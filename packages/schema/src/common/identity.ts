import { z } from "zod";
import { normalizePhone } from "./phone.js";

export type OwnerIdentity =
  | { type: "phone"; key: string; e164: string }
  | { type: "lid"; key: string; lid: string }
  | { type: "telegram"; key: string; telegramId: string };

/**
 * Validates and parses an owner identity key into its typed representation.
 *
 * Accepted forms:
 * 1. Normalized E.164 phone number (e.g. "+2348012345678").
 * 2. WhatsApp LID identifier: "lid:<id>" where <id> is a non-empty alphanumeric/dash/underscore string up to 64 chars.
 * 3. Telegram user identifier: "tg:<id>" where <id> is a positive numeric string (1-32 digits).
 */
export function parseOwnerKey(
  raw: unknown
): { valid: true; identity: OwnerIdentity } | { valid: false; error: string } {
  if (typeof raw !== "string") {
    return { valid: false, error: "Owner key must be a string" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: "Owner key cannot be empty" };
  }

  // 1. Telegram identifier
  if (trimmed.startsWith("tg:")) {
    const tgPart = trimmed.slice(3).trim();
    if (!tgPart) {
      return { valid: false, error: "Telegram ID cannot be empty after 'tg:' prefix" };
    }
    if (!/^[0-9]{1,32}$/.test(tgPart)) {
      return {
        valid: false,
        error: "Invalid Telegram ID format: must be 1-32 numeric digits",
      };
    }
    return {
      valid: true,
      identity: {
        type: "telegram",
        key: `tg:${tgPart}`,
        telegramId: tgPart,
      },
    };
  }

  // 2. WhatsApp LID identifier
  if (trimmed.startsWith("lid:")) {
    const lidPart = trimmed.slice(4).trim();
    if (!lidPart) {
      return { valid: false, error: "LID identifier cannot be empty after 'lid:' prefix" };
    }
    if (!/^[a-zA-Z0-9_\-:.]{1,64}$/.test(lidPart)) {
      return {
        valid: false,
        error: "Invalid LID format: must be 1-64 characters matching [a-zA-Z0-9_\\-:.]",
      };
    }
    return {
      valid: true,
      identity: {
        type: "lid",
        key: `lid:${lidPart}`,
        lid: lidPart,
      },
    };
  }

  // 3. Normalized E.164 Phone number
  const phoneNorm = normalizePhone(trimmed);
  if (phoneNorm.valid) {
    return {
      valid: true,
      identity: {
        type: "phone",
        key: phoneNorm.e164,
        e164: phoneNorm.e164,
      },
    };
  }

  return {
    valid: false,
    error: `Invalid owner key: '${trimmed}' is neither a valid phone number, 'lid:<id>', nor 'tg:<numeric id>'`,
  };
}

/**
 * Returns true if the string is a valid owner key (E.164, lid:<id>, or tg:<id>).
 */
export function validateOwnerKey(raw: unknown): boolean {
  return parseOwnerKey(raw).valid;
}

/**
 * Zod schema enforcing valid owner keys and normalizing them to their canonical format.
 */
export const OwnerKeySchema = z
  .string()
  .trim()
  .superRefine((val, ctx) => {
    const res = parseOwnerKey(val);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error,
      });
    }
  })
  .transform((val) => {
    const res = parseOwnerKey(val);
    if (!res.valid) {
      throw new Error(res.error);
    }
    return res.identity.key;
  });
