import { SiteDocument, RESERVED_SLUGS } from "@replyiq/schema";
import {
  Owner,
  Project,
  DocumentVersion,
  PublishEvent,
  Asset,
  PreviewTokenRecord,
  ProjectStatus,
  AuthorType,
} from "../../domain/types.js";
import {
  OwnerRepository,
  ProjectRepository,
  VersionRepository,
  PublishEventRepository,
  AssetRepository,
  PreviewRepository,
  StorageService,
} from "../../repositories/interfaces.js";
import {
  NotFoundError,
  SlugUnavailableError,
  UnauthorizedError,
  VersionConflictError,
} from "../../domain/errors.js";

const SLUG_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class InMemoryOwnerRepository implements OwnerRepository {
  public owners = new Map<string, Owner>();
  public phoneToId = new Map<string, string>();

  async getById(id: string): Promise<Owner | null> {
    return this.owners.get(id) || null;
  }

  async getByPhoneNumber(phoneNumber: string): Promise<Owner | null> {
    const id = this.phoneToId.get(phoneNumber);
    if (!id) return null;
    return this.owners.get(id) || null;
  }

  async create(owner: Omit<Owner, "createdAt" | "updatedAt">): Promise<Owner> {
    const now = Date.now();
    const record: Owner = {
      ...owner,
      createdAt: now,
      updatedAt: now,
    };
    this.owners.set(record.id, record);
    this.phoneToId.set(record.phoneNumber, record.id);
    return record;
  }

  async update(id: string, updates: Partial<Pick<Owner, "displayName">>): Promise<Owner> {
    const existing = this.owners.get(id);
    if (!existing) throw new NotFoundError("Owner", id);
    const updated: Owner = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    this.owners.set(id, updated);
    return updated;
  }
}

export class InMemoryProjectRepository implements ProjectRepository {
  public projects = new Map<string, Project>();
  public versionsMap = new Map<string, Map<number, DocumentVersion>>();

  async getById(id: string, ownerId?: string): Promise<Project | null> {
    const project = this.projects.get(id) || null;
    if (!project) return null;
    if (ownerId && project.ownerId !== ownerId) {
      throw new UnauthorizedError(`Owner ${ownerId} does not own project ${id}`);
    }
    return project;
  }

  async getBySlug(slug: string): Promise<Project | null> {
    for (const project of this.projects.values()) {
      if (project.slug === slug.toLowerCase() && project.deletedAt === null) {
        return project;
      }
    }
    return null;
  }

  async listByOwner(ownerId: string): Promise<Project[]> {
    const results: Project[] = [];
    for (const project of this.projects.values()) {
      if (project.ownerId === ownerId && project.deletedAt === null) {
        results.push(project);
      }
    }
    return results;
  }

  async isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean> {
    const normalized = slug.toLowerCase();
    if (RESERVED_SLUGS.has(normalized)) {
      return false;
    }

    const now = Date.now();
    for (const project of this.projects.values()) {
      if (excludeProjectId && project.id === excludeProjectId) {
        continue;
      }
      if (project.slug === normalized) {
        // Active project takes the slug
        if (project.deletedAt === null) {
          return false;
        }
        // In 30-day cooldown
        if (project.deletedAt > now - SLUG_COOLDOWN_MS) {
          return false;
        }
      }
    }
    return true;
  }

  async createWithInitialVersion(
    projectData: Omit<Project, "createdAt" | "updatedAt">,
    initialDocument: SiteDocument,
    authorType: AuthorType,
    changeSummary?: string
  ): Promise<{ project: Project; version: DocumentVersion }> {
    const available = await this.isSlugAvailable(projectData.slug);
    if (!available) {
      throw new SlugUnavailableError(projectData.slug);
    }

    const now = Date.now();
    const project: Project = {
      ...projectData,
      currentVersion: 1,
      publishedVersion: null,
      status: "draft",
      suspendedReason: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const version: DocumentVersion = {
      id: `ver_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      projectId: project.id,
      versionNumber: 1,
      document: initialDocument,
      authorType,
      changeSummary: changeSummary || "Initial project creation",
      createdAt: now,
    };

    this.projects.set(project.id, project);

    if (!this.versionsMap.has(project.id)) {
      this.versionsMap.set(project.id, new Map());
    }
    this.versionsMap.get(project.id)!.set(1, version);

    return { project, version };
  }

  async updateStatus(
    id: string,
    ownerId: string,
    status: ProjectStatus,
    publishedVersion?: number | null,
    suspendedReason?: string | null
  ): Promise<Project> {
    const project = await this.getById(id, ownerId);
    if (!project) throw new NotFoundError("Project", id);

    project.status = status;
    if (publishedVersion !== undefined) {
      project.publishedVersion = publishedVersion;
    }
    if (suspendedReason !== undefined) {
      project.suspendedReason = suspendedReason;
    }
    project.updatedAt = Date.now();
    this.projects.set(id, project);
    return project;
  }

  async softDelete(id: string, ownerId: string): Promise<Project> {
    const project = await this.getById(id, ownerId);
    if (!project) throw new NotFoundError("Project", id);

    project.deletedAt = Date.now();
    project.status = "draft";
    project.publishedVersion = null;
    project.updatedAt = Date.now();
    this.projects.set(id, project);
    return project;
  }

  async renameSlug(id: string, ownerId: string, newSlug: string): Promise<Project> {
    const project = await this.getById(id, ownerId);
    if (!project) throw new NotFoundError("Project", id);

    const available = await this.isSlugAvailable(newSlug, id);
    if (!available) {
      throw new SlugUnavailableError(newSlug);
    }

    project.slug = newSlug.toLowerCase();
    project.updatedAt = Date.now();
    this.projects.set(id, project);
    return project;
  }
}

export class InMemoryVersionRepository implements VersionRepository {
  constructor(private readonly projectRepo: InMemoryProjectRepository) {}

  async get(projectId: string, versionNumber: number): Promise<DocumentVersion | null> {
    const projectVersions = this.projectRepo.versionsMap.get(projectId);
    if (!projectVersions) return null;
    return projectVersions.get(versionNumber) || null;
  }

  async list(projectId: string, limit: number = 50): Promise<DocumentVersion[]> {
    const projectVersions = this.projectRepo.versionsMap.get(projectId);
    if (!projectVersions) return [];
    const list = Array.from(projectVersions.values()).sort(
      (a, b) => b.versionNumber - a.versionNumber
    );
    return list.slice(0, limit);
  }

  async createNextVersion(
    projectId: string,
    ownerId: string,
    expectedVersion: number,
    document: SiteDocument,
    authorType: AuthorType,
    changeSummary?: string
  ): Promise<DocumentVersion> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) throw new NotFoundError("Project", projectId);

    if (project.currentVersion !== expectedVersion) {
      throw new VersionConflictError(expectedVersion, project.currentVersion);
    }

    const nextVerNum = project.currentVersion + 1;
    const now = Date.now();

    const version: DocumentVersion = {
      id: `ver_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      projectId,
      versionNumber: nextVerNum,
      document,
      authorType,
      changeSummary: changeSummary || null,
      createdAt: now,
    };

    project.currentVersion = nextVerNum;
    project.updatedAt = now;
    this.projectRepo.projects.set(projectId, project);

    if (!this.projectRepo.versionsMap.has(projectId)) {
      this.projectRepo.versionsMap.set(projectId, new Map());
    }
    this.projectRepo.versionsMap.get(projectId)!.set(nextVerNum, version);

    return version;
  }

  async deleteVersions(projectId: string, versionNumbers: number[]): Promise<number> {
    const projectVersions = this.projectRepo.versionsMap.get(projectId);
    if (!projectVersions) return 0;
    let deleted = 0;
    for (const v of versionNumbers) {
      if (projectVersions.delete(v)) {
        deleted++;
      }
    }
    return deleted;
  }

  async countVersions(projectId: string): Promise<number> {
    const projectVersions = this.projectRepo.versionsMap.get(projectId);
    if (!projectVersions) return 0;
    return projectVersions.size;
  }
}

export class InMemoryPublishEventRepository implements PublishEventRepository {
  public events: PublishEvent[] = [];

  async recordEvent(event: Omit<PublishEvent, "id" | "createdAt">): Promise<PublishEvent> {
    const record: PublishEvent = {
      ...event,
      id: `event_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      createdAt: Date.now(),
    };
    this.events.unshift(record);
    return record;
  }

  async getPreviousPublishedVersion(
    projectId: string,
    currentPublishedVersion: number
  ): Promise<number | null> {
    for (const ev of this.events) {
      if (
        ev.projectId === projectId &&
        ev.action === "publish" &&
        ev.versionNumber !== currentPublishedVersion
      ) {
        return ev.versionNumber;
      }
    }
    return null;
  }

  async listEvents(projectId: string, limit: number = 50): Promise<PublishEvent[]> {
    return this.events.filter((e) => e.projectId === projectId).slice(0, limit);
  }
}

export class InMemoryAssetRepository implements AssetRepository {
  public assets = new Map<string, Asset>(); // id -> Asset

  async getById(id: string, ownerId?: string): Promise<Asset | null> {
    const asset = this.assets.get(id) || null;
    if (!asset) return null;
    if (ownerId && asset.ownerId !== ownerId) {
      return null;
    }
    return asset;
  }

  async getByOwnerAndHash(ownerId: string, hash: string): Promise<Asset | null> {
    for (const asset of this.assets.values()) {
      if (asset.ownerId === ownerId && asset.hash === hash) {
        return asset;
      }
    }
    return null;
  }

  async create(assetData: Omit<Asset, "createdAt">): Promise<Asset> {
    const record: Asset = {
      ...assetData,
      createdAt: Date.now(),
    };
    this.assets.set(record.id, record);
    return record;
  }

  async countReferencesByHash(hash: string): Promise<number> {
    let count = 0;
    for (const asset of this.assets.values()) {
      if (asset.hash === hash) {
        count++;
      }
    }
    return count;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const asset = this.assets.get(id);
    if (!asset || asset.ownerId !== ownerId) {
      return false;
    }
    return this.assets.delete(id);
  }

  async listByOwner(ownerId: string): Promise<Asset[]> {
    const list: Asset[] = [];
    for (const asset of this.assets.values()) {
      if (asset.ownerId === ownerId) {
        list.push(asset);
      }
    }
    return list;
  }
}

export class InMemoryPreviewRepository implements PreviewRepository {
  public tokens = new Map<string, PreviewTokenRecord>(); // tokenHash -> Record

  async createToken(
    tokenHash: string,
    projectId: string,
    versionNumber: number,
    ttlSeconds: number
  ): Promise<PreviewTokenRecord> {
    const now = Date.now();
    const record: PreviewTokenRecord = {
      tokenHash,
      projectId,
      versionNumber,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    };
    this.tokens.set(tokenHash, record);
    return record;
  }

  async getByTokenHash(tokenHash: string): Promise<PreviewTokenRecord | null> {
    return this.tokens.get(tokenHash) || null;
  }

  async listActiveVersionNumbers(projectId: string): Promise<number[]> {
    const now = Date.now();
    const versions = new Set<number>();
    for (const record of this.tokens.values()) {
      if (record.projectId === projectId && record.expiresAt > now) {
        versions.add(record.versionNumber);
      }
    }
    return Array.from(versions);
  }

  async deleteExpiredTokens(): Promise<number> {
    const now = Date.now();
    let deleted = 0;
    for (const [hash, record] of this.tokens.entries()) {
      if (record.expiresAt <= now) {
        this.tokens.delete(hash);
        deleted++;
      }
    }
    return deleted;
  }
}

export class InMemoryStorageService implements StorageService {
  public htmlStore = new Map<string, string>();
  public assetStore = new Map<string, { data: Uint8Array; mimeType: string }>();

  async writeHtml(key: string, html: string): Promise<void> {
    this.htmlStore.set(key, html);
  }

  async readHtml(key: string): Promise<string | null> {
    return this.htmlStore.get(key) || null;
  }

  async deleteHtml(key: string): Promise<void> {
    this.htmlStore.delete(key);
  }

  async writeAsset(key: string, data: Uint8Array, mimeType: string): Promise<void> {
    this.assetStore.set(key, { data, mimeType });
  }

  async readAsset(key: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    return this.assetStore.get(key) || null;
  }

  async deleteAsset(key: string): Promise<void> {
    this.assetStore.delete(key);
  }

  async hasAsset(key: string): Promise<boolean> {
    return this.assetStore.has(key);
  }
}
