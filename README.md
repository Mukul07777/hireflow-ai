# NexFlow AI — Multi-Agent Business Intelligence Platform

> **Live demo → [hireflow-ai-liart.vercel.app](https://hireflow-ai-liart.vercel.app)**  
> Sign in with Google, email/password, or click **Try Demo** for instant access.

A multi-agent AI platform where 6 autonomous systems — hiring, sales, support, customer care, SMB intelligence, and a live War Room — share intelligence and hand off tasks to each other in real time. Built for Indian SMBs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                        │
│                                                              │
│   AuthScreen ──→ Supabase Auth (email/password + Google)    │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │ HireFlow │  │SalesFlow │  │SupportBot│  │  CareBot │  │
│   │ 7 agents │  │ 3 agents │  │ 2 agents │  │ 2 agents │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│        └──────────────┴──────────────┴──────────┬──┘        │
│                    WAR ROOM (command center)     │           │
│         Phase 1→2→3→4 · Agent debates · Handoffs◄──────────┘│
│                        │                                     │
│              ActivityPanel (live Groq API log)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
   GROQ API (Llama 3.3 70B)       SUPABASE (PostgreSQL)
   Round-robin 4 API keys         pipeline_runs, candidates,
   SSE streaming + JSON           sales_sessions, care_tickets,
                                  war_room_sessions + RLS
```

## What makes this different

- **Not a chatbot** — an agent network with real handoffs, memory, and debate
- **India-first** — salary benchmarks, Hindi/Hinglish toggle, WhatsApp delivery, Indian market data
- **Deterministic India-compliance checks** — regex-based flags for age-proxy language, gendered job titles, missing equal-opportunity statements, salary-secrecy clauses, and over-specified experience requirements, referenced against the actual Indian legal framework (Equal Remuneration Act, POSH Act, Code on Wages) rather than a generic Western bias checklist. Reproducible — the same JD always produces the same flags, unlike the LLM-based bias score which can vary call to call. Wired live into the Bias Detector agent; see `lib/indiaComplianceRules.js`.
- **Real, cited compute cost** — a full 8-call HireFlow pipeline run costs roughly ₹0.19 in Groq API compute (see "Real Cost of Running This" below) — computed from Groq's published pricing and this app's own token tracking, not an invented marketing figure.
- **Transparent AI** — live backend panel shows every token, every key, every API call in real time
- **Production patterns** — Supabase Auth + Google OAuth, Row Level Security on all tables, React error boundaries, key rotation across 4 Groq keys, session persistence

---

## What It Does

Most AI tools are single-purpose. NexFlow AI runs 6 specialized agents simultaneously and lets them talk to each other — a sales lead auto-routes to the hiring pipeline, a support escalation triggers a care ticket, and the War Room orchestrates all of them in one command.

---

## Agents

| Agent | What it does |
|---|---|
| HireFlow AI | 7-agent hiring pipeline: JD analysis, bulk resume screening, bias audit, salary benchmarking, email outreach, interview Q generation |
| SalesFlow AI | Indian B2B prospect generation, personalized cold emails, drip sequences, live objection handler |
| SupportFlow AI | KB builder from raw docs, sentiment detection, real-time chat bot, escalation routing |
| CareFlow AI | Dynamic ticket triage, human-in-the-loop approval, WhatsApp response delivery |
| SMB Brain | WhatsApp CRM builder for tier-2 Indian businesses — paste chats, get structured CRM + FAQ + sales pipeline |
| War Room | All 4 agents fire in parallel (Promise.all), cross-agent handoffs stream live, unified AI command report generated |

---

## Key Features

- **Voice input** — Web Speech API on JD field and product description
- **English / Hinglish AI toggle** — AI switches to Roman-script Hinglish (natural Indian mix); floating toast confirms mode change
- **Dark / Light mode** — CSS filter invert on root, instant toggle
- **WhatsApp send** — pre-filled wa.me deep links in SalesFlow outreach and CareFlow responses
- **Parallel War Room agents** — 4 AI agents run simultaneously via Promise.all, not sequentially
- **Live Agent Network** — animated SVG on home screen with 6 agent nodes and real-time data-flow pulses; click any node to open that mode
- **Bulk resume processor** — paste 10+ resumes separated by ---, AI parses, scores, and ranks all against the JD. The batch-splitting and name-extraction step (the part that runs locally, before any LLM call) is unit tested and benchmarked: `node scripts/benchmark-resume-parsing.mjs` measures ~0.2ms to split and extract names from 200 pasted resumes on ordinary hardware. That number does not include the LLM scoring pass that follows — that step's latency depends on Groq's API and isn't something this repo controls or should claim a fixed number for.
- **Groq key rotation** — round-robin across up to 4 API keys for load distribution, with automatic retry on a dead/expired key (401/403) instead of silently returning an empty response.
- **Real command report** — War Room final report uses actual candidate counts, prospect counts, and calculated ROI

---

## Real Cost of Running This

A common gap in "AI for SMBs" pitches is that nobody actually says what it costs to run. This one does, computed from Groq's own published pricing, not estimated:

- Groq pricing for `llama-3.3-70b-versatile`: **$0.59 / million input tokens, $0.79 / million output tokens** (source: [groq.com/pricing](https://groq.com/pricing), checked July 2026 — token pricing changes, re-verify before quoting this elsewhere).
- A full HireFlow pipeline run (JD analysis, bulk candidate scoring, bias audit, salary benchmark, 3 outreach emails, interview questions — 8 Groq calls) comes out to roughly **$0.002 (≈ ₹0.19 at ~95.5 INR/USD, July 2026)** per run, computed in `lib/costEstimator.js` and reproducible with:

```bash
node -e "
const { estimatePipelineCost } = await import('./src/lib/costEstimator.js');
console.log(estimatePipelineCost([
  {promptChars:1200,outputChars:800},{promptChars:2000,outputChars:600},
  {promptChars:900,outputChars:400},{promptChars:600,outputChars:300},
  {promptChars:700,outputChars:500},{promptChars:700,outputChars:500},
  {promptChars:700,outputChars:500},{promptChars:800,outputChars:600},
]));
"
```

At 1,000 pipeline runs a month — a genuinely high-usage SMB scenario — that's about **₹190/month** in Groq compute. This is the actual number an SMB owner would ask about before adopting a tool like this, and it's small enough to be a real selling point rather than a glossed-over detail.

The exchange rate is a snapshot, not live — `lib/costEstimator.js` takes it as a parameter with a documented default, specifically so this doesn't quietly go stale and get quoted as current months later.

---

## Data Privacy (India's DPDP Act, 2023)

This app stores candidate names, emails, salaries, and phone numbers — personal data under India's Digital Personal Data Protection Act, 2023, which is in force. Two things exist specifically for this:

- **`deleteAllUserData(userId)`** in `lib/db.js` — a real data-subject deletion function. Deleting a user's `pipeline_runs` cascades automatically to their `candidates` and `outreach_emails` (via the `on delete cascade` foreign keys in `supabase_schema.sql`); `sales_sessions`, `support_sessions`, and `care_tickets` are deleted directly. It is not wired into the UI yet (no "delete my data" button exists on any screen) — the function is ready to call, wiring it in is a settings-page addition.
- **`supabase_rls_v2_fix.sql`** — while checking what this deletion function would actually need to work, I found that the original `supabase_rls.sql` never drops the permissive `"public access"` policies created by `supabase_schema.sql`. Postgres OR's together multiple policies for the same action, so as long as those permissive policies exist, **any holder of the public anon key can read and write every user's data**, regardless of the newer per-user policies — meaning the "Row Level Security on all tables" claim above was true in the sense that RLS was *enabled*, but not true in the sense that it was actually *restricting* anything. `supabase_rls_v2_fix.sql` explicitly drops the old permissive policies and adds the missing UPDATE/DELETE policies (the original file only had SELECT/INSERT for most tables, which would have made `deleteAllUserData` silently delete zero rows — the exact same "looks successful, does nothing" failure pattern as the Groq key bug described below). **Run this file in the Supabase SQL editor on top of the other two, then verify with the query at the bottom of the file — no policy named "public access" should remain.**

---

## Tech Stack

- React 18 + Vite 4
- Groq API (Llama 3.3 70B) — SSE streaming + non-streaming JSON
- Supabase — pipeline history, outreach emails, support sessions, care tickets
- EmailJS — real transactional email delivery
- Web Speech API — voice input with English/Hinglish switching
- Framer Motion — page transitions and animations

---

## Testing & CI

`npm test` runs the Vitest suite (`src/lib/*.test.js`) covering Groq key rotation, resume batch-parsing, India compliance rules, PAN/GSTIN/Udyam verification, outcome learning, cost estimation, and the Supabase REST helpers' fallback behavior when no database is configured. GitHub Actions (`.github/workflows/ci.yml`) runs the test suite and a production build on every push to `main` and on every pull request.

This does not cover the React component layer — there is no component/integration test suite yet. Treat the frontend as manually-tested, not regression-tested.

`node scripts/benchmark-resume-parsing.mjs` measures the local (non-LLM) resume-batch-splitting step directly, so the throughput claim in Key Features above is a number you can reproduce, not a marketing figure.

---

## Known Limitations

Being upfront about what "production patterns" in the section above does and doesn't mean:

- **WhatsApp delivery** goes through CallMeBot, a free hobbyist API with no SLA and informal rate limits. It's adequate for demos, not for production message volume — a real deployment should move to the WhatsApp Business API.
- **No automated tests on the UI layer.** `App.jsx` is a single ~5,400-line file; the Groq key rotation logic (`lib/groqKeyRotation.js`), resume batch-parsing (`lib/resumeParsing.js`), India compliance rules (`lib/indiaComplianceRules.js`), identifier verification (`lib/indianVerification.js`), outcome learning (`lib/outcomeLearning.js`), and cost estimation (`lib/costEstimator.js`) have all been extracted and are unit tested, but the rest of the component tree isn't yet split out or tested.
- **Bias audit, salary benchmarking, and sentiment detection are LLM-generated outputs**, not validated against labeled ground truth — treat them as a starting draft for human review, not a certified result.
- **Salary figures in `SampleData.js`/`ResumeBank.js` are illustrative, not sourced from a specific salary survey.** If you're using this for anything beyond a demo, replace them with numbers cited from AmbitionBox, Glassdoor India, or a similar source, and say so.
- **Sample resumes and JDs used in the demo are synthetic**, authored for this project, not real anonymized postings. This matters for how much weight "demonstrated ability to resolve real-world problems" should carry until it's been run against genuinely real inputs.
- **The RLS gap described above (fixed in `supabase_rls_v2_fix.sql`) means any database created from just `supabase_schema.sql` + `supabase_rls.sql` — i.e. before this fix existed — has exposed all users' data to anyone with the anon key.** If you deployed this before this fix, run the fix file and rotate your Supabase anon key as a precaution (Settings → API → regenerate).

---

## Additional capabilities (built, tested, not yet wired into the UI)

Modules that exist as tested library functions but aren't yet called from any screen. Listed here explicitly rather than left as silent dead code, with what it would take to finish wiring each one in:

- **`lib/indianVerification.js`** — structural + checksum validation for PAN, GSTIN, and Udyam (MSME) registration numbers. Important scope limit: this validates that a number is *shaped like* a real one and internally checksum-consistent (the GSTIN checksum implementation is verified against the standard public test vector `27AAPFU0939F1ZV`) — it does **not** call any government registry, so it cannot confirm a number is actually registered or active. Intended use: a free, instant, no-network first-pass filter in SalesFlow lead intake or HireFlow employer verification, catching obviously fabricated identifiers before a human looks at the lead/candidate. Wiring it in means adding one input field + one function call in `SalesMode()`/`HiringCandidates()` in `App.jsx`.
- **`lib/outcomeLearning.js`** — a frequency-weighted tracker (explicitly *not* reinforcement learning — see the file header) that records which outreach message openings led to a reply/conversion vs. no reply, ranks them by success rate, and can generate a prompt hint nudging future message generation toward what's actually worked. This is the mechanism for turning "agents hand off data" into "agents adjust based on measured outcomes" — but it needs real reply/conversion events to learn from, which means either live usage over time or a seeded historical dataset, honestly labeled as such rather than presented as live learning from a demo session.
- **`deleteAllUserData(userId)` in `lib/db.js`** — see "Data Privacy" above. Ready to call; needs a settings-page button and the RLS fix applied to actually delete anything.

---

## Environment Variables

Add to Vercel Project Settings > Environment Variables:

```
VITE_GROQ_API_KEY=your_primary_groq_key
VITE_GROQ_API_KEY_2=your_second_key
VITE_GROQ_API_KEY_3=your_third_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_CALLMEBOT_PHONE=+91XXXXXXXXXX
VITE_CALLMEBOT_APIKEY=your_callmebot_key
```

WhatsApp setup (CallMeBot — free): send `I allow callmebot to send me messages` to +34 644 59 97 91 on WhatsApp. CallMeBot replies with your API key. Add your number + that key to Vercel. Without these, WhatsApp buttons fall back to wa.me deep links.

Never commit .env — keys live in Vercel env vars only. If a key ever ends up in a commit, rotating it is not optional: removing the file in a later commit does not remove it from git history, and anyone can pull it back out with `git show <commit>:.env`.

---

## Local Development

```bash
git clone https://github.com/Mukul07777/hireflow-ai.git
cd hireflow-ai
npm install
# create .env with your keys
npm run dev
npm test        # run unit tests
npm run build   # production build
```

Database setup, in order:
```
1. Run supabase_schema.sql in the Supabase SQL editor
2. Run supabase_rls.sql
3. Run supabase_rls_v2_fix.sql  ← do not skip this one, see "Data Privacy" above
```

---

## Architecture

```
src/
  App.jsx                  # entire frontend (~5400 lines)
  BulkResumeProcessor.jsx  # resume parsing + scoring
  BiasAudit.jsx            # JD bias detection
  RejectionFlow.jsx        # candidate decision bar
  PipelineHistory.jsx      # Supabase run history
  SampleData.js            # candidate pool, domain detection
  ResumeBank.js            # 50+ sample resumes across 8 domains
  lib/
    db.js                     # Supabase REST helpers, incl. deleteAllUserData (unit tested)
    supabase.js               # pure fetch Supabase client (insert/select/update/delete)
    groqKeyRotation.js        # Groq API key round-robin (unit tested)
    resumeParsing.js          # resume batch split + name extraction (unit tested, benchmarked)
    indiaComplianceRules.js   # deterministic India-law JD checks (unit tested, wired into bias audit)
    indianVerification.js     # PAN/GSTIN/Udyam format+checksum validation (unit tested, not yet wired in)
    outcomeLearning.js        # outreach outcome tracker (unit tested, not yet wired in)
    costEstimator.js          # real Groq-pricing-based cost estimation (unit tested)
scripts/
  benchmark-resume-parsing.mjs  # run: node scripts/benchmark-resume-parsing.mjs
```

**Supabase table for War Room memory** (run in Supabase SQL editor):
```sql
create table war_room_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  summary text,
  candidates int default 0,
  prospects int default 0,
  kb_items int default 0,
  cross_events int default 0,
  handoffs_count int default 0
);
```

State: single useReducer at root. AI: module-level callClaude() and callClaudeStream() with round-robin key rotation.
