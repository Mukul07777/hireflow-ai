-- ═══════════════════════════════════════════════════════════════
--  HireFlow AI — Supabase Schema
--  Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. PIPELINE RUNS ──────────────────────────────────────────────
create table if not exists pipeline_runs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  jd_text     text,
  status      text default 'done',          -- idle | running | done
  total_resumes int default 0,
  bias_report jsonb,
  salary_benchmark jsonb,
  session_label text                         -- e.g. "Senior FE Engineer · Jun 2026"
);

-- 2. CANDIDATES ──────────────────────────────────────────────────
create table if not exists candidates (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid references pipeline_runs(id) on delete cascade,
  created_at  timestamptz default now(),
  name        text,
  role        text,
  company     text,
  score       int,
  exp         text,
  skills      text[],
  gaps        text[],
  salary      int,
  notice      text,
  location    text,
  email       text,
  summary     text,
  ai_analysis text,
  decision    text,                          -- pass | reject | null
  decision_note text,
  avatar      text,
  avatar_bg   text,
  avatar_text text
);

-- 3. OUTREACH EMAILS ─────────────────────────────────────────────
create table if not exists outreach_emails (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  candidate_id  uuid references candidates(id) on delete cascade,
  run_id        uuid references pipeline_runs(id) on delete cascade,
  subject       text,
  body          text,
  sent          boolean default false,
  sent_at       timestamptz
);

-- 4. SALES SESSIONS ──────────────────────────────────────────────
create table if not exists sales_sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  product      text,
  industry     text,
  target_role  text,
  prospects    jsonb,                        -- array of prospect objects
  email_drafts jsonb,                        -- {prospectId: emailText}
  drip_sequences jsonb,                      -- {prospectId: [{subject,body}]}
  objections   jsonb                         -- [{objection, response}]
);

-- 5. SUPPORT SESSIONS ────────────────────────────────────────────
create table if not exists support_sessions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  docs       text,
  kb         jsonb,                          -- [{q, a}]
  chats      jsonb                           -- [{id, messages, sentiment, csat}]
);

-- 6. CARE TICKETS ────────────────────────────────────────────────
create table if not exists care_tickets (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  ticket_ref   text,                         -- original ticket id
  customer     text,
  company      text,
  subject      text,
  message      text,
  priority     text,
  category     text,
  sentiment    numeric,
  tone_used    text,
  ai_response  text,
  approved     boolean default false,
  approved_at  timestamptz
);

-- ── Enable Row Level Security (open read for demo) ───────────────
alter table pipeline_runs    enable row level security;
alter table candidates       enable row level security;
alter table outreach_emails  enable row level security;
alter table sales_sessions   enable row level security;
alter table support_sessions enable row level security;
alter table care_tickets     enable row level security;

-- Allow all operations from browser (anon key) — fine for hackathon
drop policy if exists "public access" on pipeline_runs;
create policy "public access" on pipeline_runs    for all using (true) with check (true);
drop policy if exists "public access" on candidates;
create policy "public access" on candidates       for all using (true) with check (true);
drop policy if exists "public access" on outreach_emails;
create policy "public access" on outreach_emails  for all using (true) with check (true);
drop policy if exists "public access" on sales_sessions;
create policy "public access" on sales_sessions   for all using (true) with check (true);
drop policy if exists "public access" on support_sessions;
create policy "public access" on support_sessions for all using (true) with check (true);
drop policy if exists "public access" on care_tickets;
create policy "public access" on care_tickets     for all using (true) with check (true);
