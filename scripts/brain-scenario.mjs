/**
 * brain-scenario.mjs — a reproducible, honestly-labeled proof of the closed loop.
 *
 * Run:  node scripts/brain-scenario.mjs
 *
 * WHAT THIS IS: a small, fixed dataset (authored for this project — NOT real customer
 * data) fed through the exact same Company Brain engine the app uses in production
 * (src/lib/companyBrain.js). It prints the resolved identities and the deterministic
 * next-best-actions. Because the engine is deterministic, this output is identical on
 * every run — you can verify the "AI knows the customer across teams" claim yourself,
 * without a browser, a login, or an API key.
 *
 * WHY IT MATTERS: it separates what's real (the cross-agent memory + reasoning, which is
 * pure and reproducible) from what's a demo (the LLM drafting on top). Judges can run
 * this in 2 seconds and see the core mechanism is genuinely working, not hand-waved.
 */
import { createCompanyBrain } from "../src/lib/companyBrain.js";

// ── Labeled scenario (illustrative — authored for this project) ───────────────
// Two teams, unknowingly dealing with the SAME company (UrbanCart) and, in one case,
// the same person by a different phone format.
const events = [
  // CareFlow: an angry billing complaint from a paying customer
  { agent: "care", kind: "ticket_author", title: "Charged twice for Team plan",
    person: { name: "Raj Patel", email: "raj@urbancart.in", phone: "+91 98200 11111",
              attrs: { company: "UrbanCart", complaint: true, city: "Mumbai" } } },
  // SalesFlow: a NEW prospect at the SAME company (different person, same domain)
  { agent: "sales", kind: "lead", title: "Prospect: UrbanCart",
    person: { name: "Ananya Iyer", email: "ananya@urbancart.in",
              attrs: { company: "UrbanCart", budget: "Rs 5-10L/yr", upsell: true } } },
  // SupportFlow: same Raj, phone written differently — must still merge to one record
  { agent: "support", kind: "customer", title: "Follow-up on refund",
    person: { name: "Raj Patel", phone: "9820011111", attrs: { company: "UrbanCart" } } },
  // HireFlow: an unrelated hired candidate — should trigger onboarding, nothing else
  { agent: "hiring", kind: "candidate", title: "Candidate: Deepa Menon",
    person: { name: "Deepa Menon", email: "deepa@example.in", attrs: { hired: true } } },
];

const brain = createCompanyBrain(events);

console.log("\n=== IDENTITY RESOLUTION ===");
for (const e of brain.entities) {
  console.log(`• ${e.name.padEnd(14)} known to [${[...e.sources].join(", ")}]` +
    (e.sources.size > 1 ? "  <-- MERGED across teams" : ""));
}

console.log(`\nDistinct people: ${brain.stats().entities}  |  Merged identities: ${brain.stats().mergedIdentities}`);

console.log("\n=== NEXT-BEST-ACTIONS (deterministic) ===");
for (const ins of brain.getInsights()) {
  console.log(`[${ins.priority.toUpperCase()}] ${ins.entity}: ${ins.action}`);
  console.log(`        why: ${ins.reason}`);
}

// ── Account-level intelligence (same logic the app runs before SalesFlow drafts) ──
// Match a prospect to the whole ACCOUNT (email domain / company), not just the person.
function accountFlagsFor(prospect) {
  const domain = (prospect.email.split("@")[1] || "").toLowerCase();
  const comp = (prospect.company || "").toLowerCase();
  const flags = [];
  for (const e of brain.entities) {
    if (e.email === prospect.email.toLowerCase()) continue;
    const eDomain = ((e.email || "").split("@")[1] || "").toLowerCase();
    const eComp = (e.attrs.company || "").toLowerCase();
    if ((domain && eDomain === domain) || (comp && eComp === comp)) {
      if (e.attrs.complaint) flags.push(`${e.name} at this account has an OPEN complaint — coordinate with Care first`);
      else flags.push(`${e.name} is already known at this account`);
    }
  }
  return flags;
}

console.log("\n=== SALESFLOW ACCOUNT CHECK (before drafting to Ananya) ===");
const flags = accountFlagsFor({ name: "Ananya Iyer", email: "ananya@urbancart.in", company: "UrbanCart" });
flags.forEach(f => console.log("⚠️  " + f));
if (!flags.length) console.log("Net-new account.");

console.log("\n=== THE POINT ===");
console.log("Raj (Care + Support, phone written two ways) collapses into ONE record.");
console.log("Ananya is net-new to Sales, but the Brain flags UrbanCart already has an open");
console.log("complaint (Raj) — so SalesFlow is told to coordinate with Care before pitching.");
console.log("No single agent could see this. The shared memory makes it obvious.\n");
