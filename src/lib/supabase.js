// ── Supabase REST client — no SDK needed, pure fetch ─────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const DB_READY =
  !!SUPABASE_URL && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co'

// ── Auth token wiring ──────────────────────────────────────────────────────
// CRITICAL: every RLS policy in this app (auth.uid() = user_id, or the newer
// company/employees-scoped policies) depends on Postgres seeing the CALLING
// USER'S identity via their JWT. Supabase only resolves auth.uid() when the
// request's Authorization header carries that user's access token — the
// 'apikey' header (anon key) alone does NOT do this, it just authorizes the
// request as "some anonymous client allowed to hit the API at all."
// Previously this file always sent `Authorization: Bearer <anon key>` for
// every request, regardless of who was logged in. That means auth.uid() was
// NULL on every single request this app has ever made, which means every
// "auth.uid() = user_id" (or employees-join) RLS policy could only ever have
// been satisfied by accident — the only reason reads/writes worked at all is
// that supabase_schema.sql's permissive "public access" policy was still
// present and OR'd in. Once supabase_rls_v2_fix.sql (which drops that
// permissive policy) is run, every read and write in this app would have
// silently started failing — dbSelect returning [], dbInsert/dbUpdate/dbDelete
// returning null — with no thrown error, which is the worst possible failure
// mode because it looks like "no data" rather than a crash.
// setAuthToken() below must be called with the logged-in user's access_token
// whenever a session starts, and with null on sign-out / demo mode.
let _userAccessToken = null
export function setAuthToken(token) {
  _userAccessToken = token || null
}
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${_userAccessToken || SUPABASE_KEY}`,
    'Prefer': 'return=representation',
  }
}

/** INSERT a row, returns the inserted row or null */
export async function dbInsert(table, row) {
  if (!DB_READY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(row),
    })
    if (!res.ok) { console.error(`dbInsert ${table}:`, await res.text()); return null }
    const data = await res.json()
    return Array.isArray(data) ? data[0] : data
  } catch (e) { console.error(`dbInsert ${table}:`, e); return null }
}

/** INSERT multiple rows */
export async function dbInsertMany(table, rows) {
  if (!DB_READY || !rows.length) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(rows),
    })
    if (!res.ok) { console.error(`dbInsertMany ${table}:`, await res.text()); return null }
    return await res.json()
  } catch (e) { console.error(`dbInsertMany ${table}:`, e); return null }
}

/** SELECT rows — params is an object of query filters e.g. {run_id: 'eq.uuid'} */
export async function dbSelect(table, params = {}, orderBy = 'created_at.desc', limit = 20) {
  if (!DB_READY) return []
  try {
    const qs = new URLSearchParams({ order: orderBy, limit })
    Object.entries(params).forEach(([k, v]) => qs.set(k, v))
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: getHeaders() })
    if (!res.ok) { console.error(`dbSelect ${table}:`, await res.text()); return [] }
    return await res.json()
  } catch (e) { console.error(`dbSelect ${table}:`, e); return [] }
}

/** UPDATE rows matching filter */
export async function dbUpdate(table, filter, updates) {
  if (!DB_READY) return null
  try {
    const qs = new URLSearchParams(filter)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
    if (!res.ok) { console.error(`dbUpdate ${table}:`, await res.text()); return null }
    return await res.json()
  } catch (e) { console.error(`dbUpdate ${table}:`, e); return null }
}

/** DELETE rows matching filter — returns the deleted rows (Supabase's Prefer: return=representation), or null on failure. */
export async function dbDelete(table, filter) {
  if (!DB_READY) return null
  try {
    const qs = new URLSearchParams(filter)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) { console.error(`dbDelete ${table}:`, await res.text()); return null }
    return await res.json()
  } catch (e) { console.error(`dbDelete ${table}:`, e); return null }
}
