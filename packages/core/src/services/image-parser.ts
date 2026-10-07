import { AssetMimeType } from "../domain/types.js";
import { AssetValidationError } from "../domain/errors.js";

export const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_DIMENSION = 4096; // 4096 px
export const MAX_TOTAL_PIXELS = 12_582_912; // 12 MP (e.g. 4096 x 3072)

export interface ParsedImageInfo {
  mimeType: AssetMimeType;
  width: number;
  height: number;
  sizeBytes: number;
  hash: string;
}

/**
 * Computes SHA-256 hash of a byte array as a hex string.
 * Uses Web Crypto API (crypto.subtle).
 */
export async function computeSha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parses PNG dimensions from header.
 */
function parsePngDimensions(data: Uint8Array): { width: number; height: number } {
  if (data.length < 24) {
    throw new AssetValidationError("PNG file truncated or corrupt");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

/**
 * Parses JPEG dimensions by walking markers to the Start-of-Frame (SOF).
 */
function parseJpegDimensions(data: Uint8Array): { width: number; height: number } {
  let offset = 2;
  const len = data.length;

  while (offset < len) {
    if (data[offset] !== 0xff) {
      offset++;
      continue;
    }

    while (offset < len && data[offset] === 0xff) {
      offset++;
    }

    if (offset >= len) break;
    const marker = data[offset++];
    if (marker === undefined) break;

    // SOF markers (baseline, progressive, extended)
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof) {
      if (offset + 7 > len) {
        throw new AssetValidationError("JPEG file truncated in SOF marker");
      }
      const view = new DataView(data.buffer, data.byteOffset + offset, 7);
      const height = view.getUint16(3, false);
      const width = view.getUint16(5, false);
      return { width, height };
    }

    // Stop at Start-of-Scan (SOS) or End-of-Image (EOI)
    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    // Skip variable-length marker payload
    if (offset + 2 > len) break;
    const view = new DataView(data.buffer, data.byteOffset + offset, 2);
    const markerLength = view.getUint16(0, false);
    offset += markerLength;
  }

  throw new AssetValidationError("Could not find SOF marker in JPEG file");
}

/**
 * Parses WebP dimensions for VP8, VP8L, and VP8X chunks.
 */
function parseWebpDimensions(data: Uint8Array): { width: number; height: number } {
  if (data.length < 30) {
    throw new AssetValidationError("WebP file truncated or corrupt");
  }

  const chunkType = String.fromCharCode(...data.slice(12, 16));

  if (chunkType === "VP8 ") {
    // Lossy VP8
    const b0 = data[26] ?? 0;
    const b1 = data[27] ?? 0;
    const b2 = data[28] ?? 0;
    const b3 = data[29] ?? 0;
    const width = (b0 | (b1 << 8)) & 0x3fff;
    const height = (b2 | (b3 << 8)) & 0x3fff;
    return { width, height };
  } else if (chunkType === "VP8L") {
    // Lossless VP8L
    const b0 = data[21] ?? 0;
    const b1 = data[22] ?? 0;
    const b2 = data[23] ?? 0;
    const b3 = data[24] ?? 0;
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  } else if (chunkType === "VP8X") {
    // Extended VP8X
    const b0 = data[24] ?? 0;
    const b1 = data[25] ?? 0;
    const b2 = data[26] ?? 0;
    const b3 = data[27] ?? 0;
    const b4 = data[28] ?? 0;
    const b5 = data[29] ?? 0;
    const width = 1 + (b0 | (b1 << 8) | (b2 << 16));
    const height = 1 + (b3 | (b4 << 8) | (b5 << 16));
    return { width, height };
  }

  throw new AssetValidationError(`Unsupported WebP format chunk: ${chunkType}`);
}

/**
 * Strictly parses and validates an image buffer.
 *
 * Rules:
 * 1. Must not exceed 5 MB size cap.
 * 2. Magic bytes check: strictly WebP, JPEG, or PNG only.
 * 3. Explicitly rejects SVG, HTML, scripts, and any other types.
 * 4. Extracts dimensions; caps at 4096px and 16,777,216 total pixels.
 * 5. Returns SHA-256 hash and parsed metadata.
 */
export async function parseAndValidateImage(data: Uint8Array): Promise<ParsedImageInfo> {
  if (!data || data.length === 0) {
    throw new AssetValidationError("Image buffer is empty");
  }

  if (data.length > MAX_ASSET_SIZE_BYTES) {
    throw new AssetValidationError(
      `Image size (${(data.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of 5 MB`
    );
  }

  // Pre-check for SVG / text signatures
  const headerPreview = String.fromCharCode(...data.slice(0, Math.min(data.length, 128))).toLowerCase();
  if (
    headerPreview.includes("<svg") ||
    headerPreview.includes("<?xml") ||
    headerPreview.includes("<!doctype html") ||
    headerPreview.includes("<html")
  ) {
    throw new AssetValidationError("SVG and HTML vector formats are strictly forbidden for security");
  }

  let mimeType: AssetMimeType;
  let dimensions: { width: number; height: number };

  // 1. PNG Check: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    mimeType = "image/png";
    dimensions = parsePngDimensions(data);
  }
  // 2. JPEG Check: 0xFF 0xD8 0xFF
  else if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    mimeType = "image/jpeg";
    dimensions = parseJpegDimensions(data);
  }
  // 3. WebP Check: 'RIFF' .... 'WEBP'
  else if (
    data.length >= 12 &&
    data[0] === 0x52 && // R
    data[1] === 0x49 && // I
    data[2] === 0x46 && // F
    data[3] === 0x46 && // F
    data[8] === 0x57 && // W
    data[9] === 0x45 && // E
    data[10] === 0x42 && // B
    data[11] === 0x50 // P
  ) {
    mimeType = "image/webp";
    dimensions = parseWebpDimensions(data);
  } else {
    throw new AssetValidationError(
      "Unsupported file format. Only WebP, JPEG, and PNG images are permitted"
    );
  }

  const { width, height } = dimensions;

  if (width <= 0 || height <= 0) {
    throw new AssetValidationError(`Invalid image dimensions: ${width}x${height}`);
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new AssetValidationError(
      `Image dimensions (${width}x${height}) exceed maximum allowed dimension of ${MAX_IMAGE_DIMENSION}px`
    );
  }

  const totalPixels = width * height;
  if (totalPixels > MAX_TOTAL_PIXELS) {
    throw new AssetValidationError(
      `Total pixel count (${totalPixels.toLocaleString()}) exceeds limit of ${MAX_TOTAL_PIXELS.toLocaleString()} pixels`
    );
  }

  const hash = await computeSha256Hex(data);

  return {
    mimeType,
    width,
    height,
    sizeBytes: data.length,
    hash,
  };
}
