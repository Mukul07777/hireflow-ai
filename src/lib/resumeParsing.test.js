import { describe, it, expect } from "vitest";
import { splitResumes, extractName } from "./resumeParsing.js";

describe("splitResumes", () => {
  it("splits on '---' separator lines", () => {
    const text = "A".repeat(60) + "\n---\n" + "B".repeat(60);
    const parts = splitResumes(text);
    expect(parts).toHaveLength(2);
  });

  it("splits on '===' separator lines", () => {
    const text = "A".repeat(60) + "\n===\n" + "B".repeat(60);
    expect(splitResumes(text)).toHaveLength(2);
  });

  it("splits on underscore separator lines", () => {
    const text = "A".repeat(60) + "\n____\n" + "B".repeat(60);
    expect(splitResumes(text)).toHaveLength(2);
  });

  it("falls back to 'Resume N:' headers when no separator is present", () => {
    const text = "Resume 1:\n" + "A".repeat(60) + "\nResume 2:\n" + "B".repeat(60);
    expect(splitResumes(text)).toHaveLength(2);
  });

  it("treats the whole paste as a single resume when nothing splits it", () => {
    const text = "A".repeat(200);
    expect(splitResumes(text)).toHaveLength(1);
  });

  it("falls back to treating the whole paste as one resume when the separator split leaves only one valid-length piece", () => {
    // "short" (5 chars) is filtered out as noise, leaving only 1 piece post-filter — since
    // splitResumes requires >1 surviving pieces to trust the split, it correctly falls back
    // to the numbered-header check, then to the whole-text fallback (which is why the result
    // is the full original string, not just the 60-char "A" block).
    const text = "short\n---\n" + "A".repeat(60);
    const parts = splitResumes(text);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toBe(text);
  });

  it("returns an empty array for empty input", () => {
    expect(splitResumes("")).toEqual([]);
  });
});

describe("extractName", () => {
  it("takes the first line when it looks like a plain name", () => {
    expect(extractName("Rahul Sharma\nSenior Engineer\nSkills: React")).toBe("Rahul Sharma");
  });

  it("finds an explicit 'Name: X' line when the first line isn't name-shaped", () => {
    const text = "RESUME\nName: Sneha Verma\nRole: PM";
    expect(extractName(text)).toBe("Sneha Verma");
  });

  it("rejects a first line containing 'Resume' or 'CV' even if name-shaped", () => {
    const text = "My Resume\nName: Kavya Reddy";
    expect(extractName(text)).toBe("Kavya Reddy");
  });

  it("falls back to a placeholder when no name can be found", () => {
    expect(extractName("12345\nSkills: React, Node")).toMatch(/^Candidate \d+$/);
  });
});
