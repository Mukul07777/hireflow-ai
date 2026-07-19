/**
 * modeAccess.js — which app modes a given employee role may see.
 *
 * FAIL-OPEN BY DESIGN. Signing in must never remove features. A logged-out visitor
 * and a signed-in admin see exactly the same seven AI systems; only an explicitly
 * known, explicitly restricted role narrows the nav. Anything unexpected (missing
 * role, still-loading role, legacy role from an older schema) shows everything.
 *
 * This is the UI-layer half of the access boundary. The RLS policies in
 * supabase/04_multitenancy.sql are the real, enforced half — this mapping alone
 * would not stop a determined user, it just keeps the nav honest.
 */

export const ALL_MODES = ["hiring", "sales", "support", "care", "smb", "warroom", "brain", "team"];

export const ROLE_MODE_ACCESS = {
  admin: ALL_MODES,
  hiring_manager: ["hiring", "smb", "brain"],
  sales_rep: ["sales", "smb", "brain"],
  support_agent: ["support", "smb", "brain"],
  care_agent: ["care", "smb", "brain"],
};

export function modeAllowedForRole(modeId, role) {
  if (!role) return true;              // demo mode, or employee record not loaded yet
  if (role === "admin") return true;   // admin sees everything, always
  const allowed = ROLE_MODE_ACCESS[role];
  if (!allowed) return true;           // unknown / legacy role → never hide anything
  return allowed.includes(modeId);
}
