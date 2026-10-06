import { renderSite } from "@replyiq/templates";
import {
  ProjectRepository,
  VersionRepository,
  PreviewRepository,
} from "../repositories/interfaces.js";
import { computeSha256Hex } from "./image-parser.js";
import { NotFoundError } from "../domain/errors.js";

export const DEFAULT_PREVIEW_TTL_SECONDS = 3600; // 1 hour

export interface GeneratedPreviewToken {
  token: string; // Unguessable 256-bit plain token for URL
  tokenHash: string; // Stored SHA-256 hash
  expiresAt: number;
}

export class PreviewService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly versionRepo: VersionRepository,
    private readonly previewRepo: PreviewRepository,
    private readonly baseDomain: string
  ) {}

  /**
   * Generates a secure, expiring preview token for a specific document version.
   * Plain token (256 bits) is returned to caller; only SHA-256 hash is persisted in DB.
   */
  async createPreviewToken(
    projectId: string,
    ownerId: string,
    versionNumber: number,
    ttlSeconds: number = DEFAULT_PREVIEW_TTL_SECONDS
  ): Promise<GeneratedPreviewToken> {
    const project = await this.projectRepo.getById(projectId, ownerId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    const version = await this.versionRepo.get(projectId, versionNumber);
    if (!version) {
      throw new NotFoundError("DocumentVersion", `${projectId}@${versionNumber}`);
    }

    // 256-bit cryptographically secure random token (64 hex characters)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const token = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const tokenHash = await computeSha256Hex(new TextEncoder().encode(token));

    const record = await this.previewRepo.createToken(
      tokenHash,
      projectId,
      versionNumber,
      ttlSeconds
    );

    return {
      token,
      tokenHash,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Renders a preview given a plain token from a preview URL.
   */
  async renderPreview(plainToken: string): Promise<{ html: string; projectId: string; versionNumber: number } | null> {
    const tokenHash = await computeSha256Hex(new TextEncoder().encode(plainToken));
    const record = await this.previewRepo.getByTokenHash(tokenHash);

    if (!record) {
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      return null;
    }

    const version = await this.versionRepo.get(record.projectId, record.versionNumber);
    if (!version) {
      return null;
    }

    const project = await this.projectRepo.getById(record.projectId);
    if (!project) {
      return null;
    }

    const assetResolver = (assetId: string) => {
      // In preview, resolve against CDN host
      return {
        url: `https://cdn.${this.baseDomain}/assets/${assetId}`,
        width: 800,
        height: 600,
      };
    };

    const result = renderSite(version.document, {
      mode: "preview",
      canonicalUrl: `https://${project.slug}.${this.baseDomain}`,
      assetResolver,
      showBranding: true,
    });

    if (!result.ok) {
      throw new Error(`Preview render failed: ${result.errors.join(", ")}`);
    }

    return {
      html: result.html,
      projectId: record.projectId,
      versionNumber: record.versionNumber,
    };
  }
}
