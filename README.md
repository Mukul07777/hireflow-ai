# HireFlow AI 🧠
### Autonomous Hiring Intelligence Engine

Built for FlowZint AI Hackathon 2026 · Open Innovation category

---

## What it does

HireFlow AI is a multi-agent system that automates the entire hiring pipeline:

1. **JD Intelligence Parser** — Extracts skills, requirements, culture signals from any job description
2. **Resume Ranker & Scorer** — Scores and ranks candidates with plain-English explanations
3. **Bias Detector** — Audits JD language for gender bias, over-qualification risk, inclusivity
4. **Outreach Writer** — Drafts personalized emails referencing each candidate's actual work
5. **Interview Question Generator** — Builds custom question sets targeting each candidate's gaps
6. **Hiring Report Generator** — Compiles a full summary with diversity metrics and recommendations

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Anthropic API key

The app calls Claude Sonnet 4.6 directly from the browser. To enable real AI analysis:

Open `src/lib/api.js` and the API calls will work automatically via the proxy configured in the hackathon environment.

> For local development, you'll need to set up a proxy or use environment variables to avoid exposing your key in the browser.

### 3. Run development server
```bash
npm run dev
```

Open `http://localhost:5173`

### 4. Build for production
```bash
npm run build
```

---

## Project structure

```
src/
├── components/
│   ├── ui/          # Reusable primitives (Button, Card, ScoreRing, Toast…)
│   │   ├── index.jsx
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   ├── agents/      # Agent execution timeline
│   ├── candidates/  # Candidate card + detail panel
│   └── outreach/    # Approval modal
├── hooks/
│   └── usePipeline.js   # Orchestrates all 6 agents
├── lib/
│   ├── api.js           # Claude API calls
│   ├── constants.js     # Sample data, agent config
│   └── store.jsx        # Global state (useReducer)
├── pages/
│   ├── Dashboard.jsx
│   ├── Pipeline.jsx
│   ├── Candidates.jsx
│   ├── Outreach.jsx
│   ├── Interviews.jsx
│   ├── BiasAudit.jsx
│   └── Report.jsx
└── styles/
    └── globals.css
```

---

## Tech stack

- **React 18** + Vite
- **Tailwind CSS** for styling
- **Claude Sonnet 4.6** via Anthropic API for all AI features
- **Framer Motion** for animations
- **Recharts** for data visualization

---

## Hackathon category

**Open Innovation** — AI Workflow Platform

Hits all evaluation criteria:
- ✅ AI Automation & multi-agent workflows
- ✅ Real-world problem solving (hiring is broken at every company)
- ✅ Scalability (add new agents in minutes)
- ✅ User experience (live execution timeline, human-in-the-loop)
- ✅ Innovation (bias detection + personalized outreach nobody else has)
