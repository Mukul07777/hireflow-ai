import { describe, it, expect } from "vitest";
import { createCompanyBrain, normalizeName, nameSimilarity, namesLookRelated, isLikelySamePerson, levenshtein } from "./companyBrain";

describe("fuzzy identity matching (messy real-world names)", () => {
  it("computes edit distance", () => {
    expect(levenshtein("raj", "raj")).toBe(0);
    expect(levenshtein("raj", "raa")).toBe(1);
  });

  it("treats short forms as related when the surname matches", () => {
    expect(namesLookRelated("Raj Patel", "Rajesh Patel")).toBe(true);
    expect(namesLookRelated("R. Patel", "Raj Patel")).toBe(true);
    expect(namesLookRelated("Raj Patel", "Sunita Rao")).toBe(false);
  });

  it("only merges when corroborated by company or email domain", () => {
    expect(isLikelySamePerson(
      { name: "Raj Patel", email: "raj@urbancart.in" },
      { name: "Rajesh Patel", email: "rajesh@urbancart.in" })).toBe(true);
    // same person-ish name but a different company — must NOT merge
    expect(isLikelySamePerson(
      { name: "Raj Patel", email: "raj@urbancart.in" },
      { name: "Rajesh Patel", email: "rajesh@othercorp.in" })).toBe(false);
    // different people at the same company — must NOT merge
    expect(isLikelySamePerson(
      { name: "Raj Patel", company: "UrbanCart" },
      { name: "Ananya Iyer", company: "UrbanCart" })).toBe(false);
  });

  it("merges fuzzily in the graph without collapsing distinct colleagues", () => {
    const b = createCompanyBrain();
    b.recordEvent({ agent: "care", kind: "ticket_author", title: "t",
      person: { name: "Raj Patel", email: "raj@urbancart.in", attrs: { company: "UrbanCart" } } });
    b.recordEvent({ agent: "sales", kind: "lead", title: "l",
      person: { name: "Rajesh Patel", email: "rajesh@urbancart.in", attrs: { company: "UrbanCart" } } });
    expect(b.stats().entities).toBe(1);
    expect(b.stats().mergedIdentities).toBe(1);

    const c = createCompanyBrain();
    c.recordEvent({ agent: "care", kind: "ticket_author", title: "t",
      person: { name: "Raj Patel", email: "raj@urbancart.in", attrs: { company: "UrbanCart" } } });
    c.recordEvent({ agent: "sales", kind: "lead", title: "l",
      person: { name: "Ananya Iyer", email: "ananya@urbancart.in", attrs: { company: "UrbanCart" } } });
    expect(c.stats().entities).toBe(2);
  });
});

describe("normalizeName", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeName("  Raj   Sharma ")).toBe("raj sharma");
  });
});

describe("identity resolution (the core value)", () => {
  it("merges the same person seen by two agents via matching email", () => {
    const b = createCompanyBrain();
    b.remember({ name: "Priya Nair", email: "priya@acme.in", source: "support", kind: "ticket_author" });
    b.remember({ name: "Priya Nair", email: "priya@acme.in", source: "sales", kind: "lead", attrs: { budget: "5L" } });
    expect(b.stats().entities).toBe(1);
    const view = b.getUnifiedView({ email: "priya@acme.in" });
    expect(view.sources.sort()).toEqual(["sales", "support"]);
    expect(view.kinds.sort()).toEqual(["lead", "ticket_author"]);
    expect(view.attrs.budget).toBe("5L");
  });

  it("matches on phone even when the name differs slightly", () => {
    const b = createCompanyBrain();
    b.remember({ name: "Amit", phone: "+91 98765 43210", source: "care" });
    b.remember({ name: "Amit Kumar", phone: "9876543210", source: "sales" });
    expect(b.stats().entities).toBe(1);
    // keeps the longer, fuller name
    expect(b.getEntity({ phone: "9876543210" }).name).toBe("Amit Kumar");
  });

  it("keeps genuinely different people separate", () => {
    const b = createCompanyBrain();
    b.remember({ name: "Raj", email: "raj@x.in", source: "sales" });
    b.remember({ name: "Sunita", email: "sunita@y.in", source: "support" });
    expect(b.stats().entities).toBe(2);
    expect(b.stats().mergedIdentities).toBe(0);
  });
});

describe("timeline", () => {
  it("records events newest-first and ties them to the entity", () => {
    const b = createCompanyBrain();
    b.recordEvent({ agent: "sales", kind: "lead", title: "Prospect created", person: { name: "Neha", email: "neha@z.in" } });
    b.recordEvent({ agent: "care", kind: "ticket", title: "Complaint filed", person: { name: "Neha", email: "neha@z.in" } });
    const view = b.getUnifiedView({ email: "neha@z.in" });
    expect(view.events.length).toBe(2);
    expect(b.timeline[0].title).toBe("Complaint filed");
  });
});

describe("next-best-action insights (deterministic)", () => {
  it("flags an upsell target who also has an open complaint as high priority", () => {
    const b = createCompanyBrain();
    b.remember({ name: "Vikram Rao", email: "vikram@co.in", source: "sales", kind: "lead" });
    b.remember({ name: "Vikram Rao", email: "vikram@co.in", source: "care", kind: "ticket_author" });
    const top = b.getInsights()[0];
    expect(top.id).toContain("resolve_before_upsell");
    expect(top.priority).toBe("high");
    expect(top.agents).toContain("care");
  });

  it("suggests a warm upsell for a support customer sales has never touched", () => {
    const b = createCompanyBrain();
    b.remember({ name: "Kiran", email: "kiran@co.in", source: "support", kind: "customer" });
    const ids = b.getInsights().map((i) => i.id);
    expect(ids.some((id) => id.startsWith("warm_upsell"))).toBe(true);
  });

  it("triggers onboarding for a hired candidate", () => {
    const b = createCompanyBrain();
    b.remember({ name: "Deepa", email: "deepa@co.in", source: "hiring", kind: "candidate", attrs: { hired: true } });
    const ids = b.getInsights().map((i) => i.id);
    expect(ids.some((id) => id.startsWith("onboard_hire"))).toBe(true);
  });

  it("is deterministic — same input, same insight order", () => {
    const build = () => {
      const b = createCompanyBrain();
      b.remember({ name: "A One", email: "a@co.in", source: "support", kind: "customer" });
      b.remember({ name: "B Two", email: "b@co.in", source: "sales", kind: "lead" });
      b.remember({ name: "B Two", email: "b@co.in", source: "care", kind: "ticket_author" });
      return b.getInsights().map((i) => i.id);
    };
    expect(build()).toEqual(build());
  });
});

describe("seed replay (persistence rebuild)", () => {
  it("rebuilds the graph from a persisted event log", () => {
    const seed = [
      { agent: "sales", kind: "lead", title: "Lead", person: { name: "Meera", email: "meera@co.in" } },
      { agent: "care", kind: "ticket_author", title: "Ticket", person: { name: "Meera", email: "meera@co.in" } },
    ];
    const b = createCompanyBrain(seed);
    expect(b.stats().entities).toBe(1);
    expect(b.stats().events).toBe(2);
  });
});
