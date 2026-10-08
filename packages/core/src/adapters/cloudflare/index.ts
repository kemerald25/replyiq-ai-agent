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
  AssetMimeType,
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

// Minimal structural types for Cloudflare D1 without external imports
export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<Array<{ results?: T[]; success: boolean; meta?: { changes?: number } }>>;
}

// Minimal structural types for Cloudflare R2
export interface R2ObjectLike {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
}

export interface R2BucketLike {
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string | string[]): Promise<void>;
  head(key: string): Promise<unknown | null>;
}

interface ProjectRow {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  template: string;
  status: string;
  current_version: number;
  published_version: number | null;
  suspended_reason: string | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    name: row.name,
    template: row.template as Project["template"],
    status: row.status as ProjectStatus,
    currentVersion: row.current_version,
    publishedVersion: row.published_version,
    suspendedReason: row.suspended_reason,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class D1OwnerRepository implements OwnerRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async getById(id: string): Promise<Owner | null> {
    const row = await this.db
      .prepare("SELECT * FROM owners WHERE id = ?")
      .bind(id)
      .first<{ id: string; identity_key?: string | null; phone_number: string | null; display_name: string | null; created_at: number; updated_at: number }>();

    if (!row) return null;
    return {
      id: row.id,
      identityKey: row.identity_key || row.phone_number || row.id,
      phoneNumber: row.phone_number || null,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getByIdentityKey(identityKey: string): Promise<Owner | null> {
    const row = await this.db
      .prepare("SELECT * FROM owners WHERE identity_key = ? OR phone_number = ?")
      .bind(identityKey, identityKey)
      .first<{ id: string; identity_key?: string | null; phone_number: string | null; display_name: string | null; created_at: number; updated_at: number }>();

    if (!row) return null;
    return {
      id: row.id,
      identityKey: row.identity_key || row.phone_number || row.id,
      phoneNumber: row.phone_number || null,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getByPhoneNumber(phoneNumber: string): Promise<Owner | null> {
    const row = await this.db
      .prepare("SELECT * FROM owners WHERE phone_number = ? OR identity_key = ?")
      .bind(phoneNumber, phoneNumber)
      .first<{ id: string; identity_key?: string | null; phone_number: string | null; display_name: string | null; created_at: number; updated_at: number }>();

    if (!row) return null;
    return {
      id: row.id,
      identityKey: row.identity_key || row.phone_number || row.id,
      phoneNumber: row.phone_number || null,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(
    owner: Omit<Owner, "createdAt" | "updatedAt" | "identityKey"> & { identityKey?: string }
  ): Promise<Owner> {
    const now = Date.now();
    const identityKey = owner.identityKey || owner.phoneNumber || owner.id;
    try {
      await this.db
        .prepare("INSERT INTO owners (id, identity_key, phone_number, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(owner.id, identityKey, owner.phoneNumber || null, owner.displayName || null, now, now)
        .run();
    } catch {
      // Fallback for unmigrated schema where identity_key column doesn't exist yet
      await this.db
        .prepare("INSERT INTO owners (id, phone_number, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(owner.id, owner.phoneNumber || identityKey, owner.displayName || null, now, now)
        .run();
    }

    return {
      ...owner,
      identityKey,
      phoneNumber: owner.phoneNumber || null,
      displayName: owner.displayName || null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, updates: Partial<Pick<Owner, "displayName" | "phoneNumber">>): Promise<Owner> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError("Owner", id);

    const now = Date.now();
    const newName = updates.displayName !== undefined ? updates.displayName : existing.displayName;
    const newPhone = updates.phoneNumber !== undefined ? updates.phoneNumber : existing.phoneNumber;

    await this.db
      .prepare("UPDATE owners SET display_name = ?, phone_number = ?, updated_at = ? WHERE id = ?")
      .bind(newName, newPhone, now, id)
      .run();

    return {
      ...existing,
      displayName: newName,
      phoneNumber: newPhone,
      updatedAt: now,
    };
  }
}

export class D1ProjectRepository implements ProjectRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async getById(id: string, ownerId?: string): Promise<Project | null> {
    const row = await this.db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .bind(id)
      .first<ProjectRow>();

    if (!row) return null;
    if (ownerId && row.owner_id !== ownerId) {
      throw new UnauthorizedError(`Owner ${ownerId} does not own project ${id}`);
    }
    return mapProjectRow(row);
  }

  async getBySlug(slug: string): Promise<Project | null> {
    const row = await this.db
      .prepare("SELECT * FROM projects WHERE slug = ? AND deleted_at IS NULL")
      .bind(slug.toLowerCase())
      .first<ProjectRow>();

    if (!row) return null;
    return mapProjectRow(row);
  }

  async listByOwner(ownerId: string): Promise<Project[]> {
    const result = await this.db
      .prepare("SELECT * FROM projects WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC")
      .bind(ownerId)
      .all<ProjectRow>();

    return (result.results || []).map(mapProjectRow);
  }

  async isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean> {
    const normalized = slug.toLowerCase();
    if (RESERVED_SLUGS.has(normalized)) {
      return false;
    }

    const rows = await this.db
      .prepare("SELECT id, deleted_at FROM projects WHERE slug = ?")
      .bind(normalized)
      .all<{ id: string; deleted_at: number | null }>();

    const now = Date.now();
    for (const row of rows.results || []) {
      if (excludeProjectId && row.id === excludeProjectId) {
        continue;
      }
      if (row.deleted_at === null) {
        return false;
      }
      if (row.deleted_at > now - SLUG_COOLDOWN_MS) {
        return false;
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
    const versionId = `ver_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const projectStmt = this.db
      .prepare(
        `INSERT INTO projects (
          id, owner_id, slug, name, template, status, current_version, published_version, suspended_reason, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'draft', 1, NULL, NULL, NULL, ?, ?)`
      )
      .bind(
        projectData.id,
        projectData.ownerId,
        projectData.slug.toLowerCase(),
        projectData.name,
        projectData.template,
        now,
        now
      );

    const versionStmt = this.db
      .prepare(
        `INSERT INTO document_versions (
          id, project_id, version_number, document_json, author_type, change_summary, created_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?)`
      )
      .bind(
        versionId,
        projectData.id,
        JSON.stringify(initialDocument),
        authorType,
        changeSummary || "Initial project creation",
        now
      );

    // Atomically execute multi-statement batch
    await this.db.batch([projectStmt, versionStmt]);

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
      id: versionId,
      projectId: projectData.id,
      versionNumber: 1,
      document: initialDocument,
      authorType,
      changeSummary: changeSummary || "Initial project creation",
      createdAt: now,
    };

    return { project, version };
  }

  async updateStatus(
    id: string,
    ownerId: string,
    status: ProjectStatus,
    publishedVersion?: number | null,
    suspendedReason?: string | null
  ): Promise<Project> {
    const existing = await this.getById(id, ownerId);
    if (!existing) throw new NotFoundError("Project", id);

    const now = Date.now();
    const newPubVer = publishedVersion !== undefined ? publishedVersion : existing.publishedVersion;
    const newReason = suspendedReason !== undefined ? suspendedReason : existing.suspendedReason;

    await this.db
      .prepare(
        "UPDATE projects SET status = ?, published_version = ?, suspended_reason = ?, updated_at = ? WHERE id = ? AND owner_id = ?"
      )
      .bind(status, newPubVer, newReason, now, id, ownerId)
      .run();

    return {
      ...existing,
      status,
      publishedVersion: newPubVer,
      suspendedReason: newReason,
      updatedAt: now,
    };
  }

  async softDelete(id: string, ownerId: string): Promise<Project> {
    const existing = await this.getById(id, ownerId);
    if (!existing) throw new NotFoundError("Project", id);

    const now = Date.now();
    await this.db
      .prepare(
        "UPDATE projects SET deleted_at = ?, status = 'draft', published_version = NULL, updated_at = ? WHERE id = ? AND owner_id = ?"
      )
      .bind(now, now, id, ownerId)
      .run();

    return {
      ...existing,
      deletedAt: now,
      status: "draft",
      publishedVersion: null,
      updatedAt: now,
    };
  }

  async renameSlug(id: string, ownerId: string, newSlug: string): Promise<Project> {
    const existing = await this.getById(id, ownerId);
    if (!existing) throw new NotFoundError("Project", id);

    const available = await this.isSlugAvailable(newSlug, id);
    if (!available) {
      throw new SlugUnavailableError(newSlug);
    }

    const now = Date.now();
    const normalized = newSlug.toLowerCase();
    await this.db
      .prepare("UPDATE projects SET slug = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
      .bind(normalized, now, id, ownerId)
      .run();

    return {
      ...existing,
      slug: normalized,
      updatedAt: now,
    };
  }
}

export class D1VersionRepository implements VersionRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async get(projectId: string, versionNumber: number): Promise<DocumentVersion | null> {
    const row = await this.db
      .prepare("SELECT * FROM document_versions WHERE project_id = ? AND version_number = ?")
      .bind(projectId, versionNumber)
      .first<{
        id: string;
        project_id: string;
        version_number: number;
        document_json: string;
        author_type: string;
        change_summary: string | null;
        created_at: number;
      }>();

    if (!row) return null;
    return {
      id: row.id,
      projectId: row.project_id,
      versionNumber: row.version_number,
      document: JSON.parse(row.document_json) as SiteDocument,
      authorType: row.author_type as AuthorType,
      changeSummary: row.change_summary,
      createdAt: row.created_at,
    };
  }

  async list(projectId: string, limit: number = 50): Promise<DocumentVersion[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM document_versions WHERE project_id = ? ORDER BY version_number DESC LIMIT ?"
      )
      .bind(projectId, limit)
      .all<{
        id: string;
        project_id: string;
        version_number: number;
        document_json: string;
        author_type: string;
        change_summary: string | null;
        created_at: number;
      }>();

    return (result.results || []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      versionNumber: row.version_number,
      document: JSON.parse(row.document_json) as SiteDocument,
      authorType: row.author_type as AuthorType,
      changeSummary: row.change_summary,
      createdAt: row.created_at,
    }));
  }

  async createNextVersion(
    projectId: string,
    ownerId: string,
    expectedVersion: number,
    document: SiteDocument,
    authorType: AuthorType,
    changeSummary?: string
  ): Promise<DocumentVersion> {
    // Verify project exists and check expected version
    const currentProj = await this.db
      .prepare("SELECT current_version FROM projects WHERE id = ? AND owner_id = ?")
      .bind(projectId, ownerId)
      .first<{ current_version: number }>();

    if (!currentProj) {
      throw new NotFoundError("Project", projectId);
    }

    if (currentProj.current_version !== expectedVersion) {
      throw new VersionConflictError(expectedVersion, currentProj.current_version);
    }

    const nextVerNum = expectedVersion + 1;
    const now = Date.now();
    const versionId = `ver_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    // Stmt 1: Insert new document version
    const insertVersionStmt = this.db
      .prepare(
        `INSERT INTO document_versions (
          id, project_id, version_number, document_json, author_type, change_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        versionId,
        projectId,
        nextVerNum,
        JSON.stringify(document),
        authorType,
        changeSummary || null,
        now
      );

    // Stmt 2: Optimistic update on project verifying current_version === expectedVersion
    const updateProjectStmt = this.db
      .prepare(
        "UPDATE projects SET current_version = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND current_version = ?"
      )
      .bind(nextVerNum, now, projectId, ownerId, expectedVersion);

    // Execute atomic batch
    try {
      const batchRes = await this.db.batch([insertVersionStmt, updateProjectStmt]);
      const updateResult = batchRes[1];

      if (updateResult && updateResult.meta && updateResult.meta.changes === 0) {
        const current = await this.db
          .prepare("SELECT current_version FROM projects WHERE id = ?")
          .bind(projectId)
          .first<{ current_version: number }>();

        throw new VersionConflictError(expectedVersion, current?.current_version ?? 0);
      }
    } catch (err) {
      if (err instanceof VersionConflictError) throw err;
      // If concurrent race caused a UNIQUE constraint failure on (project_id, version_number)
      const current = await this.db
        .prepare("SELECT current_version FROM projects WHERE id = ?")
        .bind(projectId)
        .first<{ current_version: number }>();
      throw new VersionConflictError(expectedVersion, current?.current_version ?? expectedVersion);
    }

    return {
      id: versionId,
      projectId,
      versionNumber: nextVerNum,
      document,
      authorType,
      changeSummary: changeSummary || null,
      createdAt: now,
    };
  }

  async deleteVersions(projectId: string, versionNumbers: number[]): Promise<number> {
    if (versionNumbers.length === 0) return 0;
    const placeholders = versionNumbers.map(() => "?").join(",");
    const res = await this.db
      .prepare(`DELETE FROM document_versions WHERE project_id = ? AND version_number IN (${placeholders})`)
      .bind(projectId, ...versionNumbers)
      .run();

    return res.meta?.changes ?? versionNumbers.length;
  }

  async countVersions(projectId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as count FROM document_versions WHERE project_id = ?")
      .bind(projectId)
      .first<{ count: number }>();

    return row?.count ?? 0;
  }
}

export class D1PublishEventRepository implements PublishEventRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async recordEvent(event: Omit<PublishEvent, "id" | "createdAt">): Promise<PublishEvent> {
    const id = `event_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO publish_events (
          id, project_id, version_number, action, actor_id, actor_type, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        event.projectId,
        event.versionNumber,
        event.action,
        event.actorId,
        event.actorType,
        event.reason || null,
        now
      )
      .run();

    return {
      id,
      ...event,
      createdAt: now,
    };
  }

  async getPreviousPublishedVersion(
    projectId: string,
    currentPublishedVersion: number
  ): Promise<number | null> {
    const row = await this.db
      .prepare(
        `SELECT version_number FROM publish_events
         WHERE project_id = ? AND action = 'publish' AND version_number != ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(projectId, currentPublishedVersion)
      .first<{ version_number: number }>();

    return row ? row.version_number : null;
  }

  async listEvents(projectId: string, limit: number = 50): Promise<PublishEvent[]> {
    const result = await this.db
      .prepare("SELECT * FROM publish_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?")
      .bind(projectId, limit)
      .all<{
        id: string;
        project_id: string;
        version_number: number;
        action: string;
        actor_id: string;
        actor_type: string;
        reason: string | null;
        created_at: number;
      }>();

    return (result.results || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      versionNumber: r.version_number,
      action: r.action as PublishEvent["action"],
      actorId: r.actor_id,
      actorType: r.actor_type as AuthorType,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }
}

export class D1AssetRepository implements AssetRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async getById(id: string, ownerId?: string): Promise<Asset | null> {
    let query = "SELECT * FROM assets WHERE id = ?";
    const params: unknown[] = [id];
    if (ownerId) {
      query += " AND owner_id = ?";
      params.push(ownerId);
    }

    const row = await this.db.prepare(query).bind(...params).first<{
      id: string;
      owner_id: string;
      hash: string;
      r2_key: string;
      size_bytes: number;
      mime_type: string;
      width: number;
      height: number;
      created_at: number;
    }>();

    if (!row) return null;
    return {
      id: row.id,
      ownerId: row.owner_id,
      hash: row.hash,
      r2Key: row.r2_key,
      sizeBytes: row.size_bytes,
      mimeType: row.mime_type as AssetMimeType,
      width: row.width,
      height: row.height,
      createdAt: row.created_at,
    };
  }

  async getByOwnerAndHash(ownerId: string, hash: string): Promise<Asset | null> {
    const row = await this.db
      .prepare("SELECT * FROM assets WHERE owner_id = ? AND hash = ? LIMIT 1")
      .bind(ownerId, hash)
      .first<{
        id: string;
        owner_id: string;
        hash: string;
        r2_key: string;
        size_bytes: number;
        mime_type: string;
        width: number;
        height: number;
        created_at: number;
      }>();

    if (!row) return null;
    return {
      id: row.id,
      ownerId: row.owner_id,
      hash: row.hash,
      r2Key: row.r2_key,
      sizeBytes: row.size_bytes,
      mimeType: row.mime_type as AssetMimeType,
      width: row.width,
      height: row.height,
      createdAt: row.created_at,
    };
  }

  async create(asset: Omit<Asset, "createdAt">): Promise<Asset> {
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT INTO assets (
          id, owner_id, hash, r2_key, size_bytes, mime_type, width, height, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        asset.id,
        asset.ownerId,
        asset.hash,
        asset.r2Key,
        asset.sizeBytes,
        asset.mimeType,
        asset.width,
        asset.height,
        now
      )
      .run();

    return {
      ...asset,
      createdAt: now,
    };
  }

  async countReferencesByHash(hash: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as count FROM assets WHERE hash = ?")
      .bind(hash)
      .first<{ count: number }>();

    return row?.count ?? 0;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const res = await this.db
      .prepare("DELETE FROM assets WHERE id = ? AND owner_id = ?")
      .bind(id, ownerId)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  }

  async listByOwner(ownerId: string): Promise<Asset[]> {
    const result = await this.db
      .prepare("SELECT * FROM assets WHERE owner_id = ? ORDER BY created_at DESC")
      .bind(ownerId)
      .all<{
        id: string;
        owner_id: string;
        hash: string;
        r2_key: string;
        size_bytes: number;
        mime_type: string;
        width: number;
        height: number;
        created_at: number;
      }>();

    return (result.results || []).map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
      hash: r.hash,
      r2Key: r.r2_key,
      sizeBytes: r.size_bytes,
      mimeType: r.mime_type as AssetMimeType,
      width: r.width,
      height: r.height,
      createdAt: r.created_at,
    }));
  }
}

export class D1PreviewRepository implements PreviewRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async createToken(
    tokenHash: string,
    projectId: string,
    versionNumber: number,
    ttlSeconds: number
  ): Promise<PreviewTokenRecord> {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    await this.db
      .prepare(
        `INSERT INTO preview_tokens (
          token_hash, project_id, version_number, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .bind(tokenHash, projectId, versionNumber, expiresAt, now)
      .run();

    return {
      tokenHash,
      projectId,
      versionNumber,
      expiresAt,
      createdAt: now,
    };
  }

  async getByTokenHash(tokenHash: string): Promise<PreviewTokenRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM preview_tokens WHERE token_hash = ?")
      .bind(tokenHash)
      .first<{
        token_hash: string;
        project_id: string;
        version_number: number;
        expires_at: number;
        created_at: number;
      }>();

    if (!row) return null;
    return {
      tokenHash: row.token_hash,
      projectId: row.project_id,
      versionNumber: row.version_number,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async listActiveVersionNumbers(projectId: string): Promise<number[]> {
    const now = Date.now();
    const result = await this.db
      .prepare(
        "SELECT DISTINCT version_number FROM preview_tokens WHERE project_id = ? AND expires_at > ?"
      )
      .bind(projectId, now)
      .all<{ version_number: number }>();

    return (result.results || []).map((r) => r.version_number);
  }

  async deleteExpiredTokens(): Promise<number> {
    const now = Date.now();
    const res = await this.db
      .prepare("DELETE FROM preview_tokens WHERE expires_at <= ?")
      .bind(now)
      .run();

    return res.meta?.changes ?? 0;
  }
}

export class R2StorageService implements StorageService {
  constructor(
    private readonly sitesBucket: R2BucketLike,
    private readonly assetsBucket: R2BucketLike
  ) {}

  async writeHtml(key: string, html: string): Promise<void> {
    await this.sitesBucket.put(key, html, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
  }

  async readHtml(key: string): Promise<string | null> {
    const obj = await this.sitesBucket.get(key);
    if (!obj) return null;
    return obj.text();
  }

  async deleteHtml(key: string): Promise<void> {
    await this.sitesBucket.delete(key);
  }

  async writeAsset(key: string, data: Uint8Array, mimeType: string): Promise<void> {
    await this.assetsBucket.put(key, data, {
      httpMetadata: { contentType: mimeType },
    });
  }

  async readAsset(key: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    const obj = await this.assetsBucket.get(key);
    if (!obj) return null;
    const arrayBuffer = await obj.arrayBuffer();
    return {
      data: new Uint8Array(arrayBuffer),
      mimeType: obj.httpMetadata?.contentType || "application/octet-stream",
    };
  }

  async deleteAsset(key: string): Promise<void> {
    await this.assetsBucket.delete(key);
  }

  async hasAsset(key: string): Promise<boolean> {
    const head = await this.assetsBucket.head(key);
    return head !== null;
  }
}
