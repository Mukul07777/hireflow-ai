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
