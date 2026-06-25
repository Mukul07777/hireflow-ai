// ── 20 REALISTIC INDIAN RESUMES ──────────────────────────────────────────
// Used as sample applicants in the pipeline
// Each has structured text matching how candidates actually write resumes

export const RESUME_BANK = [
  // ── FRONTEND / UI ─────────────────────────────────────────────────────
  {
    id:"r1", name:"Aryan Sharma", email:"aryan.sharma@gmail.com",
    domain:"frontend", city:"Bangalore", exp:5, salary:38,
    text:`Aryan Sharma
Senior Frontend Engineer | Bangalore | aryan.sharma@gmail.com | +91 98765 43210

EXPERIENCE
Razorpay — Frontend Lead (2021–Present, 3yr)
- Led Razorpay Checkout used by 500,000+ merchants across India
- Reduced page load time by 40% using code splitting and lazy loading
- Mentored team of 6 engineers, conducted 50+ technical interviews
- Built real-time payment status dashboard with WebSocket integration

Zomato — SDE-2 Frontend (2019–2021, 2yr)
- Owned Zomato restaurant discovery page — 8M daily active users
- Migrated legacy jQuery codebase to React 18, improved TTI by 60%

SKILLS
React, TypeScript, Next.js, GraphQL, System Design, WebSockets, Performance Optimization, Jest, Webpack

EDUCATION
B.Tech Computer Science — IIT Bombay, 2019

COMPENSATION
Current: Rs 38L | Expected: Rs 46L | Notice: 30 days | Open to remote: Yes`
  },
  {
    id:"r2", name:"Sneha Verma", email:"sneha.verma@gmail.com",
    domain:"frontend", city:"Mumbai", exp:6, salary:36,
    text:`Sneha Verma
UI Engineer | Mumbai | sneha.verma@gmail.com | +91 87654 32109

EXPERIENCE
Zepto — Senior UI Engineer (2020–Present, 4yr)
- Built Zepto design system from scratch, adopted by 12 product teams
- Achieved WCAG 2.1 AA accessibility compliance across entire platform
- Reduced design-to-dev handoff time by 70% with Figma component library
- Mentored 4 junior engineers, ran weekly design system office hours

Myntra — Frontend Engineer (2018–2020, 2yr)
- Owned product listing and filtering — 15M monthly visits
- Improved Core Web Vitals score from 45 to 89

SKILLS
React, TypeScript, CSS Architecture, Accessibility (WCAG 2.1), Figma, Design Systems, Performance, Storybook

EDUCATION
B.E. Computer Engineering — VJTI Mumbai, 2018

COMPENSATION
Current: Rs 36L | Expected: Rs 44L | Notice: 45 days | Remote: Yes`
  },
  {
    id:"r3", name:"Karan Mehta", email:"karan.mehta@email.com",
    domain:"frontend", city:"Noida", exp:5, salary:28,
    text:`Karan Mehta
Full Stack Developer | Noida | karan.mehta@email.com | +91 65432 10987

EXPERIENCE
Paytm — Senior Developer (2019–Present, 5yr)
- Built Paytm Mini Apps platform serving 3M+ daily users
- Maintained 90%+ test coverage across 200K LOC codebase
- Set up CI/CD pipelines reducing deployment time from 2hr to 12min
- Owned performance monitoring — reduced P95 latency by 35%

SKILLS
React, Node.js, CI/CD, Jenkins, Docker, Testing (Jest, Cypress), Performance Monitoring, MySQL

EDUCATION
B.Tech IT — Delhi Technological University, 2019

COMPENSATION
Current: Rs 28L | Expected: Rs 36L | Notice: 30 days | Remote: No`
  },

  // ── PRODUCT MANAGERS ──────────────────────────────────────────────────
  {
    id:"r4", name:"Rohan Joshi", email:"rohan.joshi@gmail.com",
    domain:"product", city:"Bangalore", exp:6, salary:42,
    text:`Rohan Joshi
Senior Product Manager | Bangalore | rohan.joshi@gmail.com | +91 90123 45678

EXPERIENCE
CRED — Senior PM, Rewards (2020–Present, 4yr)
- Owned CRED rewards product — 8M MAU, Rs 450Cr GMV annually
- Grew user retention by 34% through personalized reward recommendations
- Led cross-functional team of 18 (eng, design, data, marketing)
- Launched CRED Store from 0-1, reached Rs 100Cr revenue in 18 months

McKinsey & Company — Business Analyst (2018–2020, 2yr)
- Served 6 BFSI and consumer clients on digital transformation
- Built market sizing models for Rs 2000Cr opportunity assessment

SKILLS
Product Strategy, SQL, Figma, A/B Testing, OKRs, User Research, Roadmapping, JIRA, Mixpanel, Python (basic)

EDUCATION
MBA — IIM Ahmedabad, 2018 | B.Tech — NIT Trichy, 2016

COMPENSATION
Current: Rs 42L | Expected: Rs 55L | Notice: 30 days | Remote: Yes`
  },
  {
    id:"r5", name:"Ananya Singh", email:"ananya.singh@outlook.com",
    domain:"product", city:"Mumbai", exp:4, salary:36,
    text:`Ananya Singh
Product Manager | Mumbai | ananya.singh@outlook.com | +91 91234 56789

EXPERIENCE
Swiggy — PM, Instamart (2021–Present, 3yr)
- Launched Swiggy Instamart in 12 cities, reached Rs 1200Cr ARR
- Reduced cart abandonment by 22% through checkout flow redesign
- Ran 40+ A/B tests, defined metrics framework for 15-member team
- Collaborated with 3 engineering pods and 2 design squads simultaneously

Nykaa — Associate PM (2020–2021, 1yr)
- Owned search and discovery — improved conversion rate by 18%

SKILLS
Product Thinking, SQL, Data Analysis, Go-to-Market Strategy, Figma, OKRs, User Interviews, Amplitude

EDUCATION
MBA — IIM Calcutta, 2020 | B.Com — St. Xavier's Mumbai, 2018

COMPENSATION
Current: Rs 36L | Expected: Rs 44L | Notice: 45 days | Remote: Yes`
  },

  // ── DATA SCIENTISTS ───────────────────────────────────────────────────
  {
    id:"r6", name:"Kavya Reddy", email:"kavya.reddy@gmail.com",
    domain:"data", city:"Bangalore", exp:5, salary:44,
    text:`Kavya Reddy
Senior Data Scientist | Bangalore | kavya.reddy@gmail.com | +91 89012 34567

EXPERIENCE
PhonePe — Senior Data Scientist, Risk (2020–Present, 4yr)
- Built ML fraud detection model saving Rs 200Cr annually
- Reduced false positive rate by 45% using ensemble methods
- Published 3 papers at NeurIPS and KDD on financial fraud detection
- Led team of 4 data scientists, defined ML platform standards

Mu Sigma — Data Scientist (2019–2020, 1yr)
- Built churn prediction model for telecom client — 82% accuracy

SKILLS
Python, Machine Learning, Deep Learning, TensorFlow, PyTorch, SQL, Spark, Statistics, NLP, MLflow

EDUCATION
M.Tech Data Science — IIT Madras, 2019 | B.E. CS — BITS Pilani, 2017

COMPENSATION
Current: Rs 44L | Expected: Rs 56L | Notice: 60 days | Remote: Yes`
  },
  {
    id:"r7", name:"Nikhil Gupta", email:"nikhil.gupta@email.com",
    domain:"data", city:"Hyderabad", exp:4, salary:38,
    text:`Nikhil Gupta
ML Engineer | Hyderabad | nikhil.gupta@email.com | +91 78901 23456

EXPERIENCE
Ola — ML Engineer, Maps (2020–Present, 4yr)
- Built ETA prediction model reducing prediction error by 28%
- Deployed 6 ML models to production using Kubeflow and MLflow
- Reduced model training time by 60% through distributed training setup
- Processed 50M+ GPS data points daily using Spark streaming

SKILLS
Python, TensorFlow, Scikit-learn, MLOps, Docker, Kubernetes, Spark, SQL, Feature Engineering, AWS SageMaker

EDUCATION
B.Tech CS — IIT Hyderabad, 2020

COMPENSATION
Current: Rs 38L | Expected: Rs 46L | Notice: 30 days | Remote: Yes`
  },
  {
    id:"r8", name:"Shreya Agarwal", email:"shreya.agarwal@gmail.com",
    domain:"data", city:"Mumbai", exp:3, salary:22,
    text:`Shreya Agarwal
Data Analyst | Mumbai | shreya.agarwal@gmail.com | +91 67890 12345

EXPERIENCE
Nykaa — Data Analyst (2021–Present, 3yr)
- Built customer LTV model driving Rs 45Cr incremental revenue
- Created executive dashboard tracking 25 KPIs used by C-suite weekly
- Ran SQL queries on 500GB+ dataset, optimized queries by 70%
- Presented insights to 200-person all-hands quarterly

SKILLS
Python, SQL, Tableau, Excel, Statistics, A/B Testing, Google Analytics, Mixpanel

EDUCATION
B.Stat — Indian Statistical Institute Mumbai, 2021

COMPENSATION
Current: Rs 22L | Expected: Rs 28L | Notice: 30 days | Remote: No`
  },

  // ── BACKEND / DEVOPS ──────────────────────────────────────────────────
  {
    id:"r9", name:"Aditya Kumar", email:"aditya.kumar@email.com",
    domain:"backend", city:"Chennai", exp:5, salary:36,
    text:`Aditya Kumar
Backend Engineer | Chennai | aditya.kumar@email.com | +91 89123 45670

EXPERIENCE
Razorpay — Senior Backend Engineer (2019–Present, 5yr)
- Built payments core handling Rs 5L Cr annual transaction volume
- Designed rate limiting framework handling 10M requests/minute
- Reduced API P99 latency from 800ms to 120ms
- On-call rotation — resolved 15+ P0 incidents with 99.99% SLA

SKILLS
Go, Python, Kafka, PostgreSQL, Redis, AWS, Microservices, gRPC, Docker, Kubernetes

EDUCATION
B.Tech CS — IIT Madras, 2019

COMPENSATION
Current: Rs 36L | Expected: Rs 46L | Notice: 45 days | Remote: Yes`
  },
  {
    id:"r10", name:"Priti Sharma", email:"priti.sharma@gmail.com",
    domain:"backend", city:"Pune", exp:3, salary:22,
    text:`Priti Sharma
Software Engineer | Pune | priti.sharma@gmail.com | +91 76012 34567

EXPERIENCE
Persistent Systems — Software Engineer (2021–Present, 3yr)
- Built REST APIs for US healthcare client — HIPAA compliant
- Optimized database queries reducing load time by 45%
- Wrote unit and integration tests achieving 85% coverage

SKILLS
Java, Spring Boot, MySQL, REST APIs, Git, Postman, JUnit, Maven

EDUCATION
B.E. CS — Pune University, 2021

COMPENSATION
Current: Rs 22L | Expected: Rs 28L | Notice: 30 days | Remote: Yes`
  },

  // ── MARKETING ─────────────────────────────────────────────────────────
  {
    id:"r11", name:"Pooja Iyer", email:"pooja.iyer@gmail.com",
    domain:"marketing", city:"Mumbai", exp:5, salary:32,
    text:`Pooja Iyer
Growth Marketing Manager | Mumbai | pooja.iyer@gmail.com | +91 90234 56781

EXPERIENCE
upGrad — Growth Marketing Manager (2019–Present, 5yr)
- Managed Rs 80Cr annual paid acquisition budget
- Achieved ROAS of 4.2x across Google, Meta, and YouTube
- Reduced CAC by 38% through creative testing and funnel optimization
- Built marketing attribution model saving Rs 12Cr in wasted spend

SKILLS
Google Ads, Meta Ads, SEO, Analytics, SQL (basic), HubSpot, Appsflyer, Attribution Modeling, A/B Testing

EDUCATION
MBA Marketing — Symbiosis Pune, 2019 | B.Com — Mumbai University, 2017

COMPENSATION
Current: Rs 32L | Expected: Rs 40L | Notice: 30 days | Remote: Yes`
  },
  {
    id:"r12", name:"Rahul Mehta", email:"rahul.mehta@email.com",
    domain:"marketing", city:"Chennai", exp:6, salary:28,
    text:`Rahul Mehta
Content Marketing Lead | Chennai | rahul.mehta@email.com | +91 80345 67892

EXPERIENCE
Zoho — Content Marketing Lead (2018–Present, 6yr)
- Grew Zoho blog from 200K to 2M monthly organic visitors
- Content drives 60% of inbound pipeline — Rs 150Cr influenced revenue
- Built team of 8 content writers and 3 SEO specialists
- Published 500+ articles ranking #1 for competitive B2B SaaS terms

SKILLS
Content Strategy, SEO, Copywriting, HubSpot, WordPress, Google Analytics, Semrush, B2B Marketing, Email Marketing

EDUCATION
B.A. English Literature — Chennai University, 2018

COMPENSATION
Current: Rs 28L | Expected: Rs 36L | Notice: 30 days | Remote: Yes`
  },

  // ── SALES ─────────────────────────────────────────────────────────────
  {
    id:"r13", name:"Amit Patel", email:"amit.patel@gmail.com",
    domain:"sales", city:"Mumbai", exp:7, salary:52,
    text:`Amit Patel
Enterprise Sales Manager | Mumbai | amit.patel@gmail.com | +91 91456 78903

EXPERIENCE
Salesforce India — Enterprise Account Executive (2017–Present, 7yr)
- Closed Rs 25Cr in enterprise deals in FY2023, 180% of quota
- Managed portfolio of 22 enterprise accounts across BFSI and manufacturing
- Built team of 15 SDRs, implemented MEDDIC sales methodology
- Largest deal: Rs 8Cr multi-year contract with HDFC Bank

SKILLS
Enterprise Sales, Solution Selling, CRM, Negotiation, Executive Stakeholder Management, MEDDIC, Salesforce

EDUCATION
MBA — IIM Bangalore, 2017 | B.E. — VIT Vellore, 2015

COMPENSATION
Current: Rs 52L + Rs 30L variable | Expected: Rs 65L + variable | Notice: 60 days`
  },
  {
    id:"r14", name:"Neha Jain", email:"neha.jain@email.com",
    domain:"sales", city:"Bangalore", exp:3, salary:18,
    text:`Neha Jain
Inside Sales Executive | Bangalore | neha.jain@email.com | +91 82567 89014

EXPERIENCE
Razorpay — Senior SDR (2021–Present, 3yr)
- Consistently at 180% quota attainment for 8 consecutive quarters
- Sourced Rs 12Cr pipeline through outbound prospecting
- Specialised in fintech and D2C merchant onboarding
- Promoted from SDR to Senior SDR in 14 months

SKILLS
Inside Sales, Cold Calling, LinkedIn Sales Navigator, HubSpot, Lead Qualification, Objection Handling, Fintech

EDUCATION
BBA — Christ University Bangalore, 2021

COMPENSATION
Current: Rs 18L + Rs 8L variable | Expected: Rs 24L | Notice: 30 days | Remote: Yes`
  },

  // ── DESIGN ────────────────────────────────────────────────────────────
  {
    id:"r15", name:"Ishaan Roy", email:"ishaan.roy@gmail.com",
    domain:"design", city:"Mumbai", exp:5, salary:34,
    text:`Ishaan Roy
Product Designer | Mumbai | ishaan.roy@gmail.com | +91 83678 90125

EXPERIENCE
Dream11 — Senior Product Designer (2019–Present, 5yr)
- Led redesign of Dream11 fantasy sports product — 23% increase in engagement
- Built and maintained design system used by 20+ designers
- Ran 30+ user research sessions, reduced support tickets by 18%
- Shipped 12 major features from concept to production

SKILLS
Figma, User Research, Prototyping, Design Systems, Usability Testing, Motion Design, Information Architecture

EDUCATION
B.Des — NID Ahmedabad, 2019

COMPENSATION
Current: Rs 34L | Expected: Rs 42L | Notice: 30 days | Remote: Yes`
  },
  {
    id:"r16", name:"Tanya Mishra", email:"tanya.mishra@email.com",
    domain:"design", city:"Gurgaon", exp:4, salary:28,
    text:`Tanya Mishra
UX Designer | Gurgaon | tanya.mishra@email.com | +91 84789 01236

EXPERIENCE
PolicyBazaar — UX Designer (2020–Present, 4yr)
- Redesigned insurance checkout — conversion rate up 31%
- Conducted 60+ user interviews and 15 usability tests
- Created wireframes and prototypes for 8 major product initiatives
- Collaborated with 4 product squads across health, life, and motor

SKILLS
UX Research, Wireframing, Figma, Usability Testing, Information Architecture, User Journey Mapping

EDUCATION
M.Des Interaction Design — IDC IIT Bombay, 2020

COMPENSATION
Current: Rs 28L | Expected: Rs 35L | Notice: 45 days | Remote: No`
  },

  // ── HR ────────────────────────────────────────────────────────────────
  {
    id:"r17", name:"Sunita Rao", email:"sunita.rao@gmail.com",
    domain:"hr", city:"Bangalore", exp:8, salary:30,
    text:`Sunita Rao
HR Business Partner | Bangalore | sunita.rao@gmail.com | +91 85890 12347

EXPERIENCE
Infosys — Senior HRBP (2016–Present, 8yr)
- Strategic HR partner for 3000+ employees across 4 business units
- Led digital transformation of HR — reduced manual processes by 60%
- Drove 25% improvement in employee engagement scores over 3 years
- Handled 200+ complex ER cases with zero legal escalations

SKILLS
HR Strategy, Talent Management, Performance Management, HRIS (SAP), Employee Relations, Compliance, L&D

EDUCATION
MBA HR — XLRI Jamshedpur, 2016 | B.Com — Bangalore University, 2014

COMPENSATION
Current: Rs 30L | Expected: Rs 38L | Notice: 60 days | Remote: No`
  },

  // ── FINANCE ───────────────────────────────────────────────────────────
  {
    id:"r18", name:"Rajesh Kumar", email:"rajesh.kumar@email.com",
    domain:"finance", city:"Bangalore", exp:6, salary:38,
    text:`Rajesh Kumar
Finance Manager | Bangalore | rajesh.kumar@email.com | +91 86901 23458

EXPERIENCE
Ather Energy — Finance Manager (2018–Present, 6yr)
- Led Series D financial diligence — Rs 600Cr fundraise
- Built 5-year financial model presented to board and investors
- Reduced month-end close from 7 days to 2 days
- Managed cash flow forecasting for Rs 1200Cr revenue business

SKILLS
Financial Modeling, FP&A, Excel, SAP, GAAP, Fundraising, Investor Relations, Cash Flow Management

EDUCATION
CA (ICAI) — 2018 | B.Com — Bangalore University, 2015

COMPENSATION
Current: Rs 38L | Expected: Rs 48L | Notice: 30 days | Remote: No`
  },

  // ── CUSTOMER SUCCESS ──────────────────────────────────────────────────
  {
    id:"r19", name:"Meera Pillai", email:"meera.pillai@gmail.com",
    domain:"cs", city:"Chennai", exp:4, salary:24,
    text:`Meera Pillai
Customer Success Manager | Chennai | meera.pillai@gmail.com | +91 87012 34569

EXPERIENCE
Chargebee — CSM (2020–Present, 4yr)
- Managed 120 SaaS accounts with combined ARR of Rs 45Cr
- Reduced churn by 22% through proactive health scoring
- Achieved NPS of 68 across managed portfolio
- Ran 200+ QBRs and executive business reviews

SKILLS
Customer Success, Onboarding, NPS, SaaS Metrics, Churn Reduction, HubSpot, Gainsight, Executive Communication

EDUCATION
MBA — IIM Kozhikode, 2020 | B.E. CS — Anna University, 2018

COMPENSATION
Current: Rs 24L | Expected: Rs 32L | Notice: 30 days | Remote: Yes`
  },

  // ── OPERATIONS ────────────────────────────────────────────────────────
  {
    id:"r20", name:"Vikram Bhatia", email:"vikram.bhatia@gmail.com",
    domain:"operations", city:"Delhi", exp:5, salary:32,
    text:`Vikram Bhatia
Operations Manager | Delhi | vikram.bhatia@gmail.com | +91 88123 45670

EXPERIENCE
Amazon India — Operations Manager (2019–Present, 5yr)
- Managed 3 fulfillment centers with combined output of 50K orders/day
- Reduced operational cost by 18% through process optimization
- Led team of 120 associates and 8 team leads
- Launched 2 new fulfillment centers — 0 to operational in 90 days

SKILLS
Operations Management, Process Optimization, Six Sigma Green Belt, Supply Chain, Lean, Data Analysis, Excel

EDUCATION
MBA Operations — MDI Gurgaon, 2019 | B.Tech Mechanical — NIT Delhi, 2017

COMPENSATION
Current: Rs 32L | Expected: Rs 42L | Notice: 45 days | Remote: No`
  },
];

// Detect best matching resumes for a domain
export function getResumesByDomain(domain, count=8){
  const domainResumes=RESUME_BANK.filter(r=>r.domain===domain);
  const others=RESUME_BANK.filter(r=>r.domain!==domain);
  return [...domainResumes, ...others].slice(0, count);
}
