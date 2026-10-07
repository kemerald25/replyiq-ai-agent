import { FREE_TIER_LIMITS } from "./pricing.js";

export interface OwnerUsage {
  dateKey: string; // YYYY-MM-DD (UTC)
  messageCount: number;
  modelCallCount: number;
  fallbackCallCount: number;
  totalNeurons: number;
}

export interface IGlobalUsageStore {
  getDailyNeurons(dateKey: string): Promise<number>;
  incrementDailyNeurons(dateKey: string, neurons: number): Promise<number>;
}

export class InMemoryGlobalUsageStore implements IGlobalUsageStore {
  private usage = new Map<string, number>();

  async getDailyNeurons(dateKey: string): Promise<number> {
    return this.usage.get(dateKey) || 0;
  }

  async incrementDailyNeurons(dateKey: string, neurons: number): Promise<number> {
    const current = await this.getDailyNeurons(dateKey);
    const updated = current + neurons;
    this.usage.set(dateKey, updated);
    return updated;
  }
}

export interface BudgetConfig {
  maxMessagesPerOwner?: number;
  maxModelCallsPerOwner?: number;
  maxFallbackCallsPerOwner?: number;
  globalDailyNeuronCap?: number;
}

export type BudgetCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "owner_message_limit" | "owner_model_limit" | "owner_fallback_limit" | "global_neuron_cap"; message: string };

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().split("T")[0]!;
}

export class BudgetTracker {
  private config: Required<BudgetConfig>;

  constructor(
    config?: BudgetConfig,
    private globalStore: IGlobalUsageStore = new InMemoryGlobalUsageStore()
  ) {
    this.config = {
      maxMessagesPerOwner: config?.maxMessagesPerOwner ?? FREE_TIER_LIMITS.DEFAULT_MAX_MESSAGES_PER_OWNER,
      maxModelCallsPerOwner: config?.maxModelCallsPerOwner ?? FREE_TIER_LIMITS.DEFAULT_MAX_MODEL_CALLS_PER_OWNER,
      maxFallbackCallsPerOwner: config?.maxFallbackCallsPerOwner ?? FREE_TIER_LIMITS.DEFAULT_MAX_FALLBACK_CALLS_PER_OWNER,
      globalDailyNeuronCap: config?.globalDailyNeuronCap ?? FREE_TIER_LIMITS.GLOBAL_DAILY_NEURON_CAP,
    };
  }

  async checkCanProcessMessage(ownerUsage: OwnerUsage): Promise<BudgetCheckResult> {
    // 1. Check owner message limit
    if (ownerUsage.messageCount >= this.config.maxMessagesPerOwner) {
      return {
        allowed: false,
        reason: "owner_message_limit",
        message: "You have reached your daily message limit (120 messages). Your allowance resets at midnight UTC. See you tomorrow!",
      };
    }

    // 2. Check global neuron cap
    const globalNeurons = await this.globalStore.getDailyNeurons(ownerUsage.dateKey);
    if (globalNeurons >= this.config.globalDailyNeuronCap) {
      return {
        allowed: false,
        reason: "global_neuron_cap",
        message: "The platform has temporarily reached its daily capacity limit for free AI updates today. Please try again tomorrow morning (resets at 00:00 UTC).",
      };
    }

    return { allowed: true };
  }

  async checkCanCallModel(ownerUsage: OwnerUsage, isFallback = false): Promise<BudgetCheckResult> {
    // Check owner model calls
    if (ownerUsage.modelCallCount >= this.config.maxModelCallsPerOwner) {
      return {
        allowed: false,
        reason: "owner_model_limit",
        message: "You have reached your daily AI edit limit (40 updates). You can still view menus, preview, or undo changes. AI editing resets tomorrow!",
      };
    }

    // Check fallback limit
    if (isFallback && ownerUsage.fallbackCallCount >= this.config.maxFallbackCallsPerOwner) {
      return {
        allowed: false,
        reason: "owner_fallback_limit",
        message: "Your fallback AI assistance limit has been reached for today.",
      };
    }

    // Check global neuron cap
    const globalNeurons = await this.globalStore.getDailyNeurons(ownerUsage.dateKey);
    if (globalNeurons >= this.config.globalDailyNeuronCap) {
      return {
        allowed: false,
        reason: "global_neuron_cap",
        message: "The platform has temporarily reached its daily capacity limit for compute allowance. Please try again after 00:00 UTC.",
      };
    }

    return { allowed: true };
  }

  async recordModelUsage(
    ownerUsage: OwnerUsage,
    neurons: number,
    isFallback = false
  ): Promise<void> {
    ownerUsage.modelCallCount += 1;
    ownerUsage.totalNeurons += neurons;
    if (isFallback) {
      ownerUsage.fallbackCallCount += 1;
    }
    await this.globalStore.incrementDailyNeurons(ownerUsage.dateKey, neurons);
  }
}
