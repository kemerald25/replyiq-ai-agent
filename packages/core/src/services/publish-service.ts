import { SiteDocument, validateSiteDocument } from "@replyiq/schema";
import { renderSite } from "@replyiq/templates";
import {
  ProjectRepository,
  VersionRepository,
  PublishEventRepository,
  AssetRepository,
  StorageService,
} from "../repositories/interfaces.js";
import {
  NotFoundError,
  PublishValidationError,
  RollbackNotAvailableError,
} from "../domain/errors.js";

/**
 * Extracts all unique asset IDs referenced in a SiteDocument.
 */
export function extractReferencedAssetIds(doc: SiteDocument): string[] {
  const assetIds = new Set<string>();
  for (const section of doc.sections) {
    if (section.type === "hero" && section.image?.assetId) {
      assetIds.add(section.image.assetId);
    } else if (section.type === "about" && section.image?.assetId) {
      assetIds.add(section.image.assetId);
    } else if (section.type === "services") {
      for (const item of section.items) {
        if (item.image?.assetId) assetIds.add(item.image.assetId);
      }
    } else if (section.type === "gallery") {
      for (const img of section.images) {
        if (img.assetId) assetIds.add(img.assetId);
      }
    } else if (section.type === "testimonials") {
      for (const t of section.items) {
        if (t.avatar?.assetId) assetIds.add(t.avatar.assetId);
      }
    }
  }
  return Array.from(assetIds);
}

export interface PublishResult {
  ok: true;
  publishedVersion: number;
  r2Key: string;
  renderCpuMs: number;
}

export class PublishService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly versionRepo: VersionRepository,
    private readonly publishEventRepo: PublishEventRepository,
    private readonly assetRepo: AssetRepository,
    private readonly storage: StorageService,
    private readonly baseDomain: string
  ) {}

  /**
   * Validates target version, verifies assets, renders HTML, writes to R2,
   * and atomically switches the published pointer.
   */
  async publish(
    projectId: string,
    ownerId: string,
    versionNumber?: number
  ): Promise<PublishResult> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    if (project.status === "suspended") {
      throw new Error(`Cannot publish suspended project: ${project.suspendedReason || "Suspended by admin"}`);
    }

    const targetVerNum = versionNumber ?? project.currentVersion;
    const version = await this.versionRepo.get(projectId, targetVerNum);
    if (!version) {
      throw new NotFoundError("DocumentVersion", `${projectId}@${targetVerNum}`);
    }

    // 1. Schema Validation
    const validation = validateSiteDocument(version.document);
    if (!validation.valid) {
      throw new PublishValidationError(validation.errors);
    }

    // 2. Asset Ownership & Existence Verification
    const assetIds = extractReferencedAssetIds(version.document);
    for (const assetId of assetIds) {
      const asset = await this.assetRepo.getById(assetId, ownerId);
      if (!asset) {
        throw new PublishValidationError([
          `Referenced asset "${assetId}" does not exist or does not belong to owner`,
        ]);
      }
    }

    // 3. Render HTML with precise CPU timing measurement
    const startTime = performance.now();
    const cdnBase = `https://cdn.${this.baseDomain}`;
    const assetResolver = (id: string) => ({
      url: `${cdnBase}/assets/${id}`,
      width: 800,
      height: 600,
    });

    const renderResult = renderSite(version.document, {
      mode: "live",
      canonicalUrl: `https://${project.slug}.${this.baseDomain}`,
      assetResolver,
      showBranding: true,
    });

    const renderCpuMs = Number((performance.now() - startTime).toFixed(3));

    if (!renderResult.ok) {
      throw new PublishValidationError(renderResult.errors);
    }

    // 4. Immutable R2 storage key
    const r2Key = `sites/${projectId}/${targetVerNum}.html`;

    // Step A: Write to R2 (if fails, D1 is never touched)
    await this.storage.writeHtml(r2Key, renderResult.html);

    // Step B: Atomically update project status and record event in D1
    await this.projectRepo.updateStatus(projectId, ownerId, "live", targetVerNum);

    await this.publishEventRepo.recordEvent({
      projectId,
      versionNumber: targetVerNum,
      action: "publish",
      actorId: ownerId,
      actorType: "user",
      reason: null,
    });

    return {
      ok: true,
      publishedVersion: targetVerNum,
      r2Key,
      renderCpuMs,
    };
  }

  /**
   * Unpublishes a project, setting status to 'draft' and published_version to NULL.
   */
  async unpublish(projectId: string, ownerId: string): Promise<void> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    const previousPublished = project.publishedVersion ?? project.currentVersion;
    await this.projectRepo.updateStatus(projectId, ownerId, "draft", null);

    await this.publishEventRepo.recordEvent({
      projectId,
      versionNumber: previousPublished,
      action: "unpublish",
      actorId: ownerId,
      actorType: "user",
      reason: null,
    });
  }

  /**
   * Rolls back to the previously published version recorded in publish_events.
   */
  async rollback(projectId: string, ownerId: string): Promise<number> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    if (project.publishedVersion === null) {
      throw new RollbackNotAvailableError(projectId);
    }

    const previousVerNum = await this.publishEventRepo.getPreviousPublishedVersion(
      projectId,
      project.publishedVersion
    );

    if (previousVerNum === null) {
      throw new RollbackNotAvailableError(projectId);
    }

    // Verify historic version HTML is in R2
    const r2Key = `sites/${projectId}/${previousVerNum}.html`;
    const existingHtml = await this.storage.readHtml(r2Key);
    if (!existingHtml) {
      // Re-render if key was missing
      const historicVersion = await this.versionRepo.get(projectId, previousVerNum);
      if (!historicVersion) {
        throw new NotFoundError("DocumentVersion", `${projectId}@${previousVerNum}`);
      }
      const cdnBase = `https://cdn.${this.baseDomain}`;
      const assetResolver = (id: string) => ({
        url: `${cdnBase}/assets/${id}`,
        width: 800,
        height: 600,
      });
      const res = renderSite(historicVersion.document, {
        mode: "live",
        canonicalUrl: `https://${project.slug}.${this.baseDomain}`,
        assetResolver,
        showBranding: true,
      });
      if (!res.ok) {
        throw new PublishValidationError(res.errors);
      }
      await this.storage.writeHtml(r2Key, res.html);
    }

    // Atomically point publishedVersion to previous version
    await this.projectRepo.updateStatus(projectId, ownerId, "live", previousVerNum);

    await this.publishEventRepo.recordEvent({
      projectId,
      versionNumber: previousVerNum,
      action: "rollback",
      actorId: ownerId,
      actorType: "user",
      reason: null,
    });

    return previousVerNum;
  }

  /**
   * Suspends a project with a documented reason. Suspension overrides published status.
   */
  async suspend(projectId: string, reason: string, actorId: string = "system"): Promise<void> {
    const project = await this.projectRepo.getById(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    await this.projectRepo.updateStatus(
      projectId,
      project.ownerId,
      "suspended",
      project.publishedVersion,
      reason
    );

    await this.publishEventRepo.recordEvent({
      projectId,
      versionNumber: project.publishedVersion ?? project.currentVersion,
      action: "suspend",
      actorId,
      actorType: "system",
      reason,
    });
  }

  /**
   * Unsuspends a project, restoring live status if it had a published version.
   */
  async unsuspend(projectId: string, actorId: string = "system"): Promise<void> {
    const project = await this.projectRepo.getById(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    const newStatus = project.publishedVersion !== null ? "live" : "draft";

    await this.projectRepo.updateStatus(
      projectId,
      project.ownerId,
      newStatus,
      project.publishedVersion,
      null
    );

    await this.publishEventRepo.recordEvent({
      projectId,
      versionNumber: project.publishedVersion ?? project.currentVersion,
      action: "restore",
      actorId,
      actorType: "system",
      reason: null,
    });
  }
}
