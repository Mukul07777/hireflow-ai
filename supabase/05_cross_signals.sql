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
