import { SiteDocument } from "@replyiq/schema";
import {
  Owner,
  Project,
  DocumentVersion,
  PublishEvent,
  Asset,
  PreviewTokenRecord,
  ProjectStatus,
  AuthorType,
} from "../domain/types.js";

export interface OwnerRepository {
  getById(id: string): Promise<Owner | null>;
  getByPhoneNumber(phoneNumber: string): Promise<Owner | null>;
  create(owner: Omit<Owner, "createdAt" | "updatedAt">): Promise<Owner>;
  update(id: string, updates: Partial<Pick<Owner, "displayName">>): Promise<Owner>;
}

export interface ProjectRepository {
  getById(id: string, ownerId?: string): Promise<Project | null>;
  getBySlug(slug: string): Promise<Project | null>;
  listByOwner(ownerId: string): Promise<Project[]>;
  isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean>;
  createWithInitialVersion(
    project: Omit<Project, "createdAt" | "updatedAt">,
    initialDocument: SiteDocument,
    authorType: AuthorType,
    changeSummary?: string
  ): Promise<{ project: Project; version: DocumentVersion }>;
  updateStatus(
    id: string,
    ownerId: string,
    status: ProjectStatus,
    publishedVersion?: number | null,
    suspendedReason?: string | null
  ): Promise<Project>;
  softDelete(id: string, ownerId: string): Promise<Project>;
  renameSlug(id: string, ownerId: string, newSlug: string): Promise<Project>;
}

export interface VersionRepository {
  get(projectId: string, versionNumber: number): Promise<DocumentVersion | null>;
  list(projectId: string, limit?: number): Promise<DocumentVersion[]>;
  createNextVersion(
    projectId: string,
    ownerId: string,
    expectedVersion: number,
    document: SiteDocument,
    authorType: AuthorType,
    changeSummary?: string
  ): Promise<DocumentVersion>;
  deleteVersions(projectId: string, versionNumbers: number[]): Promise<number>;
  countVersions(projectId: string): Promise<number>;
}

export interface PublishEventRepository {
  recordEvent(event: Omit<PublishEvent, "id" | "createdAt">): Promise<PublishEvent>;
  getPreviousPublishedVersion(
    projectId: string,
    currentPublishedVersion: number
  ): Promise<number | null>;
  listEvents(projectId: string, limit?: number): Promise<PublishEvent[]>;
}

export interface AssetRepository {
  getById(id: string, ownerId?: string): Promise<Asset | null>;
  getByOwnerAndHash(ownerId: string, hash: string): Promise<Asset | null>;
  create(asset: Omit<Asset, "createdAt">): Promise<Asset>;
  countReferencesByHash(hash: string): Promise<number>;
  delete(id: string, ownerId: string): Promise<boolean>;
  listByOwner(ownerId: string): Promise<Asset[]>;
}

export interface PreviewRepository {
  createToken(
    tokenHash: string,
    projectId: string,
    versionNumber: number,
    ttlSeconds: number
  ): Promise<PreviewTokenRecord>;
  getByTokenHash(tokenHash: string): Promise<PreviewTokenRecord | null>;
  listActiveVersionNumbers(projectId: string): Promise<number[]>;
  deleteExpiredTokens(): Promise<number>;
}

export interface StorageService {
  writeHtml(key: string, html: string): Promise<void>;
  readHtml(key: string): Promise<string | null>;
  deleteHtml(key: string): Promise<void>;
  writeAsset(key: string, data: Uint8Array, mimeType: string): Promise<void>;
  readAsset(key: string): Promise<{ data: Uint8Array; mimeType: string } | null>;
  deleteAsset(key: string): Promise<void>;
  hasAsset(key: string): Promise<boolean>;
}
