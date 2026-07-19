/**
 * companyBrain.js — the shared cross-agent memory for NexFlow AI.
 *
 * THE PROBLEM THIS SOLVES (real-world):
 * A small business runs hiring, sales, support and care as separate silos. The same
 * person shows up as a "customer" in support, a "lead" in sales, and nobody connects
 * the two — so an angry support ticket from a paying customer gets pitched an upsell
 * the next day, and a hot lead who also filed a complaint slips through. Six clever
 * agents that don't share memory are still six silos.
 *
 * WHAT THIS IS:
 * A single in-memory graph that every agent reads from and writes to. It does three
 * concrete things a pile of separate agent outputs cannot:
 *   1. IDENTITY RESOLUTION — the same person seen by two agents (matched on email, then
 *      phone, then normalized name) becomes ONE record with facts merged from both.
 *   2. TIMELINE — every agent action is one event on a single company-wide timeline.
 *   3. NEXT-BEST-ACTION — deterministic rules read the merged graph and surface the
 *      cross-silo actions no single agent could see (e.g. "this upsell target has an
 *      open complaint — resolve it first").
 *
 * DESIGN NOTE — deterministic, not an LLM. Every insight here is a pure function of the
 * data in the graph. The same events always produce the same insights. That is on
 * purpose: this is the trustworthy, reproducible spine that the probabilistic agents
 * hang off of, the same philosophy as indiaComplianceRules.js. No hidden model calls.
 *
 * Storage: in-memory by default. Pass a seed array of events to rebuild from a persisted
 * log (e.g. loaded from the company_brain Supabase table), so the brain survives a reload.
 */

// ── normalization ────────────────────────────────────────────────────────────
export function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function normEmail(e) {
  return (e || "").trim().toLowerCase() || null;
}
function normPhone(p) {
  const digits = (p || "").replace(/\D/g, "");
  if (!digits) return null;
  // keep the last 10 digits so +91-98765 43210 and 9876543210 match
  return digits.slice(-10);
}

// A stable identity key: prefer email, then phone, then normalized name. This is what
// makes "the same person seen by two agents" collapse into one record.
function identityKey({ name, email, phone }) {
  return normEmail(email) || normPhone(phone) || normalizeName(name) || null;
}

// ── FUZZY NAME MATCHING ──────────────────────────────────────────────────────
// Real CRM data is messy: "Raj Patel" in support, "Rajesh Patel" in sales, "R. Patel"
// in hiring. Exact matching misses all of those, which is the difference between a demo
// and something usable. Levenshtein distance gives a similarity ratio; we only accept a
// fuzzy match when the names are close AND corroborated by the same company/email domain,
// so we don't collapse two genuinely different people who happen to have similar names.
export function levenshtein(a, b) {
  a = a || ""; b = b || "";
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,            // deletion
        cur[j - 1] + 1,         // insertion
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 similarity between two names (1 = identical). */
export function nameSimilarity(a, b) {
  const x = normalizeName(a), y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const max = Math.max(x.length, y.length);
  return max === 0 ? 0 : 1 - levenshtein(x, y) / max;
}

/**
 * Token-aware name match. Raw edit distance is a poor fit for human names:
 * "Raj Patel" vs "Rajesh Patel" scores only 0.75 because the diff is concentrated
 * in one token. This compares surname exactly and allows a first-name that is a
 * prefix/short form of the other ("Raj" → "Rajesh", "R." → "Raj").
 */
export function namesLookRelated(a, b) {
  const clean = (s) => normalizeName(s).replace(/[.]/g, "").trim();
  const ta = clean(a).split(" ").filter(Boolean);
  const tb = clean(b).split(" ").filter(Boolean);
  if (ta.length < 2 || tb.length < 2) return false;
  if (ta[ta.length - 1] !== tb[tb.length - 1]) return false; // surname must match exactly
  const fa = ta[0], fb = tb[0];
  if (fa === fb) return true;
  const short = fa.length <= fb.length ? fa : fb;
  const long = fa.length <= fb.length ? fb : fa;
  return short.length >= 1 && long.startsWith(short); // "raj"→"rajesh", "r"→"raj"
}

/**
 * Do two records plausibly describe the same person?
 * Requires BOTH a related name AND a corroborating signal (same company or email domain).
 * Corroboration is what keeps this safe — name similarity alone is never enough.
 */
export function isLikelySamePerson(a, b, threshold = 0.82) {
  const sim = nameSimilarity(a.name, b.name);
  if (sim < threshold && !namesLookRelated(a.name, b.name)) return false;
  const domainA = ((a.email || "").split("@")[1] || "").toLowerCase();
  const domainB = ((b.email || "").split("@")[1] || "").toLowerCase();
  const compA = (a.company || "").trim().toLowerCase();
  const compB = (b.company || "").trim().toLowerCase();
  const corroborated = (domainA && domainA === domainB) || (compA && compA === compB);
  return Boolean(corroborated);
}

/**
 * @param {Array} seedEvents - optional persisted event log to replay on construction.
 */
export function createCompanyBrain(seedEvents = []) {
  // identityKey -> entity record
  const entities = new Map();
  // list of { at, agent, kind, title, desc, entityKey }
  const timeline = [];
  // Set of "aKey|bKey" pairs plus relation, for the graph
  const links = [];

  function resolveKey(person) {
    // Pass 1 — exact, high-confidence signals: email, then phone, then exact name.
    const email = normEmail(person.email);
    const phone = normPhone(person.phone);
    const nameKey = normalizeName(person.name);
    for (const [key, e] of entities) {
      if (email && e.email === email) return key;
      if (phone && e.phone === phone) return key;
      if (nameKey && e.nameKey === nameKey) return key;
    }
    // Pass 2 — fuzzy, but only when corroborated by the same company or email domain.
    // Catches "Raj Patel" vs "Rajesh Patel" at the same account without merging
    // two different people who merely have similar names.
    const candidate = { name: person.name, email: person.email, company: person.attrs?.company };
    for (const [key, e] of entities) {
      if (isLikelySamePerson(candidate, { name: e.name, email: e.email, company: e.attrs?.company })) {
        return key;
      }
    }
    return identityKey(person);
  }

  /**
   * Record (or merge into) an entity — a person or business the company deals with.
   * @param {object} p - { name, email?, phone?, kind, source, attrs? }
   *   kind: 'customer' | 'lead' | 'candidate' | 'ticket_author' | 'business'
   *   source: which agent contributed this ('sales' | 'support' | 'care' | 'hiring' | 'smb')
   * @returns {string|null} the resolved identity key, or null if unidentifiable.
   */
  function remember(p) {
    const key = resolveKey(p);
    if (!key) return null;
    const existing = entities.get(key);
    if (existing) {
      // merge — fill blanks, union sources/kinds/attrs, never lose earlier data
      existing.email = existing.email || normEmail(p.email);
      existing.phone = existing.phone || normPhone(p.phone);
      existing.nameKey = existing.nameKey || normalizeName(p.name);
      if (p.name && p.name.length > (existing.name || "").length) existing.name = p.name;
      if (p.source) existing.sources.add(p.source);
      if (p.kind) existing.kinds.add(p.kind);
      Object.assign(existing.attrs, p.attrs || {});
      existing.touches += 1;
    } else {
      entities.set(key, {
        key,
        name: p.name || p.email || p.phone || "Unknown",
        nameKey: normalizeName(p.name),
        email: normEmail(p.email),
        phone: normPhone(p.phone),
        kinds: new Set(p.kind ? [p.kind] : []),
        sources: new Set(p.source ? [p.source] : []),
        attrs: { ...(p.attrs || {}) },
        touches: 1,
      });
    }
    return key;
  }

  /** Record an event on the company-wide timeline, optionally tied to an entity. */
  function recordEvent(ev) {
    let entityKey = ev.entityKey || null;
    if (!entityKey && ev.person) entityKey = remember({ ...ev.person, source: ev.agent, kind: ev.kind });
    timeline.push({
      at: ev.at || timeline.length + 1, // monotonic fallback keeps ordering deterministic in tests
      agent: ev.agent || "system",
      kind: ev.kind || "event",
      title: ev.title || "",
      desc: ev.desc || "",
      entityKey,
    });
    return entityKey;
  }

  /** Assert a relationship between two people/businesses (e.g. lead ↔ complaint). */
  function link(aPerson, bPerson, relation) {
    const a = remember(aPerson);
    const b = remember(bPerson);
    if (!a || !b || a === b) return;
    if (!links.find((l) => l.a === a && l.b === b && l.relation === relation)) {
      links.push({ a, b, relation });
    }
  }

  function getEntity(person) {
    const key = resolveKey(typeof person === "string" ? { name: person } : person);
    return entities.get(key) || null;
  }

  /** The 360° view of one entity: merged facts + every event that touched them + links. */
  function getUnifiedView(person) {
    const e = getEntity(person);
    if (!e) return null;
    return {
      name: e.name,
      email: e.email,
      phone: e.phone,
      kinds: [...e.kinds],
      sources: [...e.sources],
      attrs: e.attrs,
      touches: e.touches,
      events: timeline.filter((t) => t.entityKey === e.key),
      links: links
        .filter((l) => l.a === e.key || l.b === e.key)
        .map((l) => ({ relation: l.relation, with: entities.get(l.a === e.key ? l.b : l.a)?.name })),
    };
  }

  /**
   * DERIVED NEXT-BEST-ACTIONS — the payoff. Pure rules over the merged graph that surface
   * the cross-silo moves no single agent can see. Each has a stable id, a priority, and a
   * plain-language reason grounded in the actual data.
   */
  function getInsights() {
    const out = [];
    for (const e of entities.values()) {
      const kinds = e.kinds;
      const sources = e.sources;

      // 1. Upsell target who also has an open complaint — resolve before pitching.
      if ((kinds.has("lead") || e.attrs.upsell) && (kinds.has("ticket_author") || e.attrs.complaint)) {
        out.push({
          id: "resolve_before_upsell:" + e.key,
          priority: "high",
          entity: e.name,
          action: "Resolve the open complaint before the sales team pitches an upsell",
          reason: `${e.name} appears as both a sales opportunity and the author of a support/care ticket. Pitching now risks the deal.`,
          agents: ["care", "sales"],
        });
      }

      // 2. Paying/support customer not yet worked as a lead — warm upsell.
      if ((sources.has("support") || sources.has("care") || kinds.has("customer")) && !sources.has("sales")) {
        out.push({
          id: "warm_upsell:" + e.key,
          priority: "medium",
          entity: e.name,
          action: "Route to SalesFlow as a warm upsell lead",
          reason: `${e.name} is already an active customer known to support/care but has never been worked by sales — the warmest lead there is.`,
          agents: ["sales"],
        });
      }

      // 3. Hired candidate — trigger onboarding.
      if (kinds.has("candidate") && e.attrs.hired) {
        out.push({
          id: "onboard_hire:" + e.key,
          priority: "high",
          entity: e.name,
          action: "Kick off onboarding + provision support access",
          reason: `${e.name} was marked hired in HireFlow. Onboarding and a support account should be created now.`,
          agents: ["support", "care"],
        });
      }

      // 4. Same person seen by 3+ agents — a key relationship worth an owner.
      if (sources.size >= 3) {
        out.push({
          id: "assign_owner:" + e.key,
          priority: "low",
          entity: e.name,
          action: "Assign a single account owner",
          reason: `${e.name} has been touched by ${sources.size} different teams (${[...sources].join(", ")}). One owner prevents mixed signals.`,
          agents: [...sources],
        });
      }
    }
    // deterministic ordering: priority then entity name
    const rank = { high: 0, medium: 1, low: 2 };
    return out.sort((x, y) => rank[x.priority] - rank[y.priority] || x.entity.localeCompare(y.entity));
  }

  function stats() {
    const bySource = {};
    for (const e of entities.values()) for (const s of e.sources) bySource[s] = (bySource[s] || 0) + 1;
    const merged = [...entities.values()].filter((e) => e.sources.size > 1).length;
    return {
      entities: entities.size,
      events: timeline.length,
      links: links.length,
      mergedIdentities: merged, // people known to more than one agent — the whole point
      bySource,
    };
  }

  // replay any persisted seed events
  seedEvents.forEach((ev) => recordEvent(ev));

  return {
    remember,
    recordEvent,
    link,
    getEntity,
    getUnifiedView,
    getInsights,
    stats,
    get timeline() {
      return [...timeline].reverse(); // newest first for display
    },
    get entities() {
      return [...entities.values()];
    },
  };
}
