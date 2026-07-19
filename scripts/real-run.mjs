/**
 * real-run.mjs — a REAL end-to-end run against the live Groq API.
 *
 * Run:  node scripts/real-run.mjs
 *
 * Why this exists: every other claim in this repo is either unit-tested or clearly
 * labelled as illustrative. This script is the one that proves the AI layer actually
 * works against the live model — it makes real API calls, records the real latency,
 * real token counts and real INR cost, and prints a markdown block you can paste
 * straight into the "Real-run log" section of the README.
 *
 * It reads VITE_GROQ_API_KEY from .env. Nothing is faked: if the API fails, it says so
 * and exits non-zero rather than printing a result.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCompanyBrain } from "../src/lib/companyBrain.js";
import { brainContextFor, salesAccountIntel } from "../src/lib/brainContext.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── read the key from .env (never hardcoded) ────────────────────────────────
function readEnvKey() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) throw new Error("No .env file found at project root.");
  const line = fs.readFileSync(envPath, "utf8")
    .split("\n").find((l) => l.trim().startsWith("VITE_GROQ_API_KEY="));
  if (!line) throw new Error("VITE_GROQ_API_KEY not found in .env");
  return line.split("=").slice(1).join("=").trim();
}

const KEY = readEnvKey();
const MODEL = "llama-3.3-70b-versatile";
// Groq published pricing for llama-3.3-70b-versatile (USD per 1M tokens)
const USD_IN = 0.59, USD_OUT = 0.79, INR_PER_USD = 95.5;

async function callGroq(system, user) {
  const t0 = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.5,
    }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return {
    ms,
    text: json.choices?.[0]?.message?.content ?? "",
    inTok: json.usage?.prompt_tokens ?? 0,
    outTok: json.usage?.completion_tokens ?? 0,
  };
}

// ── The scenario: the exact cross-team conflict the Company Brain exists to catch ──
const brain = createCompanyBrain();
brain.recordEvent({
  agent: "care", kind: "ticket_author", title: "Pipeline stuck at 40% for 3 hours",
  person: { name: "Priya Nair", email: "priya@talentbridge.co",
            attrs: { company: "TalentBridge", complaint: true } },
});
brain.recordEvent({
  agent: "sales", kind: "lead", title: "Prospect: TalentBridge",
  person: { name: "Priya Nair", email: "priya@talentbridge.co",
            attrs: { company: "TalentBridge", upsell: true, budget: "Rs 3-7L/yr" } },
});

const intel = salesAccountIntel(brain, {
  name: "Priya Nair", email: "priya@talentbridge.co", company: "TalentBridge",
});
const careCtx = brainContextFor(brain, { email: "priya@talentbridge.co" }, "care");

const steps = [
  { name: "JD analysis",
    system: "You are a senior Indian technical recruiter. Be specific and concise.",
    user: "Analyse this JD and list the 3 true must-haves vs 3 nice-to-haves:\n\nSenior Frontend Engineer, Bangalore B2B SaaS. 4+ yrs React+TypeScript, Next.js, GraphQL, system design, mentoring. Rs 28-42 LPA, remote." },
  { name: "Bias audit",
    system: "You audit Indian job descriptions for bias under the Equal Remuneration Act and Code on Wages.",
    user: "Flag any biased or exclusionary language and give a 0-100 fairness score:\n\n'Looking for a young, energetic salesman. Must be a recent graduate. Salary confidential.'" },
  { name: "SalesFlow email WITH Company Brain context",
    system: "You are a B2B sales writer for an Indian SaaS company.",
    user: `Write a 3-paragraph outreach email to Priya Nair, Head of HR at TalentBridge, about NexFlow AI (multi-agent business intelligence, Rs 2,999/month Team plan).${intel.prompt}` },
  { name: "CareFlow reply WITH Company Brain context",
    system: "You are an empathetic customer care agent.",
    user: `Write a reply to this ticket: "Our hiring pipeline has been stuck at 40% for over 3 hours. We have interviews tomorrow." Customer: Priya Nair, TalentBridge.${careCtx.prompt}` },
];

console.log(`\n=== REAL GROQ RUN — ${MODEL} ===`);
console.log(`Started ${new Date().toISOString()}\n`);

const results = [];
for (const s of steps) {
  process.stdout.write(`→ ${s.name} ... `);
  const r = await callGroq(s.system, s.user);
  results.push({ ...s, ...r });
  console.log(`${r.ms}ms · ${r.inTok} in / ${r.outTok} out tokens`);
}

const totIn = results.reduce((n, r) => n + r.inTok, 0);
const totOut = results.reduce((n, r) => n + r.outTok, 0);
const totMs = results.reduce((n, r) => n + r.ms, 0);
const usd = (totIn / 1e6) * USD_IN + (totOut / 1e6) * USD_OUT;
const inr = usd * INR_PER_USD;

console.log(`\n--- TOTALS ---`);
console.log(`calls: ${results.length} | latency: ${totMs}ms | tokens: ${totIn} in / ${totOut} out`);
console.log(`cost: $${usd.toFixed(5)} (Rs ${inr.toFixed(3)})`);

console.log(`\n--- BRAIN CONTEXT THAT WAS INJECTED (deterministic, not model output) ---`);
intel.notes.forEach((n) => console.log(`  ${n.warn ? "⚠️ " : "✓ "}${n.t}`));

console.log(`\n--- SAMPLE OUTPUT: ${results[2].name} ---`);
console.log(results[2].text.trim().slice(0, 600));

// ── markdown block for the README ───────────────────────────────────────────
const md = `
**Real-run log — ${new Date().toISOString().slice(0, 10)}**

Executed \`node scripts/real-run.mjs\` against the live Groq API (\`${MODEL}\`).
Real calls, real latency, real tokens — no mocks.

| Step | Latency | Tokens (in/out) |
|---|--:|--:|
${results.map((r) => `| ${r.name} | ${r.ms} ms | ${r.inTok} / ${r.outTok} |`).join("\n")}
| **Total** | **${totMs} ms** | **${totIn} / ${totOut}** |

Measured cost for this run: **$${usd.toFixed(5)} (≈ Rs ${inr.toFixed(3)})** at Groq's published
pricing ($${USD_IN}/M in, $${USD_OUT}/M out; Rs ${INR_PER_USD}/USD).

The Company Brain injected this cross-team context before the sales email was written:
${intel.notes.map((n) => `> ${n.warn ? "⚠️" : "✓"} ${n.t}`).join("\n")}

That context is produced deterministically by \`lib/companyBrain.js\` — it is identical on
every run and does not depend on the model.
`;
fs.writeFileSync(path.join(ROOT, "docs", "real-run-log.md"), md.trim() + "\n");
console.log(`\n✅ Wrote docs/real-run-log.md — paste it into the README's Validation section.\n`);
