import { describe, it, expect, beforeEach } from "vitest";
import { createSqliteD1Database, applyInitialMigration } from "./sqlite-d1-bridge.js";
import {
  D1OwnerRepository,
  D1ProjectRepository,
  D1VersionRepository,
  D1AssetRepository,
} from "../src/adapters/cloudflare/index.js";
import { SiteDocument } from "@replyiq/schema";
import { VersionConflictError, SlugUnavailableError } from "../src/domain/errors.js";

const mockDoc: SiteDocument = {
  schemaVersion: 1,
  subdomain: "test-biz",
  template: "portfolio",
  metadata: {
    title: "Test Business",
    description: "Testing business site",
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
      heading: "Welcome to Test Business",
      subheading: "Quality services delivered on time.",
    },
  ],
};

describe("Real SQLite & D1 Adapter Integration Tests", () => {
  let db: ReturnType<typeof createSqliteD1Database>;
  let ownerRepo: D1OwnerRepository;
  let projectRepo: D1ProjectRepository;
  let versionRepo: D1VersionRepository;
  let assetRepo: D1AssetRepository;

  beforeEach(() => {
    db = createSqliteD1Database();
    applyInitialMigration(db);
    ownerRepo = new D1OwnerRepository(db);
    projectRepo = new D1ProjectRepository(db);
    versionRepo = new D1VersionRepository(db);
    assetRepo = new D1AssetRepository(db);
  });

  describe("Migrations and Schema Constraints", () => {
    it("enforces unique phone numbers for owners", async () => {
      await ownerRepo.create({
        id: "owner_1",
        phoneNumber: "+2348012345678",
        displayName: "First Owner",
      });

      // Inserting duplicate phone number must fail SQLite UNIQUE constraint
      await expect(
        ownerRepo.create({
          id: "owner_2",
          phoneNumber: "+2348012345678",
          displayName: "Second Owner",
        })
      ).rejects.toThrow();
    });

    it("enforces unique (owner_id, hash) on assets", async () => {
      await ownerRepo.create({
        id: "owner_1",
        phoneNumber: "+2348011111111",
        displayName: "Asset Owner 1",
      });
      await ownerRepo.create({
        id: "owner_2",
        phoneNumber: "+2348022222222",
        displayName: "Asset Owner 2",
      });

      const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

      // Owner 1 creates asset
      await assetRepo.create({
        id: "asset_1",
        ownerId: "owner_1",
        hash,
        r2Key: `assets/${hash}.webp`,
        sizeBytes: 1024,
        mimeType: "image/webp",
        width: 800,
        height: 600,
      });

      // Owner 2 CAN create the same hash (shared R2, separate owner rows)
      const asset2 = await assetRepo.create({
        id: "asset_2",
        ownerId: "owner_2",
        hash,
        r2Key: `assets/${hash}.webp`,
        sizeBytes: 1024,
        mimeType: "image/webp",
        width: 800,
        height: 600,
      });
      expect(asset2.id).toBe("asset_2");

      // But Owner 1 inserting the duplicate hash again violates UNIQUE(owner_id, hash)
      await expect(
        assetRepo.create({
          id: "asset_3",
          ownerId: "owner_1",
          hash,
          r2Key: `assets/${hash}.webp`,
          sizeBytes: 1024,
          mimeType: "image/webp",
          width: 800,
          height: 600,
        })
      ).rejects.toThrow();
    });
  });

  describe("Slug Uniqueness and 30-Day Deletion Cooldown", () => {
    it("enforces unique slugs at DB level and blocks reuse during cooldown", async () => {
      await ownerRepo.create({
        id: "owner_1",
        phoneNumber: "+2348033333333",
        displayName: "Owner",
      });

      // Create project with slug "my-brand"
      const { project } = await projectRepo.createWithInitialVersion(
        {
          id: "proj_1",
          ownerId: "owner_1",
          slug: "my-brand",
          name: "My Brand",
          template: "portfolio",
          status: "draft",
          currentVersion: 1,
          publishedVersion: null,
          suspendedReason: null,
          deletedAt: null,
        },
        mockDoc,
        "user"
      );
      expect(project.slug).toBe("my-brand");

      // Attempting to create duplicate slug fails
      await expect(
        projectRepo.createWithInitialVersion(
          {
            id: "proj_2",
            ownerId: "owner_1",
            slug: "my-brand",
            name: "Duplicate Brand",
            template: "portfolio",
            status: "draft",
            currentVersion: 1,
            publishedVersion: null,
            suspendedReason: null,
            deletedAt: null,
          },
          mockDoc,
          "user"
        )
      ).rejects.toThrow(SlugUnavailableError);

      // Soft-delete project 1
      await projectRepo.softDelete("proj_1", "owner_1");

      // Immediately after deletion, slug is STILL unavailable due to 30-day cooldown
      await expect(
        projectRepo.isSlugAvailable("my-brand")
      ).resolves.toBe(false);

      await expect(
        projectRepo.createWithInitialVersion(
          {
            id: "proj_3",
            ownerId: "owner_1",
            slug: "my-brand",
            name: "Hijack Brand",
            template: "portfolio",
            status: "draft",
            currentVersion: 1,
            publishedVersion: null,
            suspendedReason: null,
            deletedAt: null,
          },
          mockDoc,
          "user"
        )
      ).rejects.toThrow(SlugUnavailableError);
    });

    it("rejects schema-reserved slugs independently of database records", async () => {
      await expect(projectRepo.isSlugAvailable("preview")).resolves.toBe(false);
      await expect(projectRepo.isSlugAvailable("admin")).resolves.toBe(false);
      await expect(projectRepo.isSlugAvailable("cdn")).resolves.toBe(false);
      await expect(projectRepo.isSlugAvailable("api")).resolves.toBe(false);
    });
  });

  describe("Optimistic Concurrency & D1 Batch Multi-Statement Atomicity", () => {
    it("atomically creates project and version 1 in a single transaction", async () => {
      await ownerRepo.create({
        id: "owner_1",
        phoneNumber: "+2348044444444",
        displayName: "Owner",
      });

      const { project, version } = await projectRepo.createWithInitialVersion(
        {
          id: "proj_atom",
          ownerId: "owner_1",
          slug: "atomic-brand",
          name: "Atomic Brand",
          template: "portfolio",
          status: "draft",
          currentVersion: 1,
          publishedVersion: null,
          suspendedReason: null,
          deletedAt: null,
        },
        mockDoc,
        "user",
        "Created with atomic batch"
      );

      expect(project.currentVersion).toBe(1);
      expect(version.versionNumber).toBe(1);

      // Verify records are present in DB
      const loadedProj = await projectRepo.getById("proj_atom");
      const loadedVer = await versionRepo.get("proj_atom", 1);
      expect(loadedProj).not.toBeNull();
      expect(loadedVer).not.toBeNull();
    });

    it("enforces expected-version check and throws VersionConflictError on race", async () => {
      await ownerRepo.create({
        id: "owner_1",
        phoneNumber: "+2348055555555",
        displayName: "Owner",
      });

      await projectRepo.createWithInitialVersion(
        {
          id: "proj_race",
          ownerId: "owner_1",
          slug: "race-brand",
          name: "Race Brand",
          template: "portfolio",
          status: "draft",
          currentVersion: 1,
          publishedVersion: null,
          suspendedReason: null,
          deletedAt: null,
        },
        mockDoc,
        "user"
      );

      // Update from v1 to v2 succeeds with expectedVersion = 1
      const v2 = await versionRepo.createNextVersion(
        "proj_race",
        "owner_1",
        1, // expected version
        { ...mockDoc, metadata: { ...mockDoc.metadata, title: "Title V2" } },
        "user"
      );
      expect(v2.versionNumber).toBe(2);

      // Stale write attempting update with expectedVersion = 1 fails with VersionConflictError!
      await expect(
        versionRepo.createNextVersion(
          "proj_race",
          "owner_1",
          1, // stale expected version!
          { ...mockDoc, metadata: { ...mockDoc.metadata, title: "Conflicting V2" } },
          "user"
        )
      ).rejects.toThrow(VersionConflictError);

      // Current version remains 2
      const current = await projectRepo.getById("proj_race");
      expect(current?.currentVersion).toBe(2);
    });
  });
});
