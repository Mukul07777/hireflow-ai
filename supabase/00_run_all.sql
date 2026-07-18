-- ═══════════════════════════════════════════════════════════════════
-- 01_schema.sql
-- ═══════════════════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════════════════
-- 02_rls.sql
-- ═══════════════════════════════════════════════════════════════════
-- ============================================================
-- FlowZint AI — Row Level Security Policies
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. PIPELINE_RUNS
alter table pipeline_runs enable row level security;

drop policy if exists "Users read own pipeline runs" on pipeline_runs;
create policy "Users read own pipeline runs"
  on pipeline_runs for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own pipeline runs" on pipeline_runs;
create policy "Users insert own pipeline runs"
  on pipeline_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own pipeline runs" on pipeline_runs;
create policy "Users update own pipeline runs"
  on pipeline_runs for update
  using (auth.uid() = user_id);

-- 2. CANDIDATES (scoped via run ownership)
alter table candidates enable row level security;

drop policy if exists "Users read candidates for own runs" on candidates;
create policy "Users read candidates for own runs"
  on candidates for select
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = candidates.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert candidates for own runs" on candidates;
create policy "Users insert candidates for own runs"
  on candidates for insert
  with check (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = candidates.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

-- 3. OUTREACH_EMAILS
alter table outreach_emails enable row level security;

drop policy if exists "Users read own outreach emails" on outreach_emails;
create policy "Users read own outreach emails"
  on outreach_emails for select
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = outreach_emails.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own outreach emails" on outreach_emails;
create policy "Users insert own outreach emails"
  on outreach_emails for insert
  with check (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = outreach_emails.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

drop policy if exists "Users update own outreach emails" on outreach_emails;
create policy "Users update own outreach emails"
  on outreach_emails for update
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = outreach_emails.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

-- 4. SALES_SESSIONS
alter table sales_sessions enable row level security;

drop policy if exists "Users read own sales sessions" on sales_sessions;
create policy "Users read own sales sessions"
  on sales_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own sales sessions" on sales_sessions;
create policy "Users insert own sales sessions"
  on sales_sessions for insert
  with check (auth.uid() = user_id);

-- 5. SUPPORT_SESSIONS
alter table support_sessions enable row level security;

drop policy if exists "Users read own support sessions" on support_sessions;
create policy "Users read own support sessions"
  on support_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own support sessions" on support_sessions;
create policy "Users insert own support sessions"
  on support_sessions for insert
  with check (auth.uid() = user_id);

-- 6. CARE_TICKETS
alter table care_tickets enable row level security;

drop policy if exists "Users read own care tickets" on care_tickets;
create policy "Users read own care tickets"
  on care_tickets for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own care tickets" on care_tickets;
create policy "Users insert own care tickets"
  on care_tickets for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- Add user_id columns if they don't exist yet
-- (skip any that already exist)
-- ============================================================
alter table pipeline_runs  add column if not exists user_id uuid references auth.users(id);
alter table sales_sessions add column if not exists user_id uuid references auth.users(id);
alter table support_sessions add column if not exists user_id uuid references auth.users(id);
alter table care_tickets    add column if not exists user_id uuid references auth.users(id);

-- Index for fast per-user queries
create index if not exists idx_pipeline_runs_user  on pipeline_runs(user_id);
create index if not exists idx_sales_sessions_user on sales_sessions(user_id);
create index if not exists idx_support_sessions_user on support_sessions(user_id);
create index if not exists idx_care_tickets_user   on care_tickets(user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 03_rls_v2_fix.sql
-- ═══════════════════════════════════════════════════════════════════
-- ============================================================
-- NexFlow AI — RLS Fix v2
-- Run this AFTER supabase_schema.sql and supabase_rls.sql, in Supabase
-- Dashboard → SQL Editor.
--
-- WHY THIS FILE EXISTS: supabase_schema.sql creates a permissive
-- "public access" policy (using (true) with check (true)) on every table.
-- supabase_rls.sql later adds proper per-user policies, but never drops
-- the old permissive ones. Postgres OR's together all policies for the
-- same command on the same table — so as long as the old "public access"
-- policy exists, ANY holder of the public anon key can read and write
-- EVERY user's data, regardless of the newer per-user policies. This file
-- is idempotent (safe to run more than once) and:
--   1. Explicitly drops the old permissive policies
--   2. Adds the missing UPDATE/DELETE policies that supabase_rls.sql never
--      created (without them, a user cannot delete or correct their own
--      data even once the permissive policy is gone — relevant for DPDP
--      Act, 2023 data-subject deletion rights)
-- ============================================================

-- 1. Drop the permissive "public access" policy from every table, if present.
drop policy if exists "public access" on pipeline_runs;
drop policy if exists "public access" on candidates;
drop policy if exists "public access" on outreach_emails;
drop policy if exists "public access" on sales_sessions;
drop policy if exists "public access" on support_sessions;
drop policy if exists "public access" on care_tickets;

-- 2. PIPELINE_RUNS — add missing DELETE policy (select/insert/update already exist)
drop policy if exists "Users delete own pipeline runs" on pipeline_runs;
create policy "Users delete own pipeline runs"
  on pipeline_runs for delete
  using (auth.uid() = user_id);

-- 3. CANDIDATES — add missing UPDATE/DELETE policies (only select/insert existed)
drop policy if exists "Users update candidates for own runs" on candidates;
create policy "Users update candidates for own runs"
  on candidates for update
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = candidates.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete candidates for own runs" on candidates;
create policy "Users delete candidates for own runs"
  on candidates for delete
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = candidates.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

-- 4. OUTREACH_EMAILS — add missing DELETE policy (select/insert/update already exist)
drop policy if exists "Users delete own outreach emails" on outreach_emails;
create policy "Users delete own outreach emails"
  on outreach_emails for delete
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = outreach_emails.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

-- 5. SALES_SESSIONS — add missing UPDATE/DELETE policies
drop policy if exists "Users update own sales sessions" on sales_sessions;
create policy "Users update own sales sessions"
  on sales_sessions for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own sales sessions" on sales_sessions;
create policy "Users delete own sales sessions"
  on sales_sessions for delete
  using (auth.uid() = user_id);

-- 6. SUPPORT_SESSIONS — add missing UPDATE/DELETE policies
drop policy if exists "Users update own support sessions" on support_sessions;
create policy "Users update own support sessions"
  on support_sessions for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own support sessions" on support_sessions;
create policy "Users delete own support sessions"
  on support_sessions for delete
  using (auth.uid() = user_id);

-- 7. CARE_TICKETS — add missing UPDATE/DELETE policies
drop policy if exists "Users update own care tickets" on care_tickets;
create policy "Users update own care tickets"
  on care_tickets for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own care tickets" on care_tickets;
create policy "Users delete own care tickets"
  on care_tickets for delete
  using (auth.uid() = user_id);

-- ============================================================
-- VERIFY — run this after the above and confirm no policy named
-- "public access" appears in the output, and that every table below
-- has select/insert/update/delete represented across its policies.
-- ============================================================
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('pipeline_runs','candidates','outreach_emails','sales_sessions','support_sessions','care_tickets')
-- order by tablename, cmd;


-- ═══════════════════════════════════════════════════════════════════
-- 04_multitenancy.sql
-- ═══════════════════════════════════════════════════════════════════
-- ============================================================
-- NexFlow AI — Multi-Tenant / Multi-Employee Migration
-- Run this in Supabase Dashboard → SQL Editor, AFTER:
--   1. supabase_schema.sql
--   2. supabase_rls.sql
--   3. supabase_rls_v2_fix.sql
-- This file is idempotent (safe to re-run).
--
-- WHAT THIS CHANGES:
-- Until now, every table was scoped to a single auth user_id — one
-- person, one account, no concept of "employees of the same company."
-- This migration introduces:
--   - companies: one row per business
--   - employees: links an auth user to a company + a role
--     (admin | hiring_manager | sales_rep | support_agent | care_agent)
--   - company_id added to every operational table, so data is shared
--     across everyone at the same company instead of siloed per-user
--   - RLS rewritten to scope by company membership (via the employees
--     table), not raw user_id — this is the real security boundary now
--
-- SECURITY MODEL:
-- Any employee of a company can READ all of that company's data
-- (this is the point — shared business data across roles). WRITE
-- access to each table is restricted to the roles that operation
-- actually belongs to, plus admin. Read access is intentionally
-- broader than write access.
-- ============================================================

-- ── 1. COMPANIES ──────────────────────────────────────────────
create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  name        text not null,
  industry    text,
  gstin       text,          -- optional, format-validated client-side via lib/indianVerification.js
  created_by  uuid references auth.users(id)
);

-- ── 2. EMPLOYEES ──────────────────────────────────────────────
-- status: 'invited' (row exists, user_id null, waiting for signup to claim it)
--         'active'  (user_id set, can log in and use the platform)
create table if not exists employees (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  company_id     uuid not null references companies(id) on delete cascade,
  user_id        uuid references auth.users(id),
  invited_email  text,
  role           text not null check (role in ('admin','hiring_manager','sales_rep','support_agent','care_agent')),
  status         text not null default 'invited' check (status in ('invited','active')),
  unique(company_id, user_id)
);
create index if not exists idx_employees_user on employees(user_id);
create index if not exists idx_employees_company on employees(company_id);

-- ── 3. Add company_id to operational tables ────────────────────
alter table pipeline_runs    add column if not exists company_id uuid references companies(id);
alter table sales_sessions   add column if not exists company_id uuid references companies(id);
alter table support_sessions add column if not exists company_id uuid references companies(id);
alter table care_tickets     add column if not exists company_id uuid references companies(id);
-- candidates / outreach_emails inherit company scoping via their run_id → pipeline_runs join,
-- no direct column needed.

create index if not exists idx_pipeline_runs_company  on pipeline_runs(company_id);
create index if not exists idx_sales_sessions_company on sales_sessions(company_id);
create index if not exists idx_support_sessions_company on support_sessions(company_id);
create index if not exists idx_care_tickets_company   on care_tickets(company_id);

-- ── 4. BACKFILL — every existing single-user's data becomes its own company ──
-- For each distinct user_id already present across the operational tables that
-- doesn't yet have a company, create a company for them and mark them admin.
-- Idempotent: only touches rows with a null company_id / users with no employees row.
do $$
declare
  r record;
  new_company_id uuid;
begin
  for r in (
    select distinct user_id from pipeline_runs where user_id is not null
    union
    select distinct user_id from sales_sessions where user_id is not null
    union
    select distinct user_id from support_sessions where user_id is not null
    union
    select distinct user_id from care_tickets where user_id is not null
  ) loop
    if not exists (select 1 from employees where user_id = r.user_id) then
      insert into companies(name, created_by) values ('My Company', r.user_id) returning id into new_company_id;
      insert into employees(company_id, user_id, role, status) values (new_company_id, r.user_id, 'admin', 'active');
    end if;
    select e.company_id into new_company_id from employees e where e.user_id = r.user_id limit 1;
    update pipeline_runs    set company_id = new_company_id where user_id = r.user_id and company_id is null;
    update sales_sessions   set company_id = new_company_id where user_id = r.user_id and company_id is null;
    update support_sessions set company_id = new_company_id where user_id = r.user_id and company_id is null;
    update care_tickets     set company_id = new_company_id where user_id = r.user_id and company_id is null;
  end loop;
end $$;

-- ── 5. RLS on the new tables ────────────────────────────────────
alter table companies enable row level security;
alter table employees  enable row level security;

drop policy if exists "Employees can read their own company" on companies;
create policy "Employees can read their own company"
  on companies for select
  using (
    exists (select 1 from employees e where e.company_id = companies.id and e.user_id = auth.uid())
  );

drop policy if exists "Admins can update their own company" on companies;
create policy "Admins can update their own company"
  on companies for update
  using (
    exists (select 1 from employees e where e.company_id = companies.id and e.user_id = auth.uid() and e.role = 'admin')
  );

drop policy if exists "Users can read employee rows for their own company" on employees;
create policy "Users can read employee rows for their own company"
  on employees for select
  using (
    exists (select 1 from employees me where me.company_id = employees.company_id and me.user_id = auth.uid())
  );

drop policy if exists "Admins can insert employees into their own company" on employees;
create policy "Admins can insert employees into their own company"
  on employees for insert
  with check (
    exists (select 1 from employees me where me.company_id = employees.company_id and me.user_id = auth.uid() and me.role = 'admin')
    -- also allow a brand-new company's very first admin row to be self-inserted
    or (select count(*) from employees e2 where e2.company_id = employees.company_id) = 0
  );

drop policy if exists "Admins can update employee roles in their own company" on employees;
create policy "Admins can update employee roles in their own company"
  on employees for update
  using (
    exists (select 1 from employees me where me.company_id = employees.company_id and me.user_id = auth.uid() and me.role = 'admin')
  );

-- Special case: an invited user (status='invited', user_id null) needs to be able to
-- claim their own row by setting user_id = auth.uid() once they sign up with the invited email.
drop policy if exists "Invited users can claim their own employee row" on employees;
create policy "Invited users can claim their own employee row"
  on employees for update
  using (status = 'invited' and invited_email = auth.jwt() ->> 'email')
  with check (user_id = auth.uid() and status = 'active');

-- ── 6. REPLACE per-user RLS on operational tables with company-scoped RLS ──
-- Drop every prior user_id-based policy from supabase_rls.sql / v2_fix.sql.
drop policy if exists "Users read own pipeline runs" on pipeline_runs;
drop policy if exists "Users insert own pipeline runs" on pipeline_runs;
drop policy if exists "Users update own pipeline runs" on pipeline_runs;
drop policy if exists "Users delete own pipeline runs" on pipeline_runs;

drop policy if exists "Users read candidates for own runs" on candidates;
drop policy if exists "Users insert candidates for own runs" on candidates;
drop policy if exists "Users update candidates for own runs" on candidates;
drop policy if exists "Users delete candidates for own runs" on candidates;

drop policy if exists "Users read own outreach emails" on outreach_emails;
drop policy if exists "Users insert own outreach emails" on outreach_emails;
drop policy if exists "Users update own outreach emails" on outreach_emails;
drop policy if exists "Users delete own outreach emails" on outreach_emails;

drop policy if exists "Users read own sales sessions" on sales_sessions;
drop policy if exists "Users insert own sales sessions" on sales_sessions;
drop policy if exists "Users update own sales sessions" on sales_sessions;
drop policy if exists "Users delete own sales sessions" on sales_sessions;

drop policy if exists "Users read own support sessions" on support_sessions;
drop policy if exists "Users insert own support sessions" on support_sessions;
drop policy if exists "Users update own support sessions" on support_sessions;
drop policy if exists "Users delete own support sessions" on support_sessions;

drop policy if exists "Users read own care tickets" on care_tickets;
drop policy if exists "Users insert own care tickets" on care_tickets;
drop policy if exists "Users update own care tickets" on care_tickets;
drop policy if exists "Users delete own care tickets" on care_tickets;

-- Helper pattern used below: is the current user an employee of company X,
-- and (for writes) do they hold one of the allowed roles for that operation.

-- PIPELINE_RUNS (hiring) — read: any employee of the company. write: hiring_manager/admin.
drop policy if exists "Company employees read pipeline runs" on pipeline_runs;
create policy "Company employees read pipeline runs"
  on pipeline_runs for select
  using (exists (select 1 from employees e where e.company_id = pipeline_runs.company_id and e.user_id = auth.uid()));
drop policy if exists "Hiring roles write pipeline runs" on pipeline_runs;
create policy "Hiring roles write pipeline runs"
  on pipeline_runs for insert
  with check (exists (select 1 from employees e where e.company_id = pipeline_runs.company_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));
drop policy if exists "Hiring roles update pipeline runs" on pipeline_runs;
create policy "Hiring roles update pipeline runs"
  on pipeline_runs for update
  using (exists (select 1 from employees e where e.company_id = pipeline_runs.company_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));
drop policy if exists "Hiring roles delete pipeline runs" on pipeline_runs;
create policy "Hiring roles delete pipeline runs"
  on pipeline_runs for delete
  using (exists (select 1 from employees e where e.company_id = pipeline_runs.company_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));

-- CANDIDATES / OUTREACH_EMAILS — scoped via their run's company_id.
drop policy if exists "Company employees read candidates" on candidates;
create policy "Company employees read candidates"
  on candidates for select
  using (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = candidates.run_id and e.user_id = auth.uid()));
drop policy if exists "Hiring roles write candidates" on candidates;
create policy "Hiring roles write candidates"
  on candidates for insert
  with check (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = candidates.run_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));
drop policy if exists "Hiring roles update candidates" on candidates;
create policy "Hiring roles update candidates"
  on candidates for update
  using (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = candidates.run_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));
drop policy if exists "Hiring roles delete candidates" on candidates;
create policy "Hiring roles delete candidates"
  on candidates for delete
  using (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = candidates.run_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));

drop policy if exists "Company employees read outreach emails" on outreach_emails;
create policy "Company employees read outreach emails"
  on outreach_emails for select
  using (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = outreach_emails.run_id and e.user_id = auth.uid()));
drop policy if exists "Hiring roles write outreach emails" on outreach_emails;
create policy "Hiring roles write outreach emails"
  on outreach_emails for insert
  with check (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = outreach_emails.run_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));
drop policy if exists "Hiring roles update outreach emails" on outreach_emails;
create policy "Hiring roles update outreach emails"
  on outreach_emails for update
  using (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = outreach_emails.run_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));
drop policy if exists "Hiring roles delete outreach emails" on outreach_emails;
create policy "Hiring roles delete outreach emails"
  on outreach_emails for delete
  using (exists (select 1 from pipeline_runs pr join employees e on e.company_id = pr.company_id where pr.id = outreach_emails.run_id and e.user_id = auth.uid() and e.role in ('hiring_manager','admin')));

-- SALES_SESSIONS — read: any employee. write: sales_rep/admin.
drop policy if exists "Company employees read sales sessions" on sales_sessions;
create policy "Company employees read sales sessions"
  on sales_sessions for select
  using (exists (select 1 from employees e where e.company_id = sales_sessions.company_id and e.user_id = auth.uid()));
drop policy if exists "Sales roles write sales sessions" on sales_sessions;
create policy "Sales roles write sales sessions"
  on sales_sessions for insert
  with check (exists (select 1 from employees e where e.company_id = sales_sessions.company_id and e.user_id = auth.uid() and e.role in ('sales_rep','admin')));
drop policy if exists "Sales roles update sales sessions" on sales_sessions;
create policy "Sales roles update sales sessions"
  on sales_sessions for update
  using (exists (select 1 from employees e where e.company_id = sales_sessions.company_id and e.user_id = auth.uid() and e.role in ('sales_rep','admin')));
drop policy if exists "Sales roles delete sales sessions" on sales_sessions;
create policy "Sales roles delete sales sessions"
  on sales_sessions for delete
  using (exists (select 1 from employees e where e.company_id = sales_sessions.company_id and e.user_id = auth.uid() and e.role in ('sales_rep','admin')));

-- SUPPORT_SESSIONS — read: any employee. write: support_agent/admin.
drop policy if exists "Company employees read support sessions" on support_sessions;
create policy "Company employees read support sessions"
  on support_sessions for select
  using (exists (select 1 from employees e where e.company_id = support_sessions.company_id and e.user_id = auth.uid()));
drop policy if exists "Support roles write support sessions" on support_sessions;
create policy "Support roles write support sessions"
  on support_sessions for insert
  with check (exists (select 1 from employees e where e.company_id = support_sessions.company_id and e.user_id = auth.uid() and e.role in ('support_agent','admin')));
drop policy if exists "Support roles update support sessions" on support_sessions;
create policy "Support roles update support sessions"
  on support_sessions for update
  using (exists (select 1 from employees e where e.company_id = support_sessions.company_id and e.user_id = auth.uid() and e.role in ('support_agent','admin')));
drop policy if exists "Support roles delete support sessions" on support_sessions;
create policy "Support roles delete support sessions"
  on support_sessions for delete
  using (exists (select 1 from employees e where e.company_id = support_sessions.company_id and e.user_id = auth.uid() and e.role in ('support_agent','admin')));

-- CARE_TICKETS — read: any employee. write: care_agent/admin.
drop policy if exists "Company employees read care tickets" on care_tickets;
create policy "Company employees read care tickets"
  on care_tickets for select
  using (exists (select 1 from employees e where e.company_id = care_tickets.company_id and e.user_id = auth.uid()));
drop policy if exists "Care roles write care tickets" on care_tickets;
create policy "Care roles write care tickets"
  on care_tickets for insert
  with check (exists (select 1 from employees e where e.company_id = care_tickets.company_id and e.user_id = auth.uid() and e.role in ('care_agent','admin')));
drop policy if exists "Care roles update care tickets" on care_tickets;
create policy "Care roles update care tickets"
  on care_tickets for update
  using (exists (select 1 from employees e where e.company_id = care_tickets.company_id and e.user_id = auth.uid() and e.role in ('care_agent','admin')));
drop policy if exists "Care roles delete care tickets" on care_tickets;
create policy "Care roles delete care tickets"
  on care_tickets for delete
  using (exists (select 1 from employees e where e.company_id = care_tickets.company_id and e.user_id = auth.uid() and e.role in ('care_agent','admin')));

-- ============================================================
-- MANUAL VERIFICATION — this is the part that actually matters.
-- RLS bugs don't show up until you test with TWO real accounts.
-- Do this before trusting any of the above:
--   1. Sign up as User A. Confirm a "My Company" row was created and
--      User A is its admin (select * from employees where user_id = '<A's uid>').
--   2. Sign up as User B (separate company, e.g. don't invite them yet).
--   3. As User B, try to select pipeline_runs / care_tickets / etc. belonging
--      to User A's company_id directly via the app or SQL editor "run as" —
--      confirm ZERO rows come back. If any row from A's company is visible
--      to B, the policy is wrong — do not demo until this is fixed.
--   4. As User A (admin), insert an employees row for User B's email with
--      role 'sales_rep' and status 'invited'. Have User B sign in with that
--      email — confirm the app can claim the row (user_id set, status
--      becomes 'active') and User B can now read User A's company data but
--      only write to sales_sessions, not pipeline_runs/care_tickets.
-- ============================================================


-- ═══════════════════════════════════════════════════════════════════
-- 05_cross_signals.sql
-- ═══════════════════════════════════════════════════════════════════
-- ============================================================
-- NexFlow AI — Cross-Role Signals
-- Run this in Supabase Dashboard → SQL Editor, AFTER supabase_multitenancy.sql.
-- Idempotent (safe to re-run).
--
-- WHAT THIS IS: real, persisted rows that let one role's action become a
-- concrete, visible task for another role at the same company — e.g. a
-- Care agent escalating a ticket creates a real "lead" row a Sales rep can
-- see and act on; a Hiring manager marking a candidate "hired" creates a
-- real "onboarding" row a Support/Care agent can see. This is deliberately
-- NOT the in-memory crossEvents log already in App.jsx — that log resets
-- on page reload and only exists in one browser tab. This table is the
-- real, shared, RLS-scoped version of the same idea.
-- ============================================================

create table if not exists cross_role_signals (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  company_id  uuid not null references companies(id) on delete cascade,
  type        text not null check (type in ('lead','onboarding')),
  payload     jsonb default '{}'::jsonb,
  created_by  uuid references auth.users(id),
  resolved    boolean default false
);
create index if not exists idx_cross_signals_company on cross_role_signals(company_id);
create index if not exists idx_cross_signals_type on cross_role_signals(company_id, type);

alter table cross_role_signals enable row level security;

-- Read: any employee of the company can see signals meant for their company.
drop policy if exists "Company employees read cross-role signals" on cross_role_signals;
create policy "Company employees read cross-role signals"
  on cross_role_signals for select
  using (exists (select 1 from employees e where e.company_id = cross_role_signals.company_id and e.user_id = auth.uid()));

-- Write: any employee of the company can create a signal (it's meant to be created
-- by whichever role triggers the handoff — care_agent creating a 'lead', hiring_manager
-- creating an 'onboarding' item — rather than restricting to a single role here).
drop policy if exists "Company employees create cross-role signals" on cross_role_signals;
create policy "Company employees create cross-role signals"
  on cross_role_signals for insert
  with check (exists (select 1 from employees e where e.company_id = cross_role_signals.company_id and e.user_id = auth.uid()));

-- Resolve: any employee of the company can mark a signal resolved (e.g. the sales rep
-- who acted on the lead, or an admin cleaning up).
drop policy if exists "Company employees resolve cross-role signals" on cross_role_signals;
create policy "Company employees resolve cross-role signals"
  on cross_role_signals for update
  using (exists (select 1 from employees e where e.company_id = cross_role_signals.company_id and e.user_id = auth.uid()));


-- ═══════════════════════════════════════════════════════════════════
-- 06_company_brain.sql
-- ═══════════════════════════════════════════════════════════════════
-- ============================================================================
-- supabase_company_brain.sql — persistent event log for the Company Brain.
--
-- The Company Brain (src/lib/companyBrain.js) is an in-memory graph rebuilt by
-- replaying an event log. This table IS that log: one row per agent action, so
-- the brain survives a reload and is shared across every logged-in employee of
-- the same company (scoped by RLS, like every other table here).
--
-- Run AFTER the multitenancy file (it depends on the companies/employees tables
-- and uses the same inline membership check as the RLS there).
-- ============================================================================

create table if not exists brain_events (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  company_id   uuid not null references companies(id) on delete cascade,
  created_by   uuid references auth.users(id),
  agent        text not null,               -- 'sales' | 'support' | 'care' | 'hiring' | 'smb'
  kind         text not null,               -- 'lead' | 'customer' | 'candidate' | 'ticket_author' | 'business' | 'event'
  title        text,
  descr        text,
  -- the person/business this event is about; the brain resolves identity from these
  person_name  text,
  person_email text,
  person_phone text,
  attrs        jsonb default '{}'::jsonb
);

create index if not exists brain_events_company_idx on brain_events(company_id, created_at desc);
create index if not exists brain_events_email_idx   on brain_events(company_id, person_email);

alter table brain_events enable row level security;

-- Company-scoped access only. Uses the same inline membership check pattern as
-- supabase_multitenancy.sql (a member is anyone with an employees row for this
-- company). No helper function needed.
drop policy if exists "brain member read"   on brain_events;
drop policy if exists "brain member insert" on brain_events;
drop policy if exists "brain member delete" on brain_events;

drop policy if exists "brain member read" on brain_events;
create policy "brain member read" on brain_events
  for select using (
    exists (select 1 from employees e where e.company_id = brain_events.company_id and e.user_id = auth.uid())
  );

create policy "brain member insert" on brain_events
  for insert with check (
    exists (select 1 from employees e where e.company_id = brain_events.company_id and e.user_id = auth.uid())
  );

create policy "brain member delete" on brain_events
  for delete using (
    exists (select 1 from employees e where e.company_id = brain_events.company_id and e.user_id = auth.uid())
  );

-- ── VERIFY (run after, should return only your own company's rows) ──────────
-- select agent, kind, person_name, created_at from brain_events order by created_at desc limit 20;


