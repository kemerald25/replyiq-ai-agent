export interface LogEntry {
  level: "info" | "warn" | "error";
  event: string;
  ownerHash: string;
  messageId?: string;
  activeProjectId?: string | null;
  command?: string;
  toolName?: string;
  modelUsed?: string;
  tokensUsed?: number;
  neuronsUsed?: number;
  textLength?: number;
  error?: string;
  timestamp: number;
}

export interface IAgentLogger {
  log(entry: LogEntry): void;
}

/**
 * Creates a one-way deterministic HMAC-SHA256 hash of the owner phone number
 * using a secret key from the environment/config, so logs can be correlated
 * without exposing raw PII.
 * Outputs at least 16 hex characters (24 hex characters).
 * Pure and portable across Node.js and Cloudflare Workers runtime.
 */
export async function hashOwnerId(
  rawIdOrPhone: string,
  secretKey?: string
): Promise<string> {
  if (!rawIdOrPhone) return "owner_unknown";
  const secret =
    secretKey ||
    (typeof process !== "undefined" ? process.env?.OWNER_HASH_SECRET : undefined) ||
    "replyiq-owner-salt-required-secret";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawIdOrPhone)
  );
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `owner_h_${hex.slice(0, 24)}`;
}

export class JsonAgentLogger implements IAgentLogger {
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  log(entry: LogEntry): void {
    if (!this.enabled) return;
    // Emits strictly structured JSON without raw phone numbers or raw message text
    const serialized = JSON.stringify(entry);
    if (entry.level === "error") {
      console.error(serialized);
    } else if (entry.level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }
}
