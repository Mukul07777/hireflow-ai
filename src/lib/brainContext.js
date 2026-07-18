/**
 * brainContext.js — turns the Company Brain's memory into the context an individual
 * agent should read BEFORE it drafts. This is the read-side of the closed loop, kept
 * as pure functions (they take a brain instance in) so they're unit-testable without
 * React, the DOM, or an API key.
 *
 *   brainContextFor(brain, person, selfAgent)  — person-level cross-team memory
 *   salesAccountIntel(brain, prospect)         — ACCOUNT-level (email domain / company)
 */

const AGENT_LABELS = { sales: "Sales", support: "Support", care: "Care", hiring: "Hiring", smb: "SMB" };

// Person-level: what the OTHER agents already know about this exact person.
// Returns { notes:[strings], prompt:"…to inject into the LLM…" }. Empty when there's
// no cross-team memory — an honest "nothing to add" instead of noise.
export function brainContextFor(brain, person, selfAgent) {
  const view = brain.getUnifiedView(person);
  if (!view) return { notes: [], prompt: "" };
  const otherSources = view.sources.filter((s) => s !== selfAgent && AGENT_LABELS[s]);
  const notes = [];
  if (otherSources.length) notes.push("Also known to " + otherSources.map((s) => AGENT_LABELS[s]).join(" & "));
  if (view.attrs.complaint && selfAgent !== "care") notes.push("Has an open complaint on file");
  if (view.attrs.upsell && selfAgent !== "sales") notes.push("Flagged as an upsell / sales opportunity");
  if (view.attrs.budget) notes.push("Budget: " + view.attrs.budget);
  const ins = brain.getInsights().find((i) => i.entity === view.name && i.priority === "high");
  if (ins) notes.push("Suggested next move: " + ins.action);
  if (!notes.length) return { notes: [], prompt: "" };
  return {
    notes,
    prompt:
      "\n\nCOMPANY BRAIN — cross-team memory on this person (use it to make the message smarter; do NOT restate it verbatim): " +
      notes.join("; ") + ".",
  };
}

// Account-level: matches the whole ACCOUNT (email domain or company name), so even a
// brand-new contact inherits what we know about their colleagues. Returns
// { status:"known"|"new", notes:[{t,warn}], prompt } — always something, so the loop
// is visible on every prospect (net-new is a real, useful signal too).
export function salesAccountIntel(brain, prospect) {
  const notes = [];
  const view = brain.getUnifiedView({ name: prospect.name, email: prospect.email });
  if (view) {
    const other = view.sources.filter((s) => s !== "sales" && AGENT_LABELS[s]);
    if (other.length) notes.push({ t: "This exact contact is already known to " + other.map((s) => AGENT_LABELS[s]).join(" & "), warn: false });
    if (view.attrs.complaint) notes.push({ t: "They have an open complaint — align with Care before pitching", warn: true });
  }
  const domain = ((prospect.email || "").split("@")[1] || "").toLowerCase();
  const comp = (prospect.company || "").trim().toLowerCase();
  const seen = new Set();
  for (const e of brain.entities) {
    if (view && e.name === view.name) continue;
    const eDomain = ((e.email || "").split("@")[1] || "").toLowerCase();
    const eComp = (e.attrs.company || "").trim().toLowerCase();
    const match = (domain && eDomain && eDomain === domain) || (comp && eComp && eComp === comp);
    if (!match || seen.has(e.name)) continue;
    seen.add(e.name);
    if (e.attrs.complaint) notes.push({ t: e.name + " at this account has an OPEN support ticket — coordinate with Care first", warn: true });
    else if (e.sources.has("care") || e.sources.has("support")) notes.push({ t: e.name + " at this account is already our customer — warm intro available", warn: false });
    else if (e.sources.has("hiring")) notes.push({ t: e.name + " here came through hiring — existing relationship", warn: false });
  }
  const promptNotes = notes.map((n) => n.t);
  return {
    status: notes.length ? "known" : "new",
    notes,
    prompt: notes.length
      ? "\n\nCOMPANY BRAIN — account intelligence (do NOT restate verbatim; let it shape tone and whether to pitch now): " + promptNotes.join("; ") + "."
      : "",
  };
}
