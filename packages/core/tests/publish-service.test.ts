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
import { SiteDocument } from "@replyiq/schema";
import {
  PublishValidationError,
  RollbackNotAvailableError,
} from "../src/domain/errors.js";

const sampleDoc: SiteDocument = {
  schemaVersion: 1,
  subdomain: "salon-amaka",
  template: "portfolio",
  metadata: {
    title: "Amaka Hair Studio",
    description: "Best salon in Ikeja Lagos",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "lagos-emerald",
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
      heading: "Top Hair Braiding in Lagos",
      subheading: "Professional stylists in Ikeja.",
      cta: {
        label: "Book on WhatsApp",
        url: "https://wa.me/2348012345678",
      },
    },
  ],
};

describe("PublishService Pipeline & Atomicity", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let publishEventRepo: InMemoryPublishEventRepository;
  let assetRepo: InMemoryAssetRepository;
  let storage: InMemoryStorageService;
  let publishService: PublishService;

  const OWNER_ID = "owner_amaka";
  const BASE_DOMAIN = "replyiq.cv";

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
      BASE_DOMAIN
    );

    await ownerRepo.create({
      id: OWNER_ID,
      phoneNumber: "+2348012345678",
      displayName: "Amaka",
    });

    await projectRepo.createWithInitialVersion(
      {
        id: "proj_1",
        ownerId: OWNER_ID,
        slug: "salon-amaka",
        name: "Amaka Salon",
        template: "portfolio",
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      sampleDoc,
      "user"
    );
  });

  describe("Standard Publish Pipeline", () => {
    it("validates version, writes immutable HTML to R2, updates pointer, and records event", async () => {
      const result = await publishService.publish("proj_1", OWNER_ID);

      expect(result.ok).toBe(true);
      expect(result.publishedVersion).toBe(1);
      expect(result.r2Key).toBe("sites/proj_1/1.html");
      expect(result.renderCpuMs).toBeGreaterThanOrEqual(0);

      // Verify HTML was written to R2
      const html = await storage.readHtml("sites/proj_1/1.html");
      expect(html).not.toBeNull();
      expect(html).toContain("Top Hair Braiding in Lagos");

      // Verify D1 project pointer updated
      const proj = await projectRepo.getById("proj_1");
      expect(proj?.status).toBe("live");
      expect(proj?.publishedVersion).toBe(1);

      // Verify publish_events table
      const events = await publishEventRepo.listEvents("proj_1");
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe("publish");
      expect(events[0].versionNumber).toBe(1);
    });
  });

  describe("Publish Atomicity & Failure Guarantees", () => {
    it("leaves live site untouched if R2 storage write fails", async () => {
      // Simulate storage write failure
      storage.writeHtml = async () => {
        throw new Error("R2 Network write timeout");
      };

      await expect(publishService.publish("proj_1", OWNER_ID)).rejects.toThrow("R2 Network write timeout");

      // Project MUST remain untouched in draft status
      const proj = await projectRepo.getById("proj_1");
      expect(proj?.status).toBe("draft");
      expect(proj?.publishedVersion).toBeNull();

      // No publish event should be recorded
      const events = await publishEventRepo.listEvents("proj_1");
      expect(events).toHaveLength(0);
    });
  });

  describe("Asset Ownership Verification at Publish Time", () => {
    it("rejects publish if a referenced asset belongs to a different owner", async () => {
      // Register an asset belonging to a DIFFERENT owner
      await assetRepo.create({
        id: "asset_stolen",
        ownerId: "other_owner",
        hash: "hash_stolen",
        r2Key: "assets/hash_stolen.webp",
        sizeBytes: 2048,
        mimeType: "image/webp",
        width: 800,
        height: 600,
      });

      // Craft document version referencing the other owner's asset
      const docWithOtherAsset: SiteDocument = {
        ...sampleDoc,
        sections: [
          {
            id: "hero-1",
            type: "hero",
            heading: "Stolen asset test",
            image: { assetId: "asset_stolen", alt: "Unauthorized image" },
          },
        ],
      };

      await versionRepo.createNextVersion(
        "proj_1",
        OWNER_ID,
        1,
        docWithOtherAsset,
        "user"
      );

      // Publishing version 2 must fail asset ownership verification!
      await expect(publishService.publish("proj_1", OWNER_ID, 2)).rejects.toThrow(
        PublishValidationError
      );
      await expect(publishService.publish("proj_1", OWNER_ID, 2)).rejects.toThrow(
        /does not exist or does not belong to owner/
      );
    });

    it("succeeds when referenced asset belongs to the project owner", async () => {
      // Register asset belonging to this project's owner
      await assetRepo.create({
        id: "asset_valid",
        ownerId: OWNER_ID,
        hash: "hash_valid",
        r2Key: "assets/hash_valid.webp",
        sizeBytes: 2048,
        mimeType: "image/webp",
        width: 800,
        height: 600,
      });

      const docWithOwnAsset: SiteDocument = {
        ...sampleDoc,
        sections: [
          {
            id: "hero-1",
            type: "hero",
            heading: "Valid asset test",
            image: { assetId: "asset_valid", alt: "Own image" },
          },
        ],
      };

      await versionRepo.createNextVersion(
        "proj_1",
        OWNER_ID,
        1,
        docWithOwnAsset,
        "user"
      );

      const res = await publishService.publish("proj_1", OWNER_ID, 2);
      expect(res.ok).toBe(true);
      expect(res.publishedVersion).toBe(2);
    });
  });

  describe("Unpublish and Rollback Pipeline", () => {
    it("unpublishes a live site, returning status to draft and clearing publishedVersion", async () => {
      await publishService.publish("proj_1", OWNER_ID);

      await publishService.unpublish("proj_1", OWNER_ID);

      const proj = await projectRepo.getById("proj_1");
      expect(proj?.status).toBe("draft");
      expect(proj?.publishedVersion).toBeNull();

      const events = await publishEventRepo.listEvents("proj_1");
      expect(events[0].action).toBe("unpublish");
    });

    it("rolls back to the previous published version using publish_events history", async () => {
      // Publish version 1
      await publishService.publish("proj_1", OWNER_ID, 1);

      // Create and publish version 2
      const v2Doc = { ...sampleDoc, metadata: { ...sampleDoc.metadata, title: "Title V2" } };
      await versionRepo.createNextVersion("proj_1", OWNER_ID, 1, v2Doc, "user");
      await publishService.publish("proj_1", OWNER_ID, 2);

      const currentProj = await projectRepo.getById("proj_1");
      expect(currentProj?.publishedVersion).toBe(2);

      // Rollback: must return to version 1
      const rolledBackVersion = await publishService.rollback("proj_1", OWNER_ID);
      expect(rolledBackVersion).toBe(1);

      const rolledBackProj = await projectRepo.getById("proj_1");
      expect(rolledBackProj?.publishedVersion).toBe(1);
      expect(rolledBackProj?.status).toBe("live");

      const events = await publishEventRepo.listEvents("proj_1");
      expect(events[0].action).toBe("rollback");
      expect(events[0].versionNumber).toBe(1);
    });

    it("throws RollbackNotAvailableError if no prior published version exists", async () => {
      await publishService.publish("proj_1", OWNER_ID, 1);

      // Attempting rollback when only 1 version was ever published must fail
      await expect(publishService.rollback("proj_1", OWNER_ID)).rejects.toThrow(
        RollbackNotAvailableError
      );
    });
  });

  describe("Suspension / Takedown Overrides", () => {
    it("suspension sets status to suspended and prevents further publishing", async () => {
      await publishService.publish("proj_1", OWNER_ID, 1);

      // Admin takedown
      await publishService.suspend("proj_1", "Terms of service violation: prohibited content");

      const proj = await projectRepo.getById("proj_1");
      expect(proj?.status).toBe("suspended");
      expect(proj?.suspendedReason).toBe("Terms of service violation: prohibited content");

      // Attempting to publish a suspended project throws error
      await expect(publishService.publish("proj_1", OWNER_ID, 1)).rejects.toThrow(
        /Cannot publish suspended project/
      );

      // Unsuspending restores live status
      await publishService.unsuspend("proj_1");
      const unsuspendedProj = await projectRepo.getById("proj_1");
      expect(unsuspendedProj?.status).toBe("live");
      expect(unsuspendedProj?.suspendedReason).toBeNull();
    });

    it("throws NotFoundError when suspending or unsuspending non-existent project", async () => {
      await expect(publishService.suspend("proj_missing", "reason")).rejects.toThrow(
        /not found/i
      );
      await expect(publishService.unsuspend("proj_missing")).rejects.toThrow(
        /not found/i
      );
    });

    it("throws NotFoundError when unpublishing non-existent project", async () => {
      await expect(publishService.unpublish("proj_missing", OWNER_ID)).rejects.toThrow(
        /not found/i
      );
    });
  });
});
