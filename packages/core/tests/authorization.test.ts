import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryOwnerRepository,
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPublishEventRepository,
  InMemoryAssetRepository,
  InMemoryStorageService,
} from "../src/adapters/memory/index.js";
import { PublishService } from "../src/services/publish-service.js";
import { VersionService } from "../src/services/version-service.js";
import { AssetService } from "../src/services/asset-service.js";
import { SiteDocument } from "@replyiq/schema";
import { UnauthorizedError, NotFoundError } from "../src/domain/errors.js";
import { maskPhoneNumber } from "../src/domain/types.js";

const doc: SiteDocument = {
  schemaVersion: 1,
  subdomain: "tenant-a-biz",
  template: "portfolio",
  metadata: {
    title: "Tenant A Business",
    description: "Testing multi-tenant boundary security",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "lagos-emerald",
    font: "system-sans",
    mode: "light",
  },
  contact: {
    whatsappNumber: "+2348011112222",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Tenant A Hero",
    },
  ],
};

describe("Multi-Tenant Authorization & PII Boundaries", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let publishEventRepo: InMemoryPublishEventRepository;
  let assetRepo: InMemoryAssetRepository;
  let storage: InMemoryStorageService;

  let publishService: PublishService;
  let versionService: VersionService;
  let assetService: AssetService;

  const OWNER_A = "owner_alice";
  const OWNER_B = "owner_bob";
  const PROJECT_A = "proj_alice";

  beforeEach(async () => {
    ownerRepo = new InMemoryOwnerRepository();
    projectRepo = new InMemoryProjectRepository();
    versionRepo = new InMemoryVersionRepository(projectRepo);
    publishEventRepo = new InMemoryPublishEventRepository();
    assetRepo = new InMemoryAssetRepository();
    storage = new InMemoryStorageService();

    publishService = new PublishService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      assetRepo,
      storage,
      "replyiq.cv"
    );

    versionService = new VersionService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      new (await import("../src/adapters/memory/index.js")).InMemoryPreviewRepository()
    );

    assetService = new AssetService(assetRepo, storage);

    await ownerRepo.create({ id: OWNER_A, phoneNumber: "+2348011112222", displayName: "Alice" });
    await ownerRepo.create({ id: OWNER_B, phoneNumber: "+2348099998888", displayName: "Bob" });

    await projectRepo.createWithInitialVersion(
      {
        id: PROJECT_A,
        ownerId: OWNER_A,
        slug: "tenant-a-biz",
        name: "Alice Biz",
        template: "portfolio",
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      doc,
      "user"
    );
  });

  describe("Owner Project Isolation", () => {
    it("prevents Owner B from reading Owner A's project", async () => {
      await expect(projectRepo.getById(PROJECT_A, OWNER_B)).rejects.toThrow(UnauthorizedError);
    });

    it("prevents Owner B from updating status or publishing Owner A's project", async () => {
      await expect(
        publishService.publish(PROJECT_A, OWNER_B)
      ).rejects.toThrow(UnauthorizedError);

      await expect(
        projectRepo.updateStatus(PROJECT_A, OWNER_B, "live", 1)
      ).rejects.toThrow(UnauthorizedError);
    });

    it("prevents Owner B from deleting Owner A's project", async () => {
      await expect(projectRepo.softDelete(PROJECT_A, OWNER_B)).rejects.toThrow(UnauthorizedError);
    });

    it("prevents Owner B from reading or creating versions for Owner A's project", async () => {
      await expect(versionService.getVersion(PROJECT_A, OWNER_B, 1)).rejects.toThrow(
        UnauthorizedError
      );

      await expect(
        versionService.createVersion({
          projectId: PROJECT_A,
          ownerId: OWNER_B,
          expectedVersion: 1,
          document: doc,
          authorType: "user",
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("Asset Boundary Isolation", () => {
    it("prevents Owner B from accessing or deleting Owner A's assets", async () => {
      const assetA = await assetRepo.create({
        id: "asset_alice_1",
        ownerId: OWNER_A,
        hash: "hash_alice",
        r2Key: "assets/hash_alice.webp",
        sizeBytes: 1024,
        mimeType: "image/webp",
        width: 800,
        height: 600,
      });

      // Owner A can read own asset
      const readA = await assetService.getAsset(assetA.id, OWNER_A);
      expect(readA).not.toBeNull();

      // Owner B cannot read Owner A's asset
      const readB = await assetService.getAsset(assetA.id, OWNER_B);
      expect(readB).toBeNull();

      // Owner B cannot delete Owner A's asset
      await expect(assetService.deleteAsset(assetA.id, OWNER_B)).rejects.toThrow(NotFoundError);
    });
  });

  describe("Phone Number Masking & PII Protection", () => {
    it("never logs or exposes full E.164 phone numbers", () => {
      expect(maskPhoneNumber("+2348011112222")).toBe("+234****22");
      expect(maskPhoneNumber("+2348099998888")).toBe("+234****88");
      expect(maskPhoneNumber("")).toBe("***");
      expect(maskPhoneNumber("123")).toBe("***");
    });
  });
});
