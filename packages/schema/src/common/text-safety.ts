import { z } from "zod";

/**
 * Matches tag-like patterns: a '<' directly followed by a letter, '/' or '!'.
 * Examples rejected: <script>, <div>, </div>, <!DOCTYPE>, <!-- comment -->
 * Examples allowed: "3 < 5", "x < y"
 */
export const TAG_LIKE_PATTERN = /<[a-zA-Z/!]/;

/**
 * Disallowed control characters:
 * C0 controls (excluding \t U+0009, \n U+000A, \r U+000D),
 * Delete (U+007F), and C1 controls (U+0080 through U+009F).
 */
// eslint-disable-next-line no-control-regex
export const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

/**
 * Bidirectional override and isolate characters:
 * U+202A (LRE), U+202B (RLE), U+202C (PDF), U+202D (LRO), U+202E (RLO),
 * U+2066 (LRI), U+2067 (RLI), U+2068 (FSI), U+2069 (PDI).
 */
export const BIDI_OVERRIDE_PATTERN = /[\u202A-\u202E\u2066-\u2069]/;

export interface SafeTextOptions {
  minLength?: number;
  maxLength: number;
  allowMultiline?: boolean;
}

/**
 * Validates a string to ensure:
 * 1. No HTML tag-like patterns (<tag, </tag, <!tag)
 * 2. No control characters
 * 3. No bidirectional override characters
 * 4. Respects min/max length
 * 5. Rejects newlines if allowMultiline is false
 */
export function validateSafeText(
  value: string,
  options: SafeTextOptions,
): { valid: true } | { valid: false; error: string } {
  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      valid: false,
      error: `Text must be at least ${options.minLength} characters (received ${value.length})`,
    };
  }

  if (value.length > options.maxLength) {
    return {
      valid: false,
      error: `Text must not exceed ${options.maxLength} characters (received ${value.length})`,
    };
  }

  if (TAG_LIKE_PATTERN.test(value)) {
    return {
      valid: false,
      error: "HTML tags or tag-like patterns (<tag, </tag, <!) are not permitted in plain text",
    };
  }

  if (CONTROL_CHARS_PATTERN.test(value)) {
    return {
      valid: false,
      error: "Control characters are not permitted",
    };
  }

  if (BIDI_OVERRIDE_PATTERN.test(value)) {
    return {
      valid: false,
      error: "Bidirectional override characters are not permitted",
    };
  }

  if (!options.allowMultiline && /[\r\n]/.test(value)) {
    return {
      valid: false,
      error: "Multiline text (newlines) is not permitted in this field",
    };
  }

  return { valid: true };
}

/**
 * Zod helper for creating safe, plain-text string schemas.
 */
export function safeTextSchema(
  options: SafeTextOptions,
): z.ZodEffects<z.ZodString, string, string> {
  let base = z.string().trim();
  if (options.minLength !== undefined) {
    base = base.min(options.minLength);
  }
  base = base.max(options.maxLength);

  return base.refine(
    (val) => {
      const res = validateSafeText(val, options);
      return res.valid;
    },
    (val) => {
      const res = validateSafeText(val, options);
      return {
        message: res.valid ? "Invalid text" : res.error,
      };
    },
  );
}
