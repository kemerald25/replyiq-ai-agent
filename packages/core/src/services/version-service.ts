import { SiteDocument, validateSiteDocument } from "@replyiq/schema";
import { AuthorType, DocumentVersion } from "../domain/types.js";
import {
  ProjectRepository,
  VersionRepository,
  PublishEventRepository,
  PreviewRepository,
} from "../repositories/interfaces.js";
import { NotFoundError, PublishValidationError } from "../domain/errors.js";

export const PRUNING_TRIGGER_THRESHOLD = 55;
export const PRUNING_KEEP_COUNT = 50;
export const PRUNING_BATCH_SIZE = 20;

export class VersionService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly versionRepo: VersionRepository,
    private readonly publishEventRepo: PublishEventRepository,
    private readonly previewRepo: PreviewRepository
  ) {}

  /**
   * Creates a new version for a project with optimistic concurrency control.
   */
  async createVersion(params: {
    projectId: string;
    ownerId: string;
    expectedVersion: number;
    document: SiteDocument;
    authorType: AuthorType;
    changeSummary?: string;
  }): Promise<DocumentVersion> {
    const { projectId, ownerId, expectedVersion, document, authorType, changeSummary } = params;

    // Validate the incoming SiteDocument against schema rules
    const validation = validateSiteDocument(document);
    if (!validation.valid) {
      throw new PublishValidationError(validation.errors);
    }

    // Verify project ownership
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    // Create next version atomically with optimistic concurrency check
    const newVersion = await this.versionRepo.createNextVersion(
      projectId,
      ownerId,
      expectedVersion,
      validation.document,
      authorType,
      changeSummary
    );

    // Trigger best-effort pruning in the background (never fails the edit)
    this.pruneVersionsBestEffort(projectId, project.publishedVersion, newVersion.versionNumber).catch(
      (err) => {
        console.warn(`[VersionService] Best-effort version pruning failed for project ${projectId}:`, err);
      }
    );

    return newVersion;
  }

  /**
   * Retrieves a specific version of a project.
   */
  async getVersion(
    projectId: string,
    ownerId: string,
    versionNumber: number
  ): Promise<DocumentVersion | null> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    return this.versionRepo.get(projectId, versionNumber);
  }

  /**
   * Lists version history for a project.
   */
  async listVersions(
    projectId: string,
    ownerId: string,
    limit: number = 50
  ): Promise<DocumentVersion[]> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    return this.versionRepo.list(projectId, limit);
  }

  /**
   * Undoes the last change by cloning version (N-1) as version (N+1).
   */
  async undo(projectId: string, ownerId: string): Promise<DocumentVersion> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    if (project.currentVersion <= 1) {
      throw new Error("Cannot undo: project is at version 1");
    }

    const previousVersion = await this.versionRepo.get(projectId, project.currentVersion - 1);
    if (!previousVersion) {
      throw new NotFoundError("DocumentVersion", `${projectId}@${project.currentVersion - 1}`);
    }

    return this.createVersion({
      projectId,
      ownerId,
      expectedVersion: project.currentVersion,
      document: previousVersion.document,
      authorType: "user",
      changeSummary: `Undo to version ${previousVersion.versionNumber}`,
    });
  }

  /**
   * Restores an arbitrary historical version by cloning it as version (N+1).
   */
  async restore(
    projectId: string,
    ownerId: string,
    targetVersionNumber: number
  ): Promise<DocumentVersion> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    const targetVersion = await this.versionRepo.get(projectId, targetVersionNumber);
    if (!targetVersion) {
      throw new NotFoundError("DocumentVersion", `${projectId}@${targetVersionNumber}`);
    }

    return this.createVersion({
      projectId,
      ownerId,
      expectedVersion: project.currentVersion,
      document: targetVersion.document,
      authorType: "user",
      changeSummary: `Restored from version ${targetVersionNumber}`,
    });
  }

  /**
   * Pruning policy implementation:
   * Keeps last 50 versions + published version + previous published version + active preview versions.
   * Runs best-effort when total versions > 55.
   */
  async pruneVersionsBestEffort(
    projectId: string,
    publishedVersion: number | null,
    currentVersion: number
  ): Promise<number> {
    if (currentVersion <= PRUNING_TRIGGER_THRESHOLD) {
      return 0;
    }

    const totalCount = await this.versionRepo.countVersions(projectId);
    if (totalCount <= PRUNING_TRIGGER_THRESHOLD) {
      return 0;
    }

    // 1. Determine protected versions
    const protectedVersions = new Set<number>();

    // Current published version
    if (publishedVersion !== null) {
      protectedVersions.add(publishedVersion);
    }

    // Previous published version from publish_events
    if (publishedVersion !== null) {
      const prevPublished = await this.publishEventRepo.getPreviousPublishedVersion(
        projectId,
        publishedVersion
      );
      if (prevPublished !== null) {
        protectedVersions.add(prevPublished);
      }
    }

    // Active unexpired preview tokens
    const activePreviewVersions = await this.previewRepo.listActiveVersionNumbers(projectId);
    for (const v of activePreviewVersions) {
      protectedVersions.add(v);
    }

    // Keep the most recent 50 versions
    const minRecentVersion = Math.max(1, currentVersion - PRUNING_KEEP_COUNT + 1);
    for (let v = minRecentVersion; v <= currentVersion; v++) {
      protectedVersions.add(v);
    }

    // 2. Query all existing versions to find prune candidates
    const allVersions = await this.versionRepo.list(projectId, totalCount);
    const candidatesToDelete: number[] = [];

    for (const v of allVersions) {
      if (!protectedVersions.has(v.versionNumber)) {
        candidatesToDelete.push(v.versionNumber);
        if (candidatesToDelete.length >= PRUNING_BATCH_SIZE) {
          break; // Small batch limit
        }
      }
    }

    if (candidatesToDelete.length === 0) {
      return 0;
    }

    return this.versionRepo.deleteVersions(projectId, candidatesToDelete);
  }
}
