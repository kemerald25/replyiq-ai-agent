/**
 * Official Cloudflare Workers AI pricing figures (Neurons per token)
 * Reference: https://developers.cloudflare.com/workers-ai/pricing/
 */
export const WORKERS_AI_PRICING = {
  // @cf/meta/llama-3.1-8b-instruct-fp8
  // 4,119 neurons per 1,000,000 input tokens
  // 34,868 neurons per 1,000,000 output tokens
  "llama-3.1-8b-instruct-fp8": {
    neuronsPerInputToken: 4119 / 1_000_000, // 0.004119
    neuronsPerOutputToken: 34868 / 1_000_000, // 0.034868
  },
  // @cf/meta/llama-3.3-70b-instruct-fp8-fast
  // 25,000 neurons per 1,000,000 input tokens
  // 180,000 neurons per 1,000,000 output tokens
  "llama-3.3-70b-instruct-fp8-fast": {
    neuronsPerInputToken: 25000 / 1_000_000, // 0.025
    neuronsPerOutputToken: 180000 / 1_000_000, // 0.18
  },
  default: {
    neuronsPerInputToken: 0.005,
    neuronsPerOutputToken: 0.035,
  },
} as const;

export const FREE_TIER_LIMITS = {
  DAILY_TOTAL_NEURONS: 10_000,
  SAFETY_CAP_PERCENT: 0.8, // 80%
  GLOBAL_DAILY_NEURON_CAP: 8_000, // Stop at 8,000 neurons
  DEFAULT_MAX_MESSAGES_PER_OWNER: 120,
  DEFAULT_MAX_MODEL_CALLS_PER_OWNER: 40,
  DEFAULT_MAX_FALLBACK_CALLS_PER_OWNER: 5,
} as const;

export function calculateNeuronUsage(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  let rates: { neuronsPerInputToken: number; neuronsPerOutputToken: number } =
    WORKERS_AI_PRICING.default;

  if (modelName.includes("70b")) {
    rates = WORKERS_AI_PRICING["llama-3.3-70b-instruct-fp8-fast"];
  } else if (modelName.includes("8b")) {
    rates = WORKERS_AI_PRICING["llama-3.1-8b-instruct-fp8"];
  }

  const cost = inputTokens * rates.neuronsPerInputToken + outputTokens * rates.neuronsPerOutputToken;
  // Return rounded to 4 decimal places
  return Math.round(cost * 10000) / 10000;
}
