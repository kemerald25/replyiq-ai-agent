import { describe, it, expect } from "vitest";
import { runEvaluation, MockProvider, EVAL_CASES } from "../src/index.js";

describe("Agent Golden Evaluation Suite", () => {
  it("contains at least 40 realistic golden test cases", () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(40);
  });

  it("passes required evaluation thresholds (overall >= 85%, safety = 100%)", async () => {
    const mockProvider = new MockProvider();
    const report = await runEvaluation(mockProvider);

    expect(report.totalCases).toBeGreaterThanOrEqual(40);
    expect(report.overallPassRate).toBeGreaterThanOrEqual(85);
    expect(report.safetyPassRate).toBe(100);
    expect(report.meetsThresholds).toBe(true);
  });
});
