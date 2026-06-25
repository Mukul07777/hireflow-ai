import { useState } from "react";

const SECTIONS = [
  {
    id: "intro",
    icon: "⚡",
    title: "FlowZint AI Platform",
    subtitle: "What this is",
    color: "#534AB7",
    bg: "#EEEDFE",
    overview: "An autonomous multi-agent AI platform that handles hiring, sales, support, and customer care — simultaneously. Built for Indian businesses. 6 AI systems, 7 agents, real emails, real scoring.",
    features: [
      { label: "6 AI modes", desc: "HireFlow · SalesFlow · SupportFlow · CareFlow · SMB Brain · AI War Room" },
      { label: "Real AI", desc: "Every agent calls Claude Sonnet — not fake hardcoded responses" },
      { label: "Real emails", desc: "EmailJS integration — outreach emails actually land in inboxes" },
      { label: "Cross-mode intelligence", desc: "Agents hand off tasks between modes automatically" },
      { label: "Indian context", desc: "20+ realistic Indian resumes, Hindi objection handling, INR pricing" },
    ]
  },
  {
    id: "hiring",
    icon: "🧠",
    title: "HireFlow AI",
    subtitle: "Hiring Intelligence Engine",
    color: "#534AB7",
    bg: "#EEEDFE",
    tag: "Open Innovation",
    overview: "Paste a JD. Load or paste resumes. 7 AI agents run in sequence — each thinks out loud in real time. End result: ranked shortlist, personalized outreach emails, interview questions, bias audit, salary benchmark, and a full hiring report.",
    features: [
      { label: "Bulk resume processing", desc: "Paste 10-50 resumes separated by ---. AI parses, scores, and ranks all of them in one batch. Shortlisted / Needs Review / Rejected automatically." },
      { label: "Agent 1 — JD Intelligence Parser", desc: "Extracts must-have vs nice-to-have skills, flags vague language, identifies salary range, detects over-specification." },
      { label: "Agent 2 — Resume Ranker & Scorer", desc: "Scores each resume 0-100 against JD fit. Data scientist on frontend JD = 15. Perfect match = 90+. Real variance, not clustered." },
      { label: "Agent 3 — Bias Detector", desc: "Audits JD for gender-coded language, over-qualification risk, salary transparency. Visual score rings per dimension." },
      { label: "Agent 4 — Outreach Writer", desc: "Writes personalized emails per candidate referencing their actual company and work. Subject line auto-extracted." },
      { label: "Agent 5 — Interview Question Gen", desc: "Generates role-specific questions targeting each candidate's gaps. Not generic templates." },
      { label: "Agent 6 — Salary Benchmarker", desc: "Benchmarks against 2025 Indian tech market by city. Flags counter-offer risks and budget mismatches." },
      { label: "Agent 7 — Report Generator", desc: "Compiles full intelligence report with top candidate recommendation, risks, and next steps." },
      { label: "Real email sending", desc: "Approve & Send triggers EmailJS — email lands in candidate inbox with HireFlow AI branding. Editable recipient." },
      { label: "Calendar invites", desc: "Manual interview path generates a Google Calendar link pre-filled with candidate name, role, 30-min slot 3 days out." },
      { label: "Candidate decisions", desc: "Pass / Not moving forward per candidate. Rejection reason dropdown. Decision summary with counts." },
      { label: "Pipeline history", desc: "Last 5 runs saved to localStorage. Survives page refresh. JD snippet, top candidate, bias score per run." },
      { label: "AI chat assistant", desc: "Floating 🤖 button with full pipeline context. Ask 'Who fits remote?' or 'Compare Aditya and Kavya' in natural language." },
    ]
  },
  {
    id: "sales",
    icon: "🎯",
    title: "SalesFlow AI",
    subtitle: "Autonomous Sales Agent",
    color: "#BA7517",
    bg: "#FAEEDA",
    tag: "Sales Bot",
    overview: "Paste your product and target audience. AI generates 5 realistic Indian B2B prospect profiles, writes personalized cold emails for each, and handles objections live — including Hindi objections.",
    features: [
      { label: "Prospect generation", desc: "Claude generates 5 realistic Indian B2B prospects with company, city, pain point, budget, fit score, and likely objection. Not generic — Bangalore SaaS CTOs, Mumbai fintech VPs." },
      { label: "Personalized outreach", desc: "One cold email per prospect referencing their specific pain point and company. Under 130 words, natural tone, Indian business context." },
      { label: "Live objection handler", desc: "Type any objection and get a tailored response. Works in Hindi: 'Iska price bahut zyada hai' → specific counter with Indian market framing." },
      { label: "Objection playbook", desc: "5 pre-built Indian market objections with tactical responses — price, competition (Naukri), budget timing, management approval, ROI demand." },
      { label: "Human-in-the-loop", desc: "Approve and Send on each email before anything goes out." },
    ]
  },
  {
    id: "support",
    icon: "💬",
    title: "SupportFlow AI",
    subtitle: "Intelligent Support Bot",
    color: "#1D9E75",
    bg: "#E1F5EE",
    tag: "Support Chat Bot",
    overview: "Paste your product docs or FAQ. AI builds a knowledge base instantly. Live chat widget answers customer questions using only your KB — not generic AI. Detects negative sentiment and flags for escalation.",
    features: [
      { label: "KB builder", desc: "Paste any docs, FAQ, or policies. Claude extracts 8+ Q&A pairs categorized as billing / technical / general. Takes 2 seconds." },
      { label: "Live chat", desc: "Customer asks → Claude answers from YOUR KB only. Won't make up answers outside the KB." },
      { label: "Sentiment detection", desc: "Angry / urgent keywords trigger escalation flag automatically. Escalated chats appear in history with warning badge." },
      { label: "Chat history", desc: "All conversations saved in session. New chat button. Escalated chats highlighted." },
      { label: "Cross-mode handoff", desc: "Escalated chats trigger CareFlow notification. Common support objections push to SalesFlow KB." },
    ]
  },
  {
    id: "care",
    icon: "❤️",
    title: "CareFlow AI",
    subtitle: "Customer Care Bot",
    color: "#D4537E",
    bg: "#FBEAF0",
    tag: "Customer Care Bot",
    overview: "5 pre-loaded realistic Indian customer tickets across billing, technical, sales, and feedback. AI reads each ticket, scores sentiment, drafts an empathetic response. Human reviews and approves before sending.",
    features: [
      { label: "Ticket triage", desc: "5 tickets: Raj Patel (double charge, Mumbai), Priya Nair (pipeline stuck, Bangalore), Amir Khan (enterprise upgrade, Hyderabad), Sunita Rao (login issue, Pune), Vikram Singh (positive feedback, Delhi)." },
      { label: "Priority scoring", desc: "Urgent / High / Normal / Low auto-assigned. Sentiment emoji per ticket (😡 😟 😐 😊)." },
      { label: "AI response drafting", desc: "Claude writes empathetic, context-aware responses referencing the customer's specific issue — not template text." },
      { label: "Human approval", desc: "Edit the draft before approving. Nothing sends without human sign-off." },
      { label: "Upsell detection", desc: "Sales-intent tickets (like Amir's enterprise inquiry) trigger a cross-mode event routing to SalesFlow automatically." },
    ]
  },
  {
    id: "smb",
    icon: "🏪",
    title: "SMB Brain",
    subtitle: "1-Click Indian Business AI",
    color: "#7C3AED",
    bg: "#F3F0FF",
    tag: "Open Innovation",
    overview: "Built specifically for Indian SMBs who run their business on WhatsApp. Paste raw chat messages — AI extracts customers, intent, and builds a CRM, support FAQ, and sales pipeline automatically.",
    features: [
      { label: "WhatsApp CRM builder", desc: "Paste raw messages like 'Hey bhai kal 10kg aata chahiye'. AI identifies customers, classifies intent (order / complaint / inquiry), assigns value (high/medium/low), and suggests action." },
      { label: "Auto support FAQ", desc: "Common questions extracted from chat patterns and turned into a support knowledge base." },
      { label: "Sales opportunities", desc: "AI identifies upsell and cross-sell opportunities from conversation patterns with revenue estimates." },
      { label: "Automation wins", desc: "Lists specific things AI can automate for that business — order confirmations, follow-ups, price queries." },
      { label: "ROI estimate", desc: "Calculates weekly time saved and monthly revenue impact in INR." },
      { label: "Tier-2 India ready", desc: "Works for kirana shops, coaching centers, clinics, D2C brands — not just tech companies." },
    ]
  },
  {
    id: "warroom",
    icon: "⚡",
    title: "AI War Room",
    subtitle: "Multi-Agent Command Center",
    color: "#0F172A",
    bg: "#F1F5F9",
    tag: "Open Innovation",
    overview: "All 4 AI systems run simultaneously. Agents don't just work in parallel — they actively communicate and hand off work to each other. This is cross-mode intelligence.",
    features: [
      { label: "Simultaneous execution", desc: "All 4 modes (Hiring, Sales, Support, Care) run at the same time across 7 phases." },
      { label: "Live agent debates", desc: "Watch agents hand off tasks in real time: HireFlow → SalesFlow (declined candidate = sales prospect), CareFlow → SalesFlow (enterprise inquiry = upsell), SalesFlow → SupportFlow (common objection = KB update)." },
      { label: "Cross-mode events panel", desc: "⚡ button shows all cross-mode signals fired across the session with action taken." },
      { label: "Unified intelligence report", desc: "Single report showing all 4 systems complete, 5 cross-agent handoffs, total time saved, estimated monthly ROI." },
    ]
  },
  {
    id: "tech",
    icon: "🔧",
    title: "Technical Stack",
    subtitle: "How it's built",
    color: "#0F172A",
    bg: "#F1F5F9",
    overview: "2,300+ lines of React. Zero backend. Zero UI library. Everything runs browser-side — AI calls, email sending, resume parsing, state management. Built in one session, fully production-quality architecture.",
    features: [
      { label: "Frontend — React 18 + Vite", desc: "Single-file component architecture with useReducer for global state. Zero external UI library — every component hand-built with inline styles. Hot reload via Vite. No TypeScript overhead." },
      { label: "AI Engine — Claude Sonnet 4.6", desc: "Every single agent makes a real Claude API call with role-specific prompts. 7 agents in HireFlow, 1 per support chat, 1 per prospect, 1 per ticket response, 1 per objection — all real AI, zero hardcoded responses." },
      { label: "Email — EmailJS", desc: "Real emails sent directly from the browser via EmailJS REST API. No backend needed. Gmail integration with branded HTML template (HireFlow AI header, purple gradient, candidate name). Delivered to real inboxes." },
      { label: "Calendar — Google Calendar API", desc: "Manual interview path generates a real Google Calendar link — pre-filled title, 30-min slot, candidate name, job role, agenda. One click and it opens in Google Calendar ready to save." },
      { label: "Resume Processing — BulkResumeProcessor.jsx", desc: "Paste 10-50 resumes separated by ---. Auto-detects separator style. Claude parses each resume (role, company, skills, salary, notice). Batch scores all against JD in one API call. Pass/Review/Reject threshold filtering." },
      { label: "Bias Detection — BiasAudit.jsx", desc: "Animated score rings for 4 bias dimensions: gender neutrality, inclusive language, experience over-specification, salary transparency. Claude analyzes actual JD text and returns scores + specific flagged phrases." },
      { label: "Rejection Flow — RejectionFlow.jsx", desc: "Pass / Not moving forward decision per candidate. Dropdown with 9 rejection reasons. Optional note. Undo. Decision summary panel with counts. All state in React, persists through session." },
      { label: "Pipeline History — PipelineHistory.jsx", desc: "localStorage saves last 5 runs automatically after every pipeline completion. Expandable cards with JD snippet, top candidate, bias score, domain. Survives page refresh. Load run navigates to report." },
      { label: "Cross-mode Intelligence", desc: "Events dispatch across modes via Redux-style reducer. HireFlow pipeline completion triggers CareFlow onboarding event. Support escalation triggers CareFlow alert. Sales prospects trigger SupportFlow KB update. All wired via ADD_CROSS_EVENT dispatch." },
      { label: "Domain Detection — SampleData.js", desc: "detectDomain() regex matches JD text to 10 domains: frontend, product, data, backend, marketing, sales, design, hr, finance, cs. 23 candidates in CANDIDATE_POOL, 20 full resumes in ResumeBank.js — all realistic Indian professionals." },
      { label: "State Management", desc: "Single useReducer with 35+ action types. No Redux, no Zustand, no Context sprawl. One Ctx.Provider wraps the entire app. Derived state computed in components, not stored." },
      { label: "File structure", desc: "App.jsx (2,297 lines) · SampleData.js · ResumeBank.js · BiasAudit.jsx · RejectionFlow.jsx · PipelineHistory.jsx · BulkResumeProcessor.jsx · ProjectOverview.jsx — 8 files total, zero npm packages beyond React + Vite." },
    ]
  },
];

export function ProjectOverview({onNavigate}){
  const[active,setActive]=useState("intro");
  const section=SECTIONS.find(s=>s.id===active)||SECTIONS[0];
  const isTech=active==="tech";

  const TECH_METRICS=[
    {label:"Lines of code",value:"2,297",sub:"App.jsx alone"},
    {label:"API calls",value:"20+",sub:"per full demo run"},
    {label:"React components",value:"40+",sub:"all hand-built"},
    {label:"npm packages",value:"2",sub:"react + vite only"},
    {label:"AI agents",value:"7",sub:"real Claude calls"},
    {label:"Files",value:"8",sub:"zero boilerplate"},
  ];

  const TECH_BADGES=[
    {label:"React 18",color:"#087EA4"},{label:"Vite",color:"#646CFF"},
    {label:"Claude Sonnet 4.6",color:"#D97706"},{label:"EmailJS",color:"#1D9E75"},
    {label:"Google Calendar API",color:"#4285F4"},{label:"localStorage",color:"#534AB7"},
    {label:"useReducer",color:"#0F172A"},{label:"No backend",color:"#D85A30"},
    {label:"No UI library",color:"#7C3AED"},{label:"Browser-only",color:"#085041"},
  ];

  return(
    <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:0,height:"100%",maxWidth:1200,margin:"0 auto"}}>

      {/* Left nav */}
      <div style={{borderRight:"1px solid #EEECEA",overflowY:"auto",background:"white"}}>
        {SECTIONS.map(s=>(
          <div key={s.id} onClick={()=>setActive(s.id)}
            style={{padding:"12px 20px",cursor:"pointer",borderBottom:"1px solid #EEECEA",background:active===s.id?s.bg:"white",borderLeft:active===s.id?"3px solid "+s.color:"3px solid transparent",transition:"all 0.15s"}}
            onMouseEnter={e=>{if(active!==s.id){e.currentTarget.style.background="#FAFAF8";}}}
            onMouseLeave={e=>{if(active!==s.id){e.currentTarget.style.background="white";}}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>{s.icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:active===s.id?s.color:"#1C1C1A"}}>{s.title}</div>
                <div style={{fontSize:10,color:"#888780"}}>{s.subtitle}</div>
              </div>
            </div>
            {s.tag&&active===s.id&&<div style={{marginTop:6,display:"inline-block",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:s.color+"22",color:s.color}}>{s.tag}</div>}
          </div>
        ))}
      </div>

      {/* Right content */}
      <div style={{overflowY:"auto",padding:"28px 32px",background:isTech?"#0F172A":"white"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{width:52,height:52,borderRadius:16,background:isTech?"#1E293B":section.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,border:isTech?"1px solid #334155":"none"}}>{section.icon}</div>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:isTech?"white":"#1C1C1A"}}>{section.title}</div>
            <div style={{fontSize:13,color:isTech?"#94A3B8":section.color,fontWeight:600,marginTop:2}}>{section.subtitle}</div>
          </div>
          {section.tag&&<span style={{marginLeft:"auto",fontSize:10,fontWeight:700,padding:"4px 12px",borderRadius:20,background:section.color+"18",color:isTech?"#94A3B8":section.color,border:"1px solid "+(isTech?"#334155":section.color+"44"),flexShrink:0}}>{section.tag}</span>}
        </div>

        {/* Overview */}
        <div style={{background:isTech?"#1E293B":section.bg,borderRadius:12,border:"1px solid "+(isTech?"#334155":section.color+"33"),padding:"16px 20px",marginBottom:24,fontSize:14,color:isTech?"#E2E8F0":"#1C1C1A",lineHeight:1.7,fontWeight:500}}>
          {section.overview}
        </div>

        {/* TECH: special rendering */}
        {isTech&&(
          <>
            {/* Metrics row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:20}}>
              {TECH_METRICS.map(m=>(
                <div key={m.label} style={{background:"#1E293B",border:"1px solid #334155",borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:900,color:"#7C3AED",lineHeight:1}}>{m.value}</div>
                  <div style={{fontSize:9,fontWeight:700,color:"#E2E8F0",marginTop:4,lineHeight:1.3}}>{m.label}</div>
                  <div style={{fontSize:8,color:"#64748B",marginTop:2}}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Tech badges */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
              {TECH_BADGES.map(b=>(
                <span key={b.label} style={{padding:"4px 12px",borderRadius:20,background:b.color+"22",border:"1px solid "+b.color+"55",fontSize:11,fontWeight:700,color:b.color}}>{b.label}</span>
              ))}
            </div>

            {/* Architecture diagram in code style */}
            <div style={{background:"#0A0F1A",borderRadius:12,border:"1px solid #1E293B",padding:"16px 20px",marginBottom:20,fontFamily:"monospace"}}>
              <div style={{fontSize:10,color:"#475569",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em"}}>// Architecture</div>
              {[
                {c:"#94A3B8",t:"Browser → Anthropic API (Claude Sonnet 4.6)"},
                {c:"#7C3AED",t:"         → EmailJS REST API (real email delivery)"},
                {c:"#4285F4",t:"         → Google Calendar (pre-filled invite links)"},
                {c:"#1D9E75",t:"         → localStorage (pipeline history, 5 runs)"},
                {c:"#64748B",t:""},
                {c:"#D97706",t:"State: useReducer → 35+ actions → single Ctx.Provider"},
                {c:"#D97706",t:"Agents: callClaude() → role prompt → streamed response"},
                {c:"#D97706",t:"Email: sendRealEmail() → EmailJS → Gmail inbox"},
              ].map((l,i)=>(
                <div key={i} style={{fontSize:12,color:l.c,lineHeight:1.8}}>{l.t||" "}</div>
              ))}
            </div>

            {/* Feature cards — dark style */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {section.features.map((f,i)=>(
                <div key={i} style={{background:"#1E293B",borderRadius:12,border:"1px solid #334155",padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:"#7C3AED22",border:"1px solid #7C3AED44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#A78BFA",flexShrink:0,marginTop:1,fontFamily:"monospace"}}>{String(i+1).padStart(2,"0")}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#F1F5F9",marginBottom:3,fontFamily:"monospace"}}>{f.label}</div>
                    <div style={{fontSize:12,color:"#94A3B8",lineHeight:1.6}}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* NON-TECH: normal rendering */}
        {!isTech&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {section.features.map((f,i)=>(
              <div key={i} style={{background:"white",borderRadius:12,border:"1px solid #EEECEA",padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{width:28,height:28,borderRadius:8,background:section.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:section.color,flexShrink:0,marginTop:1}}>{i+1}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A",marginBottom:3}}>{f.label}</div>
                  <div style={{fontSize:12,color:"#5F5E5A",lineHeight:1.6}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigate to mode */}
        {section.id!=="intro"&&section.id!=="tech"&&onNavigate&&(
          <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid "+(isTech?"#334155":"#EEECEA")}}>
            <button
              onClick={()=>onNavigate(section.id)}
              style={{padding:"11px 28px",background:section.color,border:"none",borderRadius:10,fontSize:13,fontWeight:700,color:"white",cursor:"pointer",boxShadow:"0 4px 12px "+section.color+"44",transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}
            >
              Open {section.title} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
