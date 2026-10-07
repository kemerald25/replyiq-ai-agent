/**
 * Sanitizer for user messages and document content to guard against prompt injection.
 * Strips common LLM control tokens and tag delimiters before prompt construction.
 */

const INJECTION_DELIMITERS = [
  /<\/?system>/gi,
  /\[\/?inst\]/gi,
  /<<\/?sys>>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|endoftext\|>/gi,
  /<\/?user_message>/gi,
  /<\/?site_summary>/gi,
  /<\/?instructions>/gi,
  /```(?:system|injection)/gi,
];

export const MAX_USER_MESSAGE_LENGTH = 1_000;

/**
 * Sanitizes untrusted user text before embedding into model messages.
 */
export function sanitizeUserText(rawText: string): string {
  if (!rawText) return "";

  // 1. Cap maximum length
  let cleaned = rawText.slice(0, MAX_USER_MESSAGE_LENGTH);

  // 2. Strip LLM control sequences and delimiter tags
  for (const regex of INJECTION_DELIMITERS) {
    cleaned = cleaned.replace(regex, "");
  }

  // 3. Remove null bytes or non-printable control characters (except newline and tab)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return cleaned.trim();
}

/**
 * Sanitizes text coming from existing site documents before inclusion in prompt summaries.
 */
export function sanitizeDocumentText(text: string): string {
  if (!text) return "";
  let cleaned = text;
  for (const regex of INJECTION_DELIMITERS) {
    cleaned = cleaned.replace(regex, "");
  }
  return cleaned;
}
