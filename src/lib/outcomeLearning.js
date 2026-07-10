/**
 * outcomeLearning.js — a small, honest closed-loop signal for outreach messages.
 *
 * What this actually is: a weighted-frequency tracker over message "patterns" (currently:
 * the opening line/phrase) and their observed outcomes (replied vs no reply, or converted
 * vs not). It is NOT reinforcement learning, a neural model, or anything that trains
 * weights — it's a statistics-101 technique (frequency-weighted scoring), described here
 * exactly as that, because overclaiming "AI learns from outcomes" for a frequency counter
 * is the same kind of inflation that got flagged elsewhere in this codebase's README.
 *
 * What makes it a real feedback loop rather than a gimmick: SalesFlow/CareFlow message
 * generation can call `buildLearningHint()` and inject the result into the LLM prompt, so
 * future generations are nudged toward patterns that have actually converted before — not
 * just handed data from one agent to the next, but adjusted based on measured results.
 *
 * Storage: in-memory by default (a fresh session starts with no history, matching how the
 * rest of this app's session state works). Pass in a persisted array (e.g. loaded from
 * Supabase) to seed it with real history across sessions.
 */

/** Extracts a short "opening pattern" from a message — the first ~6 words, lowercased. */
export function extractOpeningPattern(message) {
  return (message || "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ")
    .toLowerCase();
}

export function createOutcomeLearner(seedRecords = []) {
  // pattern -> { successes, attempts }
  const stats = new Map();

  function ingest(record) {
    const pattern = extractOpeningPattern(record.message);
    if (!pattern) return;
    const entry = stats.get(pattern) || { successes: 0, attempts: 0 };
    entry.attempts += 1;
    if (record.outcome === "replied" || record.outcome === "converted") entry.successes += 1;
    stats.set(pattern, entry);
  }

  seedRecords.forEach(ingest);

  return {
    /** Record a new outcome, e.g. { message: "...", outcome: "replied" | "no_reply" | "converted" } */
    recordOutcome(record) {
      ingest(record);
    },

    /** Patterns with enough data (>= minAttempts) ranked by success rate, best first. */
    getTopPerformingPatterns(minAttempts = 3, limit = 5) {
      return [...stats.entries()]
        .map(([pattern, s]) => ({ pattern, successRate: s.successes / s.attempts, attempts: s.attempts }))
        .filter((p) => p.attempts >= minAttempts)
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, limit);
    },

    /** Patterns with enough data that are clearly underperforming, worst first. */
    getWorstPerformingPatterns(minAttempts = 3, limit = 5) {
      return [...stats.entries()]
        .map(([pattern, s]) => ({ pattern, successRate: s.successes / s.attempts, attempts: s.attempts }))
        .filter((p) => p.attempts >= minAttempts)
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, limit);
    },

    /** Total number of outcomes recorded so far. */
    get sampleSize() {
      return [...stats.values()].reduce((n, s) => n + s.attempts, 0);
    },

    /**
     * Builds a short string to inject into an LLM prompt, nudging generation toward what has
     * actually worked. Returns "" when there isn't enough data yet — an honest empty state
     * instead of a hint built on a sample size of 1.
     */
    buildLearningHint(minAttempts = 3) {
      const top = this.getTopPerformingPatterns(minAttempts, 3);
      if (top.length === 0) return "";
      const lines = top.map(
        (p) => `"${p.pattern}..." (${Math.round(p.successRate * 100)}% success over ${p.attempts} sends)`
      );
      return `Historical performance data — messages opening with patterns like ${lines.join(", ")} have performed best. Prefer similar openings where it fits the context, but do not force it if the JD/product doesn't match.`;
    },
  };
}
