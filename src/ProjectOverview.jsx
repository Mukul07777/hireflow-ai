import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── DATA ─────────────────────────────────────────────────────────────────────

const MODES = [
  {
    id: "hiring",
    icon: "🧠",
    title: "HireFlow AI",
    tagline: "Hiring Intelligence Engine",
    color: "#534AB7",
    lightBg: "#F5F3FF",
    border: "#C4BFFA",
    tag: "Open Innovation",
    what: "You paste a job description and a pile of resumes. FlowZint AI reads everything and does what a hiring team of 7 would take days to do — in under 4 minutes.",
    howItWorks: [
      { step: "Paste your JD", detail: "Copy-paste any job description. The AI reads it and understands what skills matter most, what's a must-have vs nice-to-have, and flags if the JD has vague or biased language." },
      { step: "Load resumes", detail: "Either paste resumes separated by --- or click 'Load sample resumes' to use 20 realistic Indian professional profiles. The AI parses name, skills, experience, salary, notice period." },
      { step: "7 agents run automatically", detail: "You watch each agent think out loud in real time. Ranker scores every candidate 0–100. Bias auditor checks your JD. Email writer drafts personalized outreach. Interview generator creates role-specific questions." },
      { step: "Review ranked shortlist", detail: "See all candidates sorted by fit score. Click any candidate to read their AI-written email draft, interview questions, and salary analysis. One click to approve and send the email." },
    ],
    features: [
      { icon: "📊", title: "Candidate ranking", desc: "Every resume gets a real score based on how well it matches your JD — not just keyword matching but actual skill fit analysis." },
      { icon: "✉️", title: "Real emails sent", desc: "Click 'Approve & Send' and the email actually lands in the candidate's inbox via EmailJS. Fully editable before sending." },
      { icon: "⚖️", title: "Bias audit", desc: "AI checks your JD for gender-coded words, over-qualification traps, and missing salary transparency. Shows scores for 4 bias dimensions." },
      { icon: "📅", title: "Interview scheduling", desc: "Google Calendar link auto-generated for each candidate. Pre-filled with their name, role, and a 30-minute slot 3 days out." },
      { icon: "🗄️", title: "Pipeline history", desc: "Every run is saved automatically. Come back next week and see your top candidates, JD snippet, and bias score from any past run." },
      { icon: "⬛", title: "Skill gap heatmap", desc: "Switch to heatmap view to see which candidates have which skills at a glance. Instantly spot who covers the most ground." },
    ],
  },
  {
    id: "sales",
    icon: "🎯",
    title: "SalesFlow AI",
    tagline: "Autonomous Sales Agent",
    color: "#B45309",
    lightBg: "#FFFBEB",
    border: "#FCD34D",
    tag: "Sales Bot",
    what: "You describe your product. The AI creates 5 realistic Indian B2B prospects, writes a personalized cold email for each one, and handles objections live — including in Hindi.",
    howItWorks: [
      { step: "Describe your product", detail: "Type what you sell and who you're targeting. Be as specific or vague as you want — the AI figures it out." },
      { step: "5 prospects generated", detail: "Claude creates 5 realistic Indian business prospects — CTOs in Bangalore, startup founders in Pune, procurement heads in Delhi — with their company, pain point, budget range, and most likely objection." },
      { step: "Personalized cold emails", detail: "One email per prospect, referencing their specific company pain point. Under 130 words. Natural tone. No templates." },
      { step: "Handle objections live", detail: "Type any objection in the chat — even in Hindi — and get a real-time counter-argument tailored to that prospect's context." },
    ],
    features: [
      { icon: "🏢", title: "Realistic Indian prospects", detail: "" , desc: "Not generic 'Company A' placeholders. Real Bangalore SaaS companies, Mumbai fintech firms, Delhi manufacturing groups." },
      { icon: "💬", title: "Hindi objection handling", desc: "Type 'Iska price bahut zyada hai' and get a response that works for Indian market pricing conversations." },
      { icon: "📧", title: "Approve before sending", desc: "Every email needs your approval. You can edit the draft, change the subject line, or redirect it to yourself for testing." },
      { icon: "📚", title: "Objection playbook", desc: "5 pre-built Indian market objections with ready-to-use responses. Price, competition, budget timing, management approval, ROI." },
      { icon: "🔗", title: "LinkedIn message format", desc: "Switch to LinkedIn format for shorter, connection-request-style outreach instead of full cold emails." },
      { icon: "📆", title: "3-email drip sequence", desc: "Generate a Day 1 → Day 4 → Day 10 follow-up sequence for any prospect with one click." },
    ],
  },
  {
    id: "support",
    icon: "💬",
    title: "SupportFlow AI",
    tagline: "Intelligent Support Bot",
    color: "#065F46",
    lightBg: "#ECFDF5",
    border: "#6EE7B7",
    tag: "Support Chat Bot",
    what: "Paste your product docs, FAQ, or any text. The AI builds a knowledge base in seconds and handles customer questions using only your content — it won't make things up.",
    howItWorks: [
      { step: "Paste your docs", detail: "Copy-paste your product FAQ, help center articles, policies, or any support documentation. Could be 5 lines or 50 paragraphs." },
      { step: "KB builds automatically", detail: "Claude reads your docs and extracts 8+ Q&A pairs, categorized as billing / technical / general. Done in under 10 seconds." },
      { step: "Customer chat goes live", detail: "The live chat widget on the right activates. Customer asks a question, AI answers using only your KB content." },
      { step: "Escalation detection", detail: "If the customer sounds angry or frustrated, the system flags it automatically and marks the chat for human review." },
    ],
    features: [
      { icon: "🔒", title: "Only uses your content", desc: "The AI won't hallucinate answers outside your KB. If it doesn't know, it says so." },
      { icon: "😡", title: "Sentiment detection", desc: "Angry or urgent language triggers an escalation flag. These chats appear with a warning badge in history." },
      { icon: "💯", title: "CSAT prediction", desc: "Each response gets a predicted satisfaction score (1–5 stars) based on the sentiment of the conversation." },
      { icon: "📋", title: "Chat history", desc: "All conversations saved in the session. New chat button. Escalated ones highlighted in red." },
      { icon: "⚡", title: "Cross-mode handoff", desc: "Escalated chats automatically fire a notification to CareFlow. Common objections push to SalesFlow's knowledge base." },
    ],
  },
  {
    id: "care",
    icon: "❤️",
    title: "CareFlow AI",
    tagline: "Customer Care Bot",
    color: "#9D174D",
    lightBg: "#FFF1F2",
    border: "#FDA4AF",
    tag: "Customer Care Bot",
    what: "5 realistic Indian customer service tickets — billing issues, technical problems, enterprise inquiries. AI reads each one, scores urgency, drafts a response. You approve before anything sends.",
    howItWorks: [
      { step: "View incoming tickets", detail: "5 pre-loaded realistic Indian customer tickets: Raj (double-charged in Mumbai), Priya (pipeline stuck in Bangalore), Amir (enterprise upgrade in Hyderabad), Sunita (login issue in Pune), Vikram (positive feedback from Delhi)." },
      { step: "AI drafts a response", detail: "Click any ticket. Claude reads it and drafts an empathetic, context-aware reply that references the customer's specific problem — not a template." },
      { step: "Pick your tone", detail: "Choose from 4 tones: Empathetic, Formal, Direct, or Urgent. The AI rewrites the draft to match your chosen voice." },
      { step: "Review, edit, and approve", detail: "Edit the draft as much as you want. Hit Approve — nothing sends without your explicit sign-off. Every approved ticket is saved to the database." },
    ],
    features: [
      { icon: "🚨", title: "Priority scoring", desc: "Urgent / High / Normal / Low auto-assigned based on ticket content. Sentiment emoji per ticket (😡 😟 😐 😊)." },
      { icon: "⏱️", title: "SLA timer", desc: "Urgent tickets have a countdown timer. When it hits zero it shows OVERDUE in red — so you know what needs attention first." },
      { icon: "🎭", title: "4-tone selector", desc: "Same AI response rewritten in Empathetic, Formal, Direct, or Urgent tone at the click of a button." },
      { icon: "🤝", title: "Human-in-the-loop", desc: "Zero automation without human approval. Every response needs a sign-off. That's the whole design." },
      { icon: "💰", title: "Upsell detection", desc: "Enterprise inquiry tickets automatically trigger a cross-mode event to SalesFlow — treating a support request as a sales opportunity." },
    ],
  },
  {
    id: "smb",
    icon: "🏪",
    title: "SMB Brain",
    tagline: "1-Click Indian Business AI",
    color: "#5B21B6",
    lightBg: "#F5F3FF",
    border: "#C4B5FD",
    tag: "Open Innovation",
    what: "Built for the Indian businesses that run entirely on WhatsApp. Paste any chat history — kirana shops, coaching centers, clinics — and AI builds your CRM, FAQ, and sales pipeline automatically.",
    howItWorks: [
      { step: "Paste WhatsApp messages", detail: "Copy-paste raw chat messages like 'Hey bhai kal 10kg aata chahiye' or 'Doctor sahab mera appointment kab hai'. No formatting needed." },
      { step: "AI reads the chaos", detail: "Claude identifies every customer by name, classifies what they want (order / complaint / inquiry), and estimates their value (high/medium/low)." },
      { step: "CRM auto-generated", detail: "A complete customer table with contact, intent, value score, and recommended action. Built from messages that previously lived only in someone's head." },
      { step: "Business intelligence unlocked", detail: "FAQ extracted from repeated questions. Sales opportunities identified. ROI in INR calculated. Time saved per week estimated." },
    ],
    features: [
      { icon: "📱", title: "WhatsApp-native", desc: "Works with messy, informal, Hindi-English mixed messages. No structured data needed." },
      { icon: "🏘️", title: "Tier-2 India ready", desc: "Designed for kirana shops, coaching centers, clinics, D2C brands, and service businesses — not just tech startups." },
      { icon: "💼", title: "Auto CRM", desc: "Customer list with intent classification, value scoring, and next action suggestions — from raw chats." },
      { icon: "📊", title: "Sales pipeline", desc: "Upsell and cross-sell opportunities extracted from conversation patterns with INR revenue estimates." },
      { icon: "🤖", title: "Automation list", desc: "AI lists exactly what it can automate for your specific business — order confirmations, price queries, follow-ups." },
      { icon: "💰", title: "ROI calculator", desc: "Weekly hours saved and monthly revenue impact calculated in Indian Rupees, specific to your business type." },
    ],
  },
  {
    id: "warroom",
    icon: "⚡",
    title: "AI War Room",
    tagline: "Multi-Agent Command Center",
    color: "#1E3A5F",
    lightBg: "#F0F9FF",
    border: "#7DD3FC",
    tag: "Open Innovation",
    what: "All 6 AI systems run at the same time. Agents don't just work in parallel — they actively communicate, hand off tasks to each other, and cross-reference each other's output.",
    howItWorks: [
      { step: "Press Launch War Room", detail: "All 4 core modes (Hiring, Sales, Support, Care) start running simultaneously. Watch the status indicators light up as each mode activates." },
      { step: "Live agent debates stream in", detail: "Agents hand off work in real time: HireFlow sends a declined candidate to SalesFlow as a prospect. CareFlow routes an enterprise inquiry to SalesFlow. SalesFlow pushes a common objection into SupportFlow's KB." },
      { step: "Cross-mode intelligence panel", detail: "The ⚡ panel tracks every cross-agent signal fired during the session — what mode sent it, what mode received it, and what action was taken." },
      { step: "Unified report", detail: "One final report shows all 4 systems complete, 5+ cross-agent handoffs, total hours saved, and estimated monthly ROI across the entire platform." },
    ],
    features: [
      { icon: "🔄", title: "Simultaneous execution", desc: "All 4 AI systems run at once across 7 phases. Not sequential — parallel." },
      { icon: "🤝", title: "Real agent handoffs", desc: "HireFlow → SalesFlow → SupportFlow → CareFlow. Real task routing, not just visual." },
      { icon: "📡", title: "Cross-mode events panel", desc: "Every signal fired between agents shown in real time with source, destination, and action taken." },
      { icon: "💬", title: "Live streaming debates", desc: "Watch each agent reason through its position in real time. Every word streamed token by token via Llama 3.3 70B." },
      { icon: "📈", title: "Unified ROI report", desc: "Single dashboard: all modes complete, handoff count, total hours saved, combined monthly impact in INR." },
    ],
  },
];

const TECH_STACK = [
  { label: "React 18 + Vite", color: "#0EA5E9", desc: "Single-file architecture, zero UI library, hot reload" },
  { label: "Groq + Llama 3.3 70B", color: "#D97706", desc: "Every AI response is real — 0 hardcoded answers" },
  { label: "Real-time streaming", color: "#059669", desc: "Token-by-token SSE via ReadableStream API" },
  { label: "EmailJS", color: "#7C3AED", desc: "Emails actually land in inboxes from the browser" },
  { label: "Supabase PostgreSQL", color: "#3ECF8E", desc: "6-table DB — pipeline runs, candidates, emails, tickets" },
  { label: "Framer Motion", color: "#FF4D6D", desc: "Every transition and animation you see" },
  { label: "Google Calendar API", color: "#4285F4", desc: "One-click interview scheduling, pre-filled invite" },
  { label: "No backend server", color: "#374151", desc: "Everything runs browser-side. Zero Node.js server." },
];

const METRICS = [
  { value: "3,200+", label: "Lines of code", sub: "App.jsx alone" },
  { value: "7", label: "AI agents", sub: "per hiring pipeline" },
  { value: "20+", label: "Groq API calls", sub: "per full demo run" },
  { value: "6", label: "AI systems", sub: "running in parallel" },
  { value: "6", label: "AI systems", sub: "running in parallel" },
  { value: "< 4 min", label: "Per pipeline run", sub: "end to end" },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function ProjectOverview({ onNavigate }) {
  const [active, setActive] = useState("intro");
  const [expandedStep, setExpandedStep] = useState(null);

  const currentMode = MODES.find(m => m.id === active);

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "Inter,system-ui,sans-serif", overflow: "hidden" }}>

      {/* ── LEFT NAV ── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid #F3F4F6", overflowY: "auto", background: "#FAFAF8" }}>
        {/* Home nav item */}
        <div onClick={() => setActive("intro")}
          style={{ padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", background: active === "intro" ? "#EEF2FF" : "transparent", borderLeft: active === "intro" ? "3px solid #534AB7" : "3px solid transparent", transition: "all 0.15s" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: active === "intro" ? "#534AB7" : "#374151" }}>⚡ Platform Overview</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>What is FlowZint AI?</div>
        </div>

        {/* Mode nav items */}
        <div style={{ padding: "10px 12px 4px", fontSize: 9, fontWeight: 800, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI SYSTEMS</div>
        {MODES.map(m => (
          <div key={m.id} onClick={() => { setActive(m.id); setExpandedStep(null); }}
            style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #F9FAFB", background: active === m.id ? m.lightBg : "transparent", borderLeft: active === m.id ? `3px solid ${m.color}` : "3px solid transparent", transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: active === m.id ? m.color : "#374151" }}>{m.title}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{m.tagline}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Tech stack nav item */}
        <div style={{ padding: "10px 12px 4px", fontSize: 9, fontWeight: 800, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>DETAILS</div>
        <div onClick={() => setActive("tech")}
          style={{ padding: "12px 16px", cursor: "pointer", background: active === "tech" ? "#F1F5F9" : "transparent", borderLeft: active === "tech" ? "3px solid #374151" : "3px solid transparent", transition: "all 0.15s" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: active === "tech" ? "#374151" : "#6B7280" }}>🔧 Technical Stack</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>How it's built</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", background: "white" }}>
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            style={{ minHeight: "100%", padding: "32px 40px 48px" }}>

            {/* ── INTRO ── */}
            {active === "intro" && (
              <div>
                {/* Hero */}
                <div style={{ background: "linear-gradient(135deg,#F5F3FF,#EEF2FF,#F0FDF4)", borderRadius: 20, padding: "36px 36px 32px", marginBottom: 32, border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid #C4BFFA", borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
                    <span style={{ fontSize: 12 }}>🇮🇳</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#534AB7" }}>Built for Indian businesses · Real AI · Real emails · Real database</span>
                  </div>
                  <h1 style={{ fontSize: 34, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 }}>
                    FlowZint AI — The AI Platform<br />
                    <span style={{ background: "linear-gradient(135deg,#534AB7,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Indian Business Needs</span>
                  </h1>
                  <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75, maxWidth: 600 }}>
                    FlowZint AI is a platform with 6 AI agents — one for hiring, one for sales, one for customer support, one for care tickets, one for SMB intelligence, and a War Room where all of them run simultaneously. Every AI response is real — powered by Llama 3.3 70B via Groq, with actual emails sent, actual data saved, and actual decisions made.
                  </p>
                </div>

                {/* What makes it different */}
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 16 }}>What makes this different from a ChatGPT demo</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
                  {[
                    { icon: "✉️", title: "Real emails actually send", desc: "Click Approve & Send — the email lands in a real inbox via EmailJS. Not a fake demo button." },
                    { icon: "🗄️", title: "Real database saving data", desc: "Every pipeline run, ticket, and chat session is saved to a live PostgreSQL database on Supabase." },
                    { icon: "🤖", title: "Zero hardcoded responses", desc: "Every single AI output — ranking, email, objection reply, ticket response — is a live Groq API call." },
                    { icon: "⚡", title: "Agents that talk to each other", desc: "When a candidate is rejected, HireFlow sends them to SalesFlow as a prospect. Real cross-system routing." },
                    { icon: "🇮🇳", title: "Built for India specifically", desc: "Indian names, cities, companies, WhatsApp messages, Hindi objections, INR pricing — not US-centric demos." },
                    { icon: "👤", title: "Human always in control", desc: "Nothing sends without approval. Every AI action goes through a human review step first." },
                  ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ background: "#FAFAF8", borderRadius: 12, padding: "16px 18px", border: "1px solid #F3F4F6", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* 6 modes quick summary */}
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 16 }}>6 AI systems at a glance</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {MODES.map((m, i) => (
                    <div key={m.id} onClick={() => setActive(m.id)}
                      style={{ display: "flex", alignItems: "center", gap: 14, background: m.lightBg, border: `1px solid ${m.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.title}</div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{m.what.slice(0, 100)}...</div>
                      </div>
                      <span style={{ fontSize: 12, color: m.color, fontWeight: 700, flexShrink: 0 }}>Read more →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MODE PAGE ── */}
            {currentMode && active !== "intro" && active !== "tech" && (
              <div>
                {/* Mode header */}
                <div style={{ background: currentMode.lightBg, border: `1.5px solid ${currentMode.border}`, borderRadius: 20, padding: "28px 32px", marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 16, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                      {currentMode.icon}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.01em", margin: 0 }}>{currentMode.title}</h1>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "white", color: currentMode.color, border: `1px solid ${currentMode.border}` }}>{currentMode.tag}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: currentMode.color }}>{currentMode.tagline}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, margin: 0 }}>{currentMode.what}</p>
                </div>

                {/* How it works */}
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 14 }}>How it works — step by step</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {currentMode.howItWorks.map((step, i) => (
                    <motion.div key={i} layout
                      style={{ background: expandedStep === i ? currentMode.lightBg : "#FAFAF8", border: `1.5px solid ${expandedStep === i ? currentMode.border : "#F3F4F6"}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.18s" }}
                      onClick={() => setExpandedStep(expandedStep === i ? null : i)}>
                      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: expandedStep === i ? currentMode.color : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "white", flexShrink: 0, transition: "all 0.18s" }}>{i + 1}</div>
                        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827" }}>{step.step}</div>
                        <span style={{ fontSize: 16, color: "#9CA3AF", transition: "transform 0.18s", transform: expandedStep === i ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                      </div>
                      <AnimatePresence>
                        {expandedStep === i && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            style={{ padding: "0 18px 16px 64px", fontSize: 13, color: "#4B5563", lineHeight: 1.75 }}>
                            {step.detail}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                {/* Features */}
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 14 }}>Features</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                  {currentMode.features.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ background: "#FAFAF8", border: "1px solid #F3F4F6", borderRadius: 12, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{f.title}</div>
                        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{f.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Launch button */}
                {onNavigate && (
                  <div style={{ paddingTop: 8 }}>
                    <button onClick={() => onNavigate(currentMode.id)}
                      style={{ padding: "13px 32px", background: `linear-gradient(135deg,${currentMode.color},${currentMode.color}CC)`, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, color: "white", cursor: "pointer", boxShadow: `0 6px 20px ${currentMode.color}40`, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${currentMode.color}55`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 6px 20px ${currentMode.color}40`; }}>
                      Open {currentMode.title} →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── TECH STACK ── */}
            {active === "tech" && (
              <div>
                <div style={{ background: "linear-gradient(135deg,#0F172A,#1E293B)", borderRadius: 20, padding: "32px 36px", marginBottom: 28 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.02em", marginBottom: 12 }}>🔧 How it's built</h1>
                  <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.75 }}>3,200+ lines of React. Zero backend server. Everything runs in the browser — AI calls, email sending, database writes, resume parsing, real-time token streaming.</p>
                </div>

                {/* Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
                  {METRICS.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#534AB7", letterSpacing: "-0.02em" }}>{m.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginTop: 6 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{m.sub}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Stack */}
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 14 }}>Technologies used</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {TECH_STACK.map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#FAFAF8", border: "1px solid #F3F4F6", borderRadius: 12, borderLeft: `4px solid ${t.color}` }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: t.color, minWidth: 180 }}>{t.label}</div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>{t.desc}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Architecture */}
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 14 }}>Architecture</h2>
                <div style={{ background: "#0A0F1A", borderRadius: 14, padding: "20px 24px", fontFamily: "monospace" }}>
                  {[
                    { c: "#94A3B8", t: "// Browser → Groq API (Llama 3.3 70B Versatile)" },
                    { c: "#7C3AED", t: "         → EmailJS REST API (real email delivery)" },
                    { c: "#4285F4", t: "         → Google Calendar (pre-filled invite links)" },
                    { c: "#3ECF8E", t: "         → Supabase PostgreSQL (pipeline runs, tickets, chats)" },
                    { c: "#64748B", t: "" },
                    { c: "#D97706", t: "State:   useReducer → 35+ actions → single Ctx.Provider" },
                    { c: "#D97706", t: "AI:      callClaudeStream() → SSE token streaming → real-time UI" },
                    { c: "#D97706", t: "Email:   sendRealEmail() → EmailJS → Gmail inbox" },
                    { c: "#D97706", t: "DB:      dbInsert/dbSelect() → Supabase REST → PostgreSQL" },
                  ].map((l, i) => (
                    <div key={i} style={{ fontSize: 12, color: l.c, lineHeight: 2, letterSpacing: "0.01em" }}>{l.t || " "}</div>
                  ))}
                </div>

                <div style={{ marginTop: 24, padding: "16px 20px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#9A3412", marginBottom: 6 }}>For judges — live demo tip</div>
                  <div style={{ fontSize: 13, color: "#7C2D12", lineHeight: 1.7 }}>
                    Open the Supabase dashboard while running a pipeline. Show judges the actual PostgreSQL tables filling up in real time as the AI pipeline runs. That's a hard-to-fake "this is really working" moment.
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
