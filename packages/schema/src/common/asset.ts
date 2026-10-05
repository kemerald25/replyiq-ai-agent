import { z } from "zod";
import { safeTextSchema } from "./text-safety.js";

/**
 * Asset IDs must follow the format "asset_<alphanumeric-identifier>".
 * Arbitrary external image URLs are strictly forbidden in SiteDocument.
 */
export const ASSET_ID_REGEX = /^asset_[a-zA-Z0-9_-]{4,64}$/;

export const AssetIdSchema = z
  .string()
  .trim()
  .regex(
    ASSET_ID_REGEX,
    "Images must be referenced by Asset ID ('asset_<identifier>'), never by arbitrary URL",
  );

export const ImageAssetSchema = z.object({
  assetId: AssetIdSchema,
  alt: safeTextSchema({ minLength: 1, maxLength: 120, allowMultiline: false }),
  caption: safeTextSchema({ minLength: 1, maxLength: 160, allowMultiline: false }).optional(),
});

export type ImageAsset = z.infer<typeof ImageAssetSchema>;
