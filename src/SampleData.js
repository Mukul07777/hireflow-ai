// ── DIVERSE CANDIDATE POOL ────────────────────────────────────────────────
// 25 candidates across different roles — pipeline picks best 5 for the JD

export const CANDIDATE_POOL = [
  // Frontend / UI
  {id:1,name:"Aryan Sharma",role:"Frontend Lead",company:"Razorpay",city:"Bangalore",exp:"5 years",baseScore:92,email:"aryan.sharma@email.com",skills:["React","TypeScript","Next.js","GraphQL","System Design"],gaps:["CI/CD"],avatar:"AS",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Led Razorpay Checkout — 500k+ merchants. Reduced load time 40%. Mentored team of 6.",salary:38,location:"Bangalore",notice:"30 days",remote:true,domain:"frontend"},
  {id:2,name:"Sneha Verma",role:"UI Engineer",company:"Zepto",city:"Mumbai",exp:"6 years",baseScore:88,email:"sneha.verma@email.com",skills:["React","TypeScript","Accessibility","Performance","Design Systems"],gaps:["GraphQL"],avatar:"SV",avatarBg:"#E1F5EE",avatarText:"#085041",summary:"Built Zepto design system from scratch. WCAG 2.1 compliant. Mentored 4 engineers.",salary:36,location:"Mumbai",notice:"45 days",remote:true,domain:"frontend"},
  {id:3,name:"Priya Kapoor",role:"SDE-2",company:"Flipkart",city:"Bangalore",exp:"4 years",baseScore:85,email:"priya.kapoor@email.com",skills:["React","TypeScript","System Design","Next.js"],gaps:["GraphQL","Mentoring"],avatar:"PK",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Owned Flipkart product listing — 3M daily sessions. Strong system design fundamentals.",salary:32,location:"Bangalore",notice:"60 days",remote:false,domain:"frontend"},

  // Product Managers
  {id:6,name:"Rohan Joshi",role:"Senior Product Manager",company:"CRED",city:"Bangalore",exp:"6 years",baseScore:91,email:"rohan.joshi@email.com",skills:["Product Strategy","Roadmapping","A/B Testing","SQL","User Research"],gaps:["Engineering depth"],avatar:"RJ",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Owned CRED rewards product — 8M MAU. Grew retention by 34%. Ex-McKinsey.",salary:42,location:"Bangalore",notice:"30 days",remote:true,domain:"product"},
  {id:7,name:"Ananya Singh",role:"Product Manager",company:"Swiggy",city:"Mumbai",exp:"4 years",baseScore:87,email:"ananya.singh@email.com",skills:["Product Thinking","Data Analysis","Go-to-Market","Figma","OKRs"],gaps:["Technical background"],avatar:"AN",avatarBg:"#FBEAF0",avatarText:"#72243E",summary:"Launched Swiggy Instamart in 12 cities. 0-1 product experience. Strong on metrics.",salary:36,location:"Mumbai",notice:"45 days",remote:true,domain:"product"},
  {id:8,name:"Vikram Nair",role:"Associate PM",company:"Meesho",city:"Bangalore",exp:"3 years",baseScore:78,email:"vikram.nair@email.com",skills:["Product Analytics","Customer Interviews","PRD Writing","Jira","Market Research"],gaps:["Leadership","Stakeholder management"],avatar:"VN",avatarBg:"#E1F5EE",avatarText:"#085041",summary:"Built Meesho seller dashboard. Reduced seller onboarding time by 60%. Data-driven.",salary:26,location:"Bangalore",notice:"30 days",remote:false,domain:"product"},

  // Data Scientists
  {id:9,name:"Kavya Reddy",role:"Senior Data Scientist",company:"PhonePe",city:"Bangalore",exp:"5 years",baseScore:93,email:"kavya.reddy@email.com",skills:["Python","ML","Deep Learning","SQL","Spark"],gaps:["MLOps"],avatar:"KR",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Built PhonePe fraud detection model — Rs 200Cr saved annually. Published 3 papers.",salary:44,location:"Bangalore",notice:"60 days",remote:true,domain:"data"},
  {id:10,name:"Nikhil Gupta",role:"ML Engineer",company:"Ola",city:"Hyderabad",exp:"4 years",baseScore:85,email:"nikhil.gupta@email.com",skills:["Python","TensorFlow","MLOps","Docker","Kubernetes"],gaps:["Statistics depth","Research"],avatar:"NG",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Built Ola ETA prediction model. Reduced prediction error by 28%. Strong MLOps.",salary:38,location:"Hyderabad",notice:"30 days",remote:true,domain:"data"},
  {id:11,name:"Shreya Agarwal",role:"Data Analyst",company:"Nykaa",city:"Mumbai",exp:"3 years",baseScore:76,email:"shreya.agarwal@email.com",skills:["Python","SQL","Tableau","Statistics","Excel"],gaps:["ML","Engineering"],avatar:"SA",avatarBg:"#FBEAF0",avatarText:"#72243E",summary:"Built Nykaa's customer LTV model. Drove Rs 45Cr incremental revenue. Strong SQL.",salary:22,location:"Mumbai",notice:"30 days",remote:false,domain:"data"},

  // Backend / DevOps
  {id:12,name:"Karan Mehta",role:"Senior Backend Engineer",company:"Paytm",city:"Noida",exp:"5 years",baseScore:86,email:"karan.mehta@email.com",skills:["Go","Python","Kafka","PostgreSQL","AWS"],gaps:["Frontend","System design at scale"],avatar:"KM",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Paytm payments core — 10M TPS. Built internal rate limiting framework. Strong Go.",salary:36,location:"Noida",notice:"30 days",remote:false,domain:"backend"},
  {id:13,name:"Aditya Kumar",role:"DevOps Engineer",company:"Freshworks",city:"Chennai",exp:"4 years",baseScore:81,email:"aditya.kumar@email.com",skills:["Kubernetes","Docker","Terraform","CI/CD","AWS"],gaps:["Application code","Python depth"],avatar:"AK",avatarBg:"#E1F5EE",avatarText:"#085041",summary:"Led Freshworks infra migration to K8s. Reduced infra cost by 40%. Strong automation.",salary:30,location:"Chennai",notice:"45 days",remote:true,domain:"backend"},

  // Marketing
  {id:14,name:"Pooja Iyer",role:"Growth Marketing Manager",company:"upGrad",city:"Mumbai",exp:"5 years",baseScore:89,email:"pooja.iyer@email.com",skills:["Performance Marketing","Google Ads","Meta Ads","SEO","Analytics"],gaps:["Brand strategy","Offline marketing"],avatar:"PI",avatarBg:"#FBEAF0",avatarText:"#72243E",summary:"Drove upGrad's paid acquisition — Rs 80Cr ARR. ROAS 4.2x. Expert in edtech funnel.",salary:32,location:"Mumbai",notice:"30 days",remote:true,domain:"marketing"},
  {id:15,name:"Rahul Mehta",role:"Content Marketing Lead",company:"Zoho",city:"Chennai",exp:"6 years",baseScore:82,email:"rahul.mehta@email.com",skills:["Content Strategy","SEO","Copywriting","HubSpot","B2B Marketing"],gaps:["Paid ads","Analytics depth"],avatar:"RM",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Built Zoho blog to 2M monthly organic visits. 60% of pipeline from content. B2B expert.",salary:28,location:"Chennai",notice:"30 days",remote:true,domain:"marketing"},
  {id:16,name:"Deepika Sharma",role:"Digital Marketing Executive",company:"Lenskart",city:"Delhi",exp:"3 years",baseScore:72,email:"deepika.sharma@email.com",skills:["Social Media","Instagram Ads","Email Marketing","Canva","Google Analytics"],gaps:["Performance marketing","SQL","Strategy"],avatar:"DS",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Managed Lenskart Instagram — grew from 800k to 2.4M followers. Strong creative eye.",salary:18,location:"Delhi",notice:"15 days",remote:false,domain:"marketing"},

  // Sales
  {id:17,name:"Amit Patel",role:"Enterprise Sales Manager",company:"Salesforce",city:"Mumbai",exp:"7 years",baseScore:91,email:"amit.patel@email.com",skills:["Enterprise Sales","CRM","Negotiation","SaaS","Solution Selling"],gaps:["Technical depth","SMB experience"],avatar:"AP",avatarBg:"#E1F5EE",avatarText:"#085041",summary:"Closed Rs 25Cr in enterprise deals at Salesforce India. Managed 15-person SDR team.",salary:52,location:"Mumbai",notice:"60 days",remote:false,domain:"sales"},
  {id:18,name:"Neha Jain",role:"Inside Sales Executive",company:"Razorpay",city:"Bangalore",exp:"3 years",baseScore:79,email:"neha.jain@email.com",skills:["Inside Sales","Cold Calling","HubSpot","Lead Qualification","Fintech"],gaps:["Enterprise sales","Large deal closing"],avatar:"NJ",avatarBg:"#FBEAF0",avatarText:"#72243E",summary:"Top SDR at Razorpay — 180% quota attainment. Specialized in fintech onboarding.",salary:18,location:"Bangalore",notice:"30 days",remote:true,domain:"sales"},

  // Design
  {id:19,name:"Ishaan Roy",role:"Product Designer",company:"Dream11",city:"Mumbai",exp:"5 years",baseScore:88,email:"ishaan.roy@email.com",skills:["Figma","User Research","Prototyping","Design Systems","Motion Design"],gaps:["Engineering handoff","Mobile-first"],avatar:"IR",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Led Dream11 fantasy sports redesign — 23% increase in engagement. Figma expert.",salary:34,location:"Mumbai",notice:"30 days",remote:true,domain:"design"},
  {id:20,name:"Tanya Mishra",role:"UX Designer",company:"PolicyBazaar",city:"Gurgaon",exp:"4 years",baseScore:83,email:"tanya.mishra@email.com",skills:["UX Research","Wireframing","Figma","Usability Testing","Information Architecture"],gaps:["Visual design","Motion"],avatar:"TM",avatarBg:"#FBEAF0",avatarText:"#72243E",summary:"Redesigned PolicyBazaar checkout — conversion up 31%. Strong on research and testing.",salary:28,location:"Gurgaon",notice:"45 days",remote:false,domain:"design"},

  // HR
  {id:21,name:"Sunita Rao",role:"HR Business Partner",company:"Infosys",city:"Bangalore",exp:"8 years",baseScore:87,email:"sunita.rao@email.com",skills:["HR Strategy","Talent Management","Performance Management","HRIS","Compliance"],gaps:["Startup pace","Tech hiring"],avatar:"SR",avatarBg:"#E1F5EE",avatarText:"#085041",summary:"HRBP for 3000+ employees at Infosys. Led digital transformation of HR ops.",salary:30,location:"Bangalore",notice:"60 days",remote:false,domain:"hr"},

  // Finance
  {id:22,name:"Rajesh Kumar",role:"Finance Manager",company:"Ather Energy",city:"Bangalore",exp:"6 years",baseScore:84,email:"rajesh.kumar@email.com",skills:["Financial Modeling","FP&A","Excel","SAP","Fundraising"],gaps:["Crypto/fintech","International finance"],avatar:"RK",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Led Ather's Series D financial diligence. Built 5-year model for board. CA qualified.",salary:38,location:"Bangalore",notice:"30 days",remote:false,domain:"finance"},

  // Customer Success
  {id:23,name:"Meera Pillai",role:"Customer Success Manager",company:"Chargebee",city:"Chennai",exp:"4 years",baseScore:86,email:"meera.pillai@email.com",skills:["Customer Success","Onboarding","NPS","SaaS","Churn Reduction"],gaps:["Technical depth","Enterprise accounts"],avatar:"MP",avatarBg:"#FBEAF0",avatarText:"#72243E",summary:"Managed 120 SaaS accounts at Chargebee. Reduced churn by 22%. NPS score 68.",salary:24,location:"Chennai",notice:"30 days",remote:true,domain:"cs"},

  // Additional frontend/fullstack
  {id:4,name:"Karan Mehta",role:"Fullstack Developer",company:"Paytm",city:"Noida",exp:"5 years",baseScore:79,email:"karan.mehta2@email.com",skills:["React","Node.js","CI/CD","Testing","Performance"],gaps:["Next.js","TypeScript"],avatar:"KM",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Paytm Mini Apps platform. 90%+ test coverage. Strong DevOps background.",salary:28,location:"Noida",notice:"30 days",remote:false,domain:"frontend"},
  {id:5,name:"Mehul Rao",role:"Frontend Engineer",company:"Swiggy",city:"Hyderabad",exp:"3 years",baseScore:74,email:"mehul.rao@email.com",skills:["React","Next.js","Testing","CSS"],gaps:["TypeScript","Leadership","GraphQL"],avatar:"MR",avatarBg:"#FAECE7",avatarText:"#712B13",summary:"Swiggy Instamart product grid. Active open-source contributor (2k GitHub stars).",salary:24,location:"Hyderabad",notice:"15 days",remote:true,domain:"frontend"},
];

// ── SAMPLE INTERVIEW QUESTIONS BY ROLE ───────────────────────────────────
export const SAMPLE_INTERVIEW_QUESTIONS = {
  frontend: [
    {question:"Walk me through how you would optimize a React app that renders 10,000 list items without virtual scrolling libraries.",type:"technical",probes:"Checks memoization, windowing knowledge, profiler usage"},
    {question:"You shipped a feature that broke on Safari but not Chrome. Production. How do you handle the next 30 minutes?",type:"behavioral",probes:"Incident handling, communication, debugging process"},
    {question:"Your JD mentions GraphQL but your last 3 roles used REST. How would you ramp up in the first 30 days here?",type:"gap",probes:"Self-awareness, learning approach, honesty"},
    {question:"Describe the last time you pushed back on a product decision. What happened?",type:"culture",probes:"Confidence, communication, outcome orientation"},
  ],
  product: [
    {question:"We have 3 features to ship and half the engineering bandwidth. Walk me through how you prioritize.",type:"technical",probes:"Prioritization framework, tradeoff thinking, data usage"},
    {question:"Tell me about a product you launched that failed. What would you do differently?",type:"behavioral",probes:"Ownership, honesty, learning from failure"},
    {question:"You come from a consumer background but this role is B2B SaaS. What is the biggest mental shift you are preparing for?",type:"gap",probes:"Self-awareness, preparation, adaptability"},
    {question:"A senior engineer disagrees with your roadmap priority. How do you handle it?",type:"culture",probes:"Cross-functional collaboration, conflict resolution"},
  ],
  data: [
    {question:"Your model is 94% accurate in testing but business says it is not working. What do you investigate first?",type:"technical",probes:"Practical ML thinking, data drift, label leakage awareness"},
    {question:"Walk me through a time your analysis led to a decision that turned out to be wrong. How did you find out?",type:"behavioral",probes:"Intellectual honesty, process, follow-through"},
    {question:"This role requires production MLOps experience. Your background is research-heavy. How do you bridge that gap?",type:"gap",probes:"Realistic self-assessment, preparation steps"},
    {question:"A business stakeholder wants the model to be more aggressive but you know it will increase false positives. What do you do?",type:"culture",probes:"Stakeholder management, ethics, communication"},
  ],
  marketing: [
    {question:"CAC went up 40% in one month. Walk me through how you diagnose the problem.",type:"technical",probes:"Performance marketing depth, funnel thinking, analytics"},
    {question:"Tell me about your highest ROAS campaign. What made it work and can it be replicated?",type:"behavioral",probes:"Attribution understanding, creativity, repeatability"},
    {question:"You have mostly worked in B2C. This role is B2B SaaS. What is the biggest difference in your approach?",type:"gap",probes:"Awareness of B2B sales cycles, content vs performance shift"},
    {question:"Marketing and sales are blaming each other for missed pipeline. You are the marketing lead. What do you do?",type:"culture",probes:"Cross-functional ownership, accountability"},
  ],
  sales: [
    {question:"You get a warm lead from a Rs 50Cr company. Walk me through your first 3 touchpoints.",type:"technical",probes:"Sales process, research approach, multi-threading"},
    {question:"Tell me about your biggest lost deal. What did you miss?",type:"behavioral",probes:"Honest reflection, deal qualification, competitive awareness"},
    {question:"You have consistently sold to SMBs. This role targets enterprise. What is your plan to adjust?",type:"gap",probes:"Cycle length awareness, champion building, self-honesty"},
    {question:"Your prospect goes cold after a strong demo. What do you do over the next 2 weeks?",type:"culture",probes:"Persistence vs pressure balance, creativity"},
  ],
  backend: [
    {question:"Design a rate limiting system that handles 1M requests per minute with sub-10ms latency.",type:"technical",probes:"Distributed systems, Redis/token bucket, trade-offs"},
    {question:"Tell me about a production incident you caused. What happened and what changed after?",type:"behavioral",probes:"Ownership, blameless culture understanding, prevention"},
    {question:"This role uses Go but your background is Python. How are you preparing?",type:"gap",probes:"Concrete preparation steps, Go familiarity depth"},
    {question:"You disagree with a senior engineer's architecture decision. The deadline is tomorrow. What do you do?",type:"culture",probes:"Pragmatism vs principle, communication under pressure"},
  ],
  design: [
    {question:"Walk me through a design decision where you had strong data but ignored it. Were you right?",type:"technical",probes:"Qualitative vs quantitative balance, design intuition"},
    {question:"Tell me about a design that went through 6 rounds of stakeholder feedback. How did you manage it?",type:"behavioral",probes:"Stakeholder management, design confidence, process"},
    {question:"Your portfolio is mostly consumer apps. This is a B2B dashboard product. What changes in your approach?",type:"gap",probes:"Information density, power user vs novice, complexity"},
    {question:"Engineering says your design is not feasible in the sprint. What do you do?",type:"culture",probes:"Collaboration, scope negotiation, prioritization"},
  ],
  hr: [
    {question:"You have 3 open senior roles, 2 months to hire, and a recruiter on leave. Walk me through your plan.",type:"technical",probes:"Prioritization, sourcing channels, urgency management"},
    {question:"A high performer tells you they are leaving because of their manager. What do you do in the next 48 hours?",type:"behavioral",probes:"Retention instinct, confidentiality, escalation judgment"},
    {question:"This is an early-stage startup. You have run HR at large companies. What will be hardest about this transition?",type:"gap",probes:"Process vs speed trade-off awareness, ambiguity tolerance"},
    {question:"Two co-founders disagree on a compensation policy. You are asked to mediate. How do you approach it?",type:"culture",probes:"Neutrality, structure, conflict de-escalation"},
  ],
  finance: [
    {question:"Walk me through how you would build a 3-statement model for a Series B SaaS company from scratch.",type:"technical",probes:"Financial modeling depth, SaaS metrics, assumptions"},
    {question:"You spotted an accounting error a week before the board presentation. What do you do?",type:"behavioral",probes:"Integrity, communication, process improvement"},
    {question:"Your background is manufacturing finance. This is a fintech startup. What concepts transfer and what does not?",type:"gap",probes:"Self-awareness, fintech unit economics, burn rate thinking"},
    {question:"The CEO wants to spend aggressively. The CFO wants to be conservative. You are the analyst. What do you present?",type:"culture",probes:"Political navigation, data-driven approach, neutrality"},
  ],
  cs: [
    {question:"A customer has not logged in for 45 days and their renewal is in 60 days. Walk me through your outreach plan.",type:"technical",probes:"Churn signals, proactive vs reactive, playbook thinking"},
    {question:"Tell me about a customer you saved from churning. What actually worked?",type:"behavioral",probes:"Listening skills, creative problem solving, follow-through"},
    {question:"Most of your experience is with SMB accounts. This role has enterprise accounts with 6-month onboarding. What will challenge you most?",type:"gap",probes:"Complexity awareness, executive communication, patience"},
    {question:"A customer is angry on a call and blaming your product for their team missing targets. What do you do in the first 2 minutes?",type:"culture",probes:"De-escalation, empathy, accountability vs defensiveness"},
  ],
  general: [
    {question:"Tell me about the most technically complex problem you solved in your last role. Walk me through it step by step.",type:"technical",probes:"Depth of thinking, problem decomposition, ownership"},
    {question:"Describe a time you had to deliver bad news to a senior stakeholder. How did you prepare and what happened?",type:"behavioral",probes:"Communication, courage, preparation"},
    {question:"What is the biggest skill gap between where you are today and where this role needs you to be in 6 months?",type:"gap",probes:"Self-awareness, honesty, preparation plan"},
    {question:"You join and realize the team's process is broken. You have ideas but no authority yet. What do you do?",type:"culture",probes:"Influence without authority, patience, trust building"},
  ],
};

// ── DETECT ROLE DOMAIN FROM JD ────────────────────────────────────────────
export function detectDomain(jdText){
  const t=jdText.toLowerCase();
  if(t.match(/product manager|pm role|roadmap|PRD|user story|go-to-market/)) return "product";
  if(t.match(/data scientist|machine learning|ML|deep learning|tensorflow|pytorch|NLP/)) return "data";
  if(t.match(/react|frontend|typescript|next\.js|vue|angular|CSS|UI engineer/)) return "frontend";
  if(t.match(/backend|node\.js|golang|django|kafka|microservices|API design/)) return "backend";
  if(t.match(/marketing|growth|CAC|ROAS|SEO|content|campaigns|performance marketing/)) return "marketing";
  if(t.match(/sales|quota|pipeline|enterprise|SDR|AE|account executive|B2B sales/)) return "sales";
  if(t.match(/designer|UX|UI design|figma|prototyping|user research|wireframe/)) return "design";
  if(t.match(/HR|human resources|talent|recruiting|HRBP|people ops|culture/)) return "hr";
  if(t.match(/finance|CFO|FP&A|financial model|accounting|CA|CFA|audit/)) return "finance";
  if(t.match(/customer success|CSM|onboarding|churn|NPS|retention|account management/)) return "cs";
  return "general";
}

// ── GET RELEVANT CANDIDATES FOR A DOMAIN ─────────────────────────────────
export function getCandidatesForDomain(domain){
  const all=CANDIDATE_POOL;
  const domainCandidates=all.filter(c=>c.domain===domain);
  const others=all.filter(c=>c.domain!==domain);
  // Return up to 5: prioritize domain matches, fill rest with others
  const pool=[...domainCandidates,...others].slice(0,5);
  return pool;
}
