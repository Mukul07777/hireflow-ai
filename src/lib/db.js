/**
 * db.js — Supabase REST helpers (no SDK, pure fetch)
 * Falls back silently if DB not configured.
 */
import { dbInsert, dbInsertMany, dbSelect, dbUpdate, dbDelete, DB_READY } from './supabase'

// ── PIPELINE RUNS ─────────────────────────────────────────────────────────
// NOTE: user_id and company_id are both accepted and persisted here. Earlier
// versions of these functions only destructured the fields they cared about
// (jdText, candidates, etc.) and silently dropped any user_id/company_id the
// caller passed in — meaning every row was written with those columns null,
// which quietly broke every RLS policy that checks them. Fixed by explicitly
// accepting and forwarding them.

export async function savePipelineRun({ jdText, candidates, totalResumes, user_id, company_id }) {
  if (!DB_READY) return null
  const label = (jdText?.split('\n')[0]?.slice(0, 60) || 'Pipeline run') +
    ' · ' + new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

  const run = await dbInsert('pipeline_runs', {
    jd_text: jdText,
    status: 'done',
    total_resumes: totalResumes || candidates?.length || 0,
    session_label: label,
    ...(user_id && { user_id }),
    ...(company_id && { company_id }),
  })
  if (!run?.id) return null

  if (candidates?.length) {
    await dbInsertMany('candidates', candidates.map(c => ({
      run_id: run.id,
      name: c.name,
      role: c.role,
      company: c.company,
      score: c.score ?? c.baseScore ?? 75,
      exp: c.exp,
      skills: c.skills || [],
      gaps: c.gaps || [],
      salary: c.salary || c.parsedSalary || 0,
      notice: c.notice,
      location: c.location || c.parsedCity,
      email: c.email,
      summary: c.summary,
      avatar: c.avatar,
      avatar_bg: c.avatarBg,
      avatar_text: c.avatarText,
    })))
  }
  return run.id
}

export async function loadPipelineHistory() {
  return dbSelect('pipeline_runs', {}, 'created_at.desc', 20)
}

export async function loadCandidatesForRun(runId) {
  return dbSelect('candidates', { run_id: `eq.${runId}` }, 'score.desc', 50)
}

// ── OUTREACH EMAILS ───────────────────────────────────────────────────────

export async function saveOutreachEmail({ runId, subject, body }) {
  if (!DB_READY) return null
  const row = await dbInsert('outreach_emails', { run_id: runId, subject: subject || 'Outreach', body })
  return row?.id || null
}

export async function markEmailSent(emailDbId) {
  if (!DB_READY || !emailDbId) return
  await dbUpdate('outreach_emails', { id: `eq.${emailDbId}` }, { sent: true, sent_at: new Date().toISOString() })
}

// ── SALES SESSIONS ────────────────────────────────────────────────────────

export async function saveSalesSession({ product, industry, prospects, user_id, company_id }) {
  if (!DB_READY) return null
  const row = await dbInsert('sales_sessions', { product, industry, prospects, ...(user_id && { user_id }), ...(company_id && { company_id }) })
  return row?.id || null
}

export async function loadSalesSessions() {
  return dbSelect('sales_sessions', {}, 'created_at.desc', 10)
}

// ── SUPPORT SESSIONS ──────────────────────────────────────────────────────

export async function saveSupportSession({ docs, kb, chats, user_id, company_id }) {
  if (!DB_READY) return null
  const row = await dbInsert('support_sessions', { docs, kb, chats, ...(user_id && { user_id }), ...(company_id && { company_id }) })
  return row?.id || null
}

// ── CARE TICKETS ──────────────────────────────────────────────────────────

/**
 * care_tickets.sentiment is a numeric column (-1..1). Callers mostly pass a number,
 * but some paths (and older sample data) use words like "negative"/"positive". Sending
 * a string made Postgres reject the whole insert with 22P02 — the ticket silently
 * failed to save while the UI showed success. Coerce here so one bad field can't drop
 * the record; anything unrecognised becomes null rather than breaking the write.
 */
export function toNumericSentiment(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(-1, Math.min(1, value))
  }
  if (typeof value === 'string') {
    const word = value.trim().toLowerCase()
    if (word === 'negative') return -0.6
    if (word === 'positive') return 0.6
    if (word === 'neutral') return 0
    const parsed = Number(word)
    if (Number.isFinite(parsed)) return Math.max(-1, Math.min(1, parsed))
  }
  return null
}

export async function saveCareTicket({ ticket, toneUsed, aiResponse, approved, user_id, company_id }) {
  if (!DB_READY) return null
  const row = await dbInsert('care_tickets', {
    ticket_ref: String(ticket.id),
    customer: ticket.customer,
    company: ticket.company,
    subject: ticket.subject,
    message: ticket.message,
    priority: ticket.priority,
    category: ticket.category,
    sentiment: toNumericSentiment(ticket.sentiment),
    tone_used: toneUsed,
    ai_response: aiResponse,
    approved,
    approved_at: approved ? new Date().toISOString() : null,
    ...(user_id && { user_id }),
    ...(company_id && { company_id }),
  })
  return row?.id || null
}

export async function loadCareTickets() {
  return dbSelect('care_tickets', {}, 'created_at.desc', 50)
}

// ── DATA DELETION (DPDP Act, 2023 — data-subject deletion request) ─────────
// Deleting pipeline_runs cascades to candidates and outreach_emails automatically
// via the "on delete cascade" foreign keys in supabase_schema.sql, so those two
// tables don't need separate delete calls here. sales_sessions, support_sessions,
// and care_tickets are top-level per-user tables and are deleted directly.
//
// IMPORTANT: this only works correctly once supabase_rls_v2_fix.sql has been run —
// the DELETE policies it adds don't exist in the original supabase_rls.sql, so
// without that fix this call would silently delete zero rows (RLS blocks it) while
// still returning as if it succeeded. See that file's header for why.
export async function deleteAllUserData(userId) {
  if (!DB_READY || !userId) return { ok: false, reason: "DB not configured or no user id provided" }
  const results = await Promise.all([
    dbDelete('pipeline_runs', { user_id: `eq.${userId}` }),
    dbDelete('sales_sessions', { user_id: `eq.${userId}` }),
    dbDelete('support_sessions', { user_id: `eq.${userId}` }),
    dbDelete('care_tickets', { user_id: `eq.${userId}` }),
  ])
  const failed = results.some((r) => r === null)
  return { ok: !failed, tablesAttempted: 4 }
}

// ── COMPANIES / EMPLOYEES (multi-tenant) ───────────────────────────────────
// See supabase_multitenancy.sql for the schema and RLS this depends on.

/** Look up the current user's employee record (company_id + role), or null if they have none yet. */
export async function getMyEmployeeRecord(userId) {
  if (!DB_READY || !userId) return null
  const rows = await dbSelect('employees', { user_id: `eq.${userId}`, status: 'eq.active' }, 'created_at.asc', 1)
  return rows?.[0] || null
}

/** First-time login with no employee record: create a company and make this user its admin. */
export async function createCompanyAndAdmin(userId, companyName) {
  if (!DB_READY || !userId) return null
  const company = await dbInsert('companies', { name: companyName || 'My Company', created_by: userId })
  if (!company?.id) return null
  const employee = await dbInsert('employees', { company_id: company.id, user_id: userId, role: 'admin', status: 'active' })
  if (!employee) return null
  return { companyId: company.id, role: 'admin', companyName: company.name }
}

/** If the logged-in user's email matches an 'invited' employee row, claim it (set user_id, status='active'). */
export async function claimInviteIfAny(userId, email) {
  if (!DB_READY || !userId || !email) return null
  const rows = await dbSelect('employees', { invited_email: `eq.${email}`, status: 'eq.invited' }, 'created_at.asc', 1)
  const invite = rows?.[0]
  if (!invite) return null
  const updated = await dbUpdate('employees', { id: `eq.${invite.id}` }, { user_id: userId, status: 'active' })
  if (!updated?.[0]) return null
  return { companyId: invite.company_id, role: invite.role }
}

/** Admin invites a new employee by email + role. They'll claim this row on their first login. */
export async function inviteEmployee(companyId, email, role) {
  if (!DB_READY || !companyId || !email || !role) return null
  return dbInsert('employees', { company_id: companyId, invited_email: email, role, status: 'invited' })
}

/** List every employee (active + pending invites) at a company, for the admin Team screen. */
export async function listEmployees(companyId) {
  if (!DB_READY || !companyId) return []
  return dbSelect('employees', { company_id: `eq.${companyId}` }, 'created_at.asc', 100)
}

export async function updateEmployeeRole(employeeId, role) {
  if (!DB_READY || !employeeId || !role) return null
  return dbUpdate('employees', { id: `eq.${employeeId}` }, { role })
}

// ── CROSS-ROLE SIGNALS ──────────────────────────────────────────────────
// Real, persisted, RLS-scoped rows that let one role's action surface as a
// concrete task for another role at the same company — not a simulated
// in-memory event log. See supabase_cross_signals.sql.

/** type: 'lead' (Care → Sales) or 'onboarding' (Hiring → Support/Care). payload is a small jsonb blob. */
export async function createCrossRoleSignal({ companyId, type, payload, createdByUserId }) {
  if (!DB_READY || !companyId || !type) return null
  return dbInsert('cross_role_signals', {
    company_id: companyId,
    type,
    payload: payload || {},
    created_by: createdByUserId || null,
    resolved: false,
  })
}

export async function listCrossRoleSignals(companyId, type) {
  if (!DB_READY || !companyId) return []
  const filter = { company_id: `eq.${companyId}` }
  if (type) filter.type = `eq.${type}`
  return dbSelect('cross_role_signals', filter, 'created_at.desc', 30)
}

export async function resolveCrossRoleSignal(signalId) {
  if (!DB_READY || !signalId) return null
  return dbUpdate('cross_role_signals', { id: `eq.${signalId}` }, { resolved: true })
}

// ── COMPANY BRAIN (shared cross-agent memory) ─────────────────────────────
// One row per agent action. The brain (lib/companyBrain.js) replays these to
// rebuild its graph, so memory persists across reloads and is shared by every
// employee of the company (RLS-scoped). See supabase_company_brain.sql.

/** Persist one brain event. Safe no-op when DB isn't configured (returns null). */
export async function saveBrainEvent({ companyId, createdByUserId, agent, kind, title, desc, person, attrs }) {
  if (!DB_READY || !companyId || !agent) return null
  const row = await dbInsert('brain_events', {
    company_id: companyId,
    created_by: createdByUserId || null,
    agent,
    kind: kind || 'event',
    title: title || '',
    descr: desc || '',
    person_name: person?.name || null,
    person_email: person?.email || null,
    person_phone: person?.phone || null,
    attrs: attrs || {},
  })
  return row?.id || null
}

/** Load the company's brain event log, oldest→newest, ready to replay into createCompanyBrain(). */
export async function loadBrainEvents(companyId) {
  if (!DB_READY || !companyId) return []
  const rows = await dbSelect('brain_events', { company_id: `eq.${companyId}` }, 'created_at.asc', 500)
  return (rows || []).map(r => ({
    at: r.created_at,
    agent: r.agent,
    kind: r.kind,
    title: r.title,
    desc: r.descr,
    person: { name: r.person_name, email: r.person_email, phone: r.person_phone, ...(r.attrs || {}) },
  }))
}

export { DB_READY }
