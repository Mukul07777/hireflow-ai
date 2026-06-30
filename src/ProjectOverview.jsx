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
    tag: "7 AI Agents",
    what: "Paste a job description and resumes. 7 AI agents run in sequence — ranking candidates, auditing your JD for bias, drafting personalized outreach emails, generating interview questions, and benchmarking salaries. Done in under 4 minutes.",
    howItWorks: [
      { step: "Paste your JD or speak it", detail: "Type or use the voice mic to dictate your job description. The AI reads it and understands must-haves vs nice-to-haves, and flags vague or biased language." },
      { step: "Load resumes", detail: "Paste resumes separated by --- or click 'Load sample resumes' for 20 realistic Indian professional profiles. AI parses name, skills, experience, salary, notice period automatically." },
      { step: "7 agents run automatically", detail: "Watch each agent think in real time. Ranker scores every candidate 0–100. Bias auditor checks your JD. Email writer drafts personalized outreach. Interview generator creates role-specific questions. Salary benchmarker pulls Indian market data." },
      { step: "Review ranked shortlist", detail: "See all candidates sorted by fit score. Click any candidate to read their AI-written email draft, interview questions, and salary analysis. One click to approve and send the email." },
    ],
    features: [
      { icon: "📊", title: "Candidate ranking", desc: "Every resume gets a real score based on JD fit — not keyword matching but actual skill and experience analysis." },
      { icon: "✉️", title: "Real emails sent", desc: "Click Approve & Send and the email actually lands in the candidate's inbox via EmailJS. Fully editable before sending." },
      { icon: "⚖️", title: "Bias audit", desc: "AI checks your JD for gender-coded words, over-qualification traps, and missing salary transparency. Shows scores for 4 bias dimensions." },
      { icon: "🎙️", title: "Voice input", desc: "Speak your JD instead of typing it. Web Speech API with auto language detection based on English/Hinglish mode." },
      { icon: "🗄️", title: "Pipeline history", desc: "Every run is saved automatically to Supabase. Come back next week and see your top candidates, JD snippet, and bias score from any past run." },
      { icon: "📋", title: "Bulk resume processing", desc: "Paste 10+ resumes at once separated by ---. AI parses, scores, and ranks all of them against your JD in one batch." },
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
    what: "Describe your product. The AI creates 5 realistic Indian B2B prospects, writes a personalized cold email for each one, builds a drip sequence, and handles objections live — in English or Hinglish.",
    howItWorks: [
      { step: "Describe your product", detail: "Type or speak what you sell and who you're targeting. The AI figures out the ideal Indian B2B buyer persona automatically." },
      { step: "5 prospects generated", detail: "AI creates 5 realistic Indian business prospects — CTOs in Bangalore, startup founders in Pune, procurement heads in Delhi — with company, pain point, budget range, and likely objection." },
      { step: "Personalized cold emails", detail: "One email per prospect referencing their specific company and pain point. Under 130 words. Natural tone. No templates." },
      { step: "Handle objections live", detail: "Type any objection and get a real-time counter-argument. Switch to Hinglish mode for responses that sound natural in Indian market conversations." },
    ],
    features: [
      { icon: "🏢", title: "Realistic Indian prospects", desc: "Not generic placeholders. Real Bangalore SaaS companies, Mumbai fintech firms, Delhi manufacturing groups with actual pain points." },
      { icon: "🇮🇳", title: "Hinglish objection handling", desc: "Toggle to Hinglish mode and get responses like 'Aapka concern samajh aaya — lekin pehle mahine mein hi ROI dikha denge.'" },
      { icon: "📲", title: "WhatsApp send", desc: "Pre-filled WhatsApp message ready to send to any prospect with one click — opens wa.me with the email as the message." },
      { icon: "📚", title: "Objection playbook", desc: "5 pre-built Indian market objections with ready-to-use responses — price, competition, budget timing, management approval, ROI." },
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
    what: "Paste your product docs, FAQ, or any text. AI builds a knowledge base in seconds and handles customer questions using only your content — it won't make things up.",
    howItWorks: [
      { step: "Paste your docs", detail: "Copy-paste your product FAQ, help center articles, policies, or any support documentation. Could be 5 lines or 50 paragraphs." },
      { step: "KB builds automatically", detail: "AI reads your docs and extracts 8+ Q&A pairs, categorized as billing / technical / general. Done in under 10 seconds." },
      { step: "Customer chat goes live", detail: "The live chat widget activates. Customer asks a question, AI answers using only your KB content — no hallucinations." },
      { step: "Escalation detection", detail: "If the customer sounds angry or frustrated, the system flags it automatically and marks the chat for human review." },
    ],
    features: [
      { icon: "🔒", title: "Only uses your content", desc: "The AI won't answer outside your KB. If it doesn't know, it says so and offers to escalate." },
      { icon: "😡", title: "Sentiment detection", desc: "Angry or urgent language triggers an escalation flag. These chats appear with a warning badge in history." },
      { icon: "💯", title: "CSAT prediction", desc: "Each response gets a predicted satisfaction score (1–5 stars) based on conversation sentiment." },
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
    tag: "Customer Care",
    what: "Realistic Indian customer service tickets — billing issues, technical problems, enterprise inquiries. AI reads each one, scores urgency, drafts a response. You approve before anything sends. WhatsApp delivery built in.",
    howItWorks: [
      { step: "View incoming tickets", detail: "Pre-loaded realistic Indian customer tickets: Raj (double-charged in Mumbai), Priya (pipeline stuck in Bangalore), Amir (enterprise upgrade in Hyderabad), Sunita (login issue in Pune), Vikram (positive feedback from Delhi)." },
      { step: "AI drafts a response", detail: "Click any ticket. AI reads it and drafts an empathetic, context-aware reply referencing the customer's specific problem — not a template." },
      { step: "Pick your tone", detail: "Choose from 4 tones: Empathetic, Formal, Direct, or Urgent. The AI rewrites the draft to match your chosen voice." },
      { step: "Approve and send via WhatsApp", detail: "Edit the draft as much as you want. Hit Approve — or send directly on WhatsApp with one click. Nothing goes without your sign-off." },
    ],
    features: [
      { icon: "🚨", title: "Priority scoring", desc: "Urgent / High / Normal / Low auto-assigned based on ticket content. Sentiment emoji per ticket." },
      { icon: "⏱️", title: "SLA timer", desc: "Urgent tickets have a countdown timer. When it hits zero it shows OVERDUE in red." },
      { icon: "🎭", title: "4-tone selector", desc: "Same AI response rewritten in Empathetic, Formal, Direct, or Urgent tone at the click of a button." },
      { icon: "📲", title: "WhatsApp send", desc: "Send any approved response directly on WhatsApp with one click — pre-filled message opens via wa.me." },
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
    tag: "India Focus",
    what: "Built for businesses that run entirely on WhatsApp. Paste any chat history — kirana shops, coaching centers, clinics — and AI builds your CRM, FAQ, and sales pipeline automatically.",
    howItWorks: [
      { step: "Paste WhatsApp messages", detail: "Copy-paste raw chat messages like 'Hey bhai kal 10kg aata chahiye' or 'Doctor sahab mera appointment kab hai'. No formatting needed." },
      { step: "AI reads the chaos", detail: "AI identifies every customer by name, classifies what they want (order / complaint / inquiry), and estimates their value (high/medium/low)." },
      { step: "CRM auto-generated", detail: "A complete customer table with contact, intent, value score, and recommended action — built from messages that previously lived only in someone's head." },
      { step: "Business intelligence unlocked", detail: "FAQ extracted from repeated questions. Sales opportunities identified. ROI in INR calculated. Time saved per week estimated." },
    ],
    features: [
      { icon: "📱", title: "WhatsApp-native", desc: "Works with messy, informal, Hindi-English mixed messages. No structured data needed." },
      { icon: "🏘️", title: "Tier-2 India ready", desc: "Designed for kirana shops, coaching centers, clinics, D2C brands — not just tech startups." },
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
    tag: "Multi-Agent",
    what: "All 6 AI systems run at the same time. Agents don't just work in parallel — they actively communicate, hand off tasks to each other, and cross-reference each other's output in real time.",
    howItWorks: [
      { step: "Press Activate all agents", detail: "All 4 core modes (Hiring, Sales, Support, Care) start running simultaneously via Promise.all. Watch the status indicators light up as each mode activates." },
      { step: "Live agent handoffs stream in", detail: "Agents hand off work in real time: HireFlow sends a declined candidate to SalesFlow as a prospect. CareFlow routes an enterprise inquiry to SalesFlow. SalesFlow pushes a common objection into SupportFlow's KB." },
      { step: "Cross-mode intelligence panel", detail: "The ⚡ panel tracks every cross-agent signal fired during the session — what mode sent it, what mode received it, and what action was taken automatically." },
      { step: "AI executive summary + command report", detail: "One AI-written executive summary covers all 4 systems. The command report shows real candidate counts, real prospect counts, and ROI calculated from actual data — not hardcoded numbers." },
    ],
    features: [
      { icon: "🔄", title: "Simultaneous execution", desc: "All 4 AI systems run at once via Promise.all. Not sequential — genuinely parallel." },
      { icon: "🤝", title: "Real agent handoffs", desc: "HireFlow → SalesFlow → SupportFlow → CareFlow. Real task routing, not just visual animation." },
      { icon: "📡", title: "Cross-mode events panel", desc: "Every signal fired between agents shown in real time with source, destination, and action taken." },
      { icon: "💬", title: "Live streaming debates", desc: "Watch each agent reason through its position in real time. Every word streamed token by token." },
      { icon: "📈", title: "Real command report", desc: "Metrics calculated from actual session data — real candidate count, real prospect count, real ROI in INR." },
      { icon: "🌐", title: "Live Agent Network", desc: "Animated network on the home screen shows all 6 agents as nodes with live data-flow pulses between them." },
    ],
  },
];

const TECH_STACK = [
  { label: "React 18 + Vite 4", color: "#0EA5E9", desc: "Single-file architecture (~3,800 lines), no UI library, hot reload" },
  { label: "Groq + Llama 3.3 70B", color: "#D97706", desc: "Every AI response is real — 0 hardcoded answers, round-robin key rotation" },
  { label: "Real-time SSE streaming", color: "#059669", desc: "Token-by-token streaming via ReadableStream API — you see the AI think" },
  { label: "Web Speech API", color: "#8B5CF6", desc: "Voice input on JD field and product description with English/Hinglish detection" },
  { label: "EmailJS", color: "#7C3AED", desc: "Emails actually land in inboxes, sent directly from the browser" },
  { label: "Supabase PostgreSQL", color: "#3ECF8E", desc: "6-table DB — pipeline runs, candidates, emails, tickets, sessions" },
  { label: "Framer Motion", color: "#FF4D6D", desc: "Every page transition and animation" },
  { label: "No backend server", color: "#374151", desc: "Everything runs browser-side. Zero Node.js server needed." },
];

const METRICS = [
  { value: "3,800+", label: "Lines of code", sub: "App.jsx alone" },
  { value: "7", label: "AI agents", sub: "per hiring pipeline" },
  { value: "20+", label: "Groq API calls", sub: "per full demo run" },
  { value: "6", label: "AI systems", sub: "running in parallel" },
  { value: "< 4 min", label: "Per pipeline run", sub: "end to end" },
  { value: "3", label: "Groq API keys", sub: "round-robin rotation" },
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
        <div onClick={() => setActive("intro")}
          style={{ padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", background: active === "intro" ? "#EEF2FF" : "transparent", borderLeft: active === "intro" ? "3px solid #534AB7" : "3px solid transparent", transition: "all 0.15s" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: active === "intro" ? "#534AB7" : "#374151" }}>⚡ Platform Overview</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>What is NexFlow AI?</div>
        </div>

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
                <div style={{ background: "linear-gradient(135deg,#F5F3FF,#EEF2FF,#F0FDF4)", borderRadius: 20, padding: "36px 36px 32px", marginBottom: 32, border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid #C4BFFA", borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
                    <span style={{ fontSize: 12 }}>🇮🇳</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#534AB7" }}>Built for Indian businesses · Real AI · Real emails · Real database</span>
                  </div>
                  <h1 style={{ fontSize: 34, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 }}>
                    NexFlow AI —<br />
                    <span style={{ background: "linear-gradient(135deg,#534AB7,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>6 Agents. One Platform.</span>
                  </h1>
                  <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.75, maxWidth: 600 }}>
                    NexFlow AI runs 6 specialized AI agents — hiring, sales, support, customer care, SMB intelligence, and a War Room where all of them run simultaneously. Every response is real, powered by Llama 3.3 70B via Groq, with actual emails sent, actual data saved, and actual decisions made.
                  </p>
                </div>

                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 16 }}>What makes this different</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
                  {[
                    { icon: "✉️", title: "Real emails actually send", desc: "Click Approve & Send — the email lands in a real inbox via EmailJS. Not a fake demo button." },
                    { icon: "🗄️", title: "Real database saving data", desc: "Every pipeline run, ticket, and chat session is saved to a live PostgreSQL database on Supabase." },
                    { icon: "🤖", title: "Zero hardcoded responses", desc: "Every AI output — ranking, email, objection reply, ticket response — is a live Groq API call." },
                    { icon: "⚡", title: "Agents that talk to each other", desc: "When a candidate is rejected, HireFlow sends them to SalesFlow as a prospect. Real cross-system routing." },
                    { icon: "🇮🇳", title: "Built for India specifically", desc: "Indian names, cities, WhatsApp messages, Hinglish mode, INR pricing — not a US-centric demo." },
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

                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 16 }}>6 AI systems at a glance</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {MODES.map((m) => (
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
                  <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.75 }}>3,800+ lines of React. Zero backend server. Everything runs in the browser — AI calls, email sending, database writes, resume parsing, real-time token streaming.</p>
                </div>

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

                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 14 }}>Technologies used</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {TECH_STACK.map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#FAFAF8", border: "1px solid #F3F4F6", borderRadius: 12, borderLeft: `4px solid ${t.color}` }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: t.color, minWidth: 200 }}>{t.label}</div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>{t.desc}</div>
                    </motion.div>
                  ))}
                </div>

                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 14 }}>Architecture</h2>
                <div style={{ background: "#0A0F1A", borderRadius: 14, padding: "20px 24px", fontFamily: "monospace" }}>
                  {[
                    { c: "#94A3B8", t: "// Browser → Groq API (Llama 3.3 70B Versatile, round-robin keys)" },
                    { c: "#7C3AED", t: "         → EmailJS REST API (real email delivery)" },
                    { c: "#3ECF8E", t: "         → Supabase PostgreSQL (pipeline runs, tickets, chats)" },
                    { c: "#8B5CF6", t: "         → Web Speech API (voice input, English/Hinglish)" },
                    { c: "#64748B", t: "" },
                    { c: "#D97706", t: "State:   useReducer → 40+ actions → single Ctx.Provider" },
                    { c: "#D97706", t: "AI:      callClaudeStream() → SSE streaming → real-time UI" },
                    { c: "#D97706", t: "Email:   sendRealEmail() → EmailJS → Gmail inbox" },
                    { c: "#D97706", t: "DB:      dbInsert/dbSelect() → Supabase REST → PostgreSQL" },
                    { c: "#D97706", t: "Keys:    getGroqKey() → round-robin across up to 4 API keys" },
                  ].map((l, i) => (
                    <div key={i} style={{ fontSize: 12, color: l.c, lineHeight: 2, letterSpacing: "0.01em" }}>{l.t || " "}</div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
