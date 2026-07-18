import { describe, it, expect } from "vitest";
import { createCompanyBrain } from "./companyBrain";
import { brainContextFor, salesAccountIntel } from "./brainContext";

function seededBrain() {
  const b = createCompanyBrain();
  // Care: Raj at UrbanCart with an open complaint
  b.recordEvent({ agent: "care", kind: "ticket_author", title: "Billing issue",
    person: { name: "Raj Patel", email: "raj@urbancart.in", attrs: { company: "UrbanCart", complaint: true } } });
  // Sales already knows a different contact at the same account
  b.recordEvent({ agent: "sales", kind: "lead", title: "Lead",
    person: { name: "Neha Shah", email: "neha@urbancart.in", attrs: { company: "UrbanCart", budget: "5L" } } });
  return b;
}

describe("brainContextFor (person-level)", () => {
  it("returns empty when the person is unknown", () => {
    const b = createCompanyBrain();
    expect(brainContextFor(b, { name: "Nobody" }, "care")).toEqual({ notes: [], prompt: "" });
  });

  it("surfaces an open complaint to a non-care agent and injects a prompt", () => {
    const b = seededBrain();
    const ctx = brainContextFor(b, { email: "raj@urbancart.in" }, "sales");
    expect(ctx.notes.some((n) => /open complaint/i.test(n))).toBe(true);
    expect(ctx.prompt).toContain("COMPANY BRAIN");
  });

  it("does NOT tell the care agent about a complaint it already owns", () => {
    const b = seededBrain();
    const ctx = brainContextFor(b, { email: "raj@urbancart.in" }, "care");
    expect(ctx.notes.some((n) => /open complaint/i.test(n))).toBe(false);
  });
});

describe("salesAccountIntel (account-level)", () => {
  it("flags a net-new contact at a company that has an open complaint", () => {
    const b = seededBrain();
    const intel = salesAccountIntel(b, { name: "Ananya Iyer", email: "ananya@urbancart.in", company: "UrbanCart" });
    expect(intel.status).toBe("known");
    const warn = intel.notes.find((n) => n.warn);
    expect(warn).toBeTruthy();
    expect(warn.t).toMatch(/OPEN support ticket/i);
    expect(intel.prompt).toContain("account intelligence");
  });

  it("returns net-new for a genuinely unknown account", () => {
    const b = seededBrain();
    const intel = salesAccountIntel(b, { name: "Sam", email: "sam@brandnew.io", company: "BrandNew" });
    expect(intel.status).toBe("new");
    expect(intel.notes).toEqual([]);
  });

  it("matches on company name even when the email domain differs", () => {
    const b = seededBrain();
    const intel = salesAccountIntel(b, { name: "Ravi", email: "ravi@gmail.com", company: "UrbanCart" });
    expect(intel.status).toBe("known");
  });
});
