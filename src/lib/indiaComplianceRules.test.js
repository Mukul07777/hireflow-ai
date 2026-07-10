import { describe, it, expect } from "vitest";
import { runIndiaComplianceCheck, formatComplianceFlags } from "./indiaComplianceRules.js";

describe("runIndiaComplianceCheck", () => {
  it("returns no flags for a clean JD with an equal-opportunity statement", () => {
    const jd = "We are an equal opportunity employer seeking a software engineer with 2+ years experience.";
    expect(runIndiaComplianceCheck(jd)).toEqual([]);
  });

  it("returns no flags for empty input", () => {
    expect(runIndiaComplianceCheck("")).toEqual([]);
  });

  it("flags age-proxy language", () => {
    const flags = runIndiaComplianceCheck("Looking for a young dynamic engineer.");
    expect(flags.some((f) => f.id === "age-proxy")).toBe(true);
  });

  it("flags explicit age ceilings", () => {
    const flags = runIndiaComplianceCheck("Candidates must be age below 28.");
    expect(flags.some((f) => f.id === "age-proxy")).toBe(true);
  });

  it("flags gendered job titles", () => {
    const flags = runIndiaComplianceCheck("Hiring a salesman for our Mumbai office.");
    expect(flags.some((f) => f.id === "gendered-title")).toBe(true);
  });

  it("flags gender-specific pronouns describing the role", () => {
    const flags = runIndiaComplianceCheck("He must be available for night shifts.");
    expect(flags.some((f) => f.id === "gender-pronoun-exclusive")).toBe(true);
  });

  it("flags missing equal-opportunity / POSH statement on a non-trivial JD", () => {
    const flags = runIndiaComplianceCheck("We need a backend engineer with strong Node.js skills.");
    expect(flags.some((f) => f.id === "posh-missing-statement")).toBe(true);
  });

  it("does not flag missing POSH statement when one is present", () => {
    const flags = runIndiaComplianceCheck("Equal opportunity employer. Backend engineer role.");
    expect(flags.some((f) => f.id === "posh-missing-statement")).toBe(false);
  });

  it("flags salary-secrecy clauses", () => {
    const flags = runIndiaComplianceCheck("Salary is confidential and should not be discussed.");
    expect(flags.some((f) => f.id === "salary-secrecy")).toBe(true);
  });

  it("flags high numeric experience requirements", () => {
    const flags = runIndiaComplianceCheck("Requires 15+ years experience in enterprise sales.");
    expect(flags.some((f) => f.id === "excessive-experience-requirement")).toBe(true);
  });

  it("can return multiple flags for a JD with multiple issues", () => {
    const jd = "Young dynamic salesman needed, age below 28, salary is confidential.";
    const flags = runIndiaComplianceCheck(jd);
    expect(flags.length).toBeGreaterThanOrEqual(3);
  });
});

describe("formatComplianceFlags", () => {
  it("prefixes each message with severity for display", () => {
    const flags = [{ id: "age-proxy", severity: "high", message: "test message" }];
    const formatted = formatComplianceFlags(flags);
    expect(formatted[0]).toBe("[India compliance — high] test message");
  });

  it("returns an empty array for no flags", () => {
    expect(formatComplianceFlags([])).toEqual([]);
  });
});
