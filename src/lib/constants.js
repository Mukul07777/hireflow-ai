export const SAMPLE_JD = `Senior Frontend Engineer

We are looking for a Senior Frontend Engineer to join our product team. You will own the architecture of our core user-facing product used by 2M+ users daily.

Responsibilities:
- Architect and build scalable frontend systems in React and TypeScript
- Own performance: Core Web Vitals, bundle optimization, lazy loading
- Collaborate with design on accessible, pixel-perfect UIs
- Mentor 2–3 junior engineers and run technical reviews
- Partner with backend on API design and GraphQL schema

Requirements:
- 4+ years with React and TypeScript in production
- Deep understanding of browser rendering, JS engine, and memory management
- Experience with Next.js, SSR, and edge deployment
- Strong system design fundamentals
- Prior experience mentoring engineers

Nice to have:
- Open-source contributions
- Experience with WebSockets or real-time systems
- Knowledge of WCAG 2.1 accessibility standards
- Familiarity with CI/CD pipelines (GitHub Actions, Vercel)

Compensation: ₹28–42 LPA + equity + remote-first`

export const CANDIDATES = [
  {
    id: 1, name: "Aryan Sharma", role: "Frontend Lead", company: "Razorpay",
    exp: "5 years", score: 92, email: "aryan.sharma@email.com",
    skills: ["React", "TypeScript", "Next.js", "GraphQL", "System Design"],
    gaps: ["CI/CD"], avatar: "AS",
    avatarBg: "#EEEDFE", avatarText: "#3C3489",
    summary: "Led frontend for Razorpay Checkout used by 500k merchants. Rebuilt core payment UI reducing load time by 40%.",
    github: "github.com/aryan-s", linkedin: "linkedin.com/in/aryan-sharma"
  },
  {
    id: 2, name: "Sneha Verma", role: "UI Engineer", company: "Zepto",
    exp: "6 years", score: 88, email: "sneha.verma@email.com",
    skills: ["React", "TypeScript", "Accessibility", "Performance", "Testing"],
    gaps: ["GraphQL"], avatar: "SV",
    avatarBg: "#E1F5EE", avatarText: "#085041",
    summary: "Built Zepto's design system from scratch. WCAG 2.1 certified. Mentored team of 4.",
    github: "github.com/sneha-v", linkedin: "linkedin.com/in/sneha-verma"
  },
  {
    id: 3, name: "Priya Kapoor", role: "SDE-2", company: "Flipkart",
    exp: "4 years", score: 85, email: "priya.kapoor@email.com",
    skills: ["React", "TypeScript", "System Design", "Next.js"],
    gaps: ["GraphQL", "Mentoring"], avatar: "PK",
    avatarBg: "#EEEDFE", avatarText: "#3C3489",
    summary: "Owned Flipkart's product listing page — 3M daily sessions. Strong system design fundamentals.",
    github: "github.com/priya-k", linkedin: "linkedin.com/in/priya-kapoor"
  },
  {
    id: 4, name: "Karan Mehta", role: "Senior Dev", company: "Paytm",
    exp: "5 years", score: 79, email: "karan.mehta@email.com",
    skills: ["React", "CI/CD", "Testing", "Performance"],
    gaps: ["Next.js", "TypeScript"], avatar: "KM",
    avatarBg: "#FAEEDA", avatarText: "#633806",
    summary: "Paytm Mini Apps platform lead. Strong in testing infrastructure and CI/CD pipelines.",
    github: "github.com/karan-m", linkedin: "linkedin.com/in/karan-mehta"
  },
  {
    id: 5, name: "Mehul Rao", role: "Frontend Engineer", company: "Swiggy",
    exp: "3 years", score: 74, email: "mehul.rao@email.com",
    skills: ["React", "Next.js", "Testing", "CSS"],
    gaps: ["TypeScript", "Leadership", "GraphQL"], avatar: "MR",
    avatarBg: "#FAECE7", avatarText: "#712B13",
    summary: "Built Swiggy Instamart's product grid. Strong portfolio with open-source contributions.",
    github: "github.com/mehul-r", linkedin: "linkedin.com/in/mehul-rao"
  },
]

export const AGENTS = [
  { id: 1, name: "JD Intelligence Parser", icon: "🧠", desc: "Extracts requirements, skills, seniority signals, culture cues", duration: 2200,
    log: "Extracted 16 requirements — 9 must-haves, 7 nice-to-haves. Detected: senior IC role, mentoring expected, remote-first." },
  { id: 2, name: "Resume Ranker & Scorer", icon: "📊", desc: "Scores all resumes with reasoning per candidate", duration: 3800,
    log: "42 resumes processed. Top score: 92 (Aryan Sharma). Average: 71. 5 candidates shortlisted for outreach." },
  { id: 3, name: "Bias Detector", icon: "⚖️", desc: "Audits JD and scoring criteria for bias patterns", duration: 2000,
    log: "2 flags: over-qualification risk in experience clause. Gender neutrality: 88%. Inclusive language: 72%." },
  { id: 4, name: "Outreach Writer", icon: "✉️", desc: "Drafts personalized emails referencing each candidate's actual work", duration: 3200,
    log: "5 personalized outreach emails drafted. Average personalization score: 91%. Queued for human approval." },
  { id: 5, name: "Interview Question Gen", icon: "💬", desc: "Custom question sets per candidate based on gaps and strengths", duration: 2600,
    log: "20 questions generated across 5 candidates. Each set targets specific skill gaps and probes for depth." },
  { id: 6, name: "Hiring Report Generator", icon: "📄", desc: "Compiles PDF-ready summary with diversity metrics and recommendations", duration: 1900,
    log: "Report compiled. 5 shortlisted, diversity score 74%, top recommendation: Aryan Sharma (92/100)." },
]

export const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",      icon: "LayoutDashboard" },
  { id: "pipeline",    label: "Run pipeline",   icon: "Play" },
  { id: "candidates",  label: "Candidates",     icon: "Users" },
  { id: "outreach",    label: "Outreach",       icon: "Mail" },
  { id: "interviews",  label: "Interviews",     icon: "MessageSquare" },
  { id: "bias",        label: "Bias audit",     icon: "Scale" },
  { id: "report",      label: "Hiring report",  icon: "FileText" },
]
