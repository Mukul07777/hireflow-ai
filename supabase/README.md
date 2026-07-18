# Supabase — database setup

All SQL for NexFlow AI, in the exact order it must run. Each file depends on the
ones before it, so **order matters**.

## Run order

| # | File | What it does |
|---|------|--------------|
| 1 | `01_schema.sql` | Core tables (pipeline_runs, candidates, sales/support/care, etc.) |
| 2 | `02_rls.sql` | Enables Row Level Security + per-user policies |
| 3 | `03_rls_v2_fix.sql` | **Do not skip.** Drops the old permissive "public access" policies that exposed all users' data, and adds the missing UPDATE/DELETE policies |
| 4 | `04_multitenancy.sql` | companies + employees tables and company-scoped RLS |
| 5 | `05_cross_signals.sql` | Real Care→Sales / Hiring→Support handoff rows |
| 6 | `06_company_brain.sql` | `brain_events` — the shared cross-agent memory log |

## Two ways to run it

**Option A — one shot (easiest):**
Open `00_run_all.sql`, paste the whole thing into the Supabase SQL Editor, click Run.
It is files 1–6 concatenated in order.

**Option B — one at a time:**
Run `01` through `06` individually, in order. Each should end with
"Success. No rows returned."

## After running

1. Settings → API → copy your **Project URL** and **anon public** key into the
   project's `.env` (and Vercel env vars if deployed).
2. Verify multi-tenant isolation with two real accounts before trusting it live —
   sign up as User A and User B and confirm B cannot read A's company data. RLS
   bugs are invisible until tested with two separate logins.

## Note on the earlier error

`06_company_brain.sql` originally referenced a helper function
`is_company_member()` that was never defined — that's what caused
`ERROR: 42883: function is_company_member(uuid) does not exist`.
It now uses the same inline `exists (select 1 from employees …)` membership check
as `04_multitenancy.sql`, so it has no missing dependency. Just run the files in
order (4 before 6) and it works.
