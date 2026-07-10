import { describe, it, expect } from "vitest";
import {
  savePipelineRun,
  loadPipelineHistory,
  loadCandidatesForRun,
  saveOutreachEmail,
  markEmailSent,
  saveSalesSession,
  loadSalesSessions,
  saveSupportSession,
  saveCareTicket,
  loadCareTickets,
  deleteAllUserData,
  DB_READY,
} from "./db.js";

// These tests run without VITE_SUPABASE_URL configured (the normal state for CI/local dev
// without a .env file), which exercises the "DB not configured" fallback path every helper
// is supposed to degrade to gracefully instead of throwing.

describe("db.js — graceful degradation when Supabase is not configured", () => {
  it("DB_READY is false without env vars", () => {
    expect(DB_READY).toBe(false);
  });

  it("savePipelineRun returns null instead of throwing", async () => {
    const result = await savePipelineRun({ jdText: "Senior Engineer", candidates: [], totalResumes: 0 });
    expect(result).toBeNull();
  });

  it("loadPipelineHistory returns an empty array instead of throwing", async () => {
    const result = await loadPipelineHistory();
    expect(result).toEqual([]);
  });

  it("loadCandidatesForRun returns an empty array instead of throwing", async () => {
    const result = await loadCandidatesForRun("some-run-id");
    expect(result).toEqual([]);
  });

  it("saveOutreachEmail returns null instead of throwing", async () => {
    const result = await saveOutreachEmail({ runId: "x", subject: "Hi", body: "Body" });
    expect(result).toBeNull();
  });

  it("markEmailSent resolves without throwing even with no db configured", async () => {
    await expect(markEmailSent("some-id")).resolves.toBeUndefined();
  });

  it("saveSalesSession returns null instead of throwing", async () => {
    const result = await saveSalesSession({ product: "CRM", industry: "Retail", prospects: [] });
    expect(result).toBeNull();
  });

  it("loadSalesSessions returns an empty array instead of throwing", async () => {
    const result = await loadSalesSessions();
    expect(result).toEqual([]);
  });

  it("saveSupportSession returns null instead of throwing", async () => {
    const result = await saveSupportSession({ docs: [], kb: [], chats: [] });
    expect(result).toBeNull();
  });

  it("saveCareTicket returns null instead of throwing", async () => {
    const result = await saveCareTicket({
      ticket: { id: 1, customer: "Test", company: "Acme", subject: "Issue", message: "Help", priority: "high", category: "billing", sentiment: "negative" },
      toneUsed: "empathetic",
      aiResponse: "We're on it",
      approved: false,
    });
    expect(result).toBeNull();
  });

  it("loadCareTickets returns an empty array instead of throwing", async () => {
    const result = await loadCareTickets();
    expect(result).toEqual([]);
  });

  it("deleteAllUserData returns a clear failure reason instead of throwing when DB isn't configured", async () => {
    const result = await deleteAllUserData("some-user-id");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not configured/i);
  });

  it("deleteAllUserData returns a failure when called without a user id", async () => {
    const result = await deleteAllUserData(null);
    expect(result.ok).toBe(false);
  });
});
