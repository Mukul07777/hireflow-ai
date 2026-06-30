/**
 * db.js — Supabase REST helpers (no SDK, pure fetch)
 * Falls back silently if DB not configured.
 */
import { dbInsert, dbInsertMany, dbSelect, dbUpdate, DB_READY } from './supabase'

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

export { DB_READY }
