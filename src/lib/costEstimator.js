/**
 * costEstimator.js — real, cited Groq API pricing, not an invented number.
 *
 * Pricing source: Groq's published on-demand pricing for llama-3.3-70b-versatile,
 * $0.59 per million input tokens / $0.79 per million output tokens (checked July 2026,
 * see https://groq.com/pricing — re-verify this before quoting it publicly, since token
 * pricing changes and this file will silently go stale otherwise).
 *
 * USD→INR conversion rate is NOT hardcoded as a "real number" pretending to be current —
 * it's a parameter with a documented default that WILL drift. Call sites should pass a
 * fresher rate when precision matters; the default exists so the function still returns
 * something reasonable if no rate is supplied.
 */

export const GROQ_PRICING_USD_PER_MILLION_TOKENS = {
  model: "llama-3.3-70b-versatile",
  input: 0.59,
  output: 0.79,
  sourceNote: "Groq on-demand pricing, groq.com/pricing — checked July 2026, re-verify before relying on this for real budgeting.",
};

/** Default USD→INR rate — a snapshot (~95.5 as of July 2026), NOT live. Pass a current rate for real accuracy. */
export const DEFAULT_USD_TO_INR = 95.5;

/**
 * Cost of a single Groq API call given its actual input/output token counts.
 * This app already estimates tokens per call (promptChars+outputChars)/4 in the
 * ActivityPanel — feed those same estimates in here rather than inventing new ones.
 */
export function estimateCallCostUSD(inputTokens, outputTokens) {
  const inCost = (Math.max(0, inputTokens) / 1_000_000) * GROQ_PRICING_USD_PER_MILLION_TOKENS.input;
  const outCost = (Math.max(0, outputTokens) / 1_000_000) * GROQ_PRICING_USD_PER_MILLION_TOKENS.output;
  return inCost + outCost;
}

export function estimateCallCostINR(inputTokens, outputTokens, usdToInr = DEFAULT_USD_TO_INR) {
  return estimateCallCostUSD(inputTokens, outputTokens) * usdToInr;
}

/**
 * Aggregates a list of calls — e.g. the ActivityPanel's log for one pipeline run —
 * into a total cost. Each call is { promptChars, outputChars } as already tracked
 * by _pushActivity() in App.jsx; token estimate matches the app's existing (promptChars+
 * outputChars)/4 approximation so this number is consistent with what the UI already shows,
 * not a second, disagreeing estimate.
 */
export function estimatePipelineCost(calls, usdToInr = DEFAULT_USD_TO_INR) {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const call of calls || []) {
    const promptChars = call.promptChars || 0;
    const outputChars = call.outputChars || 0;
    // Rough input/output split consistent with the app's existing token estimate;
    // treats prompt chars as input tokens and output chars as output tokens at ~4 chars/token.
    totalInputTokens += promptChars / 4;
    totalOutputTokens += outputChars / 4;
  }
  const usd = estimateCallCostUSD(totalInputTokens, totalOutputTokens);
  const inr = usd * usdToInr;
  return {
    callCount: (calls || []).length,
    totalInputTokens: Math.round(totalInputTokens),
    totalOutputTokens: Math.round(totalOutputTokens),
    usd: Math.round(usd * 10000) / 10000,
    inr: Math.round(inr * 100) / 100,
  };
}
