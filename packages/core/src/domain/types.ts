import { SiteDocument, TemplateId } from "@replyiq/schema";

export type ProjectStatus = "draft" | "live" | "suspended";
export type AuthorType = "user" | "agent" | "system";
export type PublishAction = "publish" | "unpublish" | "rollback" | "suspend" | "restore";
export type AssetMimeType = "image/webp" | "image/jpeg" | "image/png";

export interface Owner {
  id: string;
  identityKey: string; // Normalized E.164 phone or "lid:<id>"
  phoneNumber: string | null; // Confirmed contact phone number, if known
  displayName: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  template: TemplateId;
  status: ProjectStatus;
  currentVersion: number;
  publishedVersion: number | null;
  suspendedReason: string | null;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  document: SiteDocument;
  authorType: AuthorType;
  changeSummary: string | null;
  createdAt: number;
}

export interface PublishEvent {
  id: string;
  projectId: string;
  versionNumber: number;
  action: PublishAction;
  actorId: string;
  actorType: AuthorType;
  reason: string | null;
  createdAt: number;
}

export interface Asset {
  id: string;
  ownerId: string;
  hash: string;
  r2Key: string;
  sizeBytes: number;
  mimeType: AssetMimeType;
  width: number;
  height: number;
  createdAt: number;
}

export interface PreviewTokenRecord {
  tokenHash: string;
  projectId: string;
  versionNumber: number;
  expiresAt: number;
  createdAt: number;
}

/**
  * Safely masks a phone number for logging and display without exposing PII.
  * Never logs plain E.164 phone numbers.
  */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) {
    return "***";
  }
  const prefix = phone.slice(0, 4);
  const suffix = phone.slice(-2);
  return `${prefix}****${suffix}`;
}
