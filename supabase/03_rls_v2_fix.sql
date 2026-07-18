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
