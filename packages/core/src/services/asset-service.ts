import { Asset, AssetMimeType } from "../domain/types.js";
import { AssetRepository, StorageService } from "../repositories/interfaces.js";
import { parseAndValidateImage } from "./image-parser.js";
import { NotFoundError } from "../domain/errors.js";

function getExtensionForMimeType(mimeType: AssetMimeType): string {
  switch (mimeType) {
    case "image/webp":
      return "webp";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
  }
}

export class AssetService {
  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly storage: StorageService
  ) {}

  /**
   * Uploads and stores a new image asset.
   * Content-addressed by SHA-256 hash. If this owner already registered this hash,
   * returns the existing record. If another owner uploaded the same hash, R2 storage is shared.
   */
  async uploadAsset(ownerId: string, data: Uint8Array): Promise<Asset> {
    const parsed = await parseAndValidateImage(data);
    const ext = getExtensionForMimeType(parsed.mimeType);
    const r2Key = `assets/${parsed.hash}.${ext}`;

    // Check if this owner already uploaded this exact file
    const existing = await this.assetRepo.getByOwnerAndHash(ownerId, parsed.hash);
    if (existing) {
      return existing;
    }

    // Write to R2 only if not already stored
    const alreadyStored = await this.storage.hasAsset(r2Key);
    if (!alreadyStored) {
      await this.storage.writeAsset(r2Key, data, parsed.mimeType);
    }

    // Create DB reference for this owner
    const assetId = `asset_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    return this.assetRepo.create({
      id: assetId,
      ownerId,
      hash: parsed.hash,
      r2Key,
      sizeBytes: parsed.sizeBytes,
      mimeType: parsed.mimeType,
      width: parsed.width,
      height: parsed.height,
    });
  }

  async getAsset(id: string, ownerId: string): Promise<Asset | null> {
    const asset = await this.assetRepo.getById(id, ownerId);
    return asset;
  }

  async listAssets(ownerId: string): Promise<Asset[]> {
    return this.assetRepo.listByOwner(ownerId);
  }

  /**
   * Deletes an asset record.
   * If no other asset rows reference the underlying content hash, deletes from R2.
   */
  async deleteAsset(id: string, ownerId: string): Promise<boolean> {
    const asset = await this.assetRepo.getById(id, ownerId);
    if (!asset) {
      throw new NotFoundError("Asset", id);
    }

    const deleted = await this.assetRepo.delete(id, ownerId);
    if (deleted) {
      const remainingRefs = await this.assetRepo.countReferencesByHash(asset.hash);
      if (remainingRefs === 0) {
        await this.storage.deleteAsset(asset.r2Key);
      }
    }
    return deleted;
  }
}
