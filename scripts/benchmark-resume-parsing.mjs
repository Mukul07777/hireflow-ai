/**
 * benchmark-resume-parsing.mjs — measures the local (non-LLM) portion of the bulk resume
 * pipeline: splitting a pasted batch into individual resumes and extracting a candidate
 * name from each. This is the part of "screens N resumes" that runs client-side with no
 * network call, so it's the only part of that claim we can measure deterministically
 * without a live Groq key. The LLM scoring step that follows is not included here —
 * its latency depends on Groq's API and isn't something this repo controls or should claim.
 *
 * Run: node scripts/benchmark-resume-parsing.mjs
 */
import { splitResumes, extractName } from "../src/lib/resumeParsing.js";

const FIRST_NAMES = ["Aryan", "Sneha", "Rohan", "Kavya", "Karan", "Pooja", "Amit", "Ishaan", "Aditya", "Meera"];
const LAST_NAMES = ["Sharma", "Verma", "Joshi", "Reddy", "Mehta", "Iyer", "Patel", "Roy", "Kumar", "Pillai"];

function makeSampleResume(i) {
  const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`;
  return `${name}\nSenior Engineer | Bangalore\nSkills: React, TypeScript, Node.js, System Design, SQL\nExp: ${2 + (i % 8)} years at Company${i} — shipped feature X, Y% improvement\nSalary: Rs ${20 + (i % 40)}L | Notice: ${(i % 3) * 15 + 15} days`;
}

function benchmark(n) {
  const batch = Array.from({ length: n }, (_, i) => makeSampleResume(i)).join("\n\n---\n\n");

  const t0 = performance.now();
  const resumes = splitResumes(batch);
  const t1 = performance.now();
  const names = resumes.map(extractName);
  const t2 = performance.now();

  return {
    n,
    parsedCount: resumes.length,
    splitMs: t1 - t0,
    nameExtractMs: t2 - t1,
    totalMs: t2 - t0,
    namesLookCorrect: names.every((name) => /^[A-Za-z]+ [A-Za-z]+$/.test(name)),
  };
}

const sizes = [10, 50, 200];
console.log("Resume batch split + name extraction — local, deterministic, no network call:\n");
for (const n of sizes) {
  const r = benchmark(n);
  console.log(
    `  ${String(r.n).padStart(4)} resumes → split: ${r.splitMs.toFixed(2)}ms, name extraction: ${r.nameExtractMs.toFixed(2)}ms, total: ${r.totalMs.toFixed(2)}ms` +
    (r.namesLookCorrect ? "" : "  [WARNING: name extraction produced unexpected output]")
  );
}
