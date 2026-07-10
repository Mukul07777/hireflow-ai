/**
 * resumeParsing.js — pure, deterministic resume-batch splitting and name extraction.
 * Pulled out of BulkResumeProcessor.jsx so this logic is unit tested and independently
 * benchmarkable, separate from the LLM-scoring step (which needs a live Groq key and
 * can't be measured or unit tested without one).
 */

/** Split a pasted block of text into individual resumes. */
export function splitResumes(text) {
  // Try separator-based split first: "---", "===", or 3+ underscores on their own line.
  const separators = [/\n---+\n/, /\n===+\n/, /\n_{3,}\n/];
  for (const sep of separators) {
    const parts = text.split(sep).map((p) => p.trim()).filter((p) => p.length > 50);
    if (parts.length > 1) return parts;
  }
  // Try splitting by "Resume N:" or "Candidate N:" headers.
  const numbered = text
    .split(/\n(?=Resume\s+\d+:|Candidate\s+\d+:)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 50);
  if (numbered.length > 1) return numbered;
  // Fallback: treat the whole paste as one resume.
  return [text.trim()].filter((p) => p.length > 50);
}

/** Best-effort name extraction from the top of a resume before the LLM parse pass runs. */
export function extractName(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0];
  // If the first line looks like a plain name (2-3 words, letters/spaces only).
  if (first && /^[A-Za-z\s]{3,40}$/.test(first) && !first.includes("Resume") && !first.includes("CV")) {
    return first;
  }
  // Try an explicit "Name: X" line anywhere in the resume.
  const nameLine = lines.find((l) => l.match(/^name\s*:/i));
  if (nameLine) return nameLine.replace(/^name\s*:\s*/i, "").trim();
  return "Candidate " + ((Math.random() * 100) | 0);
}
