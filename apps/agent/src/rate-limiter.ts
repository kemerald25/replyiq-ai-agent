/**
 * Sliding window rate limiter for Agent API endpoints.
 *
 * ARCHITECTURAL NOTE: WORKER ISOLATE SCOPE
 * -----------------------------------------
 * In Cloudflare Workers, module-level state (`MemoryRateLimiter` / `globalRateLimiter`)
 * is instantiated in the volatile memory of an individual Worker isolate instance.
 *
 * What this means operationally:
 * 1. Per-Instance / Per-Colo Isolation:
 *    - Cloudflare spins up multiple isolate instances across edge data centers worldwide.
 *    - Each isolate tracks its own independent sliding window counters.
 *    - If requests arrive across N isolates, total throughput across the entire fleet
 *      can theoretically reach N * maxRequests before an individual isolate throttles.
 *
 * 2. Transient Memory Lifecycle:
 *    - Isolates are ephemeral; they are created on demand and torn down during idle periods,
 *      restarts, or code deployments. State resets whenever an isolate recycles.
 *
 * 3. Purpose & Design Trade-off:
 *    - This in-memory limiter is designed for zero-latency, zero-cost DDoS and runaway
 *      loop mitigation (preventing runaway scripts from overloading CPU or downstream APIs).
 *    - It is NOT a substitute for global, strictly-enforced billing/usage quotas (which must
 *      be tracked durably via Durable Objects, D1, or Cloudflare KV).
 *    - Because the ReplyIQ WhatsApp Gateway communicates as a dedicated client, isolates
 *      typically remain warm and collocated, providing effective traffic smoothing.
 *      For globally distributed strict quotas, configure Cloudflare Edge Rate Limiting rules
 *      or delegate to a coordinator Durable Object.
 */

interface WindowCounter {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter {
  private counters = new Map<string, WindowCounter>();

  /**
   * Checks if an action with the given key is allowed under the rate limit.
   * Returns true if allowed, false if rate limit exceeded.
   */
  allow(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.counters.get(key);

    if (!entry || now >= entry.resetAt) {
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Periodic pruning of expired keys to prevent memory growth.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.counters.entries()) {
      if (now >= entry.resetAt) {
        this.counters.delete(key);
      }
    }
  }
}

export const globalRateLimiter = new MemoryRateLimiter();
