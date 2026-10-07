import { describe, it, expect, beforeEach, vi } from "vitest";
import * as templates from "@replyiq/templates";
import {
  InMemoryOwnerRepository,
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPreviewRepository,
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
  let previewService: PreviewService;

  const OWNER_ID = "owner_preview";
  const PROJECT_ID = "proj_preview";

  beforeEach(async () => {
    ownerRepo = new InMemoryOwnerRepository();
    projectRepo = new InMemoryProjectRepository();
    versionRepo = new InMemoryVersionRepository(projectRepo);
    previewRepo = new InMemoryPreviewRepository();

    previewService = new PreviewService(
      projectRepo,
      versionRepo,
      previewRepo,
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

  it("throws NotFoundError when creating preview token for non-existent project or version", async () => {
    await expect(
      previewService.createPreviewToken("non_existent_project", OWNER_ID, 1, 3600)
    ).rejects.toThrow();

    await expect(
      previewService.createPreviewToken(PROJECT_ID, OWNER_ID, 999, 3600)
    ).rejects.toThrow();
  });

  it("renders preview with image assets using cdn assetResolver", async () => {
    const docWithAsset: SiteDocument = {
      ...testDoc,
      sections: [
        {
          id: "hero-1",
          type: "hero",
          heading: "Hero With Asset",
          image: { assetId: "asset_test_hero", alt: "Test Hero" },
        },
      ],
    };

    await versionRepo.createNextVersion(
      PROJECT_ID,
      OWNER_ID,
      1,
      docWithAsset,
      "user"
    );

    const { token } = await previewService.createPreviewToken(
      PROJECT_ID,
      OWNER_ID,
      2,
      3600
    );

    const rendered = await previewService.renderPreview(token);
    expect(rendered).not.toBeNull();
    expect(rendered?.html).toContain("https://cdn.replyiq.cv/assets/asset_test_hero");
  });

  it("returns null when project or version is deleted after token creation", async () => {
    const { token, tokenHash } = await previewService.createPreviewToken(
      PROJECT_ID,
      OWNER_ID,
      1,
      3600
    );

    // Corrupt record pointing to missing version
    const record = await previewRepo.getByTokenHash(tokenHash);
    if (record) {
      record.versionNumber = 9999;
    }
    expect(await previewService.renderPreview(token)).toBeNull();

    // Corrupt record pointing to missing project
    if (record) {
      record.versionNumber = 1;
      record.projectId = "missing_proj";
    }
    expect(await previewService.renderPreview(token)).toBeNull();
  });

  it("throws Error when renderSite fails during preview rendering", async () => {
    const { token } = await previewService.createPreviewToken(
      PROJECT_ID,
      OWNER_ID,
      1,
      3600
    );

    const spy = vi.spyOn(templates, "renderSite").mockReturnValueOnce({
      ok: false,
      errors: ["Simulated render syntax error"],
    } as any);

    await expect(previewService.renderPreview(token)).rejects.toThrow(
      /Preview render failed: Simulated render syntax error/
    );

    spy.mockRestore();
  });
});

