import { z } from "zod";

/**
 * Validates that a link URL is restricted exclusively to https:// or wa.me/ protocols.
 * Strictly rejects http://, javascript:, data:, file:, ftp:, etc.
 */
export function validateSafeUrl(
  url: string,
): { valid: true; normalized: string } | { valid: false; error: string } {
  const trimmed = url.trim();

  // Reject dangerous pseudo-protocols explicitly
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return {
      valid: false,
      error: "Dangerous URL schemes (javascript:, data:) are strictly forbidden",
    };
  }

  // Reject insecure http://
  if (lower.startsWith("http://")) {
    return {
      valid: false,
      error: "Insecure http:// links are forbidden. Only https:// or wa.me links are allowed",
    };
  }

  // Check for allowed forms:
  // 1. "https://..."
  // 2. "https://wa.me/..."
  // 3. "wa.me/..."
  if (trimmed.startsWith("https://") || trimmed.startsWith("wa.me/")) {
    try {
      const parsed = new URL(trimmed.startsWith("wa.me/") ? `https://${trimmed}` : trimmed);
      return { valid: true, normalized: parsed.toString() };
    } catch {
      return { valid: false, error: "Malformed URL" };
    }
  }

  return {
    valid: false,
    error: "URL must begin with https:// or wa.me/",
  };
}

export const SafeUrlSchema = z
  .string()
  .trim()
  .min(5)
  .max(500)
  .refine(
    (url) => validateSafeUrl(url).valid,
    (url) => {
      const res = validateSafeUrl(url);
      return { message: res.valid ? "Invalid URL" : res.error };
    },
  );
