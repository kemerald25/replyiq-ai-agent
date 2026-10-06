import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryOwnerRepository,
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPublishEventRepository,
  InMemoryPreviewRepository,
} from "../src/adapters/memory/index.js";
import { VersionService } from "../src/services/version-service.js";
import { SiteDocument } from "@replyiq/schema";
import { VersionConflictError } from "../src/domain/errors.js";

const baseDoc: SiteDocument = {
  schemaVersion: 1,
  subdomain: "version-test",
  template: "portfolio",
  metadata: {
    title: "Version Test",
    description: "Testing version retention and pruning",
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
      heading: "Initial Heading",
    },
  ],
};

describe("VersionService & Pruning Policy", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let publishEventRepo: InMemoryPublishEventRepository;
  let previewRepo: InMemoryPreviewRepository;
  let versionService: VersionService;

  const OWNER_ID = "owner_version";
  const PROJECT_ID = "proj_versions";

  beforeEach(async () => {
    ownerRepo = new InMemoryOwnerRepository();
    projectRepo = new InMemoryProjectRepository();
    versionRepo = new InMemoryVersionRepository(projectRepo);
    publishEventRepo = new InMemoryPublishEventRepository();
    previewRepo = new InMemoryPreviewRepository();

    versionService = new VersionService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      previewRepo
    );

    await ownerRepo.create({
      id: OWNER_ID,
      phoneNumber: "+2348012345678",
      displayName: "Owner",
    });

    await projectRepo.createWithInitialVersion(
      {
        id: PROJECT_ID,
        ownerId: OWNER_ID,
        slug: "version-test",
        name: "Version Test",
        template: "portfolio",
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      baseDoc,
      "user"
    );
  });

  describe("Optimistic Concurrency Control", () => {
    it("creates sequential versions when expectedVersion matches", async () => {
      const v2 = await versionService.createVersion({
        projectId: PROJECT_ID,
        ownerId: OWNER_ID,
        expectedVersion: 1,
        document: { ...baseDoc, metadata: { ...baseDoc.metadata, title: "Version 2" } },
        authorType: "user",
        changeSummary: "Updated title",
      });

      expect(v2.versionNumber).toBe(2);

      const v3 = await versionService.createVersion({
        projectId: PROJECT_ID,
        ownerId: OWNER_ID,
        expectedVersion: 2,
        document: { ...baseDoc, metadata: { ...baseDoc.metadata, title: "Version 3" } },
        authorType: "agent",
        changeSummary: "Agent tweak",
      });

      expect(v3.versionNumber).toBe(3);
    });

    it("throws VersionConflictError on stale expectedVersion", async () => {
      await versionService.createVersion({
        projectId: PROJECT_ID,
        ownerId: OWNER_ID,
        expectedVersion: 1,
        document: baseDoc,
        authorType: "user",
      });

      // Attempting to create from expectedVersion 1 again should conflict
      await expect(
        versionService.createVersion({
          projectId: PROJECT_ID,
          ownerId: OWNER_ID,
          expectedVersion: 1, // Stale!
          document: baseDoc,
          authorType: "user",
        })
      ).rejects.toThrow(VersionConflictError);
    });
  });

  describe("Undo and Restore", () => {
    it("undoes the last change by writing version (N-1) as version (N+1)", async () => {
      // v1 is "Initial Heading"
      // v2 is "Changed Heading"
      const docV2: SiteDocument = {
        ...baseDoc,
        sections: [{ id: "hero-1", type: "hero", heading: "Changed Heading" }],
      };
      await versionService.createVersion({
        projectId: PROJECT_ID,
        ownerId: OWNER_ID,
        expectedVersion: 1,
        document: docV2,
        authorType: "user",
      });

      // Undo creates v3 with contents of v1
      const undone = await versionService.undo(PROJECT_ID, OWNER_ID);
      expect(undone.versionNumber).toBe(3);
      expect((undone.document.sections[0] as any).heading).toBe("Initial Heading");
    });

    it("restores an arbitrary historical version as version (N+1)", async () => {
      // v2
      await versionService.createVersion({
        projectId: PROJECT_ID,
        ownerId: OWNER_ID,
        expectedVersion: 1,
        document: { ...baseDoc, metadata: { ...baseDoc.metadata, title: "Version 2" } },
        authorType: "user",
      });
      // v3
      await versionService.createVersion({
        projectId: PROJECT_ID,
        ownerId: OWNER_ID,
        expectedVersion: 2,
        document: { ...baseDoc, metadata: { ...baseDoc.metadata, title: "Version 3" } },
        authorType: "user",
      });

      // Restore v2 -> creates v4 with title "Version 2"
      const restored = await versionService.restore(PROJECT_ID, OWNER_ID, 2);
      expect(restored.versionNumber).toBe(4);
      expect(restored.document.metadata.title).toBe("Version 2");
    });
  });

  describe("Version Pruning Policy Rules", () => {
    it("prunes old versions beyond 50, but protects published, previous published, and preview versions", async () => {
      // Fast-forward create 60 versions
      for (let i = 1; i <= 59; i++) {
        await versionRepo.createNextVersion(
          PROJECT_ID,
          OWNER_ID,
          i,
          { ...baseDoc, metadata: { ...baseDoc.metadata, title: `Title ${i + 1}` } },
          "user"
        );
      }

      // We now have 60 versions (1..60)
      const countBefore = await versionRepo.countVersions(PROJECT_ID);
      expect(countBefore).toBe(60);

      // Set up protections:
      // 1. Version 5 is the published version
      await projectRepo.updateStatus(PROJECT_ID, OWNER_ID, "live", 5);
      // 2. Version 3 was the previous published version
      await publishEventRepo.recordEvent({
        projectId: PROJECT_ID,
        versionNumber: 3,
        action: "publish",
        actorId: OWNER_ID,
        actorType: "user",
        reason: null,
      });
      // 3. Version 2 has an active, unexpired preview token
      await previewRepo.createToken("hash_for_v2", PROJECT_ID, 2, 3600);

      // Prune policy:
      // Current version = 60.
      // Recent 50 kept: 11..60.
      // Candidates for deletion: 1..10.
      // Protected: v2 (preview), v3 (previous published), v5 (currently published).
      // Deleted should be: v1, v4, v6, v7, v8, v9, v10. (7 versions)

      const deletedCount = await versionService.pruneVersionsBestEffort(PROJECT_ID, 5, 60);
      expect(deletedCount).toBe(7);

      // Verify protected versions still exist!
      expect(await versionRepo.get(PROJECT_ID, 2)).not.toBeNull(); // Protected by preview
      expect(await versionRepo.get(PROJECT_ID, 3)).not.toBeNull(); // Protected by previous published
      expect(await versionRepo.get(PROJECT_ID, 5)).not.toBeNull(); // Protected by currently published

      // Verify pruned versions are gone
      expect(await versionRepo.get(PROJECT_ID, 1)).toBeNull();
      expect(await versionRepo.get(PROJECT_ID, 4)).toBeNull();
      expect(await versionRepo.get(PROJECT_ID, 6)).toBeNull();
    });
  });
});
