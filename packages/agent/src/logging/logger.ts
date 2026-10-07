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
 * Creates a one-way deterministic 64-bit FNV-1a hash of the owner phone number
 * so logs can be correlated without storing or exposing raw PII.
 * Pure and portable across Node.js and Cloudflare Workers runtime.
 */
export function hashOwnerId(rawIdOrPhone: string): string {
  if (!rawIdOrPhone) return "owner_unknown";
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < rawIdOrPhone.length; i++) {
    const c = rawIdOrPhone.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `owner_h_${hex1}${hex2}`.slice(0, 16);
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
