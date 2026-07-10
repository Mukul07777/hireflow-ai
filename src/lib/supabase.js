// ── Supabase REST client — no SDK needed, pure fetch ─────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const DB_READY =
  !!SUPABASE_URL && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co'

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation',
}

/** INSERT a row, returns the inserted row or null */
export async function dbInsert(table, row) {
  if (!DB_READY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
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
      headers,
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers })
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
      headers,
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
      headers,
    })
    if (!res.ok) { console.error(`dbDelete ${table}:`, await res.text()); return null }
    return await res.json()
  } catch (e) { console.error(`dbDelete ${table}:`, e); return null }
}
