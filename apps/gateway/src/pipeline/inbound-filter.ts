import { InboundTransportMessage, MessagingTransport } from "../transport/interface.js";

export const FRESHNESS_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

export interface InboundFilterOptions {
  freshnessWindowMs?: number;
  chatRateLimitMax?: number;
  chatRateLimitWindowMs?: number;
  maxApologiesPerMinute?: number;
}

interface ChatRateEntry {
  count: number;
  resetAt: number;
  noticeSent: boolean;
}

export class InboundFilter {
  private freshnessWindowMs: number;
  private chatRateLimitMax: number;
  private chatRateLimitWindowMs: number;
  private maxApologiesPerMinute: number;

  private chatRateLimits = new Map<string, ChatRateEntry>();
  private chatApologySent = new Set<string>();
  private apologyTimestamps: number[] = [];
  private justReconnected = false;

  constructor(options?: InboundFilterOptions) {
    this.freshnessWindowMs = options?.freshnessWindowMs ?? FRESHNESS_WINDOW_MS;
    this.chatRateLimitMax = options?.chatRateLimitMax ?? 5;
    this.chatRateLimitWindowMs = options?.chatRateLimitWindowMs ?? 20_000;
    this.maxApologiesPerMinute = options?.maxApologiesPerMinute ?? 5;
  }

  /**
   * Signals that the transport just reconnected after an outage.
   */
  notifyReconnected(): void {
    this.justReconnected = true;
    this.chatApologySent.clear();
  }

  /**
   * Clears the reconnect state once initial catch-up window passes.
   */
  clearReconnectState(): void {
    this.justReconnected = false;
  }

  /**
   * Filters an incoming message.
   * Returns:
   * - { allow: true } if message is fresh and within rate limits
   * - { allow: false, reason: string } if message should be dropped
   */
  async filter(
    message: InboundTransportMessage,
    transport: MessagingTransport
  ): Promise<{ allow: boolean; reason?: string }> {
    const now = Date.now();
    const age = now - message.timestamp;

    // 1. Freshness window check
    if (age > this.freshnessWindowMs) {
      if (this.justReconnected) {
        await this.trySendOfflineApology(message.from, transport);
      }
      return { allow: false, reason: "stale_message" };
    }

    // 2. Chat Inbound Rate Limit
    const rateEntry = this.chatRateLimits.get(message.from);
    if (!rateEntry || now >= rateEntry.resetAt) {
      this.chatRateLimits.set(message.from, {
        count: 1,
        resetAt: now + this.chatRateLimitWindowMs,
        noticeSent: false,
      });
      return { allow: true };
    }

    if (rateEntry.count >= this.chatRateLimitMax) {
      if (!rateEntry.noticeSent) {
        rateEntry.noticeSent = true;
        try {
          await transport.sendText(
            message.from,
            "You're sending messages too fast. Please wait a moment."
          );
        } catch (err) {
          console.error("Failed to send rate-limit notice:", err);
        }
      }
      return { allow: false, reason: "chat_rate_limit_exceeded" };
    }

    rateEntry.count++;
    return { allow: true };
  }

  private async trySendOfflineApology(chatId: string, transport: MessagingTransport): Promise<void> {
    if (this.chatApologySent.has(chatId)) {
      return; // At most one apology per chat
    }

    const now = Date.now();
    // Prune apologies older than 1 minute
    this.apologyTimestamps = this.apologyTimestamps.filter((t) => now - t < 60_000);

    if (this.apologyTimestamps.length >= this.maxApologiesPerMinute) {
      return; // Rate limit apologies to a few per minute
    }

    this.chatApologySent.add(chatId);
    this.apologyTimestamps.push(now);

    try {
      await transport.sendText(chatId, "Sorry, I was offline, please send that again.");
    } catch (err) {
      console.error("Failed to send offline apology:", err);
    }
  }
}
