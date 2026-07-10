/**
 * db.js — Supabase REST helpers (no SDK, pure fetch)
 * Falls back silently if DB not configured.
 */
import { dbInsert, dbInsertMany, dbSelect, dbUpdate, dbDelete, DB_READY } from './supabase'

// ── PIPELINE RUNS ─────────────────────────────────────────────────────────

export async function savePipelineRun({ jdText, candidates, totalResumes }) {
  if (!DB_READY) return null
  const label = (jdText?.split('\n')[0]?.slice(0, 60) || 'Pipeline run') +
    ' · ' + new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

  const run = await dbInsert('pipeline_runs', {
    jd_text: jdText,
    status: 'done',
    total_resumes: totalResumes || candidates?.length || 0,
    session_label: label,
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

export async function saveSalesSession({ product, industry, prospects }) {
  if (!DB_READY) return null
  const row = await dbInsert('sales_sessions', { product, industry, prospects })
  return row?.id || null
}

export async function loadSalesSessions() {
  return dbSelect('sales_sessions', {}, 'created_at.desc', 10)
}

// ── SUPPORT SESSIONS ──────────────────────────────────────────────────────

export async function saveSupportSession({ docs, kb, chats }) {
  if (!DB_READY) return null
  const row = await dbInsert('support_sessions', { docs, kb, chats })
  return row?.id || null
}

// ── CARE TICKETS ──────────────────────────────────────────────────────────

export async function saveCareTicket({ ticket, toneUsed, aiResponse, approved }) {
  if (!DB_READY) return null
  const row = await dbInsert('care_tickets', {
    ticket_ref: String(ticket.id),
    customer: ticket.customer,
    company: ticket.company,
    subject: ticket.subject,
    message: ticket.message,
    priority: ticket.priority,
    category: ticket.category,
    sentiment: ticket.sentiment,
    tone_used: toneUsed,
    ai_response: aiResponse,
    approved,
    approved_at: approved ? new Date().toISOString() : null,
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

export { DB_READY }
