import { normalizePhone, parseOwnerKey } from "@replyiq/schema";
import { MessagingTransport } from "../transport/interface.js";

export interface ResolvedIdentity {
  ownerKey: string;
  phoneDefault: string | null;
  isLid: boolean;
}

/**
 * Resolves a raw WhatsApp sender identity to a canonical ReplyIQ ownerKey.
 *
 * Rules:
 * 1. For phone-based senders (@c.us), normalizes phone number to E.164.
 * 2. For WhatsApp LID users (@lid), uses "lid:<id>". Never rejects unresolved LID users.
 * 3. Never allows a user to claim a phone number by typing it in chat.
 * 4. If transport resolves the underlying phone number for a LID user, offers it as a default.
 */
export async function resolveIdentity(
  rawSender: string,
  transport?: MessagingTransport
): Promise<ResolvedIdentity> {
  const clean = rawSender.trim();

  // 1. WhatsApp LID identifier (@lid or lid:...)
  if (clean.endsWith("@lid") || clean.startsWith("lid:")) {
    const rawLid = clean.replace(/@lid$/, "").replace(/^lid:/, "").trim();
    const ownerKey = `lid:${rawLid}`;

    let phoneDefault: string | null = null;
    if (transport?.resolvePhoneNumber) {
      try {
        const resolvedPhone = await transport.resolvePhoneNumber(rawSender);
        if (resolvedPhone) {
          const norm = normalizePhone(resolvedPhone);
          if (norm.valid) {
            phoneDefault = norm.e164;
          }
        }
      } catch {
        // Unresolved LID - perfectly fine, proceed without phoneDefault
      }
    }

    return {
      ownerKey,
      phoneDefault,
      isLid: true,
    };
  }

  // 2. Standard phone number identifier (@c.us or raw digits/phone)
  const phoneCandidate = clean.replace(/@c\.us$/, "");
  const norm = normalizePhone(phoneCandidate);
  if (norm.valid) {
    return {
      ownerKey: norm.e164,
      phoneDefault: norm.e164,
      isLid: false,
    };
  }

  // 3. Fallback: validate with schema helper
  const parsed = parseOwnerKey(clean);
  if (parsed.valid) {
    return {
      ownerKey: parsed.identity.key,
      phoneDefault: parsed.identity.type === "phone" ? parsed.identity.e164 : null,
      isLid: parsed.identity.type === "lid",
    };
  }

  // If cannot parse as phone, fallback to safe LID representation
  const sanitized = clean.replace(/[^a-zA-Z0-9_-]/g, "");
  return {
    ownerKey: `lid:${sanitized}`,
    phoneDefault: null,
    isLid: true,
  };
}
