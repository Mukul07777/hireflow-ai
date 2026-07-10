import { describe, it, expect } from "vitest";
import { createOutcomeLearner, extractOpeningPattern } from "./outcomeLearning.js";

describe("extractOpeningPattern", () => {
  it("takes the first 6 words, lowercased", () => {
    expect(extractOpeningPattern("Hi There, Saw Your Recent Post About Hiring")).toBe(
      "hi there, saw your recent post"
    );
  });

  it("handles short messages without throwing", () => {
    expect(extractOpeningPattern("Hi")).toBe("hi");
  });

  it("returns an empty string for empty input", () => {
    expect(extractOpeningPattern("")).toBe("");
  });
});

describe("createOutcomeLearner", () => {
  it("starts with zero sample size and no top patterns", () => {
    const learner = createOutcomeLearner();
    expect(learner.sampleSize).toBe(0);
    expect(learner.getTopPerformingPatterns()).toEqual([]);
  });

  it("tracks attempts and successes per opening pattern", () => {
    const learner = createOutcomeLearner();
    learner.recordOutcome({ message: "Quick question about your team", outcome: "replied" });
    learner.recordOutcome({ message: "Quick question about your team", outcome: "no_reply" });
    expect(learner.sampleSize).toBe(2);
  });

  it("ranks patterns by success rate, best first", () => {
    const learner = createOutcomeLearner();
    for (let i = 0; i < 3; i++) learner.recordOutcome({ message: "Pattern A opens strong here", outcome: "replied" });
    for (let i = 0; i < 3; i++) learner.recordOutcome({ message: "Pattern B opens weakly here", outcome: "no_reply" });
    const top = learner.getTopPerformingPatterns(3);
    expect(top[0].pattern).toMatch(/pattern a/);
    expect(top[0].successRate).toBe(1);
  });

  it("excludes patterns below the minAttempts threshold", () => {
    const learner = createOutcomeLearner();
    learner.recordOutcome({ message: "Only one data point exists", outcome: "replied" });
    expect(learner.getTopPerformingPatterns(3)).toEqual([]);
  });

  it("treats 'converted' the same as 'replied' for success counting", () => {
    const learner = createOutcomeLearner();
    for (let i = 0; i < 3; i++) learner.recordOutcome({ message: "Converts every single time", outcome: "converted" });
    const top = learner.getTopPerformingPatterns(3);
    expect(top[0].successRate).toBe(1);
  });

  it("can be seeded with historical records at creation time", () => {
    const learner = createOutcomeLearner([
      { message: "Seeded pattern from last week", outcome: "replied" },
      { message: "Seeded pattern from last week", outcome: "replied" },
      { message: "Seeded pattern from last week", outcome: "replied" },
    ]);
    expect(learner.sampleSize).toBe(3);
    expect(learner.getTopPerformingPatterns(3)).toHaveLength(1);
  });

  it("buildLearningHint returns empty string when there isn't enough data", () => {
    const learner = createOutcomeLearner();
    learner.recordOutcome({ message: "Not enough data yet", outcome: "replied" });
    expect(learner.buildLearningHint(3)).toBe("");
  });

  it("buildLearningHint returns a non-empty, readable hint once there's enough data", () => {
    const learner = createOutcomeLearner();
    for (let i = 0; i < 5; i++) learner.recordOutcome({ message: "This opener converts well always", outcome: "converted" });
    const hint = learner.buildLearningHint(3);
    expect(hint).toContain("this opener converts well always");
    expect(hint).toContain("%");
  });
});
