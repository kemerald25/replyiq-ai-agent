import { describe, it, expect, beforeEach } from "vitest";
import {
  AssetService,
  InMemoryAssetRepository,
  InMemoryStorageService,
  NotFoundError,
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

describe("AssetService", () => {
  let assetRepo: InMemoryAssetRepository;
  let storage: InMemoryStorageService;
  let assetService: AssetService;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    storage = new InMemoryStorageService();
    assetService = new AssetService(assetRepo, storage);
  });

  it("uploads an image and writes to R2", async () => {
    const png = createSyntheticPng(640, 480);
    const asset = await assetService.uploadAsset("owner_1", png);

    expect(asset.id).toBeDefined();
    expect(asset.ownerId).toBe("owner_1");
    expect(asset.width).toBe(640);
    expect(asset.height).toBe(480);
    expect(asset.mimeType).toBe("image/png");

    const inStorage = await storage.hasAsset(asset.r2Key);
    expect(inStorage).toBe(true);
  });

  it("deduplicates asset uploads for the same owner and content hash", async () => {
    const png = createSyntheticPng(640, 480);
    const asset1 = await assetService.uploadAsset("owner_1", png);
    const asset2 = await assetService.uploadAsset("owner_1", png);

    expect(asset1.id).toBe(asset2.id);
  });

  it("shares R2 storage key across owners but creates separate owner asset records", async () => {
    const png = createSyntheticPng(800, 600);
    const assetA = await assetService.uploadAsset("owner_A", png);
    const assetB = await assetService.uploadAsset("owner_B", png);

    expect(assetA.r2Key).toBe(assetB.r2Key);
    expect(assetA.id).not.toBe(assetB.id);
    expect(assetA.ownerId).toBe("owner_A");
    expect(assetB.ownerId).toBe("owner_B");
  });

  it("retrieves asset by id and owner", async () => {
    const png = createSyntheticPng(100, 100);
    const created = await assetService.uploadAsset("owner_1", png);

    const retrieved = await assetService.getAsset(created.id, "owner_1");
    expect(retrieved?.id).toBe(created.id);

    const otherOwner = await assetService.getAsset(created.id, "owner_2");
    expect(otherOwner).toBeNull();
  });

  it("lists all assets for an owner", async () => {
    const png1 = createSyntheticPng(100, 100);
    const png2 = createSyntheticPng(200, 200);

    await assetService.uploadAsset("owner_1", png1);
    await assetService.uploadAsset("owner_1", png2);
    await assetService.uploadAsset("owner_2", png1);

    const owner1Assets = await assetService.listAssets("owner_1");
    expect(owner1Assets).toHaveLength(2);

    const owner2Assets = await assetService.listAssets("owner_2");
    expect(owner2Assets).toHaveLength(1);
  });

  it("deletes R2 object only when no rows reference the hash", async () => {
    const png = createSyntheticPng(300, 300);
    const assetA = await assetService.uploadAsset("owner_A", png);
    const assetB = await assetService.uploadAsset("owner_B", png);

    // Delete owner A's asset
    const deletedA = await assetService.deleteAsset(assetA.id, "owner_A");
    expect(deletedA).toBe(true);

    // R2 object must STILL exist because owner B references it!
    expect(await storage.hasAsset(assetA.r2Key)).toBe(true);

    // Delete owner B's asset
    const deletedB = await assetService.deleteAsset(assetB.id, "owner_B");
    expect(deletedB).toBe(true);

    // Now R2 object is deleted because reference count reached 0
    expect(await storage.hasAsset(assetA.r2Key)).toBe(false);
  });

  it("throws NotFoundError when deleting a non-existent asset", async () => {
    await expect(assetService.deleteAsset("asset_missing", "owner_1")).rejects.toThrow(
      NotFoundError
    );
  });
});
