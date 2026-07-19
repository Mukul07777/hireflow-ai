import { describe, it, expect } from "vitest";
import { modeAllowedForRole, ALL_MODES } from "./modeAccess";

// The bug this file exists to prevent: signing in used to REMOVE systems from the
// home grid (7 systems + Team dropped to 6). Access must never shrink on login.
describe("mode access — signing in must never remove features", () => {
  it("shows every mode to a logged-out visitor (no role)", () => {
    for (const m of ALL_MODES) expect(modeAllowedForRole(m, null)).toBe(true);
  });

  it("shows every mode to an admin — identical to logged-out", () => {
    for (const m of ALL_MODES) expect(modeAllowedForRole(m, "admin")).toBe(true);
  });

  it("shows Company Brain and Team to an admin (the exact regression)", () => {
    expect(modeAllowedForRole("brain", "admin")).toBe(true);
    expect(modeAllowedForRole("team", "admin")).toBe(true);
  });

  it("fails OPEN for an unknown or legacy role instead of hiding things", () => {
    for (const m of ALL_MODES) expect(modeAllowedForRole(m, "some_old_role")).toBe(true);
    for (const m of ALL_MODES) expect(modeAllowedForRole(m, "")).toBe(true);
  });

  it("still narrows the nav for an explicitly restricted role", () => {
    expect(modeAllowedForRole("hiring", "sales_rep")).toBe(false);
    expect(modeAllowedForRole("sales", "sales_rep")).toBe(true);
    expect(modeAllowedForRole("brain", "sales_rep")).toBe(true); // shared memory for everyone
  });

  it("gives every restricted role access to the Company Brain", () => {
    for (const role of ["hiring_manager", "sales_rep", "support_agent", "care_agent"]) {
      expect(modeAllowedForRole("brain", role)).toBe(true);
    }
  });
});
