/**
 * Pure Web-safe media inspection for Telegram uploads (Zero Node sharp bindings).
 */

export interface ImageValidationResult {
  valid: boolean;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  error?: string;
}

export const MAX_RAW_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PROCESSED_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates image buffer using magic bytes without third-party binary libraries.
 */
export function validateImageMagicBytes(bytes: Uint8Array): ImageValidationResult {
  if (!bytes || bytes.length < 12) {
    return { valid: false, error: "Image payload is too small or truncated" };
  }

  if (bytes.length > MAX_RAW_MEDIA_BYTES) {
    return { valid: false, error: "Image file exceeds maximum allowable size of 10 MB" };
  }

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png" };
  }

  // 3. WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return { valid: true, mimeType: "image/webp" };
  }

  return {
    valid: false,
    error: "Unsupported image format. Only JPEG, PNG, and WebP are allowed.",
  };
}
