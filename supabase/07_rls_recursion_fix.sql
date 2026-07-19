-- ============================================================================
-- 07_rls_recursion_fix.sql — fixes "infinite recursion detected in policy for
-- relation employees" (Postgres 42P17), which broke EVERY database write.
--
-- THE BUG
-- The policies added in 04_multitenancy.sql check membership like this:
--
--   create policy "..." on employees for select
--     using (exists (select 1 from employees me
--                    where me.company_id = employees.company_id
--                      and me.user_id = auth.uid()));
--
-- To decide whether you may read a row of `employees`, Postgres has to run that
-- USING clause — which itself reads `employees` — which runs the policy again,
-- forever. Postgres aborts with 42P17. Because every other table's policy also
-- selects from `employees`, the recursion took down pipeline_runs, candidates,
-- sales_sessions, support_sessions, care_tickets and brain_events too: every
-- insert and select failed.
--
-- Found by the test suite, which surfaced the raw Postgres error on every db call.
--
-- THE FIX
-- Move the membership lookup into SECURITY DEFINER functions. Those execute with
-- the function owner's rights, which means RLS is NOT re-applied to the lookup —
-- so the policy can ask "which companies does this user belong to?" without
-- re-entering the policy. This is the standard Supabase pattern for self-
-- referential membership tables.
--
-- Run AFTER 04_multitenancy.sql. Idempotent — safe to re-run.
-- ============================================================================

-- ── Membership helpers (SECURITY DEFINER = bypasses RLS, stops the recursion) ──

create or replace function public.my_company_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select e.company_id
  from employees e
  where e.user_id = auth.uid()
    and e.status = 'active'
$$;

create or replace function public.is_company_admin(target_company uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from employees e
    where e.user_id = auth.uid()
      and e.company_id = target_company
      and e.role = 'admin'
      and e.status = 'active'
  )
$$;

revoke all on function public.my_company_ids() from public;
revoke all on function public.is_company_admin(uuid) from public;
grant execute on function public.my_company_ids() to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;

-- ── Replace the recursive EMPLOYEES policies ─────────────────────────────────

drop policy if exists "Users can read employee rows for their own company" on employees;
create policy "Users can read employee rows for their own company"
  on employees for select
  using (
    user_id = auth.uid()                          -- always see your own row
    or company_id in (select public.my_company_ids())
  );

drop policy if exists "Admins can insert employees into their own company" on employees;
create policy "Admins can insert employees into their own company"
  on employees for insert
  with check (
    public.is_company_admin(company_id)
    -- a brand-new company's very first admin row is self-inserted, and at that
    -- moment the user is not yet a member of anything, so allow that case:
    or user_id = auth.uid()
  );

drop policy if exists "Admins can update employee roles in their own company" on employees;
create policy "Admins can update employee roles in their own company"
  on employees for update
  using (public.is_company_admin(company_id));

drop policy if exists "Invited users can claim their own employee row" on employees;
create policy "Invited users can claim their own employee row"
  on employees for update
  using (status = 'invited' and invited_email = auth.jwt() ->> 'email')
  with check (user_id = auth.uid() and status = 'active');

-- ── COMPANIES: same recursion risk, same fix ─────────────────────────────────

drop policy if exists "Users can read their own company" on companies;
create policy "Users can read their own company"
  on companies for select
  using (id in (select public.my_company_ids()) or created_by = auth.uid());

drop policy if exists "Admins can update their own company" on companies;
create policy "Admins can update their own company"
  on companies for update
  using (public.is_company_admin(id));

-- ── VERIFY ───────────────────────────────────────────────────────────────────
-- Run this after; it must return rows, not error 42P17:
--   select * from employees limit 5;
--   select public.my_company_ids();
