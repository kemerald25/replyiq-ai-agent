import sharp from "sharp";

export const MAX_INPUT_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB cap on raw asset
export const MAX_IMAGE_EDGE_PX = 1600; // 1600 px max edge
export const WEBP_QUALITY = 80;

export interface ProcessedAsset {
  buffer: Buffer;
  base64: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: "image/webp";
}

export class MediaProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaProcessingError";
  }
}

/**
 * Validates, strips EXIF, resizes to max edge 1600px, and transcodes images to WebP.
 * Output is guaranteed under 5 MB (typically < 1 MB).
 */
export async function processImageMedia(
  inputBuffer: Buffer,
  _mimetype?: string
): Promise<ProcessedAsset> {
  if (inputBuffer.byteLength > MAX_INPUT_ASSET_BYTES) {
    throw new MediaProcessingError(
      `Media exceeds 5 MB input limit (${(inputBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`
    );
  }

  let pipeline = sharp(inputBuffer, { failOn: "error" });

  let metadata;
  try {
    metadata = await pipeline.metadata();
    if (!metadata.format || !["jpeg", "png", "webp", "jpg"].includes(metadata.format)) {
      throw new MediaProcessingError(
        `Unsupported image format: ${metadata.format || "unknown"}. Supported: JPEG, PNG, WebP`
      );
    }
  } catch (err) {
    if (err instanceof MediaProcessingError) throw err;
    throw new MediaProcessingError(`Unsupported image format: ${(err as Error)?.message || "invalid image"}`);
  }

  // Strip EXIF metadata, resize to max 1600px bounding box, convert to WebP 80%
  pipeline = pipeline
    .rotate() // Auto-orient based on EXIF before stripping
    .resize({
      width: MAX_IMAGE_EDGE_PX,
      height: MAX_IMAGE_EDGE_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .withMetadata({ exif: {} }) // Strip EXIF & personal location data
    .webp({ quality: WEBP_QUALITY });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  if (data.byteLength > MAX_INPUT_ASSET_BYTES) {
    throw new MediaProcessingError("Processed asset exceeded 5 MB cap after compression");
  }

  return {
    buffer: data,
    base64: data.toString("base64"),
    width: info.width,
    height: info.height,
    sizeBytes: data.byteLength,
    mimeType: "image/webp",
  };
}
