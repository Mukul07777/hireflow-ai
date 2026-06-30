-- ============================================================
-- FlowZint AI — Row Level Security Policies
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. PIPELINE_RUNS
alter table pipeline_runs enable row level security;

create policy "Users read own pipeline runs"
  on pipeline_runs for select
  using (auth.uid() = user_id);

create policy "Users insert own pipeline runs"
  on pipeline_runs for insert
  with check (auth.uid() = user_id);

create policy "Users update own pipeline runs"
  on pipeline_runs for update
  using (auth.uid() = user_id);

-- 2. CANDIDATES (scoped via run ownership)
alter table candidates enable row level security;

create policy "Users read candidates for own runs"
  on candidates for select
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = candidates.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

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

create policy "Users read own outreach emails"
  on outreach_emails for select
  using (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = outreach_emails.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

create policy "Users insert own outreach emails"
  on outreach_emails for insert
  with check (
    exists (
      select 1 from pipeline_runs
      where pipeline_runs.id = outreach_emails.run_id
        and pipeline_runs.user_id = auth.uid()
    )
  );

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

create policy "Users read own sales sessions"
  on sales_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own sales sessions"
  on sales_sessions for insert
  with check (auth.uid() = user_id);

-- 5. SUPPORT_SESSIONS
alter table support_sessions enable row level security;

create policy "Users read own support sessions"
  on support_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own support sessions"
  on support_sessions for insert
  with check (auth.uid() = user_id);

-- 6. CARE_TICKETS
alter table care_tickets enable row level security;

create policy "Users read own care tickets"
  on care_tickets for select
  using (auth.uid() = user_id);

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
