#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { getPlatformProxy } from "wrangler";
import {
  allSampleDocuments,
} from "@replyiq/templates";
import {
  D1OwnerRepository,
  D1ProjectRepository,
  D1AssetRepository,
} from "@replyiq/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrationsIfPending(db: any, migrationSql: string): Promise<void> {
  const statements = migrationSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await db.prepare(stmt).run();
    } catch (err: any) {
      if (!err.message?.includes("already exists")) {
        throw err;
      }
    }
  }
}

async function main() {
  console.log("Seeding ReplyIQ Agent database...");
  const configPath = path.resolve(__dirname, "../wrangler.jsonc");
  const migrationPath = path.resolve(__dirname, "../../../packages/core/migrations/0001_initial.sql");

  const migrationSql = await fs.readFile(migrationPath, "utf-8");

  const proxy = await getPlatformProxy<{
    DB: D1Database;
    SITES_BUCKET: R2Bucket;
    ASSETS_BUCKET: R2Bucket;
  }>({
    configPath,
    persist: { path: path.resolve(__dirname, "../.wrangler/state/v3") },
  });

  try {
    await runMigrationsIfPending(proxy.env.DB, migrationSql);

    const ownerRepo = new D1OwnerRepository(proxy.env.DB);
    const projectRepo = new D1ProjectRepository(proxy.env.DB);
    const assetRepo = new D1AssetRepository(proxy.env.DB);

    const phone = "+2348012345678";
    const ownerId = "owner_2348012345678";

    let owner = await ownerRepo.getByPhoneNumber(phone);
    if (!owner) {
      owner = await ownerRepo.create({
        id: ownerId,
        phoneNumber: phone,
        displayName: "Amaka Hair Studio",
      });
      console.log(`Created test owner: ${owner.id} (${owner.phoneNumber})`);
    }

    // Seed test hero asset
    const existingAsset = await assetRepo.getById("asset_salon_hero", ownerId);
    if (!existingAsset) {
      await assetRepo.create({
        id: "asset_salon_hero",
        ownerId,
        hash: "hash_hero_1",
        r2Key: "assets/asset_salon_hero.jpg",
        sizeBytes: 1024,
        mimeType: "image/jpeg",
        width: 800,
        height: 600,
      });
      console.log("Seeded test asset: asset_salon_hero");
    }

    const existingProject = await projectRepo.getBySlug("amaka-luxe");
    if (!existingProject) {
      await projectRepo.createWithInitialVersion(
        {
          id: "proj_amaka_luxe",
          ownerId,
          slug: "amaka-luxe",
          name: "Amaka Luxe Salon",
          template: "portfolio",
          status: "draft",
          currentVersion: 1,
          publishedVersion: null,
          suspendedReason: null,
          deletedAt: null,
        },
        allSampleDocuments.salon,
        "user",
        "Seeded test salon website"
      );
      console.log("Seeded test project: amaka-luxe (Version 1)");
    } else {
      console.log("Project 'amaka-luxe' already exists.");
    }

    console.log("✅ Seed completed successfully!");
  } finally {
    await proxy.dispose();
  }
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
