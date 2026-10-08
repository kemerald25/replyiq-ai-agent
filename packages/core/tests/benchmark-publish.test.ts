import { describe, it, expect } from "vitest";
import { stressSample } from "@replyiq/templates";
import {
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPublishEventRepository,
  InMemoryAssetRepository,
  InMemoryStorageService,
  PublishService,
  extractReferencedAssetIds,
} from "../src/index.js";

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

describe("Publish Pipeline CPU Benchmark", () => {
  it("measures and reports the CPU time of rendering the maximum-content stress sample at publish", async () => {
    const projectRepo = new InMemoryProjectRepository();
    const versionRepo = new InMemoryVersionRepository(projectRepo);
    const publishEventRepo = new InMemoryPublishEventRepository();
    const assetRepo = new InMemoryAssetRepository();
    const storage = new InMemoryStorageService();
    const publishService = new PublishService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      assetRepo,
      storage,
      "replyiq.cv"
    );

    const ownerId = "owner_stress_bench";
    const projectId = "proj_stress_bench";

    // 1. Upload all referenced assets for the stress sample
    const assetIds = extractReferencedAssetIds(stressSample);
    for (const assetId of assetIds) {
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

    // 2. Create project with initial version
    const { project } = await projectRepo.createWithInitialVersion(
      {
        id: projectId,
        ownerId,
        slug: stressSample.subdomain,
        name: stressSample.metadata.title,
        template: stressSample.template,
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      stressSample,
      "system",
      "Benchmark stress test sample publish"
    );

    // Warm-up runs to ensure V8 JIT compilation and IC caches are warm
    for (let w = 0; w < 3; w++) {
      await publishService.publish(project.id, ownerId, 1);
    }

    // Measured iterations
    const iterations = 10;
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const res = await publishService.publish(project.id, ownerId, 1);
      times.push(res.renderCpuMs);
    }

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const avgTime = Number((times.reduce((a, b) => a + b, 0) / iterations).toFixed(3));

    console.log("\n=======================================================");
    console.log("MAXIMUM-CONTENT STRESS SAMPLE RENDERING BENCHMARK:");
    console.log(`  Document Sections : ${stressSample.sections.length} (Max allowed: 20)`);
    console.log(`  Referenced Assets : ${assetIds.length}`);
    console.log(`  Average CPU Time  : ${avgTime} ms`);
    console.log(`  Min CPU Time      : ${minTime} ms`);
    console.log(`  Max CPU Time      : ${maxTime} ms`);
    console.log("=======================================================\n");

    expect(avgTime).toBeLessThan(50); // Well below publish budget
  });
});
