import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { getPlatformProxy } from "wrangler";
import {
  allSampleDocuments,
  SiteDocument,
} from "@replyiq/templates";
import {
  D1OwnerRepository,
  D1ProjectRepository,
  D1VersionRepository,
  D1PublishEventRepository,
  D1AssetRepository,
  R2StorageService,
  PublishService,
  extractReferencedAssetIds,
} from "@replyiq/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSyntheticPng(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(33);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(buf.buffer);
  view.setUint32(8, 13, false);
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  buf.set([8, 2, 0, 0, 0], 24);
  return buf;
}

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
  console.log("Starting ReplyIQ local seed script...");
  const configPath = path.resolve(__dirname, "../wrangler.jsonc");
  const migrationPath = path.resolve(__dirname, "../../../packages/core/migrations/0001_initial.sql");

  const migrationSql = await fs.readFile(migrationPath, "utf-8");

  const proxy = await getPlatformProxy<{
    DB: any;
    SITES_BUCKET: any;
    ASSETS_BUCKET: any;
    BASE_DOMAIN: string;
    STAGING_OVERRIDE_ENABLED: string;
  }>({
    configPath,
    persist: { path: path.resolve(__dirname, "../../../.wrangler/state/v3") },
  });

  try {
    const { env } = proxy;
    console.log("Applying D1 migrations to local database...");
    await runMigrationsIfPending(env.DB, migrationSql);
    console.log("Migrations applied successfully.");

    const baseDomain = env.BASE_DOMAIN || "localhost";
    const ownerRepo = new D1OwnerRepository(env.DB);
    const projectRepo = new D1ProjectRepository(env.DB);
    const versionRepo = new D1VersionRepository(env.DB);
    const publishEventRepo = new D1PublishEventRepository(env.DB);
    const assetRepo = new D1AssetRepository(env.DB);
    const storage = new R2StorageService(env.SITES_BUCKET, env.ASSETS_BUCKET);
    const publishService = new PublishService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      assetRepo,
      storage,
      baseDomain
    );

    const sampleEntries: Array<[string, SiteDocument]> = Object.entries(allSampleDocuments);

    console.log(`\nSeeding ${sampleEntries.length} sample sites...\n`);
    const benchmarkResults: Record<string, number> = {};

    for (let i = 0; i < sampleEntries.length; i++) {
      const entry = sampleEntries[i];
      if (!entry) continue;
      const [key, doc] = entry;
      const slug = doc.subdomain;
      const ownerId = `owner_${key}`;
      const projectId = `proj_${key}`;

      // 1. Ensure Owner
      let owner = await ownerRepo.getById(ownerId);
      if (!owner) {
        owner = await ownerRepo.create({
          id: ownerId,
          phoneNumber: `+23480000000${i + 1}`.slice(0, 14),
          displayName: `${key.toUpperCase()} Sample Owner`,
        });
      }

      // 2. Upload referenced assets
      const assetIds = extractReferencedAssetIds(doc);
      for (const assetId of assetIds) {
        const existing = await assetRepo.getById(assetId, ownerId);
        if (!existing) {
          const fakeImage = createSyntheticPng(800, 600);
          await storage.writeAsset(`assets/${assetId}.png`, fakeImage, "image/png");
          await assetRepo.create({
            id: assetId,
            ownerId,
            hash: `hash_${assetId}`,
            r2Key: `assets/${assetId}.png`,
            sizeBytes: fakeImage.length,
            mimeType: "image/png",
            width: 800,
            height: 600,
          });
        }
      }

      // 3. Create or get Project
      let project = await projectRepo.getBySlug(slug);
      if (!project) {
        const created = await projectRepo.createWithInitialVersion(
          {
            id: projectId,
            ownerId,
            slug,
            name: doc.metadata.title,
            template: doc.template,
            status: "draft",
            currentVersion: 1,
            publishedVersion: null,
            suspendedReason: null,
            deletedAt: null,
          },
          doc,
          "system",
          `Initial seed of ${key} sample`
        );
        project = created.project;
      }

      // 4. Publish
      const publishRes = await publishService.publish(project.id, ownerId, 1);
      benchmarkResults[key] = publishRes.renderCpuMs;

      console.log(`  ✓ Seeded & Published [${key}]:`);
      console.log(`    Slug: ${slug}`);
      console.log(`    Direct URL: http://${slug}.${baseDomain}:8787`);
      console.log(`    Staging URL: http://${baseDomain}:8787/site/${slug}`);
      console.log(`    Render CPU Time: ${publishRes.renderCpuMs} ms\n`);
    }

    console.log("=".repeat(60));
    console.log("BENCHMARK & CPU RENDERING SUMMARY:");
    for (const [key, ms] of Object.entries(benchmarkResults)) {
      console.log(`  ${key.padEnd(12)}: ${ms} ms`);
    }
    console.log("=".repeat(60));
    console.log(
      `\nMaximum-Content Stress Sample CPU Time: ${benchmarkResults.stress} ms (budget: < 100 ms at publish)`
    );
    console.log("\nAll sample sites seeded successfully!");
  } finally {
    await proxy.dispose();
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
