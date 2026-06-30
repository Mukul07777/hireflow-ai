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
- **Bulk resume processor** — paste 10+ resumes separated by ---, AI parses, scores, and ranks all against the JD
- **Groq key rotation** — round-robin across up to 4 API keys for load distribution
- **Real command report** — War Room final report uses actual candidate counts, prospect counts, and calculated ROI

---

## Tech Stack

- React 18 + Vite 4
- Groq API (Llama 3.3 70B) — SSE streaming + non-streaming JSON
- Supabase — pipeline history, outreach emails, support sessions, care tickets
- EmailJS — real transactional email delivery
- Web Speech API — voice input with English/Hinglish switching
- Framer Motion — page transitions and animations

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

Never commit .env — keys live in Vercel env vars only.

---

## Local Development

```bash
git clone https://github.com/Mukul07777/hireflow-ai.git
cd hireflow-ai
npm install
# create .env with your keys
npm run dev
```

---

## Architecture

```
src/
  App.jsx                  # entire frontend (~3800 lines)
  BulkResumeProcessor.jsx  # resume parsing + scoring
  BiasAudit.jsx            # JD bias detection
  RejectionFlow.jsx        # candidate decision bar
  PipelineHistory.jsx      # Supabase run history
  SampleData.js            # candidate pool, domain detection
  ResumeBank.js            # 50+ sample resumes across 8 domains
  lib/
    db.js                  # Supabase REST helpers
    supabase.js            # pure fetch Supabase client
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

