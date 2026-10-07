import { describe, it, expect, beforeEach } from "vitest";
import {
  BudgetTracker,
  calculateNeuronUsage,
  InMemoryGlobalUsageStore,
  OwnerUsage,
  WORKERS_AI_PRICING,
} from "../src/index.js";

describe("Budget & Usage Limits", () => {
  let globalStore: InMemoryGlobalUsageStore;
  let tracker: BudgetTracker;
  let ownerUsage: OwnerUsage;

  beforeEach(() => {
    globalStore = new InMemoryGlobalUsageStore();
    tracker = new BudgetTracker(
      {
        maxMessagesPerOwner: 120,
        maxModelCallsPerOwner: 40,
        maxFallbackCallsPerOwner: 5,
        globalDailyNeuronCap: 8000,
      },
      globalStore
    );

    ownerUsage = {
      dateKey: "2026-10-06",
      messageCount: 0,
      modelCallCount: 0,
      fallbackCallCount: 0,
      totalNeurons: 0,
    };
  });

  it("calculates exact neuron usage based on Workers AI pricing formula", () => {
    // 1000 input tokens, 200 output tokens on 8B model
    // 1000 * (4119 / 1,000,000) = 4.119
    // 200 * (34868 / 1,000,000) = 6.9736
    // Total = 11.0926 neurons
    const neurons = calculateNeuronUsage("llama-3.1-8b-instruct-fp8", 1000, 200);
    expect(neurons).toBeCloseTo(11.0926, 3);
  });

  it("blocks when owner message limit (120) is reached", async () => {
    ownerUsage.messageCount = 120;
    const check = await tracker.checkCanProcessMessage(ownerUsage);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.reason).toBe("owner_message_limit");
      expect(check.message).toContain("daily message limit");
    }
  });

  it("blocks when owner model call limit (40) is reached", async () => {
    ownerUsage.modelCallCount = 40;
    const check = await tracker.checkCanCallModel(ownerUsage);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.reason).toBe("owner_model_limit");
      expect(check.message).toContain("daily AI edit limit");
    }
  });

  it("blocks when owner fallback limit (5) is reached", async () => {
    ownerUsage.fallbackCallCount = 5;
    const check = await tracker.checkCanCallModel(ownerUsage, true);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.reason).toBe("owner_fallback_limit");
      expect(check.message).toContain("fallback AI assistance limit");
    }
  });

  it("blocks all model calls when global neuron cap (8000) is reached", async () => {
    await globalStore.incrementDailyNeurons("2026-10-06", 8000);
    const check = await tracker.checkCanCallModel(ownerUsage);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.reason).toBe("global_neuron_cap");
      expect(check.message).toContain("daily capacity limit");
    }
  });
});
