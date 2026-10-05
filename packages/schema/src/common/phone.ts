import { z } from "zod";

/**
 * Normalizes phone numbers to standard E.164 format.
 *
 * Rules:
 * 1. Accepts Nigerian mobile numbers in common formats:
 *    - Local 11-digit format starting with 0 (e.g., 08031234567) -> +2348031234567
 *    - 13-digit format starting with 234 (e.g., 2348031234567) -> +2348031234567
 *    - Full international starting with +234 (e.g., +2348031234567) -> +2348031234567
 *    - Accommodates formatting noise (spaces, dashes, parentheses, or +234 (0) 803...)
 * 2. Accepts valid international E.164 numbers (+[1-9]\d{6,14}).
 */
export function normalizePhone(
  raw: string,
): { valid: true; e164: string } | { valid: false; error: string } {
  if (typeof raw !== "string") {
    return { valid: false, error: "Phone number must be a string" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number cannot be empty" };
  }

  // Preserve leading '+' if present
  const hasLeadingPlus = trimmed.startsWith("+");

  // Remove common phone separators: spaces, hyphens, dots, parentheses
  let cleaned = trimmed.replace(/[\s\-().]/g, "");

  // Handle +2340... pattern (e.g. +234 (0) 803...)
  if (cleaned.startsWith("+2340") && cleaned.length === 15) {
    cleaned = "+234" + cleaned.slice(5);
  } else if (cleaned.startsWith("2340") && cleaned.length === 14) {
    cleaned = "234" + cleaned.slice(4);
  }

  // Check Nigerian local format (0 followed by 10 digits, e.g., 08031234567)
  if (/^0\d{10}$/.test(cleaned)) {
    return { valid: true, e164: `+234${cleaned.slice(1)}` };
  }

  // Check Nigerian 234 format without + (234 followed by 10 digits)
  if (/^234\d{10}$/.test(cleaned)) {
    return { valid: true, e164: `+${cleaned}` };
  }

  // Check Nigerian +234 format (+234 followed by 10 digits)
  if (/^\+234\d{10}$/.test(cleaned)) {
    return { valid: true, e164: cleaned };
  }

  // Check international format starting with +
  const internationalCandidate = hasLeadingPlus ? cleaned : `+${cleaned}`;
  if (/^\+[1-9]\d{6,14}$/.test(internationalCandidate)) {
    return { valid: true, e164: internationalCandidate };
  }

  return {
    valid: false,
    error: `Invalid phone number format: "${raw}". Must be a valid Nigerian number (e.g. 0803..., +234803...) or international E.164 number.`,
  };
}

/**
 * Normalizes phone or throws an error.
 */
export function normalizePhoneOrThrow(raw: string): string {
  const result = normalizePhone(raw);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return result.e164;
}

/**
 * Builds a safe, encoded wa.me link.
 * wa.me requires digits only in international format without leading '+'.
 */
export function buildWhatsAppLink(phone: string, defaultMessage?: string): string {
  const normalized = normalizePhoneOrThrow(phone);
  const digitsOnly = normalized.replace(/^\+/, "");

  if (!defaultMessage || !defaultMessage.trim()) {
    return `https://wa.me/${digitsOnly}`;
  }

  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(defaultMessage.trim())}`;
}

/**
 * Zod schema for validated, normalized E.164 phone numbers.
 */
export const PhoneNumberSchema = z
  .string()
  .trim()
  .transform((val, ctx) => {
    const result = normalizePhone(val);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
      });
      return z.NEVER;
    }
    return result.e164;
  });
