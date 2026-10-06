import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryOwnerRepository,
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPreviewRepository,
  InMemoryAssetRepository,
} from "../src/adapters/memory/index.js";
import { PreviewService } from "../src/services/preview-service.js";
import { SiteDocument } from "@replyiq/schema";
import { computeSha256Hex } from "../src/services/image-parser.js";

const testDoc: SiteDocument = {
  schemaVersion: 1,
  subdomain: "preview-biz",
  template: "portfolio",
  metadata: {
    title: "Preview Test Business",
    description: "Testing preview mode rendering and token security",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "royal-gold",
    font: "system-sans",
    mode: "light",
  },
  contact: {
    whatsappNumber: "+2348012345678",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Exciting New Product Showcase",
      subheading: "Only available to draft preview viewers.",
    },
  ],
};

describe("PreviewService & Unguessable Hashed Tokens", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let previewRepo: InMemoryPreviewRepository;
  let assetRepo: InMemoryAssetRepository;
  let previewService: PreviewService;

  const OWNER_ID = "owner_preview";
  const PROJECT_ID = "proj_preview";

  beforeEach(async () => {
    ownerRepo = new InMemoryOwnerRepository();
    projectRepo = new InMemoryProjectRepository();
    versionRepo = new InMemoryVersionRepository(projectRepo);
    previewRepo = new InMemoryPreviewRepository();
    assetRepo = new InMemoryAssetRepository();

    previewService = new PreviewService(
      projectRepo,
      versionRepo,
      previewRepo,
      assetRepo,
      "replyiq.cv"
    );

    await ownerRepo.create({
      id: OWNER_ID,
      phoneNumber: "+2348012345678",
      displayName: "Preview Owner",
    });

    await projectRepo.createWithInitialVersion(
      {
        id: PROJECT_ID,
        ownerId: OWNER_ID,
        slug: "preview-biz",
        name: "Preview Biz",
        template: "portfolio",
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      testDoc,
      "user"
    );
  });

  it("generates a 256-bit unguessable token and persists only its SHA-256 hash", async () => {
    const { token, tokenHash, expiresAt } = await previewService.createPreviewToken(
      PROJECT_ID,
      OWNER_ID,
      1,
      3600
    );

    // Token must be a 64-character hex string (256 bits of entropy)
    expect(token).toHaveLength(64);
    expect(expiresAt).toBeGreaterThan(Date.now());

    // Token hash in DB must match SHA-256 of the plain token
    const expectedHash = await computeSha256Hex(new TextEncoder().encode(token));
    expect(tokenHash).toBe(expectedHash);

    // Verify DB only stores the hash, never the plain token
    const dbRecord = await previewRepo.getByTokenHash(tokenHash);
    expect(dbRecord).not.toBeNull();
    expect(previewRepo.tokens.has(token)).toBe(false); // Plain token is NEVER in DB
  });

  it("renders preview HTML for valid unexpired token with preview ribbon and noindex", async () => {
    const { token } = await previewService.createPreviewToken(
      PROJECT_ID,
      OWNER_ID,
      1,
      3600
    );

    const rendered = await previewService.renderPreview(token);
    expect(rendered).not.toBeNull();
    if (rendered) {
      expect(rendered.projectId).toBe(PROJECT_ID);
      expect(rendered.versionNumber).toBe(1);
      expect(rendered.html).toContain("Exciting New Product Showcase");
      expect(rendered.html).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(rendered.html).toContain("preview-ribbon");
    }
  });

  it("refuses to render preview when token has expired", async () => {
    // Generate token with negative TTL (already expired)
    const { token } = await previewService.createPreviewToken(
      PROJECT_ID,
      OWNER_ID,
      1,
      -10 // Expired 10 seconds ago
    );

    const rendered = await previewService.renderPreview(token);
    expect(rendered).toBeNull();
  });

  it("refuses to render preview when token is invalid or fabricated", async () => {
    const fakeToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const rendered = await previewService.renderPreview(fakeToken);
    expect(rendered).toBeNull();
  });
});
