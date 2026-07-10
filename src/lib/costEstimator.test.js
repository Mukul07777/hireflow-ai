import { describe, it, expect } from "vitest";
import { estimateCallCostUSD, estimateCallCostINR, estimatePipelineCost, GROQ_PRICING_USD_PER_MILLION_TOKENS } from "./costEstimator.js";

describe("estimateCallCostUSD", () => {
  it("computes cost for exactly 1 million input tokens as the published input rate", () => {
    expect(estimateCallCostUSD(1_000_000, 0)).toBeCloseTo(GROQ_PRICING_USD_PER_MILLION_TOKENS.input, 6);
  });

  it("computes cost for exactly 1 million output tokens as the published output rate", () => {
    expect(estimateCallCostUSD(0, 1_000_000)).toBeCloseTo(GROQ_PRICING_USD_PER_MILLION_TOKENS.output, 6);
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCallCostUSD(0, 0)).toBe(0);
  });

  it("treats negative token counts as 0 rather than producing a negative cost", () => {
    expect(estimateCallCostUSD(-100, -100)).toBe(0);
  });

  it("scales linearly with token count", () => {
    const small = estimateCallCostUSD(1000, 500);
    const double = estimateCallCostUSD(2000, 1000);
    expect(double).toBeCloseTo(small * 2, 8);
  });
});

describe("estimateCallCostINR", () => {
  it("multiplies the USD cost by the given exchange rate", () => {
    const usd = estimateCallCostUSD(1_000_000, 0);
    const inr = estimateCallCostINR(1_000_000, 0, 90);
    expect(inr).toBeCloseTo(usd * 90, 6);
  });

  it("uses the documented default rate when none is supplied", () => {
    const usd = estimateCallCostUSD(500, 500);
    const inrDefault = estimateCallCostINR(500, 500);
    const inrExplicit = estimateCallCostINR(500, 500, 95.5);
    expect(inrDefault).toBeCloseTo(inrExplicit, 8);
    expect(inrDefault).toBeCloseTo(usd * 95.5, 8);
  });
});

describe("estimatePipelineCost", () => {
  it("aggregates multiple calls into total tokens and cost", () => {
    const calls = [
      { promptChars: 400, outputChars: 400 }, // 100 input tok, 100 output tok
      { promptChars: 400, outputChars: 400 },
    ];
    const result = estimatePipelineCost(calls);
    expect(result.callCount).toBe(2);
    expect(result.totalInputTokens).toBe(200);
    expect(result.totalOutputTokens).toBe(200);
    expect(result.usd).toBeGreaterThan(0);
    expect(result.inr).toBeGreaterThan(0);
  });

  it("returns zeroed-out result for an empty call list", () => {
    const result = estimatePipelineCost([]);
    expect(result.callCount).toBe(0);
    expect(result.usd).toBe(0);
    expect(result.inr).toBe(0);
  });

  it("handles undefined/missing input gracefully", () => {
    const result = estimatePipelineCost(undefined);
    expect(result.callCount).toBe(0);
  });

  it("handles calls with missing promptChars/outputChars fields", () => {
    const result = estimatePipelineCost([{}, { promptChars: 400 }]);
    expect(result.callCount).toBe(2);
    expect(result.totalInputTokens).toBe(100);
    expect(result.totalOutputTokens).toBe(0);
  });
});
