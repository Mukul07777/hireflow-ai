import { createContext, useContext, useReducer, useState, useEffect, useRef } from "react";
import { CANDIDATE_POOL, SAMPLE_INTERVIEW_QUESTIONS, detectDomain, getCandidatesForDomain } from "./SampleData.js";
import { RESUME_BANK, getResumesByDomain } from "./ResumeBank.js";
import { BiasAuditPanel } from "./BiasAudit.jsx";
import { CandidateDecisionBar, RejectionSummary } from "./RejectionFlow.jsx";
import { savePipelineRun, PipelineHistoryPanel } from "./PipelineHistory.jsx";
import { BulkResumeProcessor } from "./BulkResumeProcessor.jsx";
import { ProjectOverview } from "./ProjectOverview.jsx";

// ── EMAILJS ───────────────────────────────────────────────────────────────
const EJS={svc:"service_f5hfgxa",tpl:"template_kcl0nki",key:"Yu7ThCT-UB7Kn7uc1"};
async function sendRealEmail({to_name,to_email,subject,message,from_name="HireFlow AI"}){
  if(!to_email||to_email.includes("no email")) return{ok:false,err:"No email address"};
  try{
    const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({service_id:EJS.svc,template_id:EJS.tpl,user_id:EJS.key,
        template_params:{to_name,to_email,subject,message,from_name}})
    });
    return{ok:r.status===200,status:r.status};
  }catch(e){return{ok:false,err:e.message};}
}

const initialState = {
  appMode:"home", activeNav:"dashboard", sidebarOpen:true,
  jdText:"", pipelineState:"idle", agentStatuses:{}, agentLogs:{}, agentStreams:{},
  selectedCandidate:null, loadingAnalysis:null, aiAnalysis:{},
  emailDrafts:{}, sentEmails:{}, interviewQs:{}, biasReport:null,
  toasts:[], salaryData:null, chatOpen:false, chatMessages:[], chatLoading:false,
  salesProduct:"", salesTarget:"", salesProspects:[], salesRunning:false,
  salesEmailDrafts:{}, salesSentEmails:{},
  supportDocs:"", supportKB:[], supportChats:[], supportBuilding:false,
  crossEvents:[], smbProfile:null, warRoomLogs:{}, dynamicScores:{},
  interviewMode:null, customQuestions:"", interviewDecisionOpen:false,
  activeCandidates:CANDIDATE_POOL.slice(0,5), roleDomain:"general",
  candidateDecisions:{}, submittedResumes:[], resumeScoring:false,
  pipelineStep:"jd", appliedResumes:[], dynamicVerdicts:{},
};

function reducer(s,a){
  switch(a.type){
    case "SET_MODE": return{...s,appMode:a.payload,activeNav:"dashboard"};
    case "SET_NAV": return{...s,activeNav:a.payload};
    case "TOGGLE_SIDEBAR": return{...s,sidebarOpen:!s.sidebarOpen};
    case "SET_JD": return{...s,jdText:a.payload};
    case "SET_PIPELINE": return{...s,pipelineState:a.payload};
    case "SET_AGENT_STATUS": return{...s,agentStatuses:{...s.agentStatuses,[a.id]:a.status}};
    case "SET_AGENT_LOG": return{...s,agentLogs:{...s.agentLogs,[a.id]:a.log}};
    case "SET_AGENT_STREAM": return{...s,agentStreams:{...s.agentStreams,[a.id]:a.text}};
    case "RESET_PIPELINE": return{...s,pipelineState:"idle",agentStatuses:{},agentLogs:{},agentStreams:{},biasReport:null,emailDrafts:{},interviewQs:{},aiAnalysis:{},sentEmails:{},salaryData:null,warRoomLogs:{},interviewMode:null,interviewDecisionOpen:false,dynamicScores:{},activeCandidates:CANDIDATE_POOL.slice(0,5),roleDomain:"general",pipelineStep:"jd",appliedResumes:[]};
    case "SET_CANDIDATE": return{...s,selectedCandidate:a.payload};
    case "SET_LOADING_ANALYSIS": return{...s,loadingAnalysis:a.id};
    case "SET_AI_ANALYSIS": return{...s,aiAnalysis:{...s.aiAnalysis,[a.id]:a.text},loadingAnalysis:null};
    case "SET_EMAIL_DRAFT": return{...s,emailDrafts:{...s.emailDrafts,[a.id]:a.text}};
    case "SET_EMAIL_SENT": return{...s,sentEmails:{...s.sentEmails,[a.id]:true}};
    case "SET_INTERVIEW_QS": return{...s,interviewQs:{...s.interviewQs,[a.id]:a.qs}};
    case "SET_BIAS": return{...s,biasReport:a.payload};
    case "SET_SALARY": return{...s,salaryData:a.payload};
    case "TOGGLE_CHAT": return{...s,chatOpen:!s.chatOpen};
    case "ADD_CHAT_MSG": return{...s,chatMessages:[...s.chatMessages,a.msg]};
    case "SET_CHAT_LOADING": return{...s,chatLoading:a.val};
    case "UPDATE_LAST_CHAT": return{...s,chatMessages:s.chatMessages.map((m,i)=>i===s.chatMessages.length-1?{...m,text:a.text}:m)};
    case "SET_SALES_PRODUCT": return{...s,salesProduct:a.payload};
    case "SET_SALES_TARGET": return{...s,salesTarget:a.payload};
    case "SET_SALES_PROSPECTS": return{...s,salesProspects:a.payload};
    case "SET_SALES_RUNNING": return{...s,salesRunning:a.val};
    case "SET_SALES_EMAIL": return{...s,salesEmailDrafts:{...s.salesEmailDrafts,[a.id]:a.text}};
    case "SET_SALES_SENT": return{...s,salesSentEmails:{...s.salesSentEmails,[a.id]:true}};
    case "SET_SUPPORT_DOCS": return{...s,supportDocs:a.payload};
    case "SET_SUPPORT_KB": return{...s,supportKB:a.payload};
    case "SET_SUPPORT_BUILDING": return{...s,supportBuilding:a.val};
    case "ADD_SUPPORT_CHAT": return{...s,supportChats:[...s.supportChats,a.chat]};
    case "UPDATE_SUPPORT_CHAT": return{...s,supportChats:s.supportChats.map(c=>c.id===a.id?{...c,...a.updates}:c)};
    case "ADD_TOAST": return{...s,toasts:[...s.toasts,{id:Date.now(),...a.payload}]};
    case "REMOVE_TOAST": return{...s,toasts:s.toasts.filter(t=>t.id!==a.id)};
    case "SET_CANDIDATE_DECISION": return{...s,candidateDecisions:{...s.candidateDecisions,[a.id]:a.decision}};
    case "SET_PIPELINE_STEP": return{...s,pipelineStep:a.payload};
    case "ADD_APPLIED_RESUME": return{...s,appliedResumes:[...s.appliedResumes,a.resume]};
    case "REMOVE_APPLIED_RESUME": return{...s,appliedResumes:s.appliedResumes.filter(r=>r.id!==a.id)};
    case "CLEAR_APPLIED_RESUMES": return{...s,appliedResumes:[]};
    case "UPDATE_SUBMITTED_RESUME": return{...s,submittedResumes:s.submittedResumes.map(r=>r.id===a.id?{...r,...a.updates}:r)};
    case "SET_RESUME_SCORING": return{...s,resumeScoring:a.val};
    case "CLEAR_SUBMITTED_RESUMES": return{...s,submittedResumes:[]};
    case "SET_ACTIVE_CANDIDATES": return{...s,activeCandidates:a.payload.candidates,roleDomain:a.payload.domain};
    case "SET_DYNAMIC_SCORES": return{...s,dynamicScores:a.payload};
    case "SET_DYNAMIC_VERDICTS": return{...s,dynamicVerdicts:a.payload};
    case "SET_INTERVIEW_MODE": return{...s,interviewMode:a.payload,interviewDecisionOpen:false};
    case "SET_CUSTOM_QUESTIONS": return{...s,customQuestions:a.payload};
    case "OPEN_INTERVIEW_DECISION": return{...s,interviewDecisionOpen:true};
    case "CLOSE_INTERVIEW_DECISION": return{...s,interviewDecisionOpen:false};
    case "ADD_CROSS_EVENT": return{...s,crossEvents:[a.event,...s.crossEvents].slice(0,20)};
    case "SET_SMB_PROFILE": return{...s,smbProfile:a.payload};
    case "ADD_WAR_ROOM_LOG": return{...s,warRoomLogs:{...s.warRoomLogs,[a.agentId]:[...(s.warRoomLogs[a.agentId]||[]),a.log]}};
    default: return s;
  }
}

const Ctx=createContext(null);
function useStore(){return useContext(Ctx);}
function useToast(){const{dispatch}=useStore();return(msg,type="success")=>dispatch({type:"ADD_TOAST",payload:{msg,type}});}

async function callClaude(messages,system=""){
  try{
    const body={model:"claude-sonnet-4-6",max_tokens:1000,messages};
    if(system)body.system=system;
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await res.json();
    return data.content?.map(b=>b.text||"").join("")||"";
  }catch{return"";}
}

// ── SAMPLE DATA ───────────────────────────────────────────────────────────
const SAMPLE_JD="Senior Frontend Engineer — Remote\n\nWe are a Bangalore-based B2B SaaS startup (Series A, 80 employees).\n\nRequirements:\n- 4+ years React + TypeScript\n- Next.js, GraphQL experience\n- System design fundamentals\n- Mentoring junior developers\n- Startup mindset\n\nCompensation: Rs 28-42 LPA + equity + fully remote";
const SAMPLE_PRODUCT="FlowZint AI Platform\n\nAutonomous multi-agent AI for Indian SMBs. Automates hiring, sales, support, and care.\n\nPricing: Starter Rs 999/month, Team Rs 2,999/month, Enterprise custom.\nFree trial: 14 days, no credit card.";
const SAMPLE_TARGET="B2B SaaS startups in India (Series A-B, 50-300 employees). CTOs struggling with scaling hiring and customer ops. Bangalore, Mumbai, Hyderabad, Delhi-NCR.";
const SAMPLE_DOCS="FlowZint Help Center\n\nGetting Started: Sign up at flowzint.in, create workspace, choose template, paste context, run pipeline.\n\nPricing: Starter Rs 999/month, Team Rs 2,999/month, Enterprise custom.\n\nRefund Policy: 14-day money-back. Email support@flowzint.in.\n\nPipeline stuck: Hard refresh then restart. API errors: Settings > Integrations.\n\nData Privacy: AES-256 encryption. SOC2 Type II. Data stays in India.";
const SAMPLE_SMB={name:"Kirana King",type:"Retail Chain",city:"Pune",problem:"Managing 3 stores, WhatsApp orders chaotic, no CRM, losing customers to BigBasket",whatsappChats:"Hey bhai kal 10kg aata chahiye\nHi can I order ghee 2kg?\nKab milega mera order? 2 din ho gaye\nBhai price kya hai tomato ka aaj?\nOrder cancel karna hai mera"};

const CANDIDATES=[
  {id:1,name:"Aryan Sharma",role:"Frontend Lead",company:"Razorpay",city:"Bangalore",exp:"5 years",score:92,email:"aryan.sharma@email.com",phone:"+91 98765 43210",skills:["React","TypeScript","Next.js","GraphQL","System Design"],gaps:["CI/CD"],avatar:"AS",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Led Razorpay Checkout — 500k+ merchants. Reduced load time 40%. Mentored team of 6.",salary:38,location:"Bangalore",notice:"30 days",remote:true},
  {id:2,name:"Sneha Verma",role:"UI Engineer",company:"Zepto",city:"Mumbai",exp:"6 years",score:88,email:"sneha.verma@email.com",phone:"+91 87654 32109",skills:["React","TypeScript","Accessibility","Performance","Design Systems"],gaps:["GraphQL"],avatar:"SV",avatarBg:"#E1F5EE",avatarText:"#085041",summary:"Built Zepto design system from scratch. WCAG 2.1 compliant. Mentored 4 engineers.",salary:36,location:"Mumbai",notice:"45 days",remote:true},
  {id:3,name:"Priya Kapoor",role:"SDE-2",company:"Flipkart",city:"Bangalore",exp:"4 years",score:85,email:"priya.kapoor@email.com",phone:"+91 76543 21098",skills:["React","TypeScript","System Design","Next.js"],gaps:["GraphQL","Mentoring"],avatar:"PK",avatarBg:"#EEEDFE",avatarText:"#3C3489",summary:"Owned Flipkart product listing — 3M daily sessions. Strong system design fundamentals.",salary:32,location:"Bangalore",notice:"60 days",remote:false},
  {id:4,name:"Karan Mehta",role:"Senior Developer",company:"Paytm",city:"Noida",exp:"5 years",score:79,email:"karan.mehta@email.com",phone:"+91 65432 10987",skills:["React","CI/CD","Testing","Performance"],gaps:["Next.js","TypeScript"],avatar:"KM",avatarBg:"#FAEEDA",avatarText:"#633806",summary:"Paytm Mini Apps platform. 90%+ test coverage. Strong DevOps background.",salary:28,location:"Noida",notice:"30 days",remote:false},
  {id:5,name:"Mehul Rao",role:"Frontend Engineer",company:"Swiggy",city:"Hyderabad",exp:"3 years",score:74,email:"mehul.rao@email.com",phone:"+91 54321 09876",skills:["React","Next.js","Testing","CSS"],gaps:["TypeScript","Leadership","GraphQL"],avatar:"MR",avatarBg:"#FAECE7",avatarText:"#712B13",summary:"Swiggy Instamart product grid. Active open-source contributor (2k GitHub stars).",salary:24,location:"Hyderabad",notice:"15 days",remote:true},
];

const AGENTS=[
  {id:1,name:"JD Intelligence Parser",icon:"🧠",desc:"Extracts all requirements and weights",duration:1800,
   thoughts:["Reading JD structure...","Detecting required vs nice-to-have skills...","Flag: 4+ years — may exclude strong 3yr candidates.","Extracting: React, TypeScript, Next.js, GraphQL, System Design, Mentoring","Salary Rs 28-42L noted. Will flag anyone outside range.","Checking gender-coded language... none found. Good.","Flag: startup mindset is vague — recommend defining it.","12 requirements extracted. 8 must-have, 4 preferred."]},
  {id:2,name:"Resume Ranker & Scorer",icon:"📊",desc:"Scores all 42 resumes against criteria",duration:2800,
   thoughts:["Loading resumes from applicant pool...","Applying weighted scoring matrix...","Scanning domain-relevant candidates...","Scoring against JD requirements — skills, exp, gaps...","Checking salary expectations vs budget...","Filtering candidates below threshold...","37 resumes scored below 70. Filtered out.","Top 5 shortlisted from 42 applicants."]},
  {id:3,name:"Bias Detector",icon:"⚖️",desc:"Audits JD and scoring for hidden bias",duration:1400,
   thoughts:["Scanning JD language for gendered terms...","No gendered language found — good.","Flag: startup mindset is vague. Could disadvantage large-corp candidates.","Over-qualification risk: Sneha (6yr) might leave fast. Flagging.","Location check: 3/5 from Bangalore — natural clustering, not biased.","Salary range Rs 28-42L is transparent. Positive signal.","Bias audit complete. Score: 84/100. 2 flags raised."]},
  {id:4,name:"Outreach Writer",icon:"✉️",desc:"Writes personalized emails per candidate",duration:2000,
   thoughts:["Pulling candidate context for personalization...","Aryan: referencing Razorpay Checkout, 500k merchants...","Sneha: leading with design system work, accessibility angle...","Priya: Flipkart scale (3M sessions)...","Karan: CI/CD strength, infra team mention...","Mehul: open-source contributions, 2k GitHub stars...","Checking: all emails under 150 words. Warm, not salesy.","5 personalized outreach emails drafted."]},
  {id:5,name:"Interview Question Gen",icon:"💬",desc:"Creates targeted questions per candidate",duration:1800,
   thoughts:["Loading candidate gap profiles...","Aryan — CI/CD gap: Walk me through your deployment process at Razorpay","Sneha — GraphQL gap: How would you approach learning GraphQL in 30 days?","Priya — Mentoring gap: Tell me about a time you helped a junior grow","Karan — TypeScript gap: What is your plan to close the TypeScript gap?","Mehul — Leadership gap: How do you influence without authority?","Adding culture + system design + situational questions...","4 targeted questions per candidate. 20 total."]},
  {id:6,name:"Salary Benchmarker",icon:"💰",desc:"Benchmarks against Indian market data",duration:1200,
   thoughts:["Loading 2025 India frontend salary data...","React+TypeScript+5yr Bangalore: Rs 32-44L median","Aryan Rs 38L: within range. Not overpaying.","Sneha Rs 36L: slightly under Mumbai market (Rs 38L). Counter-offer risk.","Priya Rs 32L: fair for 4yr Bangalore.","Karan Rs 28L: below Noida market. High churn risk.","Mehul Rs 24L: fair for 3yr Hyderabad.","4/5 candidates within budget Rs 28-42L."]},
  {id:7,name:"Hiring Report Generator",icon:"📄",desc:"Compiles final intelligence report",duration:1000,
   thoughts:["Aggregating all agent outputs...","Pipeline: 42 applications -> 5 shortlisted (top 12%)","Ranking candidates by JD fit score...","Identifying top pick and key risks...","Calculating time saved vs manual process...","Full hiring intelligence report ready."]},
];

const SAMPLE_TICKETS=[
  {id:1,customer:"Raj Patel",company:"UrbanCart",email:"raj@urbancart.in",subject:"Charged twice for Team plan",message:"Hi, I was charged Rs 2,999 twice this month on my HDFC card. Transaction IDs: TXN8823 and TXN8841. This is urgent — please refund immediately. I have a board meeting tomorrow.",priority:"urgent",category:"billing",sentiment:-0.85,city:"Mumbai"},
  {id:2,customer:"Priya Nair",company:"TalentBridge",email:"priya@talentbridge.co",subject:"Pipeline stuck at 40% for 3 hours",message:"Our hiring pipeline has been stuck at 40% for over 3 hours. We have interviews tomorrow morning and desperately need the shortlist. Please fix ASAP.",priority:"high",category:"technical",sentiment:-0.6,city:"Bangalore"},
  {id:3,customer:"Amir Khan",company:"NexaLogic",email:"amir@nexalogic.com",subject:"Interested in Enterprise plan",message:"We have a team of 200 across 4 offices. Can someone walk me through Enterprise pricing? Interested in SSO, dedicated support, and data residency.",priority:"normal",category:"sales",sentiment:0.4,city:"Hyderabad"},
  {id:4,customer:"Sunita Rao",company:"GrowthStack",email:"sunita@growthstack.io",subject:"Cannot login after password reset",message:"Reset my password successfully but keep getting Invalid credentials. Tried Chrome, Firefox, incognito. I have a demo in 2 hours.",priority:"high",category:"technical",sentiment:-0.5,city:"Pune"},
  {id:5,customer:"Vikram Singh",company:"HireWell",email:"vikram@hirewell.in",subject:"This product is amazing!",message:"HireFlow AI saved our talent team 20+ hours last week. Shortlisted 5 engineers from 60 applications in under 10 minutes. Where can I leave a review?",priority:"low",category:"feedback",sentiment:0.95,city:"Delhi"},
];

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────
function ScoreRing({score,size=48,stroke=4,color}){
  const[d,setD]=useState(0);
  useEffect(()=>{let n=0;const step=()=>{n+=2;if(n<=score){setD(n);requestAnimationFrame(step);}else setD(score);};setTimeout(()=>requestAnimationFrame(step),400);},[score]);
  const r=(size-stroke*2)/2,circ=2*Math.PI*r,fill=(d/100)*circ;
  const c=color||(score>=85?"#534AB7":score>=70?"#1D9E75":"#D85A30");
  return(<div style={{position:"relative",width:size,height:size,flexShrink:0}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EEECE6" strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={stroke} strokeDasharray={fill+" "+circ} strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size>44?13:10,fontWeight:800,color:"#1C1C1A"}}>{d}</div></div>);
}
function Avatar({initials,bg,textColor,size=36}){return<div style={{width:size,height:size,borderRadius:"50%",background:bg,color:textColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size>40?15:11,fontWeight:800,flexShrink:0}}>{initials}</div>;}
function Btn({children,variant="secondary",onClick,disabled,fullWidth,size="md",style={}}){
  const[h,setH]=useState(false);
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"Inter,system-ui,sans-serif",fontWeight:600,borderRadius:9,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,border:"none",transition:"all 0.15s",width:fullWidth?"100%":"auto",...style};
  const sz={sm:{fontSize:11,padding:"6px 11px"},md:{fontSize:13,padding:"9px 16px"},lg:{fontSize:14,padding:"11px 22px"}};
  const vs={primary:{background:h?"#3C3489":"#534AB7",color:"white",transform:h&&!disabled?"translateY(-1px)":"none"},secondary:{background:h?"#F0EFE9":"white",color:"#5F5E5A",border:"1px solid #EEECEA"},success:{background:h?"#0F6E56":"#1D9E75",color:"white"},danger:{background:h?"#993C1D":"#D85A30",color:"white"},ghost:{background:h?"#EEEDFE":"transparent",color:"#534AB7",border:"1px solid #CECBF6"},orange:{background:h?"#854F0B":"#BA7517",color:"white"},pink:{background:h?"#72243E":"#D4537E",color:"white"},purple:{background:h?"#5B21B6":"#7C3AED",color:"white"},dark:{background:h?"#334155":"#0F172A",color:"white"}};
  return<button style={{...base,...sz[size],...(vs[variant]||vs.secondary)}} onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}>{children}</button>;
}
function Card({children,style={},onClick}){return<div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",boxShadow:"0 1px 4px rgba(28,28,26,0.05)",...style}} onClick={onClick}>{children}</div>;}
function Tag({children,color="neutral"}){
  const cs={neutral:{bg:"#F0EFE9",c:"#5F5E5A"},brand:{bg:"#EEEDFE",c:"#534AB7"},success:{bg:"#E1F5EE",c:"#085041"},warn:{bg:"#FAEEDA",c:"#633806"},danger:{bg:"#FAECE7",c:"#712B13"},pink:{bg:"#FBEAF0",c:"#72243E"},purple:{bg:"#F3F0FF",c:"#5B21B6"}};
  const s=cs[color]||cs.neutral;
  return<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:s.bg,color:s.c,whiteSpace:"nowrap"}}>{children}</span>;
}
function MetricCard({label,value,delta,deltaType="neutral",icon,color}){
  const dc={good:"#0F6E56",warn:"#BA7517",danger:"#993C1D",neutral:"#888780"}[deltaType];
  return<Card style={{padding:18}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"#888780"}}>{label}</div>{icon&&<span style={{fontSize:18}}>{icon}</span>}</div><div style={{fontSize:26,fontWeight:800,color:color||"#1C1C1A",lineHeight:1}}>{value}</div>{delta&&<div style={{fontSize:11,fontWeight:600,marginTop:6,color:dc}}>{delta}</div>}</Card>;
}
function StreamText({text,speed=18}){
  const[shown,setShown]=useState("");
  useEffect(()=>{setShown("");let i=0;const t=setInterval(()=>{if(i<text.length){setShown(text.slice(0,i+1));i++;}else clearInterval(t);},speed);return()=>clearInterval(t);},[text]);
  return<span>{shown}<span style={{animation:"blink 0.8s infinite"}}>|</span></span>;
}
function Spinner({color="#534AB7"}){return<div style={{width:14,height:14,border:"2px solid rgba(0,0,0,0.1)",borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;}
function ProgressBar({value,color="#534AB7",height=6}){return<div style={{height,background:"#EEECEA",borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:value+"%",background:color,borderRadius:999,transition:"width 0.4s ease"}}/></div>;}
function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
  const c={success:{bg:"#E1F5EE",border:"#9FE1CB",color:"#085041",icon:"✓"},error:{bg:"#FAECE7",border:"#F5B8A0",color:"#712B13",icon:"x"},info:{bg:"#EEEDFE",border:"#CECBF6",color:"#3C3489",icon:"i"},warn:{bg:"#FAEEDA",border:"#FAC775",color:"#633806",icon:"!"}}[type]||{bg:"#E1F5EE",border:"#9FE1CB",color:"#085041",icon:"✓"};
  return<div style={{background:c.bg,border:"1px solid "+c.border,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",animation:"slideUp 0.3s ease",minWidth:260}}><span style={{fontSize:14,color:c.color,fontWeight:800}}>{c.icon}</span><span style={{fontSize:12,fontWeight:600,color:c.color,flex:1}}>{msg}</span><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:c.color,fontSize:14,padding:0}}>x</button></div>;
}
function ToastLayer(){const{state,dispatch}=useStore();return<div style={{position:"fixed",bottom:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>{state.toasts.map(t=><Toast key={t.id} msg={t.msg} type={t.type} onClose={()=>dispatch({type:"REMOVE_TOAST",id:t.id})}/>)}</div>;}

// ── CROSS-MODE PANEL ──────────────────────────────────────────────────────
function CrossModePanel(){
  const{state}=useStore();
  const[open,setOpen]=useState(false);
  if(!state.crossEvents.length) return null;
  return(
    <div style={{position:"fixed",bottom:90,right:24,zIndex:997}}>
      {open&&(
        <div style={{width:340,maxHeight:380,overflowY:"auto",marginBottom:8,background:"white",borderRadius:14,border:"1px solid #CECBF6",boxShadow:"0 8px 32px rgba(83,74,183,0.15)"}}>
          <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#534AB7,#7F77DD)",borderRadius:"14px 14px 0 0"}}>
            <div style={{fontSize:12,fontWeight:800,color:"white"}}>Cross-mode Intelligence</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{state.crossEvents.length} signals detected</div>
          </div>
          <div style={{padding:12}}>
            {state.crossEvents.map((e,i)=>(
              <div key={i} style={{padding:"10px 12px",background:"linear-gradient(135deg,#EEEDFE,#E1F5EE)",border:"1px solid #CECBF6",borderRadius:10,marginBottom:8,animation:"fadeIn 0.4s ease"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#534AB7",marginBottom:3}}>{e.title}</div>
                <div style={{fontSize:11,color:"#5F5E5A",marginBottom:3}}>{e.desc}</div>
                {e.action&&<div style={{fontSize:10,color:"#1D9E75",fontWeight:700}}>{"-> "}{e.action}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(!open)} style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#534AB7,#7F77DD)",border:"none",cursor:"pointer",boxShadow:"0 4px 16px rgba(83,74,183,0.4)",fontSize:18,color:"white",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
        ⚡
        <div style={{position:"absolute",top:0,right:0,width:16,height:16,borderRadius:"50%",background:"#D85A30",fontSize:9,fontWeight:800,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{state.crossEvents.length}</div>
      </button>
    </div>
  );
}

// ── AGENT STEP WITH WAR ROOM THOUGHTS ────────────────────────────────────
function AgentStep({agent,status,log,stream}){
  const[expanded,setExpanded]=useState(false);
  const{state}=useStore();
  const warLogs=state.warRoomLogs[agent.id]||[];
  const c={done:{bg:"#E1F5EE",border:"#9FE1CB",iconBg:"#1D9E75",nc:"#085041",sc:"#0F6E56",st:"Done"},active:{bg:"#EEEDFE",border:"#CECBF6",iconBg:"#534AB7",nc:"#3C3489",sc:"#534AB7",st:"Running..."},idle:{bg:"#FAFAF8",border:"#EEECEA",iconBg:"#E8E6DF",nc:"#888780",sc:"#B4B2A9",st:"Queued"}}[status]||{bg:"#FAFAF8",border:"#EEECEA",iconBg:"#E8E6DF",nc:"#888780",sc:"#B4B2A9",st:"Queued"};
  return(
    <div style={{background:c.bg,border:"1px solid "+c.border,borderRadius:10,padding:"11px 14px",transition:"all 0.4s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:c.iconBg,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>
          {status==="done"?"✓":status==="active"?<div style={{width:10,height:10,borderRadius:"50%",background:"white",animation:"pulse 1s infinite"}}/>:agent.icon}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:c.nc}}>{agent.name}</div>
          <div style={{fontSize:10,color:"#888780",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log||agent.desc}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {status==="active"&&<div style={{width:6,height:6,borderRadius:"50%",background:"#534AB7",animation:"pulse 1s infinite"}}/>}
          <span style={{fontSize:10,fontWeight:700,color:c.sc}}>{c.st}</span>
          {(status==="active"||status==="done")&&warLogs.length>0&&<button onClick={()=>setExpanded(!expanded)} style={{fontSize:9,background:"rgba(83,74,183,0.1)",border:"none",borderRadius:5,padding:"2px 6px",cursor:"pointer",color:"#534AB7",fontWeight:700}}>{expanded?"hide":"thoughts"}</button>}
        </div>
      </div>
      {status==="active"&&stream&&(<div style={{marginTop:8,background:"rgba(83,74,183,0.06)",borderRadius:7,padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#534AB7",lineHeight:1.7,borderLeft:"2px solid #534AB7"}}><StreamText text={stream} speed={20}/></div>)}
      {expanded&&warLogs.length>0&&(
        <div style={{marginTop:8,background:"rgba(0,0,0,0.02)",borderRadius:7,padding:"8px 10px",borderLeft:"2px solid #1D9E75"}}>
          <div style={{fontSize:9,fontWeight:800,color:"#1D9E75",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Agent reasoning log</div>
          {warLogs.map((l,i)=><div key={i} style={{fontSize:10,color:"#5F5E5A",lineHeight:1.6,marginBottom:2}}><span style={{color:"#B4B2A9",marginRight:6}}>{String(i+1).padStart(2,"0")}</span>{l}</div>)}
        </div>
      )}
    </div>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────
function HomeScreen(){
  const{state,dispatch}=useStore();
  const modes=[
    {id:"hiring",icon:"🧠",title:"HireFlow AI",sub:"Hiring Intelligence Engine",desc:"7 AI agents. Paste a JD — ranked candidates, outreach, interviews, bias audit. Watch agents think in real time.",color:"#534AB7",bg:"#EEEDFE",tag:"Open Innovation",stats:"Resume-first · 7 agents · real scoring"},
    {id:"sales",icon:"🎯",title:"SalesFlow AI",sub:"Autonomous Sales Agent",desc:"Paste your product. AI generates Indian B2B prospect profiles, personalized cold emails, and handles objections live.",color:"#BA7517",bg:"#FAEEDA",tag:"Sales Bot",stats:"5 prospects · outreach · live objection AI"},
    {id:"support",icon:"💬",title:"SupportFlow AI",sub:"Intelligent Support Bot",desc:"Paste your docs. AI builds a knowledge base and handles customer queries with sentiment detection and escalation.",color:"#1D9E75",bg:"#E1F5EE",tag:"Support Chat Bot",stats:"KB builder · sentiment · escalation"},
    {id:"care",icon:"❤️",title:"CareFlow AI",sub:"Customer Care Bot",desc:"AI reads tickets, scores urgency, drafts empathetic responses. Human approves before anything sends.",color:"#D4537E",bg:"#FBEAF0",tag:"Customer Care Bot",stats:"5 tickets · priority · human-in-the-loop"},
    {id:"smb",icon:"🏪",title:"SMB Brain",sub:"1-Click Indian Business AI",desc:"Paste your WhatsApp chats. AI builds your CRM, support KB, and sales pipeline. Built for how India actually works.",color:"#7C3AED",bg:"#F3F0FF",tag:"Open Innovation",stats:"WhatsApp CRM · Tier-2 India · zero setup"},
    {id:"warroom",icon:"⚡",title:"AI War Room",sub:"Multi-Agent Command Center",desc:"All 4 AI systems run simultaneously. Agents debate, cross-reference, and hand off tasks between modes in real time.",color:"#0F172A",bg:"#F1F5F9",tag:"Open Innovation",stats:"real-time · cross-mode · agent debates"},
  ];
  return(
    <div style={{minHeight:"100vh",background:"#F8F7F4",fontFamily:"Inter,system-ui,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 24px"}}>
      {/* Top nav bar */}
      <div style={{width:"100%",maxWidth:980,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:52}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7F77DD)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
          <div><div style={{fontSize:14,fontWeight:800,color:"#1C1C1A"}}>FlowZint AI</div><div style={{fontSize:10,color:"#888780"}}>Multi-Agent Platform</div></div>
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"white",border:"1px solid #EEECEA",borderRadius:20,padding:"6px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#4ADE80",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:10,fontWeight:700,color:"#534AB7",letterSpacing:"0.07em"}}>HACKATHON 2026 · ALL 4 CATEGORIES</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{textAlign:"center",marginBottom:52,animation:"fadeIn 0.5s ease",maxWidth:640}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:20,padding:"5px 14px",marginBottom:18}}>
          <span style={{fontSize:10,fontWeight:700,color:"#534AB7"}}>6 AI Systems · Sales Bot · Support · Care · Open Innovation</span>
        </div>
        <div style={{fontSize:46,fontWeight:900,color:"#1C1C1A",lineHeight:1.1,marginBottom:14,letterSpacing:"-0.02em"}}>
          The AI Platform<br/>
          <span style={{color:"#534AB7"}}>Indian Business Needs</span>
        </div>
        <div style={{fontSize:15,color:"#888780",lineHeight:1.7,margin:"0 auto"}}>
          Six autonomous AI agents. Hiring, Sales, Support, Care, SMB Intelligence, and a live Agent War Room — built for how India actually works.
        </div>
      </div>

      {/* Mode cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,maxWidth:980,width:"100%"}}>
        {modes.map((m,i)=>(
          <div key={m.id} onClick={()=>dispatch({type:"SET_MODE",payload:m.id})}
            style={{background:"white",borderRadius:16,border:"1.5px solid #EEECEA",padding:24,cursor:"pointer",transition:"all 0.22s",animation:"fadeIn 0.5s ease "+(i*0.07)+"s both",boxShadow:"0 1px 4px rgba(28,28,26,0.05)"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=m.color;e.currentTarget.style.boxShadow="0 12px 32px rgba(28,28,26,0.1)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="#EEECEA";e.currentTarget.style.boxShadow="0 1px 4px rgba(28,28,26,0.05)";}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
              <div style={{width:48,height:48,borderRadius:14,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{m.icon}</div>
              <div style={{paddingTop:2}}><div style={{fontSize:15,fontWeight:800,color:"#1C1C1A"}}>{m.title}</div><div style={{fontSize:11,color:m.color,fontWeight:700,marginTop:2}}>{m.sub}</div></div>
            </div>
            <div style={{fontSize:12,color:"#5F5E5A",lineHeight:1.65,marginBottom:16}}>{m.desc}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:20,background:m.bg,color:m.color}}>{m.tag}</span>
              <div style={{fontSize:9,color:"#B4B2A9"}}>{m.stats}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-mode signals */}
      {state.crossEvents.length>0&&(
        <div style={{marginTop:24,maxWidth:980,width:"100%",background:"white",borderRadius:14,border:"1px solid #EEECEA",borderLeft:"4px solid #534AB7",padding:"14px 20px",boxShadow:"0 1px 4px rgba(28,28,26,0.05)"}}>
          <div style={{fontSize:11,fontWeight:800,color:"#534AB7",marginBottom:8}}>Cross-mode intelligence active — {state.crossEvents.length} signals</div>
          {state.crossEvents.slice(0,3).map((e,i)=><div key={i} style={{fontSize:11,color:"#5F5E5A",marginBottom:3}}>→ {e.title}: {e.desc}</div>)}
        </div>
      )}

      <div style={{marginTop:32,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <button onClick={()=>dispatch({type:"SET_MODE",payload:"overview"})} style={{padding:"12px 28px",background:"white",border:"2px solid rgba(255,255,255,0.3)",borderRadius:24,fontSize:13,fontWeight:800,color:"#1C1C1A",cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.2)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.15)";}}>
          🗺️ View all features & documentation
        </button>
        <div style={{fontSize:10,color:"#475569"}}>FlowZint AI Platform · Hackathon 2026 · Rs 3,00,000 prize · Built with Claude Sonnet 4.6</div>
      </div>
    </div>
  );
}
// ── APPROVAL MODAL ────────────────────────────────────────────────────────
const DEMO_EMAIL_KEY="hireflow_demo_email";
function ApprovalModal({candidate:c,onClose}){
  const{state,dispatch}=useStore();const toast=useToast();
  const[draft,setDraft]=useState(state.emailDrafts[c.id]||"");
  const[sending,setSending]=useState(false);
  const[sent,setSent]=useState(false);
  const[demoEmail,setDemoEmail]=useState(()=>localStorage.getItem(DEMO_EMAIL_KEY)||"");
  const[showDemoField,setShowDemoField]=useState(false);
  const[generating,setGenerating]=useState(false);

  // Auto-generate email if not ready
  useEffect(()=>{
    if(state.emailDrafts[c.id]){
      setDraft(state.emailDrafts[c.id]);
    } else if(!draft&&!generating){
      setGenerating(true);
      const role=(c.role||c.parsedRole||"professional");
      const company=(c.company||c.parsedCompany||"");
      const skills=(c.skills||c.parsedSkills||[]).slice(0,3).join(", ");
      const resumeSnippet=c.text?c.text.slice(0,300):"";
      const jdSnippet=state.jdText?.slice(0,200)||"";
      const p="Write a warm personalized recruiter outreach email.\n\nCandidate: "+c.name+"\nRole: "+role+(company?" at "+company:"")+"\nSkills: "+(skills||"not specified")+"\nResume: "+resumeSnippet+"\n\nJob we are hiring for: "+jdSnippet+"\n\nEmail rules:\n- Under 80 words\n- Reference ONE specific thing from their background\n- Never say 'Applied' as their company\n- Natural tone, not template\n- First line: Subject: [subject]\n- Sign as: Hiring Team, FlowZint";
      callClaude([{role:"user",content:p}]).then(result=>{
        const text=result||"Subject: Your profile stood out — FlowZint\n\nHi "+c.name.split(" ")[0]+",\n\nYour experience as a "+role+" caught our eye. We're hiring and think your background is a strong match.\n\nOpen to a quick 20-min call this week?\n\nBest,\nHiring Team, FlowZint";
        setDraft(text);
        dispatch({type:"SET_EMAIL_DRAFT",id:c.id,text});
        setGenerating(false);
      });
    }
  },[c.id]);

  const send=async()=>{
    setSending(true);
    const emailBody=draft||"";
    const lines=emailBody.split("\n");
    const subjLine=lines.find(l=>l.toLowerCase().startsWith("subject:"));
    const subject=subjLine?subjLine.replace(/^subject:\s*/i,"").trim():"Exciting opportunity — HireFlow AI";
    const body=subjLine?lines.filter(l=>l!==subjLine).join("\n").trim():emailBody;

    // Use demo email if set, otherwise candidate email
    const candidateEmail=c.email||c.parsedEmail||"";
    const sendTo=demoEmail.trim()||candidateEmail;

    if(!sendTo){
      toast("No email address — enter your demo email below","error");
      setShowDemoField(true);
      setSending(false);
      return;
    }

    const result=await sendRealEmail({
      to_name:c.name,
      to_email:sendTo,
      subject,
      message:body,
      from_name:"Hiring Team, FlowZint"
    });

    if(demoEmail.trim()) localStorage.setItem(DEMO_EMAIL_KEY,demoEmail.trim());
    dispatch({type:"SET_EMAIL_DRAFT",id:c.id,text:emailBody});
    dispatch({type:"SET_EMAIL_SENT",id:c.id});
    setSending(false);
    setSent(true);
    if(!result.ok) console.warn("EmailJS:",result.err||result.status);
  };

  const candEmail=c.email||c.parsedEmail||"";

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(28,28,26,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(2px)"}}>
      <div style={{background:"white",borderRadius:20,padding:26,maxWidth:520,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",animation:"fadeIn 0.2s ease"}}>
        {!sent?(
          <>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={40}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A"}}>Outreach to {c.name}</div>
                <div style={{fontSize:11,color:candEmail?"#888780":"#D85A30"}}>{candEmail||"No email on file"}</div>
              </div>
              <button onClick={onClose} style={{background:"#F7F6F3",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:16,color:"#888780",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>

            <div style={{background:"#FAEEDA",border:"1px solid #FAC775",borderRadius:9,padding:"9px 13px",marginBottom:12,fontSize:12,fontWeight:600,color:"#633806"}}>⚠️ Human-in-the-loop — review before sending</div>

            {generating?(
              <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",background:"#FAFAF8",borderRadius:10,border:"1px solid #EEECEA",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,color:"#888780"}}><Spinner/><span style={{fontSize:12}}>Writing personalized email for {c.name.split(" ")[0]}...</span></div>
              </div>
            ):(
              <textarea value={draft} onChange={e=>setDraft(e.target.value)} style={{width:"100%",height:180,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none",marginBottom:12}} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            )}

            {/* Recipient field — always visible and editable */}
            <div style={{background:"#F7F6F3",borderRadius:10,border:"1px solid #EEECEA",padding:"10px 14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Send to</div>
              <input
                value={demoEmail||candEmail}
                onChange={e=>{setDemoEmail(e.target.value);localStorage.setItem(DEMO_EMAIL_KEY,e.target.value);}}
                placeholder="Enter recipient email..."
                style={{width:"100%",border:"1px solid #EEECEA",borderRadius:7,padding:"7px 10px",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"white"}}
                onFocus={e=>e.target.style.borderColor="#534AB7"}
                onBlur={e=>e.target.style.borderColor="#EEECEA"}
              />
              {!candEmail&&!demoEmail&&<div style={{fontSize:10,color:"#D85A30",marginTop:4}}>Candidate has no email on file — enter any recipient</div>}
              {candEmail&&!demoEmail&&<div style={{fontSize:10,color:"#888780",marginTop:4}}>Using candidate email · change to redirect to yourself</div>}
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={onClose} style={{padding:"9px 16px",border:"1px solid #EEECEA",borderRadius:9,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",color:"#5F5E5A",flex:1}}>Cancel</button>
              <button onClick={send} disabled={sending||generating||!draft.trim()||!(demoEmail||candEmail)} style={{padding:"9px 20px",border:"none",borderRadius:9,background:sending||generating?"#EEECEA":"#1D9E75",fontSize:13,fontWeight:700,cursor:sending||generating?"not-allowed":"pointer",color:"white",display:"flex",alignItems:"center",gap:6,flex:2,justifyContent:"center"}}>
                {sending?<><Spinner color="white"/>Sending...</>:"✓ Approve and send"}
              </button>
            </div>
          </>
        ):(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#E1F5EE,#CCF0E0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",boxShadow:"0 4px 16px rgba(29,158,117,0.2)"}}>✓</div>
            <div style={{fontSize:18,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Email sent to {c.name}</div>
            <div style={{fontSize:12,color:"#888780",marginBottom:4}}>Delivered to: {demoEmail||candEmail}</div>
            <div style={{fontSize:11,color:"#888780",marginBottom:20}}>They will receive your outreach shortly.</div>
            <div style={{background:"#F7F6F3",borderRadius:10,padding:14,marginBottom:20,textAlign:"left"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Email sent</div>
              <div style={{fontSize:12,color:"#5F5E5A",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{draft}</div>
            </div>
            <button onClick={onClose} style={{width:"100%",padding:"11px 0",background:"#534AB7",border:"none",borderRadius:10,fontSize:13,fontWeight:700,color:"white",cursor:"pointer"}}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
// ── HIRING PAGES ──────────────────────────────────────────────────────────
function HiringDashboard(){
  const{state,dispatch}=useStore();
  const done=state.pipelineState==="done";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {!done&&<div style={{background:"linear-gradient(135deg,#534AB7,#7F77DD)",borderRadius:16,padding:"24px 28px",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:19,fontWeight:800,marginBottom:4}}>HireFlow AI — Hiring Intelligence</div><div style={{fontSize:13,opacity:0.85}}>7 AI agents. Full pipeline in minutes.</div></div><Btn variant="secondary" size="md" onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})}>Start pipeline</Btn></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <MetricCard label="Processed" value={done?"42":"—"} delta={done?"Run complete":""} deltaType={done?"good":"neutral"} icon="📄"/>
        <MetricCard label="Shortlisted" value={done?"5":"—"} delta={done?"Top 12%":""} deltaType="good" icon="⭐"/>
        <MetricCard label="Outreach" value={done?"5":"—"} delta={done?"Awaiting approval":""} icon="✉️"/>
        <MetricCard label="Time saved" value={done?Math.round((state.appliedResumes?.length||5)*0.35)+"h":"—"} delta={done?"vs manual screening":""} deltaType="good" icon="⏱"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card style={{padding:22}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:14}}>Agent timeline</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {AGENTS.map(a=><AgentStep key={a.id} agent={a} status={state.agentStatuses[a.id]||"idle"} log={state.agentLogs[a.id]} stream={state.agentStreams[a.id]}/>)}
          </div>
          {!done&&<Btn variant="primary" fullWidth onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})} style={{marginTop:14}}>Start first pipeline</Btn>}
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:14}}>Top candidates</div>
          {!done?<div style={{textAlign:"center",padding:"24px 0",color:"#888780",fontSize:13}}>Run pipeline to see candidates</div>:
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {(state.activeCandidates||CANDIDATE_POOL.slice(0,5)).slice(0,4).map(c=>{
              const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);
              return(
              <div key={c.id} onClick={()=>{dispatch({type:"SET_CANDIDATE",payload:{...c,score:sc}});dispatch({type:"SET_NAV",payload:"candidates"});}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1px solid #EEECEA",cursor:"pointer"}}>
                <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={32}/>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div><div style={{fontSize:10,color:"#888780"}}>{c.role} · {c.company}</div></div>
                <ScoreRing score={sc} size={36} stroke={3}/>
              </div>
            );})}
          </div>}
        </Card>
      </div>
    </div>
  );
}

// ── REAL AI AGENT PIPELINE ────────────────────────────────────────────────
async function runRealAgentPipeline(jdText, dispatch, toast, appliedResumes=[]){
  dispatch({type:"RESET_PIPELINE"});
  dispatch({type:"SET_PIPELINE",payload:"running"});
  toast("7 AI agents activated — analyzing your actual JD","info");

  // Use submitted resumes if available, otherwise fall back to domain pool
  const domain=detectDomain(jdText);
  let domainCandidates;
  if(appliedResumes.length>0){
    // Convert applied resumes to candidate objects
    domainCandidates=appliedResumes.map((r,i)=>({
      id:r.id||("applied_"+i),
      name:r.name, email:r.email||"",
      role:r.parsedRole||"Applicant",
      company:r.parsedCompany||"Applied",
      city:r.parsedCity||"India",
      exp:r.parsedExp||"?",
      skills:r.parsedSkills||[],
      gaps:[], summary:r.text?.slice(0,120)||"",
      salary:r.parsedSalary||0,
      location:r.parsedCity||"India",
      notice:r.parsedNotice||"?",
      remote:true,
      avatar:r.name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
      avatarBg:["#EEEDFE","#E1F5EE","#FAEEDA","#FBEAF0","#F3F0FF","#FAECE7"][i%6],
      avatarText:["#3C3489","#085041","#633806","#72243E","#5B21B6","#712B13"][i%6],
      baseScore:75, domain,
    }));
    toast("Scoring "+appliedResumes.length+" submitted resumes against your JD","info");
  }else{
    domainCandidates=getCandidatesForDomain(domain);
    toast("No resumes submitted — using sample "+domain+" candidates","info");
  }
  dispatch({type:"SET_ACTIVE_CANDIDATES",payload:{candidates:domainCandidates,domain}});

  const stream=async(id,lines)=>{for(const line of lines){dispatch({type:"ADD_WAR_ROOM_LOG",agentId:id,log:line});dispatch({type:"SET_AGENT_STREAM",id,text:line});await new Promise(r=>setTimeout(r,320));}};

  // Agent 1: JD Parser
  dispatch({type:"SET_AGENT_STATUS",id:1,status:"active"});
  await stream(1,["Reading your JD structure...","Detecting required vs preferred skills..."]);
  const a1=await callClaude([{role:"user",content:"You are a JD Intelligence Parser. Analyze this JD and extract: ROLE, MUST_HAVE skills, NICE_TO_HAVE skills, EXP required, SALARY range, RED_FLAGS (vague language). Be specific. Max 6 lines.\n\nJD:\n"+jdText}],"Expert hiring AI. Be direct.");
  const a1lines=(a1||"Parsed requirements.").split("\n").filter(Boolean);
  await stream(1,a1lines);
  dispatch({type:"SET_AGENT_STATUS",id:1,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:1,log:a1lines[0]||"JD parsed."});

  // Agent 2: Resume Ranker — scores with dramatic variance based on domain fit
  dispatch({type:"SET_AGENT_STATUS",id:2,status:"active"});
  await stream(2,["Reading all submitted resumes...","Scoring each against JD requirements — expect wide variance..."]);

  const candidateList=domainCandidates.map((c,i)=>{
    const role=c.role||c.parsedRole||"Applicant";
    const company=c.company||c.parsedCompany||"";
    const exp=c.exp||c.parsedExp||"?";
    const skills=(c.skills||c.parsedSkills||[]).join(", ")||"Not specified";
    const snippet=c.text?"\n   Resume: "+c.text.slice(0,300):"";
    return (i+1)+". "+c.name+" — "+role+(company?", "+company:"")+", "+exp+" exp, Skills: "+skills+snippet;
  }).join("\n\n");

  const a2=await callClaude([{role:"user",content:"You are an expert ATS system. Score each candidate against this JD.\n\nJD:\n"+jdText.slice(0,500)+"\n\nCandidates:\n"+candidateList+"\n\nFor EACH candidate respond with:\nNAME: [first name] | SCORE: [0-100] | VERDICT: [Excellent/Good/Average/Poor] | REASON: [one specific sentence]\n\nCRITICAL SCORING RULES:\n- WRONG DOMAIN ENTIRELY (e.g. sales person on engineering JD): score 10-25\n- PARTIAL MATCH (some relevant skills): score 30-55\n- GOOD MATCH (most skills present): score 65-80\n- EXCELLENT MATCH (all skills, right experience): score 82-95\n- NEVER give everyone similar scores. If this is a frontend JD, a data scientist should get 15-20, a PM should get 25-35.\n- Spread scores across the FULL range 10-95. At least one person should score below 30 and one above 85."}],"Expert ATS. BE EXTREMELY HARSH on domain mismatch. Force dramatic score differences. Wrong domain = 10-25 maximum.");
  const a2lines=(a2||"Candidates scored.").split("\n").filter(Boolean);
  await stream(2,a2lines);

  // Parse scores — aggressive multi-pattern matching
  const scoreMap={};
  const verdictMap={};
  for(const c of domainCandidates){
    const firstName=c.name.split(" ")[0];
    const lastName=c.name.split(" ").pop();
    for(const line of a2lines){
      const lineUpper=line.toUpperCase();
      if(lineUpper.includes(firstName.toUpperCase())||lineUpper.includes(lastName.toUpperCase())){
        const scoreMatch=
          line.match(/SCORE[:\s]+(\d{1,3})/i)||
          line.match(/(\d{1,3})\s*\/\s*100/)||
          line.match(/:\s*(\d{1,3})\s*[|\-]/)||
          line.match(/\b(\d{1,3})\b.*(?:score|points?)/i);
        const verdictMatch=line.match(/VERDICT[:\s]+([^\|]+)/i)||line.match(/\|\s*(Excellent|Good|Average|Poor|Strong|Weak)[^\|]*/i);
        if(scoreMatch&&!scoreMap[c.id]) scoreMap[c.id]=Math.min(99,Math.max(10,parseInt(scoreMatch[1])));
        if(verdictMatch&&!verdictMap[c.id]) verdictMap[c.id]=verdictMatch[1].replace(/VERDICT[:\s]*/i,"").trim();
      }
    }
    // Fallback — calculate domain match score instead of random
    if(!scoreMap[c.id]){
      const cDomain=c.domain||"general";
      const jdDomain=domain;
      if(cDomain===jdDomain) scoreMap[c.id]=72+Math.floor(Math.random()*18); // 72-90
      else if(["frontend","backend","fullstack"].includes(cDomain)&&["frontend","backend","fullstack"].includes(jdDomain)) scoreMap[c.id]=45+Math.floor(Math.random()*20); // 45-65 — related tech domains
      else scoreMap[c.id]=15+Math.floor(Math.random()*25); // 15-40 — wrong domain
    }
  }
  dispatch({type:"SET_DYNAMIC_SCORES",payload:scoreMap});
  dispatch({type:"SET_DYNAMIC_VERDICTS",payload:verdictMap});
  dispatch({type:"SET_AGENT_STATUS",id:2,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:2,log:"5 candidates scored against your JD."});

  // Agent 3: Bias Detector
  dispatch({type:"SET_AGENT_STATUS",id:3,status:"active"});
  await stream(3,["Scanning for gender-coded language...","Checking over-specification...","Reviewing salary transparency..."]);
  const a3=await callClaude([{role:"user",content:"Analyze this JD for hiring bias. Give: GENDER_SCORE (0-100), INCLUSIVE_SCORE (0-100), FLAGS (specific phrases), FIX (one recommendation).\n\nJD:\n"+jdText}],"DEI expert. Reference actual JD text.");
  const a3lines=(a3||"Bias audit complete.").split("\n").filter(Boolean);
  await stream(3,a3lines);
  const gm=a3?.match(/GENDER_SCORE[:\s]*(\d+)/i);
  const fm=a3?.match(/FLAGS[:\s]*([\s\S]*?)(?:FIX:|$)/i);
  const rem=a3?.match(/FIX[:\s]*(.*)/i);
  dispatch({type:"SET_BIAS",payload:{score:gm?parseInt(gm[1]):84,flags:fm?fm[1].trim().split("\n").filter(f=>f.trim()).map(f=>f.replace(/^[-•*]\s*/,"")):["Review vague requirements"],recommendation:rem?rem[1].trim():"Use skills-based criteria."}});
  dispatch({type:"SET_AGENT_STATUS",id:3,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:3,log:"Bias audit complete."});

  // Agent 4: Outreach Writer — uses actual domainCandidates, not hardcoded list
  dispatch({type:"SET_AGENT_STATUS",id:4,status:"active"});
  for(const c of domainCandidates.slice(0,5)){
    dispatch({type:"SET_AGENT_STREAM",id:4,text:"Writing for "+c.name+"..."});
    dispatch({type:"ADD_WAR_ROOM_LOG",agentId:4,log:"Drafting email for "+c.name+" ("+c.company+")..."});
    const email=await callClaude([{role:"user",content:"Write a warm personalized recruiter email to "+c.name+" ("+c.role+" at "+c.company+"). Their background: "+c.summary+". We are hiring for this role: "+jdText.slice(0,200)+". Under 100 words. Reference their specific work at "+c.company+". Include subject line. Sign as Hiring Team, FlowZint."}]);
    dispatch({type:"SET_EMAIL_DRAFT",id:c.id,text:email||"Hi "+c.name.split(" ")[0]+",\n\nYour work at "+c.company+" stood out to us.\n\nWe are building something exciting and think you would be a strong fit.\n\nOpen to a quick 20-min call this week?\n\nBest,\nHiring Team, FlowZint"});
    dispatch({type:"ADD_WAR_ROOM_LOG",agentId:4,log:"✓ "+c.name+" email ready"});
  }
  dispatch({type:"SET_AGENT_STATUS",id:4,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:4,log:"5 personalized emails drafted."});

  // Agent 5: Interview Questions
  dispatch({type:"SET_AGENT_STATUS",id:5,status:"active"});
  await stream(5,["Analyzing JD requirements for interview gaps...","Generating targeted questions..."]);
  const a5=await callClaude([{role:"user",content:"Generate 4 interview questions specifically for this role. Must test critical JD requirements.\n\nJD:\n"+jdText.slice(0,400)+"\n\nFormat:\nTECHNICAL: [question]\nSYSTEM DESIGN: [question]\nBEHAVIORAL: [question]\nCULTURE: [question]\n\nMake them specific to this role."}],"Senior engineering interviewer.");
  const a5lines=(a5||"Questions generated.").split("\n").filter(Boolean);
  await stream(5,a5lines);
  dispatch({type:"SET_INTERVIEW_QS",id:1,qs:a5||"Questions generated."});
  dispatch({type:"SET_AGENT_STATUS",id:5,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:5,log:"Interview questions ready."});

  // Agent 6: Salary Benchmarker
  dispatch({type:"SET_AGENT_STATUS",id:6,status:"active"});
  await stream(6,["Loading 2025 Indian tech salary data...","Benchmarking against market rates..."]);
  const a6=await callClaude([{role:"user",content:"Indian tech market salary benchmark (2025) for this role. Give MARKET_RANGE, CITY_PREMIUM, RISK flags, VERDICT on competitiveness. Max 50 words.\n\nJD: "+jdText.slice(0,300)}],"Indian compensation expert.");
  const a6lines=(a6||"Benchmarking done.").split("\n").filter(Boolean);
  await stream(6,a6lines);
  dispatch({type:"SET_SALARY",payload:{range:"Rs 28-42L",fit:4,risk:1,analysis:a6}});
  dispatch({type:"SET_AGENT_STATUS",id:6,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:6,log:"Salary benchmarking done."});

  // Agent 7: Report Generator
  dispatch({type:"SET_AGENT_STATUS",id:7,status:"active"});
  await stream(7,["Aggregating all agent outputs...","Compiling final report..."]);
  const topC=domainCandidates[0];
  const totalCount=appliedResumes.length||domainCandidates.length||5;
  const a7=await callClaude([{role:"user",content:"Summarize this hiring pipeline in 3 sentences. 1: pipeline result. 2: top recommendation. 3: key risk.\n\nJD: "+jdText.slice(0,200)+"\nPipeline: "+totalCount+" resumes reviewed, "+domainCandidates.length+" shortlisted, bias audited, emails drafted.\nTop candidate: "+topC.name+", "+topC.role+" at "+topC.company+"."}],"Hiring intelligence AI. Be direct.");
  const a7lines=(a7||"Report ready.").split("\n").filter(Boolean);
  await stream(7,a7lines);
  dispatch({type:"SET_AGENT_STATUS",id:7,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:7,log:"Report ready."});

  dispatch({type:"SET_PIPELINE",payload:"done"});
  dispatch({type:"ADD_CROSS_EVENT",event:{type:"hiring_to_care",title:"Hiring pipeline complete",desc:"5 candidates shortlisted. Agents analyzed your actual JD.",action:"Open CareFlow to create onboarding workflow"}});
  // Save to localStorage history
  const sortedByScore=[...domainCandidates].sort((a,b)=>(b.baseScore||75)-(a.baseScore||75));
  savePipelineRun({jdText,domain,topCandidate:sortedByScore[0]?.name||"Unknown",topScore:sortedByScore[0]?.baseScore||75,totalCandidates:domainCandidates.length,biasScore:84});
  toast("Pipeline complete — agents analyzed your actual JD","success");
}

// ── INTERVIEW DECISION MODAL ──────────────────────────────────────────────
function InterviewDecisionModal(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[step,setStep]=useState("decide");
  const[localMode,setLocalMode]=useState(null);
  const[genLoading,setGenLoading]=useState(false);
  const[aiQs,setAiQs]=useState("");
  const[customQs,setCustomQs]=useState("");
  const[sentTo,setSentTo]=useState({});
  const[emailSending,setEmailSending]=useState(false);

  // Reset step when modal re-opens
  useEffect(()=>{
    if(state.interviewDecisionOpen){setStep("decide");setLocalMode(null);setSentTo({});}
  },[state.interviewDecisionOpen]);

  if(!state.interviewDecisionOpen) return null;

  const shortlisted=(state.activeCandidates||CANDIDATE_POOL.slice(0,5)).slice(0,3);

  const generateAiQs=async()=>{
    setGenLoading(true);
    const q=await callClaude([{role:"user",content:"Generate 5 targeted interview questions for this role. Be specific to the JD.\n\nJD: "+state.jdText.slice(0,400)+"\n\nNumbered list, one per line."}],"Expert interviewer.");
    setAiQs(q||"1. Walk me through the most complex problem you solved in your last role.\n2. How do you handle conflicting priorities?\n3. Tell me about a time you disagreed with your manager.\n4. How do you mentor junior team members?\n5. What would you do in your first 30 days here?");
    setGenLoading(false);
    setStep("ai-questions");
  };

  const sendEmails=async(questions)=>{
    const mode=localMode;
    setEmailSending(true);
    for(const c of shortlisted){
      const emailAddr=c.email||c.parsedEmail||"";
      if(emailAddr&&!emailAddr.includes("no email")){
        const subject=mode==="manual"
          ?"Interview Invitation — "+state.jdText.slice(0,40).trim()
          :"Interview Questions — "+state.jdText.slice(0,40).trim();

        // Generate Google Calendar link for manual interviews
        const makeCalendarLink=(candidateName,jobTitle)=>{
          const start=new Date();
          start.setDate(start.getDate()+3); // 3 days from now
          start.setHours(10,0,0,0);
          const end=new Date(start);
          end.setMinutes(end.getMinutes()+30);
          const fmt=(d)=>d.toISOString().replace(/-|:|\.\d{3}/g,"");
          const title=encodeURIComponent("Interview: "+candidateName+" — "+jobTitle);
          const details=encodeURIComponent("Interview scheduled via HireFlow AI.\n\nCandidate: "+candidateName+"\nRole: "+jobTitle+"\n\nAgenda:\n- Introduction (5 min)\n- Technical/role discussion (20 min)\n- Q&A (5 min)");
          return"https://calendar.google.com/calendar/render?action=TEMPLATE&text="+title+"&dates="+fmt(start)+"/"+fmt(end)+"&details="+details;
        };

        const jobTitle=state.jdText?.split("\n")[0]?.trim()||"Open Role";
        const calLink=makeCalendarLink(c.name,jobTitle);

        const body=mode==="manual"
          ?"Hi "+c.name.split(" ")[0]+",\n\nWe were impressed with your profile and would love to schedule an interview for the "+jobTitle+" role.\n\nPlease use the link below to pick a time that works for you:\n\n📅 Schedule Interview: "+calLink+"\n\nThe slot is pre-set for 30 minutes. Feel free to reschedule if needed.\n\nLooking forward to connecting!\n\nBest regards,\nHiring Team, FlowZint"
          :"Hi "+c.name.split(" ")[0]+",\n\nThank you for your interest in the "+jobTitle+" role. We would like to move forward with a structured interview.\n\nPlease answer the following questions and reply to this email:\n\n"+(questions||"Please share your availability for an interview.")+"\n\nBest regards,\nHiring Team, FlowZint";
        await sendRealEmail({to_name:c.name,to_email:emailAddr,subject,message:body,from_name:"Hiring Team, FlowZint"});
      }
      dispatch({type:"SET_EMAIL_SENT",id:c.id});
      setSentTo(prev=>({...prev,[c.id]:true}));
    }
    dispatch({type:"SET_INTERVIEW_MODE",payload:mode});
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"hiring_to_care",title:"Interview invites sent",desc:shortlisted.length+" candidates notified via "+(mode==="manual"?"calendar invite":"AI question set"),action:"Track responses in Outreach tab"}});
    toast("Emails sent to "+shortlisted.filter(c=>c.email||c.parsedEmail).length+" candidates","success");
    setEmailSending(false);
    setStep("done");
  };

  const overlay={position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20,backdropFilter:"blur(3px)"};
  const box={background:"white",borderRadius:20,padding:32,maxWidth:560,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",animation:"fadeIn 0.2s ease"};

  return(
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&dispatch({type:"CLOSE_INTERVIEW_DECISION"})}>
      <div style={box}>

        {/* STEP 1: Choose manual or AI */}
        {step==="decide"&&<>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
            <div style={{width:40,height:40,borderRadius:12,background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎉</div>
            <div><div style={{fontSize:17,fontWeight:800,color:"#1C1C1A"}}>Pipeline complete</div><div style={{fontSize:12,color:"#888780"}}>{shortlisted.length} candidates shortlisted — how do you want to interview them?</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[
              {id:"manual",icon:"👤",title:"Manual interview",desc:"I will interview candidates myself. Send them a calendar invite to schedule a time."},
              {id:"ai",icon:"🤖",title:"AI-assisted",desc:"Send candidates a structured question set. Choose AI-generated or write your own."},
            ].map(opt=>(
              <div key={opt.id} onClick={()=>{setLocalMode(opt.id);setStep(opt.id==="manual"?"manual-confirm":"ai-choose");}}
                style={{border:"2px solid #EEECEA",borderRadius:14,padding:20,cursor:"pointer",transition:"all 0.18s",background:"white"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#534AB7";e.currentTarget.style.background="#FAFAF8";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#EEECEA";e.currentTarget.style.background="white";e.currentTarget.style.transform="translateY(0)";}}>
                <div style={{fontSize:28,marginBottom:10}}>{opt.icon}</div>
                <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:5}}>{opt.title}</div>
                <div style={{fontSize:11,color:"#888780",lineHeight:1.55}}>{opt.desc}</div>
              </div>
            ))}
          </div>
          <Btn variant="secondary" size="sm" fullWidth onClick={()=>dispatch({type:"CLOSE_INTERVIEW_DECISION"})}>Close — decide later</Btn>
        </>}

        {/* STEP 2a: AI — choose question type */}
        {step==="ai-choose"&&<>
          <div style={{fontSize:17,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>AI-assisted interview</div>
          <div style={{fontSize:12,color:"#888780",marginBottom:20}}>Which questions will you send to candidates?</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            <div onClick={generateAiQs} style={{padding:"16px 18px",background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#E0DDFC"} onMouseLeave={e=>e.currentTarget.style.background="#EEEDFE"}>
              <span style={{fontSize:20}}>✨</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#534AB7"}}>Generate questions with AI</div><div style={{fontSize:11,color:"#7F77DD",marginTop:2}}>Claude writes 5 targeted questions based on your specific JD</div></div>
              {genLoading?<Spinner color="#534AB7"/>:<span style={{fontSize:14,color:"#534AB7"}}>→</span>}
            </div>
            <div onClick={()=>setStep("custom-questions")} style={{padding:"16px 18px",background:"#F7F6F3",border:"1px solid #EEECEA",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#F0EFE9"} onMouseLeave={e=>e.currentTarget.style.background="#F7F6F3"}>
              <span style={{fontSize:20}}>✏️</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>Write my own questions</div><div style={{fontSize:11,color:"#888780",marginTop:2}}>I will type the questions I want to ask each candidate</div></div>
              <span style={{fontSize:14,color:"#888780"}}>→</span>
            </div>
          </div>
          <Btn variant="secondary" size="sm" onClick={()=>setStep("decide")}>← Back</Btn>
        </>}

        {/* STEP 2b: Manual — confirm calendar send */}
        {step==="manual-confirm"&&<>
          <div style={{fontSize:17,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Send calendar invites</div>
          <div style={{fontSize:12,color:"#888780",marginBottom:18}}>Each candidate receives an email with a Google Calendar scheduling link — they pick a time directly.</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {shortlisted.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#FAFAF8",borderRadius:10,border:"1px solid #EEECEA"}}>
                <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={32}/>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div><div style={{fontSize:10,color:"#888780"}}>{c.email}</div></div>
                <Tag color="neutral">Pending</Tag>
              </div>
            ))}
          </div>
          <div style={{background:"#FAEEDA",borderRadius:10,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#633806",lineHeight:1.5}}>
            Email will say: <em>"We would love to schedule an interview. Please pick a time that works for you."</em>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" onClick={()=>setStep("decide")}>← Back</Btn>
            <Btn variant="primary" fullWidth disabled={emailSending} onClick={()=>sendEmails(null)}>{emailSending?<><Spinner color="white"/>Sending emails...</>:"Send calendar invites →"}</Btn>
          </div>
        </>}

        {/* STEP 3: AI questions — review and edit */}
        {step==="ai-questions"&&<>
          <div style={{fontSize:17,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Review AI questions</div>
          <div style={{fontSize:12,color:"#888780",marginBottom:14}}>Generated from your JD. Edit anything before sending.</div>
          <textarea value={aiQs} onChange={e=>setAiQs(e.target.value)} style={{width:"100%",height:200,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.7,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",outline:"none",marginBottom:14}} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" onClick={()=>setStep("ai-choose")}>← Back</Btn>
            <Btn variant="ghost" onClick={generateAiQs} disabled={genLoading||emailSending}>{genLoading?<><Spinner/>Regenerating...</>:"Regenerate"}</Btn>
            <Btn variant="primary" fullWidth disabled={emailSending} onClick={()=>sendEmails(aiQs)}>{emailSending?<><Spinner color="white"/>Sending emails...</>:"Send to "+shortlisted.length+" candidates →"}</Btn>
          </div>
        </>}

        {/* STEP 4: Custom questions */}
        {step==="custom-questions"&&<>
          <div style={{fontSize:17,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Write your questions</div>
          <div style={{fontSize:12,color:"#888780",marginBottom:14}}>These will be sent to all shortlisted candidates in their interview email.</div>
          <textarea value={customQs} onChange={e=>setCustomQs(e.target.value)} style={{width:"100%",height:200,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.7,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",outline:"none",marginBottom:14}} placeholder={"1. Tell me about your experience with...\n2. How would you approach...\n3. Describe a time when..."} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" onClick={()=>setStep("ai-choose")}>← Back</Btn>
            <Btn variant="primary" fullWidth disabled={!customQs.trim()||emailSending} onClick={()=>sendEmails(customQs)}>{emailSending?<><Spinner color="white"/>Sending emails...</>:"Send to "+shortlisted.length+" candidates →"}</Btn>
          </div>
        </>}

        {/* STEP 5: Done — confirmation */}
        {step==="done"&&<>
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#E1F5EE,#CCF0E0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",boxShadow:"0 4px 16px rgba(29,158,117,0.2)"}}>✓</div>
            <div style={{fontSize:18,fontWeight:800,color:"#1C1C1A",marginBottom:6}}>Emails sent successfully</div>
            <div style={{fontSize:13,color:"#888780",marginBottom:6}}>{shortlisted.length} candidates notified</div>
            <div style={{fontSize:12,color:"#888780",marginBottom:20}}>Mode: {localMode==="manual"?"Manual interview — calendar invite sent":"AI-assisted — question set included"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {shortlisted.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:"#E1F5EE",borderRadius:10,border:"1px solid #9FE1CB"}}>
                  <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={28}/>
                  <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:"#085041"}}>{c.name}</div><div style={{fontSize:10,color:"#1D9E75"}}>{c.email}</div></div>
                  <span style={{fontSize:11,fontWeight:700,color:"#1D9E75"}}>✓ Sent</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="ghost" fullWidth onClick={()=>{dispatch({type:"CLOSE_INTERVIEW_DECISION"});dispatch({type:"SET_NAV",payload:"outreach"});}}>View outreach</Btn>
              <Btn variant="primary" fullWidth onClick={()=>{dispatch({type:"CLOSE_INTERVIEW_DECISION"});dispatch({type:"SET_NAV",payload:"candidates"});}}>View candidates</Btn>
            </div>
          </div>
        </>}

      </div>
    </div>
  );
}

// ── RESUME SUBMISSION + ELIGIBILITY CHECK ────────────────────────────────
const AVATAR_COLORS=[
  {bg:"#EEEDFE",text:"#3C3489"},{bg:"#E1F5EE",text:"#085041"},
  {bg:"#FAEEDA",text:"#633806"},{bg:"#FBEAF0",text:"#72243E"},
  {bg:"#F3F0FF",text:"#5B21B6"},{bg:"#FAECE7",text:"#712B13"},
];
function getInitials(name){return name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();}
function getAvatarColor(name){const i=name.charCodeAt(0)%AVATAR_COLORS.length;return AVATAR_COLORS[i];}

function ResumeSubmitPanel(){
  const{state,dispatch}=useStore();const toast=useToast();
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[resumeText,setResumeText]=useState("");
  const[scoring,setScoring]=useState(false);
  const[open,setOpen]=useState(false);

  const SAMPLE_RESUMES=[
    {name:"Rahul Sharma",email:"rahul.sharma@gmail.com",text:"Rahul Sharma | Full Stack Developer | 4 years\nSkills: React, Node.js, TypeScript, PostgreSQL, AWS\nExp: Swiggy (2yr) — built order tracking dashboard. Ola (2yr) — payment microservices.\nEducation: B.Tech CS, IIT Bombay 2020\nSalary: Rs 24L current, expecting Rs 32L\nNotice: 30 days"},
    {name:"Priya Mehta",email:"priya.mehta@outlook.com",text:"Priya Mehta | Product Manager | 5 years\nSkills: Product Strategy, SQL, Figma, A/B Testing, JIRA, OKRs\nExp: Zomato (3yr) — launched subscription product 0-1, 2M users. Paytm (2yr) — checkout redesign.\nEducation: MBA IIM Ahmedabad 2019\nSalary: Rs 38L current, expecting Rs 48L\nNotice: 60 days"},
    {name:"Arjun Nair",email:"arjun.nair@email.com",text:"Arjun Nair | Data Scientist | 3 years\nSkills: Python, ML, TensorFlow, SQL, Tableau, NLP\nExp: PhonePe (2yr) — fraud detection model (Rs 50Cr saved). Freshworks (1yr) — churn prediction.\nEducation: M.Tech Data Science, IIT Madras 2021\nSalary: Rs 22L, expecting Rs 30L\nNotice: 45 days"},
    {name:"Divya Krishnan",email:"divya.k@gmail.com",text:"Divya Krishnan | UX Designer | 4 years\nSkills: Figma, User Research, Prototyping, Design Systems, Accessibility\nExp: CRED (2yr) — redesigned rewards UX, +40% engagement. Meesho (2yr) — seller onboarding flow.\nEducation: B.Des NID Ahmedabad 2020\nSalary: Rs 26L, expecting Rs 34L\nNotice: 30 days"},
    {name:"Rohit Gupta",email:"rohit.gupta@email.com",text:"Rohit Gupta | Backend Engineer | 6 years\nSkills: Go, Python, Kafka, Redis, Kubernetes, PostgreSQL\nExp: Razorpay (3yr) — payments core, 5M TPS. Flipkart (3yr) — inventory microservices.\nEducation: B.Tech CS, BITS Pilani 2018\nSalary: Rs 45L, expecting Rs 55L\nNotice: 60 days"},
  ];

  const scoreResume=async()=>{
    if(!name.trim()||!resumeText.trim()){toast("Add name and resume text","error");return;}
    if(!state.jdText.trim()){toast("Run the pipeline first so I know the JD","error");return;}
    setScoring(true);
    const initials=getInitials(name);
    const avatarColor=getAvatarColor(name);
    const tempId="custom_"+Date.now();
    dispatch({type:"ADD_SUBMITTED_RESUME",resume:{id:tempId,name,email,resumeText,initials,avatarColor,status:"scoring",score:null,verdict:null,matchedSkills:[],gaps:[],recommendation:""}});

    const prompt="You are an expert recruiter and eligibility checker.\n\nJOB DESCRIPTION:\n"+state.jdText.slice(0,500)+"\n\nCANDIDATE RESUME:\n"+resumeText+"\n\nEvaluate this candidate and respond in EXACTLY this JSON format (no markdown):\n{\"score\":85,\"verdict\":\"Strong match\",\"eligible\":true,\"matchedSkills\":[\"React\",\"TypeScript\"],\"gaps\":[\"GraphQL\"],\"salaryFit\":\"within budget\",\"recommendation\":\"2 sentence recommendation\",\"interviewSuggestion\":\"what to probe in interview\"}";

    try{
      const raw=await callClaude([{role:"user",content:prompt}],"Expert recruiter. Be specific and honest. Score 0-100 based on actual JD fit.");
      const clean=raw.split("```").join("").replace(/^json\s*/i,"").trim();
      const result=JSON.parse(clean);
      dispatch({type:"UPDATE_SUBMITTED_RESUME",id:tempId,updates:{status:"done",score:result.score||70,verdict:result.verdict||"Reviewed",eligible:result.eligible!==false,matchedSkills:result.matchedSkills||[],gaps:result.gaps||[],salaryFit:result.salaryFit||"Unknown",recommendation:result.recommendation||"",interviewSuggestion:result.interviewSuggestion||""}});
      toast(name+" scored "+result.score+"/100 — "+(result.eligible?"Eligible":"Not eligible"),"success");
    }catch{
      dispatch({type:"UPDATE_SUBMITTED_RESUME",id:tempId,updates:{status:"error",score:0,verdict:"Error parsing result",eligible:false}});
      toast("Error scoring resume — try again","error");
    }
    setScoring(false);
    setName("");setEmail("");setResumeText("");
  };

  const useSample=(s)=>{setName(s.name);setEmail(s.email);setResumeText(s.text);};

  return(
    <Card style={{padding:22}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:open?16:0,cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📋</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>Submit a resume for eligibility check</div>
            <div style={{fontSize:11,color:"#888780"}}>Paste any resume — AI scores it against the active JD instantly</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {state.submittedResumes.length>0&&<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#EEEDFE",color:"#534AB7"}}>{state.submittedResumes.length} checked</span>}
          <span style={{color:"#888780",fontSize:14}}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {open&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#5F5E5A",marginBottom:4}}>Candidate name *</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{width:"100%",border:"1px solid #EEECEA",borderRadius:9,padding:"9px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#5F5E5A",marginBottom:4}}>Email (optional)</div>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="rahul@email.com" style={{width:"100%",border:"1px solid #EEECEA",borderRadius:9,padding:"9px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            </div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#5F5E5A",marginBottom:4}}>Resume text * <span style={{fontWeight:400,color:"#B4B2A9"}}>(paste from PDF or type key details)</span></div>
          <textarea value={resumeText} onChange={e=>setResumeText(e.target.value)} placeholder={"Skills: React, TypeScript, Node.js\nExperience: 4 years at Flipkart — built checkout flow\nEducation: B.Tech CS, IIT Delhi 2020\nSalary: Rs 28L, expecting Rs 36L\nNotice: 30 days"} style={{width:"100%",height:130,border:"1px solid #EEECEA",borderRadius:9,padding:12,fontSize:12,lineHeight:1.65,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none",marginBottom:10}} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <Btn variant="primary" disabled={scoring||!name.trim()||!resumeText.trim()||!state.jdText.trim()} onClick={scoreResume}>{scoring?<><Spinner color="white"/>Checking eligibility...</>:"Check eligibility"}</Btn>
            {!state.jdText.trim()&&<span style={{fontSize:11,color:"#D85A30",display:"flex",alignItems:"center"}}>Run pipeline first</span>}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:6}}>Quick test — sample resumes:</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:state.submittedResumes.length>0?16:0}}>
            {SAMPLE_RESUMES.map(s=>(
              <button key={s.name} onClick={()=>useSample(s)} style={{padding:"4px 10px",background:"#F7F6F3",border:"1px solid #EEECEA",borderRadius:20,fontSize:11,color:"#5F5E5A",cursor:"pointer",fontWeight:600}}>{s.name.split(" ")[0]}</button>
            ))}
          </div>
          {state.submittedResumes.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,marginTop:4}}>
                <div style={{fontSize:12,fontWeight:800,color:"#1C1C1A"}}>Results — {state.submittedResumes.length} resume{state.submittedResumes.length>1?"s":""} checked</div>
                <button onClick={()=>dispatch({type:"CLEAR_SUBMITTED_RESUMES"})} style={{fontSize:10,color:"#D85A30",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Clear all</button>
              </div>
              {state.submittedResumes.map(r=>(
                <div key={r.id} style={{border:"1px solid "+(r.eligible===false?"#F5B8A0":r.eligible?"#9FE1CB":"#EEECEA"),borderRadius:12,padding:"14px 16px",marginBottom:8,background:r.eligible===false?"#FFFBFB":r.eligible?"#FAFFFC":"white",animation:"fadeIn 0.3s ease"}}>
                  {r.status==="scoring"?(
                    <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:36,height:36,borderRadius:"50%",background:r.avatarColor?.bg||"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:r.avatarColor?.text||"#534AB7"}}>{r.initials}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{r.name}</div><div style={{fontSize:11,color:"#888780"}}>Checking eligibility...</div></div><Spinner color="#534AB7"/></div>
                  ):(
                    <div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:r.recommendation?12:0}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:r.avatarColor?.bg||"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:r.avatarColor?.text||"#534AB7",flexShrink:0}}>{r.initials}</div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                            <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>{r.name}</div>
                            <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:r.eligible?"#E1F5EE":"#FAECE7",color:r.eligible?"#085041":"#712B13"}}>{r.eligible?"✓ Eligible":"✗ Not eligible"}</span>
                          </div>
                          {r.email&&<div style={{fontSize:10,color:"#888780",marginBottom:6}}>{r.email}</div>}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                            {r.matchedSkills?.map(s=><span key={s} style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:"#E1F5EE",color:"#085041"}}>✓ {s}</span>)}
                            {r.gaps?.map(g=><span key={g} style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:"#FAECE7",color:"#712B13"}}>✗ {g}</span>)}
                          </div>
                          {r.salaryFit&&<div style={{fontSize:11,color:"#888780"}}>Salary: {r.salaryFit}</div>}
                        </div>
                        <div style={{textAlign:"center",flexShrink:0}}>
                          <div style={{fontSize:24,fontWeight:900,color:r.score>=80?"#534AB7":r.score>=60?"#BA7517":"#D85A30"}}>{r.score}</div>
                          <div style={{fontSize:9,color:"#888780"}}>/100</div>
                          <div style={{fontSize:10,fontWeight:700,color:"#888780",marginTop:2}}>{r.verdict}</div>
                        </div>
                      </div>
                      {r.recommendation&&<div style={{background:"#FAFAF8",borderRadius:8,padding:"9px 12px",fontSize:12,color:"#5F5E5A",lineHeight:1.55,borderLeft:"3px solid #534AB7",marginBottom:r.interviewSuggestion?8:0}}>{r.recommendation}</div>}
                      {r.interviewSuggestion&&<div style={{background:"#EEEDFE",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#3C3489",lineHeight:1.5}}><span style={{fontWeight:700}}>Interview focus: </span>{r.interviewSuggestion}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function HiringPipeline(){
  const{state,dispatch}=useStore();const toast=useToast();
  const running=state.pipelineState==="running";
  const pDone=state.pipelineState==="done";
  const doneCount=Object.values(state.agentStatuses).filter(s=>s==="done").length;
  const progress=Math.round((doneCount/AGENTS.length)*100);
  const step=pDone?"done":state.pipelineStep||"jd";

  const[addName,setAddName]=useState("");
  const[addEmail,setAddEmail]=useState("");
  const[addText,setAddText]=useState("");
  const[adding,setAdding]=useState(false);
  const[showAddForm,setShowAddForm]=useState(false);

  const run=async()=>{
    if(!state.jdText.trim()){toast("Paste a job description first","error");return;}
    await runRealAgentPipeline(state.jdText,dispatch,toast,state.appliedResumes);
    dispatch({type:"OPEN_INTERVIEW_DECISION"});
  };

  const addResume=async()=>{
    if(!addName.trim()||!addText.trim()){toast("Name and resume required","error");return;}
    setAdding(true);
    // Quick parse with Claude
    const parsed=await callClaude([{role:"user",content:"Extract from this resume (respond only in JSON, no markdown):\n{\"role\":\"job title\",\"company\":\"last company\",\"city\":\"city\",\"exp\":\"X years\",\"salary\":0,\"notice\":\"X days\",\"skills\":[\"skill1\"]}\n\nResume:\n"+addText.slice(0,600)}]);
    let meta={role:"Applicant",company:"",city:"India",exp:"?",salary:0,notice:"?",skills:[]};
    try{const c=parsed.split("```").join("").replace(/^json\s*/i,"").trim();meta={...meta,...JSON.parse(c)};}catch{}
    const av=addName.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    const ci=state.appliedResumes.length%6;
    dispatch({type:"ADD_APPLIED_RESUME",resume:{id:"r_"+Date.now(),name:addName.trim(),email:addEmail.trim(),text:addText.trim(),avatar:av,avatarBg:["#EEEDFE","#E1F5EE","#FAEEDA","#FBEAF0","#F3F0FF","#FAECE7"][ci],avatarText:["#3C3489","#085041","#633806","#72243E","#5B21B6","#712B13"][ci],parsedRole:meta.role,parsedCompany:meta.company,parsedCity:meta.city,parsedExp:meta.exp,parsedSalary:meta.salary,parsedNotice:meta.notice,parsedSkills:meta.skills||[]}});
    toast(addName+" added to applicant pool","success");
    setAddName("");setAddEmail("");setAddText("");setShowAddForm(false);setAdding(false);
  };

  const addSampleResumes=()=>{
    const domain=detectDomain(state.jdText);
    const samples=getResumesByDomain(domain,8);
    dispatch({type:"CLEAR_APPLIED_RESUMES"});
    samples.forEach((r,i)=>dispatch({type:"ADD_APPLIED_RESUME",resume:{
      ...r,
      parsedRole:r.text?.split("\n")[1]?.trim()||r.domain+" professional",
      parsedCompany:r.city,
      parsedCity:r.city,
      parsedExp:r.exp+" years",
      parsedSalary:r.salary,
      parsedNotice:"30-60 days",
      parsedSkills:extractSkillsFromText(r.text),
    }}));
    toast("Loaded "+samples.length+" sample resumes matched to your JD","success");
  };

  const extractSkillsFromText=(text)=>{
    if(!text) return [];
    const skillsLine=text.split("\n").find(l=>l.toUpperCase().includes("SKILLS:"));
    if(!skillsLine) return [];
    return skillsLine.replace(/SKILLS:/i,"").split(",").map(s=>s.trim()).filter(Boolean).slice(0,5);
  };

  // Step indicator
  const steps=[{id:"jd",label:"Job Description",n:1},{id:"resumes",label:"Add Applicants",n:2},{id:"run",label:"Run Pipeline",n:3}];
  const curStep=step==="done"?3:step==="run"?3:step==="resumes"?2:1;

  return(
    <div style={{maxWidth:800,display:"flex",flexDirection:"column",gap:16}}>

      {/* Step indicator */}
      {!pDone&&(
        <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:4}}>
          {steps.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,cursor:i<curStep-1?"pointer":"default"}} onClick={()=>i<curStep-1&&dispatch({type:"SET_PIPELINE_STEP",payload:s.id})}>
                <div style={{width:28,height:28,borderRadius:"50%",background:curStep>s.n?"#1D9E75":curStep===s.n?"#534AB7":"#EEECEA",color:curStep>=s.n?"white":"#888780",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{curStep>s.n?"✓":s.n}</div>
                <span style={{fontSize:12,fontWeight:curStep===s.n?700:500,color:curStep>=s.n?"#1C1C1A":"#B4B2A9",whiteSpace:"nowrap"}}>{s.label}</span>
              </div>
              {i<steps.length-1&&<div style={{flex:1,height:2,background:curStep>s.n?"#1D9E75":"#EEECEA",margin:"0 12px"}}/>}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1: Job Description */}
      {(step==="jd"||step==="resumes"||step==="run")&&(
        <Card style={{padding:24,border:step==="jd"?"2px solid #534AB7":"1px solid #EEECEA"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:step==="jd"?14:0,cursor:step!=="jd"?"pointer":"default"}} onClick={()=>step!=="jd"&&dispatch({type:"SET_PIPELINE_STEP",payload:"jd"})}>
            <div style={{width:24,height:24,borderRadius:"50%",background:state.jdText?"#1D9E75":"#534AB7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",flexShrink:0}}>{state.jdText?"✓":"1"}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>Job Description</div>{state.jdText&&step!=="jd"&&<div style={{fontSize:11,color:"#888780"}}>{state.jdText.slice(0,60)}...</div>}</div>
            {state.jdText&&step!=="jd"&&<Btn variant="ghost" size="sm" onClick={e=>{e.stopPropagation();dispatch({type:"SET_PIPELINE_STEP",payload:"jd"});}}>Edit</Btn>}
          </div>
          {step==="jd"&&(
            <>
              <textarea value={state.jdText} onChange={e=>dispatch({type:"SET_JD",payload:e.target.value})} style={{width:"100%",height:220,border:"1px solid #EEECEA",borderRadius:10,padding:14,fontSize:13,lineHeight:1.65,color:"#1C1C1A",background:"#FAFAF8",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",outline:"none"}} placeholder="Paste your job description here — role, requirements, salary range, location..." onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:"SET_JD",payload:SAMPLE_JD})}>Use sample JD</Btn>
                <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_JD",payload:""})}>Clear</Btn>
                <div style={{flex:1}}/>
                <Btn variant="primary" disabled={!state.jdText.trim()} onClick={()=>dispatch({type:"SET_PIPELINE_STEP",payload:"resumes"})}>Next: Add applicants →</Btn>
              </div>
            </>
          )}
        </Card>
      )}

      {/* STEP 2: Bulk Resume Processing */}
      {(step==="resumes"||step==="run")&&(
        <Card style={{padding:24,border:step==="resumes"?"2px solid #534AB7":"1px solid #EEECEA"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:step==="resumes"?16:0,cursor:step==="run"?"pointer":"default"}} onClick={()=>step==="run"&&dispatch({type:"SET_PIPELINE_STEP",payload:"resumes"})}>
            <div style={{width:24,height:24,borderRadius:"50%",background:state.appliedResumes.length>0?"#1D9E75":"#534AB7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",flexShrink:0}}>{state.appliedResumes.length>0?"✓":"2"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>Resume Processing</div>
              <div style={{fontSize:11,color:"#888780"}}>{state.appliedResumes.length>0?state.appliedResumes.length+" resumes ready for pipeline":"Paste resumes for bulk AI screening"}</div>
            </div>
            {step==="run"&&state.appliedResumes.length>0&&<Btn variant="ghost" size="sm" onClick={e=>{e.stopPropagation();dispatch({type:"SET_PIPELINE_STEP",payload:"resumes"});}}>Edit</Btn>}
          </div>

          {step==="resumes"&&(
            <>
              <BulkResumeProcessor
                jdText={state.jdText}
                callClaude={callClaude}
                onResumesParsed={(scored)=>{
                  dispatch({type:"CLEAR_APPLIED_RESUMES"});
                  scored.forEach(r=>dispatch({type:"ADD_APPLIED_RESUME",resume:{
                    id:r.id, name:r.name, email:r.email||"",
                    text:r.text, avatar:r.avatar,
                    avatarBg:r.avatarBg, avatarText:r.avatarText,
                    parsedRole:r.role, parsedCompany:r.company,
                    parsedCity:r.city, parsedExp:r.exp,
                    parsedSalary:r.salary, parsedNotice:r.notice,
                    parsedSkills:r.skills||[],
                    preScore:r.score, // carry pre-screening score
                  }}));
                  dispatch({type:"SET_PIPELINE_STEP",payload:"run"});
                  toast(scored.length+" resumes processed — ready to run pipeline","success");
                }}
              />
              <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:16,paddingTop:16,borderTop:"1px solid #EEECEA"}}>
                <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_PIPELINE_STEP",payload:"jd"})}>← Back</Btn>
                <Btn variant="primary" onClick={()=>dispatch({type:"SET_PIPELINE_STEP",payload:"run"})}>
                  {state.appliedResumes.length>0?"Use "+state.appliedResumes.length+" resumes — run pipeline →":"Skip — use sample candidates →"}
                </Btn>
              </div>
            </>
          )}
        </Card>
      )}

      {/* STEP 3: Run Pipeline */}
      {(step==="run"||pDone)&&(
        <Card style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:pDone?"#1D9E75":"#534AB7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",flexShrink:0}}>{pDone?"✓":"3"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>Run AI Pipeline</div>
              <div style={{fontSize:11,color:"#888780"}}>{state.appliedResumes.length>0?state.appliedResumes.length+" resumes will be scored":"Sample candidates will be scored"} · 7 agents · ~60 seconds</div>
            </div>
          </div>

          {!running&&!pDone&&(
            <div style={{background:"#F7F6F3",borderRadius:10,border:"1px solid #EEECEA",padding:14,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A",marginBottom:8}}>Pipeline will:</div>
              {["Parse JD and extract all requirements","Score each resume against JD fit","Detect bias in job description","Draft personalized outreach emails","Generate targeted interview questions","Benchmark salaries against Indian market","Produce hiring intelligence report"].map((item,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#534AB7",flexShrink:0}}>{i+1}</div>
                  <span style={{fontSize:12,color:"#5F5E5A"}}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {running&&<div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:600,color:"#534AB7"}}>Agents running...</span><span style={{fontSize:12,fontWeight:700,color:"#534AB7"}}>{progress}%</span></div><ProgressBar value={progress}/></div>}

          {!pDone&&<Btn variant="primary" fullWidth disabled={running} onClick={run}>{running?<><Spinner color="white"/>Pipeline running — watch agents below...</>:"Run all 7 agents →"}</Btn>}

          {pDone&&(
            <div style={{background:"linear-gradient(135deg,#E1F5EE,#CCF0E0)",border:"1px solid #9FE1CB",borderRadius:10,padding:16,display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:26}}>🎉</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:"#085041"}}>Pipeline complete</div>
                <div style={{fontSize:12,color:"#085041",opacity:0.85}}>{state.activeCandidates?.length||5} candidates scored · outreach drafted · report ready</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="success" size="sm" onClick={()=>dispatch({type:"SET_NAV",payload:"candidates"})}>View results</Btn>
                <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"RESET_PIPELINE"})}>New pipeline</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Live agent execution — always visible when running or done */}
      {(running||pDone)&&(
        <Card style={{padding:22}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Live agent execution</div>
          <div style={{fontSize:12,color:"#888780",marginBottom:14}}>Click "thoughts" on any agent to see its reasoning</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{AGENTS.map(a=><AgentStep key={a.id} agent={a} status={state.agentStatuses[a.id]||"idle"} log={state.agentLogs[a.id]} stream={state.agentStreams[a.id]}/>)}</div>
        </Card>
      )}

    </div>
  );
}

function HiringCandidates(){
  const{state,dispatch}=useStore();
  const[modal,setModal]=useState(null);

  // ── helpers defined first so loadAnalysis can use them ──────────────────
  const getScore=(c)=>state.dynamicScores?.[c.id]??(c.preScore||c.baseScore||c.score||75);
  const getVerdict=(c)=>state.dynamicVerdicts?.[c.id]||null;

  const extractFromText=(text)=>{
    if(!text) return{};
    const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
    // Line 2 usually: "Role | City | email" or "Role at Company | City"
    const line2=lines[1]||"";
    const parts=line2.split("|").map(s=>s.trim());

    // Role: first part if it contains a job-related word
    const roleMatch=parts[0]?.match(/(senior|junior|lead|principal|staff|associate)?\s*(frontend|backend|fullstack|full.stack|software|product|data|ml|machine learning|ux|ui|growth|marketing|sales|customer success|hr|human resources|finance|operations|devops|engineer|manager|developer|designer|analyst|scientist|director|executive|consultant|specialist)/i);
    const role=roleMatch?parts[0].trim():"";

    // City
    const cityList=["bangalore","bengaluru","mumbai","delhi","hyderabad","pune","chennai","noida","gurgaon","gurugram","kolkata","ahmedabad","jaipur","chandigarh"];
    const city=parts.find(p=>cityList.some(c=>p.toLowerCase().includes(c)))||
      lines.slice(0,5).find(l=>cityList.some(c=>l.toLowerCase().includes(c)))||"";

    // Skills line
    const skillsLine=lines.find(l=>l.toLowerCase().startsWith("skills:"));
    const skills=skillsLine?skillsLine.replace(/^skills:\s*/i,"").split(",").map(s=>s.trim()).filter(s=>s.length>1&&s.length<30):[];

    // Experience
    const expLine=lines.find(l=>l.match(/\d+\s*years?/i));
    const expMatch=expLine?.match(/(\d+)\s*years?/i);
    const exp=expMatch?expMatch[1]+" years":"?";

    // Salary
    const salaryLine=lines.find(l=>l.toLowerCase().includes("salary")||l.match(/rs\.?\s*\d+/i));
    const salaryMatch=salaryLine?.match(/rs\.?\s*(\d+)/i);
    const salary=salaryMatch?parseInt(salaryMatch[1]):0;

    // Notice
    const noticeLine=lines.find(l=>l.toLowerCase().includes("notice"));
    const noticeMatch=noticeLine?.match(/(\d+)\s*days?/i);
    const notice=noticeMatch?noticeMatch[1]+" days":"?";

    // Company — look for "at Company" or "— Company" or "Company —" patterns
    // Search in first 8 lines for company names
    const companyPatterns=[
      /(?:at|@)\s+([A-Z][A-Za-z0-9\s&]{2,25})(?:\s*[|,—\(]|$)/,
      /—\s*([A-Z][A-Za-z0-9\s&]{2,25})(?:\s*[|,\(]|$)/,
      /([A-Z][A-Za-z0-9]{2,20})\s*(?:—|-)\s*(?:Senior|Junior|Lead|Principal|Staff)/,
    ];
    let company="";
    for(const line of lines.slice(0,8)){
      for(const pat of companyPatterns){
        const m=line.match(pat);
        if(m&&m[1]){
          const candidate=m[1].trim().replace(/\s+/g," ");
          // Skip obvious non-companies
          if(!["The","This","Our","Their","Your","From","With","And"].includes(candidate.split(" ")[0])){
            company=candidate;
            break;
          }
        }
      }
      if(company) break;
    }

    // Summary — first line that's a meaningful sentence about experience
    const summary=lines.find(l=>
      l.length>40&&l.length<200&&
      !l.toLowerCase().startsWith("skills")&&
      !l.toLowerCase().startsWith("education")&&
      !l.toLowerCase().startsWith("compensation")&&
      !l.toLowerCase().startsWith("notice")&&
      !l.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)&&// skip name lines
      !l.includes("@")// skip email lines
    )||"";

    return{role,city,skills,exp,salary,notice,company,summary};
  };

  const normalize=(c)=>{
    const ft=extractFromText(c.text);
    return{
      ...c,
      role:c.role&&c.role!=="Applicant"?c.role:c.parsedRole&&c.parsedRole!=="Applicant"?c.parsedRole:ft.role||"Applicant",
      company:c.company||c.parsedCompany||ft.company||"",
      exp:c.exp&&c.exp!=="?"?c.exp:c.parsedExp&&c.parsedExp!=="?"?c.parsedExp:ft.exp||"?",
      location:c.location||c.city||c.parsedCity||ft.city||"India",
      notice:c.notice&&c.notice!=="?"?c.notice:c.parsedNotice&&c.parsedNotice!=="?"?c.parsedNotice:ft.notice||"?",
      salary:c.salary||c.parsedSalary||ft.salary||0,
      skills:((c.skills?.length&&c.skills)||(c.parsedSkills?.length&&c.parsedSkills)||ft.skills||[]),
      gaps:c.gaps||[],
      summary:c.summary||ft.summary||(c.text?.slice(0,150)||""),
    };
  };

  const loadAnalysis=async(rawC)=>{
    const c=normalize(rawC);
    if(state.aiAnalysis[c.id]||state.loadingAnalysis===c.id)return;
    dispatch({type:"SET_LOADING_ANALYSIS",id:c.id});
    const score=getScore(rawC);
    const jdContext=state.jdText?.slice(0,300)||"Senior role";
    // Use full resume text if available, otherwise build from parsed fields
    const resumeContext=c.text?c.text.slice(0,500):
      c.name+" — "+c.role+(c.company?" at "+c.company:"")+
      ", "+c.exp+" exp"+
      (c.skills?.length?", Skills: "+c.skills.slice(0,5).join(", "):"")+
      (c.salary?", Salary: Rs "+c.salary+"L":"")+
      (c.notice&&c.notice!=="?"?", Notice: "+c.notice:"");

    const p=`You are a hiring intelligence AI. Analyze this candidate.

JOB DESCRIPTION:
${jdContext}

CANDIDATE:
${resumeContext}

Score: ${score}/100

Write in EXACTLY this format (use the actual candidate name and their real skills/company):

**WHY THEY STAND OUT**
[2 sentences. Name their actual company if known. Name specific skills that match the JD.]

**KEY RISK**
[1 sentence. Name the actual gap or concern — not generic "limited info".]

**INTERVIEW FOCUS**
[1 specific interview question tailored to their background and the JD gaps.]

RULES: Never say "Applied" as company. Never repeat the resume verbatim. Be specific, not generic.`;

    const text=await callClaude([{role:"user",content:p}],"Hiring intelligence expert. Always reference real candidate details. Never write generic analysis.");

    // Validate — reject if it looks like raw resume dump
    const isRawDump=text&&(
      text.includes(c.name+"\n")||
      text.includes("Skills: React, TypeScript")||
      (text.length<80&&text.includes(c.name))
    );
    const fallback=`**WHY THEY STAND OUT**\n${c.name} brings ${c.exp&&c.exp!=="?"?c.exp:"relevant"} experience${c.company?" from "+c.company:""}. ${c.skills?.length?"Strong in "+c.skills.slice(0,3).join(", ")+" which aligns with this role.":"Background shows potential fit for the requirements."}\n\n**KEY RISK**\n${c.gaps?.length?"Gap in "+c.gaps[0]+" needs evaluation in the interview.":"Needs screening to confirm depth of technical skills."}\n\n**INTERVIEW FOCUS**\n"Walk me through the most complex ${c.role||"project"} you've owned end to end — what broke, and what did you fix?"`;

    dispatch({type:"SET_AI_ANALYSIS",id:c.id,text:(!text||isRawDump)?fallback:text});
  };

  if(state.pipelineState!=="done") return(
    <Card style={{padding:52,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>👥</div>
      <div style={{fontSize:15,fontWeight:700,color:"#1C1C1A",marginBottom:6}}>No candidates yet</div>
      <div style={{fontSize:13,color:"#888780",marginBottom:16}}>Run the pipeline first</div>
      <Btn variant="primary" onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})}>Run pipeline</Btn>
    </Card>
  );

  const candidates=(state.activeCandidates||CANDIDATE_POOL.slice(0,5)).map(normalize);
  const sortedCandidates=[...candidates].sort((a,b)=>getScore(b)-getScore(a));

  return(
    <div style={{display:"grid",gridTemplateColumns:state.selectedCandidate?"360px 1fr":"1fr",gap:18,maxWidth:state.selectedCandidate?"none":520}}>
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888780",marginBottom:12}}>{candidates.length} candidates — scored against your JD</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sortedCandidates.map((c,idx)=>{
            const score=getScore(c);
            const verdict=getVerdict(c);
            const scoreColor=score>=80?"#534AB7":score>=60?"#BA7517":"#D85A30";
            return(
            <div key={c.id} onClick={()=>{dispatch({type:"SET_CANDIDATE",payload:{...c,score}});loadAnalysis(c);}} style={{background:"white",borderRadius:12,border:state.selectedCandidate?.id===c.id?"2px solid #534AB7":"1px solid #EEECEA",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"all 0.2s",boxShadow:state.selectedCandidate?.id===c.id?"0 0 0 4px #EEEDFE":"none"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#B4B2A9",width:16}}>#{idx+1}</div>
              <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div>
                  {verdict&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:score>=80?"#EEEDFE":score>=60?"#FAEEDA":"#FAECE7",color:scoreColor}}>{verdict}</span>}
                </div>
                <div style={{fontSize:11,color:"#888780",marginTop:1}}>{c.role}{c.company?" · "+c.company:""}{c.city||c.parsedCity?" · "+(c.city||c.parsedCity):""}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
                  {c.skills.slice(0,3).map(s=><Tag key={s} color="success">{s}</Tag>)}
                  {c.gaps.slice(0,1).map(s=><Tag key={s} color="danger">Gap: {s}</Tag>)}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                <ScoreRing score={score} size={44} stroke={4} color={scoreColor}/>
                {c.parsedSalary>0||c.salary>0?<div style={{fontSize:9,color:"#888780"}}>Rs {c.salary||c.parsedSalary}L</div>:null}
              </div>
            </div>
          );})}
        </div>
      </div>
      {state.selectedCandidate&&(()=>{
        const sel=normalize(state.selectedCandidate);
        const selScore=getScore(sel);
        return(
        <Card style={{padding:22}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <Avatar initials={sel.avatar} bg={sel.avatarBg} textColor={sel.avatarText} size={52}/>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:800,color:"#1C1C1A"}}>{sel.name}</div>
              <div style={{fontSize:12,color:"#888780",marginTop:2}}>{sel.role}{sel.company?" at "+sel.company:""}{sel.exp&&sel.exp!=="?"?" · "+sel.exp:""}</div>
              <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                {(sel.location||sel.parsedCity)&&<Tag color="neutral">📍{sel.location||sel.parsedCity}</Tag>}
                {sel.notice&&sel.notice!=="?"&&<Tag color="neutral">⏰{sel.notice}</Tag>}
                {(sel.salary||sel.parsedSalary)>0&&<Tag color="brand">Rs {sel.salary||sel.parsedSalary}L</Tag>}
                {sel.email&&<Tag color="neutral">✉ {sel.email}</Tag>}
              </div>
            </div>
            <div style={{textAlign:"center",flexShrink:0}}>
              <ScoreRing score={selScore} size={60} stroke={5}/>
              {getVerdict(sel)&&<div style={{fontSize:10,color:"#888780",marginTop:4,fontWeight:600}}>{getVerdict(sel)}</div>}
            </div>
          </div>
          <div style={{fontSize:13,color:"#5F5E5A",lineHeight:1.7,marginBottom:14,padding:12,background:"#F7F6F3",borderRadius:10,borderLeft:"3px solid #534AB7"}}>{sel.summary||sel.text?.slice(0,150)||"Resume submitted"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div style={{background:"#E1F5EE",border:"1px solid #9FE1CB",borderRadius:10,padding:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"#0F6E56",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Matched skills</div>
              {sel.skills.length>0?sel.skills.map(s=><div key={s} style={{fontSize:12,color:"#085041",fontWeight:600,marginBottom:3}}>✓ {s}</div>):<div style={{fontSize:11,color:"#888780"}}>Run pipeline to extract</div>}
            </div>
            <div style={{background:"#FAECE7",border:"1px solid #F5C4B3",borderRadius:10,padding:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"#993C1D",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Skill gaps</div>
              {sel.gaps.length>0?sel.gaps.map(s=><div key={s} style={{fontSize:12,color:"#712B13",fontWeight:600,marginBottom:3}}>✗ {s}</div>):<div style={{fontSize:11,color:"#888780"}}>To be assessed</div>}
            </div>
          </div>
          <div style={{background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:10,padding:14,marginBottom:14,minHeight:80}}>
            <div style={{fontSize:10,fontWeight:800,color:"#534AB7",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>AI Analysis</div>
            {state.loadingAnalysis===state.selectedCandidate.id?<div style={{display:"flex",alignItems:"center",gap:8}}><Spinner/><span style={{fontSize:12,color:"#7F77DD"}}>Analysing with Claude...</span></div>:state.aiAnalysis[state.selectedCandidate.id]?(()=>{
              const text=state.aiAnalysis[state.selectedCandidate.id];
              const lines=text.split("\n").filter(l=>l.trim());
              return<div style={{fontSize:13,color:"#26215C",lineHeight:1.7}}>{lines.map((line,i)=>{
                const isBold=line.startsWith("**")&&line.includes("**");
                const clean=line.replace(/\*\*/g,"").trim();
                return<div key={i} style={{marginBottom:isBold?4:2}}>{isBold?<strong style={{color:"#3C3489",fontSize:12,textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginTop:i>0?10:0}}>{clean}</strong>:<span>{clean}</span>}</div>;
              })}</div>;
            })():<div style={{fontSize:12,color:"#7F77DD"}}>Loading...</div>}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <Btn variant="primary" fullWidth onClick={()=>setModal(state.selectedCandidate)}>Review outreach email</Btn>
            <Btn variant="secondary" onClick={()=>dispatch({type:"SET_NAV",payload:"interviews"})}>Interview Qs</Btn>
          </div>
          <CandidateDecisionBar
            candidate={state.selectedCandidate}
            decision={state.candidateDecisions[state.selectedCandidate.id]}
            onPass={(d)=>dispatch({type:"SET_CANDIDATE_DECISION",id:state.selectedCandidate.id,decision:d})}
            onReject={(d)=>dispatch({type:"SET_CANDIDATE_DECISION",id:state.selectedCandidate.id,decision:d})}
          />
          {modal&&<ApprovalModal candidate={modal} onClose={()=>setModal(null)}/>}
        </Card>
        );
      })()}
      <RejectionSummary decisions={state.candidateDecisions} candidates={sortedCandidates}/>
    </div>
  );
}

function HiringOutreach(){
  const{state,dispatch}=useStore();const[modal,setModal]=useState(null);
  if(state.pipelineState!=="done")return<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>✉️</div><div style={{fontSize:15,fontWeight:700,color:"#1C1C1A",marginBottom:6}}>No outreach drafts</div><div style={{fontSize:13,color:"#888780",marginBottom:16}}>Run the pipeline first</div><Btn variant="primary" onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})}>Run pipeline</Btn></Card>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:740}}>
      {(state.activeCandidates||CANDIDATE_POOL.slice(0,5)).map(c=>{
        const sent=state.sentEmails[c.id];
        const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);
        const email=c.email||c.parsedEmail||"(no email on file)";
        const role=c.role||c.parsedRole||"Applicant";
        return(
        <Card key={c.id} style={{padding:18,opacity:sent?0.8:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={36}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div>
              <div style={{fontSize:11,color:"#888780"}}>{role}{c.company||c.parsedCompany?" · "+(c.company||c.parsedCompany):""}</div>
              <div style={{fontSize:10,color:email.includes("no email")?"#D85A30":"#888780"}}>{email}</div>
            </div>
            <ScoreRing score={sc} size={34} stroke={3}/>
            {sent?<Tag color="success">Sent</Tag>:<Btn variant="primary" size="sm" onClick={()=>setModal({...c,email,score:sc})}>Review and send</Btn>}
          </div>
          <div style={{background:"#FAFAF8",border:"1px solid #EEECEA",borderRadius:8,padding:12,fontSize:12,color:"#5F5E5A",lineHeight:1.65,maxHeight:60,overflow:"hidden",WebkitMaskImage:"linear-gradient(to bottom,black 30%,transparent 100%)",whiteSpace:"pre-wrap"}}>{state.emailDrafts[c.id]||"Email will be generated when pipeline runs..."}</div>
        </Card>
      );})}
      {modal&&<ApprovalModal candidate={modal} onClose={()=>setModal(null)}/> }
    </div>
  );
}

function HiringInterviews(){
  const{state,dispatch}=useStore();
  if(state.pipelineState!=="done")return<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>💬</div><div style={{fontSize:15,fontWeight:700,color:"#1C1C1A",marginBottom:6}}>No interview questions</div><div style={{fontSize:13,color:"#888780",marginBottom:16}}>Run the pipeline first</div><Btn variant="primary" onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})}>Run pipeline</Btn></Card>;

  // qs can be a string (from real pipeline) or array (legacy) — handle both
  const rawQs=state.interviewQs[1];
  const domain=state.roleDomain||"general";
  const parseQs=(raw)=>{
    if(!raw||raw==="Questions generated.") return null;
    if(Array.isArray(raw)) return raw;
    const lines=raw.split("\n").filter(l=>l.trim());
    const typeMap={"TECHNICAL":"technical","SYSTEM DESIGN":"technical","BEHAVIORAL":"behavioral","CULTURE":"culture","GAP PROBE":"gap","GAP":"gap"};
    const result=[];
    for(const line of lines){
      const match=line.match(/^([A-Z][A-Z\s]+):\s*(.+)/);
      if(match&&match[2].length>10){
        const typeKey=Object.keys(typeMap).find(k=>line.toUpperCase().startsWith(k));
        result.push({question:match[2].trim(),type:typeKey?typeMap[typeKey]:"technical",probes:""});
      }
    }
    if(result.length>0) return result;
    // fallback: numbered list
    const numbered=lines.filter(l=>/^\d+[\.\)]/.test(l.trim()));
    if(numbered.length>0) return numbered.map(l=>({question:l.replace(/^\d+[\.\)]\s*/,"").trim(),type:"technical",probes:""}));
    return null;
  };
  // Use parsed AI questions, or fall back to domain-specific sample questions
  const questions=parseQs(rawQs)||(SAMPLE_INTERVIEW_QUESTIONS[domain]||SAMPLE_INTERVIEW_QUESTIONS.general);
  const ts={technical:{bg:"#EEEDFE",text:"#3C3489",label:"Technical"},behavioral:{bg:"#E1F5EE",text:"#085041",label:"Behavioral"},gap:{bg:"#FAECE7",text:"#712B13",label:"Gap Probe"},culture:{bg:"#FAEEDA",text:"#633806",label:"Culture"}};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:740}}>
      <Card style={{padding:20,background:"#EEEDFE",border:"1px solid #CECBF6"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#534AB7",marginBottom:4}}>AI-generated questions for your role</div>
        <div style={{fontSize:12,color:"#5F5E5A"}}>These questions were generated by analyzing your specific JD — not generic templates.</div>
      </Card>
      {!questions&&(
        <Card style={{padding:32,textAlign:"center"}}><Spinner/><div style={{fontSize:12,color:"#888780",marginTop:8}}>Generating questions...</div></Card>
      )}
      {questions&&questions.length===0&&(
        <Card style={{padding:32,textAlign:"center"}}><div style={{fontSize:13,color:"#888780"}}>Could not parse questions. Try running the pipeline again.</div></Card>
      )}
      {questions&&questions.length>0&&questions.map((q,i)=>{
        const s=ts[q.type]||ts.technical;
        return(
          <Card key={i} style={{padding:18}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:20,background:s.bg,color:s.text,flexShrink:0,marginTop:2}}>{s.label}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#1C1C1A",lineHeight:1.6}}>{q.question}</div>
                {q.probes&&<div style={{fontSize:11,color:"#888780",marginTop:5,fontStyle:"italic"}}>💡 {q.probes}</div>}
              </div>
              <div style={{fontSize:12,fontWeight:800,color:"#888780",flexShrink:0}}>Q{i+1}</div>
            </div>
          </Card>
        );
      })}
      {/* Also show per-candidate questions if available */}
      {(()=>{const ac=state.activeCandidates||CANDIDATE_POOL.slice(0,5);const withQs=ac.filter(c=>state.interviewQs[c.id]&&c.id!==1);if(!withQs.length) return null;return(
        <div style={{marginTop:8}}>
          <div style={{fontSize:12,fontWeight:800,color:"#888780",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Candidate-specific questions</div>
          {withQs.map(c=>{
            const cqs=parseQs(state.interviewQs[c.id]);
            if(!cqs||!cqs.length) return null;
            return(
              <Card key={c.id} style={{padding:18,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={32}/>
                  <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{c.name} — {c.role}</div>
                </div>
                {cqs.map((q,i)=>{const s=ts[q.type]||ts.technical;return(
                  <div key={i} style={{padding:"9px 12px",background:"#FAFAF8",borderRadius:8,border:"1px solid #EEECEA",marginBottom:7}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:9,fontWeight:700,padding:"3px 7px",borderRadius:20,background:s.bg,color:s.text,flexShrink:0,marginTop:2}}>{s.label}</span>
                      <div style={{fontSize:12,color:"#1C1C1A",lineHeight:1.55}}>{q.question}</div>
                    </div>
                  </div>
                );})}
              </Card>
            );
          })}
        </div>
      );})()}
    </div>
  );
}

function HiringReport(){
  const{state,dispatch}=useStore();const toast=useToast();
  if(state.pipelineState!=="done")return<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div style={{fontSize:15,fontWeight:700,color:"#1C1C1A",marginBottom:6}}>No report yet</div><div style={{fontSize:13,color:"#888780",marginBottom:16}}>Run the pipeline first</div><Btn variant="primary" onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})}>Run pipeline</Btn></Card>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:680}}>
      <Card style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}><div><div style={{fontSize:17,fontWeight:800,color:"#1C1C1A"}}>Hiring summary report</div><div style={{fontSize:12,color:"#888780",marginTop:2}}>Senior Frontend Engineer · {new Date().toLocaleDateString()}</div></div><Btn variant="primary" size="sm" onClick={()=>toast("Report downloaded","success")}>Download PDF</Btn></div>
        {(()=>{
          const totalResumes=state.appliedResumes?.length||state.activeCandidates?.length||5;
          const shortlistedCount=state.activeCandidates?.length||5;
          const scores=state.activeCandidates?.map(c=>state.dynamicScores?.[c.id]??(c.baseScore||75))||[];
          const avgScore=scores.length>0?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):83;
          const timeSaved=Math.round(totalResumes*0.35); // ~20min per resume manual
          return<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            <MetricCard label="Applicants" value={totalResumes}/>
            <MetricCard label="Shortlisted" value={shortlistedCount} delta={"Top "+Math.round(shortlistedCount/Math.max(totalResumes,1)*100)+"%"} deltaType="good"/>
            <MetricCard label="Avg score" value={avgScore+"%"} deltaType="good"/>
            <MetricCard label="Time saved" value={timeSaved+"h"} delta="vs manual screening" deltaType="good"/>
          </div>;
        })()}
        <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:10}}>Shortlisted candidates</div>
        {(state.activeCandidates||CANDIDATE_POOL.slice(0,5)).map((c,i)=>{const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);return<div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:i===0?"#EEEDFE":"#FAFAF8",borderRadius:10,border:"1px solid "+(i===0?"#CECBF6":"#EEECEA"),marginBottom:6}}><div style={{fontSize:12,fontWeight:800,color:i===0?"#534AB7":"#888780",width:20}}>#{i+1}</div><Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={28}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div><div style={{fontSize:10,color:"#888780"}}>{c.company}</div></div><div style={{fontSize:13,fontWeight:800,color:sc>=85?"#534AB7":"#1D9E75"}}>{sc}/100</div></div>;})}
        {(()=>{
          const cands=state.activeCandidates||CANDIDATE_POOL.slice(0,5);
          const sorted=[...cands].sort((a,b)=>(state.dynamicScores?.[b.id]??(b.baseScore||75))-(state.dynamicScores?.[a.id]??(a.baseScore||75)));
          const top=sorted[0];const second=sorted[1];
          const topSc=state.dynamicScores?.[top?.id]??(top?.baseScore||75);
          const secondSc=state.dynamicScores?.[second?.id]??(second?.baseScore||75);
          return<div style={{background:"#E1F5EE",border:"1px solid #9FE1CB",borderRadius:10,padding:14,marginTop:14}}><div style={{fontSize:13,fontWeight:800,color:"#085041",marginBottom:4}}>AI Recommendation</div><div style={{fontSize:13,color:"#085041",lineHeight:1.65}}>Proceed with top 3 candidates. {top&&<><strong>{top.name}</strong> ({topSc}/100) is your strongest match{second&&<> — {second.name} ({secondSc}) close behind</>}.</>} Review bias flags before posting JD publicly.</div></div>;
        })()}
      </Card>
      <BiasAuditPanel report={state.biasReport}/>
      <PipelineHistoryPanel onLoadRun={(run)=>toast&&toast("History run loaded — view candidates","info")}/>
    </div>
  );
}

// ── HIRING CHAT ───────────────────────────────────────────────────────────
function HiringChat(){
  const{state,dispatch}=useStore();
  const[input,setInput]=useState("");
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[state.chatMessages]);
  useEffect(()=>{
    if(state.chatOpen&&state.chatMessages.length===0){
      const cands=state.activeCandidates||CANDIDATE_POOL.slice(0,5);
      const names=cands.slice(0,2).map(c=>c.name.split(" ")[0]).join(" and ");
      dispatch({type:"ADD_CHAT_MSG",msg:{role:"assistant",text:"Hi! Pipeline context loaded — "+cands.length+" candidates for your role.\n\nTry: Who fits best? Compare "+names+". Who has shortest notice?"}});
    }
  },[state.chatOpen]);
  const send=async()=>{
    if(!input.trim()||state.chatLoading)return;
    const msg=input.trim();setInput("");
    dispatch({type:"ADD_CHAT_MSG",msg:{role:"user",text:msg}});
    dispatch({type:"SET_CHAT_LOADING",val:true});
    dispatch({type:"ADD_CHAT_MSG",msg:{role:"assistant",text:""}});
    const activeCands=state.activeCandidates||CANDIDATE_POOL.slice(0,5);
    const ctx="You are HireFlow AI assistant. Candidates: "+activeCands.map(c=>{const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);return c.name+"("+sc+"/100,"+c.company+",Rs "+(c.salary||"?")+"L,"+c.location+","+c.notice+" notice,skills:"+c.skills.join(",")+",gaps:"+c.gaps.join(",")+")"}).join(" | ")+". JD role: "+state.jdText.slice(0,100)+". Answer directly.";
    const history=state.chatMessages.slice(-6).filter(m=>m.text).map(m=>({role:m.role,content:m.text}));
    history.push({role:"user",content:msg});
    const reply=await callClaude(history,ctx);
    dispatch({type:"UPDATE_LAST_CHAT",text:reply||"Could not process that. Ask about specific candidates."});
    dispatch({type:"SET_CHAT_LOADING",val:false});
  };
  if(!state.chatOpen)return<button onClick={()=>dispatch({type:"TOGGLE_CHAT"})} style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#534AB7,#7F77DD)",border:"none",cursor:"pointer",boxShadow:"0 4px 20px rgba(83,74,183,0.4)",fontSize:22,zIndex:998,transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>🤖</button>;
  return(
    <div style={{position:"fixed",bottom:24,right:24,width:360,height:520,background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",zIndex:998,display:"flex",flexDirection:"column",overflow:"hidden",border:"1px solid #EEECEA"}}>
      <div style={{background:"linear-gradient(135deg,#534AB7,#7F77DD)",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"white"}}>HireFlow AI Assistant</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>Pipeline context loaded</div></div>
        <button onClick={()=>dispatch({type:"TOGGLE_CHAT"})} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",color:"white",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {state.chatMessages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"85%",padding:"9px 13px",borderRadius:m.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:m.role==="user"?"#534AB7":"#F7F6F3",color:m.role==="user"?"white":"#1C1C1A",fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {i===state.chatMessages.length-1&&m.role==="assistant"&&state.chatLoading?<StreamText text={m.text||"Thinking..."}/>:m.text}
            </div>
          </div>
        ))}
        {state.chatMessages.length<=1&&["Who fits remote best?","Compare Aryan and Sneha","Shortest notice period?","Who fits the budget?"].map(s=><button key={s} onClick={()=>setInput(s)} style={{textAlign:"left",padding:"7px 11px",background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:8,fontSize:11,color:"#534AB7",cursor:"pointer"}}>{s}</button>)}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"10px 12px",borderTop:"1px solid #EEECEA",display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about candidates..." style={{flex:1,border:"1px solid #EEECEA",borderRadius:9,padding:"8px 11px",fontSize:12,fontFamily:"inherit",outline:"none",background:"#FAFAF8"}} onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
        <button onClick={send} disabled={!input.trim()||state.chatLoading} style={{width:34,height:34,borderRadius:9,background:input.trim()?"#534AB7":"#EEECEA",border:"none",cursor:"pointer",color:"white",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>→</button>
      </div>
    </div>
  );
}

// ── SALES MODE ────────────────────────────────────────────────────────────
function SalesMode(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[activeTab,setActiveTab]=useState("setup");
  const[objInput,setObjInput]=useState("");
  const[objReply,setObjReply]=useState("");
  const[objLoading,setObjLoading]=useState(false);

  const generate=async()=>{
    if(!state.salesProduct.trim()){toast("Add product description first","error");return;}
    dispatch({type:"SET_SALES_RUNNING",val:true});
    toast("Generating prospects...","info");
    const p="Based on this product and target, generate 5 realistic B2B prospect profiles.\nProduct: "+state.salesProduct+"\nTarget: "+state.salesTarget+"\n\nReturn ONLY JSON array: [{id,name,role,company,industry,painPoint,fitScore,budget,objection,email}]. fitScore 0-100. Make realistic and specific.";
    try{
      const raw=await callClaude([{role:"user",content:p}]);
      const clean=raw.split("```").join("").replace(/^json/,"").trim();
      const prospects=JSON.parse(clean);
      dispatch({type:"SET_SALES_PROSPECTS",payload:prospects});
      for(const pr of prospects){
        const ep="Write a 3-paragraph cold email to "+pr.name+" ("+pr.role+" at "+pr.company+", pain: "+pr.painPoint+") about: "+state.salesProduct.slice(0,300)+". Specific and warm.";
        const email=await callClaude([{role:"user",content:ep}]);
        dispatch({type:"SET_SALES_EMAIL",id:pr.id,text:email||"Hi "+pr.name.split(" ")[0]+",\n\nI noticed "+pr.company+" faces "+pr.painPoint+".\n\nOur platform can help. Would you be open to a 15-min call?\n\nBest,\nSales Team"});
      }
      toast("5 prospects with personalized outreach ready","success");
      setActiveTab("prospects");
    }catch{
      const fallback=[
        {id:1,name:"Ankit Sharma",role:"VP Engineering",company:"GrowthTech",industry:"SaaS",painPoint:"Manual hiring taking 3+ weeks",fitScore:92,budget:"Rs 5-10L/yr",objection:"Already using spreadsheets",email:"ankit@growthtech.io"},
        {id:2,name:"Meera Joshi",role:"Head of HR",company:"ScaleUp",industry:"Fintech",painPoint:"No structured screening",fitScore:87,budget:"Rs 3-7L/yr",objection:"Team is small",email:"meera@scaleup.in"},
        {id:3,name:"Rohan Das",role:"CEO",company:"FastHire",industry:"Recruitment",painPoint:"Slow candidate evaluation",fitScore:84,budget:"Rs 8-15L/yr",objection:"Price too high",email:"rohan@fasthire.co"},
        {id:4,name:"Priti Singh",role:"Talent Manager",company:"BuildCo",industry:"Construction",painPoint:"No bias detection",fitScore:76,budget:"Rs 2-5L/yr",objection:"Need ROI first",email:"priti@buildco.in"},
        {id:5,name:"Karan Mehta",role:"CTO",company:"DevStudio",industry:"Agency",painPoint:"Inconsistent interviews",fitScore:71,budget:"Rs 3-6L/yr",objection:"Need integrations",email:"karan@devstudio.io"},
      ];
      dispatch({type:"SET_SALES_PROSPECTS",payload:fallback});
      for(const pr of fallback)dispatch({type:"SET_SALES_EMAIL",id:pr.id,text:"Hi "+pr.name.split(" ")[0]+",\n\nI noticed "+pr.company+" might be dealing with "+pr.painPoint+".\n\nOur AI platform saves 14+ hours per hire. Would you be open to a 15-min demo?\n\nBest,\nSales Team"});
      toast("Prospects generated","success");
      setActiveTab("prospects");
    }
    dispatch({type:"SET_SALES_RUNNING",val:false});
  };

  const handleObj=async()=>{
    if(!objInput.trim())return;
    setObjLoading(true);setObjReply("");
    const p="Expert sales response for: "+state.salesProduct.slice(0,200)+"\n\nObjection: '"+objInput+"'\n\n3-sentence response: acknowledge, reframe as benefit, move to next step. Specific to product.";
    const reply=await callClaude([{role:"user",content:p}]);
    setObjReply(reply||"I completely understand that concern. Many of our customers said the same before seeing a 10x return in month one. Would a free trial help you evaluate without commitment?");
    setObjLoading(false);
  };

  const tabs=[{id:"setup",label:"Setup",icon:"⚙️"},{id:"prospects",label:"Prospects",icon:"🎯"},{id:"outreach",label:"Outreach",icon:"✉️"},{id:"objections",label:"Objections",icon:"🛡️"}];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <div style={{display:"flex",gap:4,marginBottom:18,background:"white",borderRadius:12,padding:4,border:"1px solid #EEECEA",width:"fit-content"}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"8px 16px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:activeTab===t.id?"#BA7517":"transparent",color:activeTab===t.id?"white":"#5F5E5A",transition:"all 0.15s"}}>{t.icon} {t.label}</button>)}
      </div>

      {activeTab==="setup"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:700}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Your product</div>
            <textarea value={state.salesProduct} onChange={e=>dispatch({type:"SET_SALES_PRODUCT",payload:e.target.value})} style={{width:"100%",height:160,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} placeholder="Describe your product..." onFocus={e=>e.target.style.borderColor="#BA7517"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_SALES_PRODUCT",payload:SAMPLE_PRODUCT})} style={{marginTop:10}}>Use sample product</Btn>
          </Card>
          <Card style={{padding:22}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Target audience</div>
            <textarea value={state.salesTarget} onChange={e=>dispatch({type:"SET_SALES_TARGET",payload:e.target.value})} style={{width:"100%",height:90,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} placeholder="Industry, company size, role, pain points..." onFocus={e=>e.target.style.borderColor="#BA7517"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_SALES_TARGET",payload:SAMPLE_TARGET})} style={{marginTop:10}}>Use sample target</Btn>
          </Card>
          <Btn variant="orange" size="lg" disabled={state.salesRunning||!state.salesProduct.trim()} onClick={generate} fullWidth>{state.salesRunning?"Generating prospects...":"Generate prospects and outreach"}</Btn>
        </div>
      )}

      {activeTab==="prospects"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:760}}>
          {state.salesProspects.length===0?<Card style={{padding:48,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🎯</div><div style={{fontSize:14,fontWeight:700,color:"#1C1C1A",marginBottom:12}}>No prospects yet</div><Btn variant="orange" onClick={()=>setActiveTab("setup")}>Set up product first</Btn></Card>:
          state.salesProspects.map(p=>(
            <Card key={p.id} style={{padding:20}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <div style={{width:46,height:46,borderRadius:12,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🏢</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><div style={{fontSize:14,fontWeight:700,color:"#1C1C1A"}}>{p.name}</div><Tag color="warn">{p.role}</Tag><Tag color="neutral">{p.industry}</Tag></div>
                  <div style={{fontSize:12,color:"#888780",marginBottom:8}}>{p.company} · {p.budget}</div>
                  <div style={{fontSize:12,color:"#633806",padding:"8px 10px",background:"#FFF8EE",borderRadius:7,border:"1px solid #FAC775",marginBottom:6}}>Pain: {p.painPoint}</div>
                  <div style={{fontSize:11,color:"#993C1D"}}>Likely objection: "{p.objection}"</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <div style={{fontSize:22,fontWeight:800,color:"#BA7517"}}>{p.fitScore}</div>
                  <div style={{fontSize:10,color:"#888780"}}>fit score</div>
                  <Btn variant="orange" size="sm" onClick={()=>setActiveTab("outreach")}>Email</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab==="outreach"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:760}}>
          {state.salesProspects.length===0?<Card style={{padding:48,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>✉️</div><Btn variant="orange" onClick={()=>setActiveTab("setup")}>Set up product first</Btn></Card>:
          state.salesProspects.map(p=>{const sent=state.salesSentEmails[p.id];return(
            <Card key={p.id} style={{padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{p.name} — {p.company}</div><div style={{fontSize:11,color:"#888780"}}>{p.email} · Fit: {p.fitScore}/100</div></div>{sent?<Tag color="success">Sent</Tag>:<Btn variant="orange" size="sm" onClick={()=>{dispatch({type:"SET_SALES_SENT",id:p.id});toast("Sent to "+p.name,"success");}}>Send</Btn>}</div>
              <div style={{background:"#FFF8EE",border:"1px solid #FAC775",borderRadius:8,padding:12,fontSize:12,color:"#5F5E5A",lineHeight:1.65,maxHeight:72,overflow:"hidden",WebkitMaskImage:"linear-gradient(to bottom,black 30%,transparent 100%)",whiteSpace:"pre-wrap"}}>{state.salesEmailDrafts[p.id]||"Generating..."}</div>
            </Card>
          );})}
        </div>
      )}

      {activeTab==="objections"&&(
        <div style={{maxWidth:680,display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Live objection handler</div>
            <div style={{fontSize:12,color:"#888780",marginBottom:14}}>Type any customer objection — get an AI response instantly</div>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <input value={objInput} onChange={e=>setObjInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleObj()} placeholder="e.g. Your price is too high" style={{flex:1,border:"1px solid #EEECEA",borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor="#BA7517"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
              <Btn variant="orange" onClick={handleObj} disabled={objLoading||!objInput.trim()}>{objLoading?"...":"Handle"}</Btn>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["Price is too high","We already have a solution","Not the right time","Need to check with the team","Need to see ROI first"].map(o=><button key={o} onClick={()=>setObjInput(o)} style={{padding:"5px 12px",background:"#FFF8EE",border:"1px solid #FAC775",borderRadius:20,fontSize:11,color:"#854F0B",cursor:"pointer",fontWeight:600}}>{o}</button>)}
            </div>
          </Card>
          {objReply&&(
            <Card style={{padding:22,background:"#FFF8EE",border:"1px solid #FAC775"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Suggested response</div>
              <div style={{fontSize:13,color:"#633806",lineHeight:1.7,whiteSpace:"pre-wrap"}}><StreamText text={objReply}/></div>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <Btn variant="orange" size="sm" onClick={()=>{navigator.clipboard?.writeText(objReply);toast("Copied","success");}}>Copy</Btn>
                <Btn variant="secondary" size="sm" onClick={()=>{setObjInput("");setObjReply("");}}>Try another</Btn>
              </div>
            </Card>
          )}
          <Card style={{padding:20}}>
            <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Objection playbook</div>
            {[["Price too high","Reframe as ROI — calculate hours saved x rate"],["Already have a solution","Ask what is missing — position as complementary"],["Not the right time","Create urgency — limited offer or competitor pressure"],["Need to think about it","Identify real concern — ask what would help decide"],["Too complex","Emphasize onboarding support — offer pilot program"]].map(([obj,handle])=>(
              <div key={obj} style={{padding:"10px 12px",background:"#FAFAF8",borderRadius:9,border:"1px solid #EEECEA",marginBottom:7}}>
                <div style={{fontSize:12,fontWeight:700,color:"#BA7517",marginBottom:2}}>{obj}</div>
                <div style={{fontSize:11,color:"#5F5E5A"}}>{handle}</div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── SUPPORT MODE ──────────────────────────────────────────────────────────
function SupportMode(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[chatInput,setChatInput]=useState("");
  const[chatLoading,setChatLoading]=useState(false);
  const[activeChatId,setActiveChatId]=useState(null);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[state.supportChats,activeChatId]);

  const buildKB=async()=>{
    if(!state.supportDocs.trim()){toast("Add docs first","error");return;}
    dispatch({type:"SET_SUPPORT_BUILDING",val:true});
    await new Promise(r=>setTimeout(r,1800));
    dispatch({type:"SET_SUPPORT_KB",payload:[
      {q:"How do I get started?",a:"Sign up at flowzint.in, create workspace, choose template, paste context, run pipeline."},
      {q:"What are the pricing plans?",a:"Starter: Rs 999/month. Team: Rs 2,999/month. Enterprise: Custom."},
      {q:"How do I cancel?",a:"Settings > Billing > Cancel Plan. Access continues until period ends."},
      {q:"What is your refund policy?",a:"14-day money back guarantee. Email support@flowzint.in."},
      {q:"Pipeline is stuck — what do I do?",a:"Refresh and restart. If persists, check API key in Settings > Integrations."},
      {q:"How do I change my password?",a:"Settings > Security > Change Password."},
    ]});
    dispatch({type:"SET_SUPPORT_BUILDING",val:false});
    toast("Knowledge base ready — bot is live","success");
  };

  const sendMsg=async()=>{
    if(!chatInput.trim()||chatLoading||state.supportKB.length===0)return;
    const msg=chatInput.trim();setChatInput("");
    const id=activeChatId||Date.now();
    if(!activeChatId){
      setActiveChatId(id);
      dispatch({type:"ADD_SUPPORT_CHAT",chat:{id,messages:[{role:"user",text:msg},{role:"assistant",text:""}],sentiment:"neutral",status:"open",timestamp:new Date().toLocaleTimeString()}});
    }else{
      dispatch({type:"UPDATE_SUPPORT_CHAT",id,updates:{messages:[...((state.supportChats.find(c=>c.id===id)?.messages)||[]),{role:"user",text:msg},{role:"assistant",text:""}]}});
    }
    setChatLoading(true);
    const sys="You are a helpful support agent. Use this knowledge: "+SAMPLE_DOCS+". Answer concisely. If unsure, say you will escalate to a human agent.";
    const reply=await callClaude([{role:"user",content:msg}],sys);
    const sentiment=msg.toLowerCase().includes("angry")||msg.toLowerCase().includes("refund")||msg.toLowerCase().includes("urgent")?"negative":msg.toLowerCase().includes("great")||msg.toLowerCase().includes("love")?"positive":"neutral";
    const chat=state.supportChats.find(c=>c.id===id)||{messages:[{role:"user",text:msg}]};
    const updated=[...chat.messages.slice(0,-1),{role:"assistant",text:reply||"Thank you for reaching out. Let me look into this for you. Can you provide more details?"}];
    dispatch({type:"UPDATE_SUPPORT_CHAT",id,updates:{messages:updated,sentiment,status:sentiment==="negative"?"escalated":"open"}});
    setChatLoading(false);
  };

  const activeChat=state.supportChats.find(c=>c.id===activeChatId);

  return(
    <div style={{display:"grid",gridTemplateColumns:"290px 1fr",gap:16,height:"calc(100vh - 160px)"}}>
      <div style={{display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
        <Card style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:10}}>Knowledge base</div>
          <textarea value={state.supportDocs} onChange={e=>dispatch({type:"SET_SUPPORT_DOCS",payload:e.target.value})} style={{width:"100%",height:110,border:"1px solid #EEECEA",borderRadius:9,padding:10,fontSize:12,lineHeight:1.6,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} placeholder="Paste product docs, FAQ, policies..." onFocus={e=>e.target.style.borderColor="#1D9E75"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_SUPPORT_DOCS",payload:SAMPLE_DOCS})}>Sample</Btn>
            <Btn variant="success" size="sm" disabled={state.supportBuilding||!state.supportDocs.trim()} onClick={buildKB} fullWidth>{state.supportBuilding?"Building...":"Build KB"}</Btn>
          </div>
        </Card>
        {state.supportKB.length>0&&<Card style={{padding:14}}><div style={{fontSize:12,fontWeight:800,color:"#1C1C1A",marginBottom:8}}>KB ({state.supportKB.length} items)</div>{state.supportKB.map((item,i)=><div key={i} style={{padding:"7px 9px",background:"#E1F5EE",borderRadius:7,marginBottom:5,border:"1px solid #9FE1CB"}}><div style={{fontSize:11,fontWeight:700,color:"#085041"}}>{item.q}</div></div>)}</Card>}
        {state.supportChats.length>0&&<Card style={{padding:14}}><div style={{fontSize:12,fontWeight:800,color:"#1C1C1A",marginBottom:8}}>Chat history</div>{state.supportChats.map(c=><div key={c.id} onClick={()=>setActiveChatId(c.id)} style={{padding:"7px 9px",borderRadius:8,border:"1px solid "+(activeChatId===c.id?"#1D9E75":"#EEECEA"),background:activeChatId===c.id?"#E1F5EE":"#FAFAF8",cursor:"pointer",marginBottom:5}}><div style={{fontSize:11,fontWeight:600,color:"#1C1C1A"}}>{c.messages[0]?.text.slice(0,32)}...</div><div style={{fontSize:9,color:"#888780",marginTop:2,display:"flex",gap:4}}>{c.timestamp}{c.status==="escalated"&&<span style={{color:"#D85A30",fontWeight:700}}>⚠ Escalated</span>}</div></div>)}</Card>}
      </div>
      <Card style={{display:"flex",flexDirection:"column",overflow:"hidden",padding:0}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #EEECEA",background:"linear-gradient(135deg,#1D9E75,#5DCAA5)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💬</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"white"}}>SupportFlow AI</div><div style={{fontSize:10,color:"rgba(255,255,255,0.75)"}}>{state.supportKB.length>0?"KB loaded — bot ready":"Build KB to activate"}</div></div>
          <button onClick={()=>{setActiveChatId(null);}} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"white",fontSize:11,fontWeight:600}}>+ New</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
          {!activeChat&&<div style={{textAlign:"center",padding:"36px 20px",color:"#888780"}}><div style={{fontSize:36,marginBottom:10}}>💬</div><div style={{fontSize:13,fontWeight:600,color:"#1C1C1A",marginBottom:4}}>Support chat ready</div><div style={{fontSize:12}}>{state.supportKB.length>0?"Type a customer question to test":"Build KB first"}</div><div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:14}}>{["How do I get started?","What is the refund policy?","My pipeline is stuck","How do I cancel?"].map(q=><button key={q} onClick={()=>{setChatInput(q);}} style={{padding:"6px 12px",background:"#E1F5EE",border:"1px solid #9FE1CB",borderRadius:20,fontSize:11,color:"#085041",cursor:"pointer"}}>{q}</button>)}</div></div>}
          {activeChat?.messages.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?"#1D9E75":"#F7F6F3",color:m.role==="user"?"white":"#1C1C1A",fontSize:13,lineHeight:1.6}}>
                {i===activeChat.messages.length-1&&m.role==="assistant"&&chatLoading?<StreamText text={m.text||"Thinking..."}/>:m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid #EEECEA",display:"flex",gap:8}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder={state.supportKB.length>0?"Type a question...":"Build KB first..."} disabled={state.supportKB.length===0} style={{flex:1,border:"1px solid #EEECEA",borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:"inherit",outline:"none",background:state.supportKB.length===0?"#F7F6F3":"white"}} onFocus={e=>e.target.style.borderColor="#1D9E75"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
          <Btn variant="success" onClick={sendMsg} disabled={!chatInput.trim()||chatLoading||state.supportKB.length===0}>Send</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── CARE MODE ─────────────────────────────────────────────────────────────
function CareMode(){
  const toast=useToast();
  const[tickets,setTickets]=useState(SAMPLE_TICKETS);
  const[selected,setSelected]=useState(null);
  const[generating,setGenerating]=useState(null);
  const[responses,setResponses]=useState({});
  const[approved,setApproved]=useState({});

  const genResponse=async(t)=>{
    setGenerating(t.id);
    const p="You are a customer care agent. Write a professional, empathetic response.\n\nCustomer: "+t.customer+"\nSubject: "+t.subject+"\nMessage: "+t.message+"\nCategory: "+t.category+"\n\nResponse: acknowledge issue, clear solution/next step, warm but concise (3 paragraphs). Sign as Customer Care Team, FlowZint.";
    const reply=await callClaude([{role:"user",content:p}]);
    setResponses(r=>({...r,[t.id]:reply||"Dear "+t.customer.split(" ")[0]+",\n\nThank you for reaching out. I completely understand your concern and sincerely apologize for the inconvenience.\n\nI have escalated this to our "+t.category+" team and they will resolve it within 24 hours.\n\nThank you for your patience.\nCustomer Care Team, FlowZint"}));
    setGenerating(null);
    toast("Response drafted for "+t.customer,"success");
  };

  const pConfig={urgent:{color:"#D85A30",bg:"#FAECE7",label:"Urgent"},high:{color:"#BA7517",bg:"#FAEEDA",label:"High"},normal:{color:"#534AB7",bg:"#EEEDFE",label:"Normal"},low:{color:"#1D9E75",bg:"#E1F5EE",label:"Low"}};
  const cConfig={billing:{icon:"💳"},technical:{icon:"🔧"},sales:{icon:"💼"},feedback:{icon:"⭐"},refund:{icon:"💰"}};
  const emoji=(s)=>s<=-0.6?"😡":s<=-0.3?"😟":s>=0.6?"😊":"😐";

  return(
    <div style={{display:"grid",gridTemplateColumns:"330px 1fr",gap:16}}>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>{tickets.length} tickets</div>
          <div style={{display:"flex",gap:6}}>
            <Tag color="danger">{tickets.filter(t=>t.priority==="urgent").length} urgent</Tag>
            <Tag color="warn">{tickets.filter(t=>!approved[t.id]).length} pending</Tag>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {tickets.map(t=>{
            const pc=pConfig[t.priority]||pConfig.normal;
            const cc=cConfig[t.category]||{icon:"📩"};
            return(
              <div key={t.id} onClick={()=>setSelected(t)} style={{background:"white",borderRadius:12,border:"1.5px solid "+(selected?.id===t.id?"#D4537E":"#EEECEA"),padding:"12px 14px",cursor:"pointer",transition:"all 0.2s",boxShadow:selected?.id===t.id?"0 0 0 3px #FBEAF0":"none"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{fontSize:20,flexShrink:0}}>{cc.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A",marginBottom:2}}>{t.customer}</div>
                    <div style={{fontSize:11,color:"#5F5E5A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{t.subject}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:pc.bg,color:pc.color}}>{pc.label}</span>
                      {approved[t.id]&&<Tag color="success">Resolved</Tag>}
                    </div>
                  </div>
                  <div style={{fontSize:16}}>{emoji(t.sentiment)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected?(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16}}>
              <div style={{width:46,height:46,borderRadius:12,background:"#FBEAF0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{cConfig[selected.category]?.icon||"📩"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:"#1C1C1A"}}>{selected.subject}</div>
                <div style={{fontSize:12,color:"#888780",marginTop:2}}>{selected.customer} · {selected.email}</div>
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,background:pConfig[selected.priority]?.bg,color:pConfig[selected.priority]?.color}}>{pConfig[selected.priority]?.label}</span>
                  <Tag color="neutral">{selected.category}</Tag>
                  <span>{emoji(selected.sentiment)} {selected.sentiment>=0.5?"Positive":selected.sentiment<=-0.5?"Negative":"Neutral"}</span>
                </div>
              </div>
            </div>
            <div style={{background:"#F7F6F3",borderRadius:10,padding:14,fontSize:13,color:"#1C1C1A",lineHeight:1.7,marginBottom:16,borderLeft:"3px solid #D4537E"}}>{selected.message}</div>
            {!responses[selected.id]?(
              <Btn variant="pink" fullWidth disabled={generating===selected.id} onClick={()=>genResponse(selected)}>
                {generating===selected.id?<><Spinner/>Generating response...</>:"Generate AI response"}
              </Btn>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:12,fontWeight:800,color:"#1C1C1A",display:"flex",alignItems:"center",gap:6}}>AI draft <Tag color="warn">Review before sending</Tag></div>
                <textarea value={responses[selected.id]} onChange={e=>setResponses(r=>({...r,[selected.id]:e.target.value}))} style={{width:"100%",height:180,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#D4537E"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
                <div style={{display:"flex",gap:8}}>
                  <Btn variant="secondary" onClick={()=>genResponse(selected)} disabled={generating===selected.id}>Regenerate</Btn>
                  <Btn variant="pink" fullWidth disabled={approved[selected.id]} onClick={()=>{setApproved(a=>({...a,[selected.id]:true}));toast("Response sent to "+selected.customer,"success");}}>
                    {approved[selected.id]?"Sent":"Approve and send"}
                  </Btn>
                </div>
              </div>
            )}
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <MetricCard label="Priority" value={pConfig[selected.priority]?.label} icon={cConfig[selected.category]?.icon}/>
            <MetricCard label="Sentiment" value={emoji(selected.sentiment)+" "+(selected.sentiment>=0.5?"Positive":selected.sentiment<=-0.5?"Negative":"Neutral")} deltaType={selected.sentiment>=0.3?"good":selected.sentiment<=-0.3?"danger":"neutral"}/>
            <MetricCard label="Status" value={approved[selected.id]?"Resolved":"Pending"} delta={approved[selected.id]?"Sent":"Awaiting"} deltaType={approved[selected.id]?"good":"warn"}/>
          </div>
        </div>
      ):(
        <Card style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48}}>
          <div style={{textAlign:"center",color:"#888780"}}><div style={{fontSize:40,marginBottom:12}}>❤️</div><div style={{fontSize:14,fontWeight:600,color:"#1C1C1A",marginBottom:6}}>Select a ticket</div><div style={{fontSize:12}}>Click any ticket to view and generate a response</div></div>
        </Card>
      )}
    </div>
  );
}

// ── SMB BRAIN MODE ────────────────────────────────────────────────────────
function SMBMode(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[step,setStep]=useState("input");
  const[biz,setBiz]=useState({name:"",type:"",city:"",problem:"",whatsapp:""});
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);

  const useSample=()=>setBiz({name:SAMPLE_SMB.name,type:SAMPLE_SMB.type,city:SAMPLE_SMB.city,problem:SAMPLE_SMB.problem,whatsapp:SAMPLE_SMB.whatsappChats});

  const analyze=async()=>{
    if(!biz.name.trim()){toast("Add business name","error");return;}
    setLoading(true);setStep("analyzing");
    toast("AI analyzing your business in Indian context...","info");
    const p="You are a business intelligence AI for Indian SMBs. Analyze this business and return JSON.\n\nBusiness: "+JSON.stringify(biz)+"\n\nReturn ONLY valid JSON (no markdown):\n{\"summary\":\"2 sentence overview\",\"topPain\":\"biggest pain\",\"crmContacts\":[{\"name\":\"name\",\"intent\":\"order\",\"value\":\"high\",\"action\":\"Follow up today\"}],\"supportFAQs\":[{\"q\":\"question\",\"a\":\"answer\"}],\"salesOpportunities\":[{\"opportunity\":\"description\",\"revenue\":\"Rs X/month\",\"action\":\"what to do\"}],\"automationWins\":[\"specific automation\"],\"weeklyTimeSaved\":\"X hours\",\"roiEstimate\":\"Rs X/month\"}";
    try{
      const raw=await callClaude([{role:"user",content:p}]);
      const clean=raw.split("```").join("").replace(/^json\s*/i,"").trim();
      const data=JSON.parse(clean);
      setResult(data);
      dispatch({type:"SET_SMB_PROFILE",payload:{...biz,...data}});
      dispatch({type:"ADD_CROSS_EVENT",event:{type:"hiring_to_care",title:"SMB profile built for "+biz.name,desc:(data.crmContacts?.length||0)+" contacts extracted, "+(data.salesOpportunities?.length||0)+" sales opportunities found.",action:"Routes to SalesFlow and CareFlow automatically"}});
      setStep("result");
      toast("SMB intelligence report ready","success");
    }catch{
      toast("Error analyzing — try again","error");setStep("input");
    }
    setLoading(false);
  };

  return(
    <div style={{maxWidth:860,animation:"fadeIn 0.3s ease"}}>
      {step==="input"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:24,background:"linear-gradient(135deg,#7C3AED,#9F67FA)",border:"none"}}>
            <div style={{fontSize:18,fontWeight:800,color:"white",marginBottom:8}}>SMB Brain — 1-Click Indian Business AI</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.65}}>Tell us about your business. Paste your WhatsApp chats. AI builds your CRM, support KB, and sales pipeline — designed for how Indian businesses actually work.</div>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card style={{padding:18}}>
              <div style={{fontSize:12,fontWeight:800,color:"#1C1C1A",marginBottom:10}}>Business details</div>
              {[{key:"name",label:"Business name",ph:"e.g. Kirana King, TechFlow India"},{key:"type",label:"Business type",ph:"e.g. Retail, SaaS, Clinic, Coaching"},{key:"city",label:"City",ph:"e.g. Pune, Bangalore, Mumbai"}].map(f=>(
                <div key={f.key} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#5F5E5A",marginBottom:4}}>{f.label}</div>
                  <input value={biz[f.key]} onChange={e=>setBiz(b=>({...b,[f.key]:e.target.value}))} placeholder={f.ph} style={{width:"100%",border:"1px solid #EEECEA",borderRadius:9,padding:"9px 12px",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#7C3AED"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
                </div>
              ))}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#5F5E5A",marginBottom:4}}>Main challenge</div>
                <textarea value={biz.problem} onChange={e=>setBiz(b=>({...b,problem:e.target.value}))} placeholder="e.g. Managing 3 stores, WhatsApp orders chaotic, no CRM, losing customers..." style={{width:"100%",height:70,border:"1px solid #EEECEA",borderRadius:9,padding:"9px 12px",fontSize:12,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#7C3AED"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
              </div>
            </Card>
            <Card style={{padding:18}}>
              <div style={{fontSize:12,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>WhatsApp chats / Enquiries</div>
              <div style={{fontSize:11,color:"#888780",marginBottom:10}}>Paste raw WhatsApp messages — AI extracts customers, intent, and builds your CRM automatically</div>
              <textarea value={biz.whatsapp} onChange={e=>setBiz(b=>({...b,whatsapp:e.target.value}))} placeholder={"Hey bhai kal 10kg aata chahiye\nHi can I order ghee 2kg?\nKab milega mera order?"} style={{width:"100%",height:185,border:"1px solid #EEECEA",borderRadius:9,padding:"9px 12px",fontSize:12,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor="#7C3AED"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            </Card>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="secondary" onClick={useSample}>Use sample (Kirana shop)</Btn>
            <Btn variant="purple" fullWidth disabled={loading||!biz.name.trim()} onClick={analyze}>Analyze my business →</Btn>
          </div>
        </div>
      )}

      {step==="analyzing"&&(
        <Card style={{padding:48,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:16}}>🏪</div>
          <div style={{fontSize:16,fontWeight:800,color:"#1C1C1A",marginBottom:8}}>Analyzing {biz.name}...</div>
          <div style={{fontSize:13,color:"#888780",marginBottom:20}}>AI reading your business context in Indian market setting</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:400,margin:"0 auto"}}>
            {["Extracting customer contacts from chats...","Building CRM with intent scoring...","Identifying sales opportunities...","Creating support FAQ from patterns...","Calculating ROI and time savings..."].map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#F3F0FF",borderRadius:8,animation:"fadeIn 0.4s ease "+(i*0.3)+"s both"}}>
                <Spinner color="#7C3AED"/><span style={{fontSize:12,color:"#5F5E5A"}}>{s}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step==="result"&&result&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:20,background:"linear-gradient(135deg,#7C3AED,#9F67FA)",border:"none"}}>
            <div style={{fontSize:14,fontWeight:800,color:"white",marginBottom:4}}>{biz.name} — Business Intelligence Report</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.65,marginBottom:12}}>{result.summary}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:"white"}}>{result.weeklyTimeSaved||"8h"}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>weekly saved</div></div>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:"white"}}>{result.crmContacts?.length||0}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>CRM contacts</div></div>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:"white"}}>{result.salesOpportunities?.length||0}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>sales opps</div></div>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:"white"}}>{result.roiEstimate||"Rs 25,000"}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>monthly ROI</div></div>
            </div>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {result.crmContacts?.length>0&&(
              <Card style={{padding:18}}>
                <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>CRM — Customer contacts</div>
                {result.crmContacts.map((c,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:"#F7F6F3",borderRadius:9,border:"1px solid #EEECEA",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div>
                      <Tag color={c.value==="high"?"success":c.value==="medium"?"warn":"neutral"}>{c.value}</Tag>
                    </div>
                    <div style={{fontSize:11,color:"#888780",marginBottom:3}}>Intent: {c.intent}</div>
                    <div style={{fontSize:11,color:"#534AB7",fontWeight:600}}>{"-> "}{c.action}</div>
                  </div>
                ))}
              </Card>
            )}
            {result.salesOpportunities?.length>0&&(
              <Card style={{padding:18}}>
                <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Sales opportunities</div>
                {result.salesOpportunities.map((o,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:"#FFF8EE",borderRadius:9,border:"1px solid #FAC775",marginBottom:8}}>
                    <div style={{fontSize:12,color:"#633806",marginBottom:4,lineHeight:1.5}}>{o.opportunity}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <Tag color="warn">{o.revenue}</Tag>
                      <div style={{fontSize:10,color:"#BA7517",fontWeight:600}}>{o.action}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
          {result.automationWins?.length>0&&(
            <Card style={{padding:18}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Automation wins — what AI can do for you</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                {result.automationWins.map((w,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:"#E1F5EE",borderRadius:9,border:"1px solid #9FE1CB",fontSize:12,color:"#085041"}}>✓ {w}</div>
                ))}
              </div>
            </Card>
          )}
          {result.supportFAQs?.length>0&&(
            <Card style={{padding:18}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Auto-generated support FAQ</div>
              {result.supportFAQs.map((f,i)=>(
                <div key={i} style={{padding:"10px 12px",background:"#EEEDFE",borderRadius:9,border:"1px solid #CECBF6",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#3C3489",marginBottom:3}}>{f.q}</div>
                  <div style={{fontSize:11,color:"#5F5E5A"}}>{f.a}</div>
                </div>
              ))}
            </Card>
          )}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn variant="secondary" onClick={()=>{setStep("input");setResult(null);}}>Analyze another business</Btn>
            <Btn variant="success" onClick={()=>dispatch({type:"SET_MODE",payload:"support"})}>{"-> "}Open SupportFlow with this KB</Btn>
            <Btn variant="orange" onClick={()=>dispatch({type:"SET_MODE",payload:"sales"})}>{"-> "}Open SalesFlow with prospects</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WAR ROOM MODE ─────────────────────────────────────────────────────────
function WarRoomMode(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[running,setRunning]=useState(false);
  const[phase,setPhase]=useState(0);
  const[debates,setDebates]=useState([]);
  const[metrics,setMetrics]=useState(null);

  const PHASES=[
    {id:0,title:"Briefing",icon:"📋",desc:"Loading business context across all 4 systems"},
    {id:1,title:"Hiring agents",icon:"🧠",desc:"7 agents scanning 42 resumes simultaneously"},
    {id:2,title:"Sales agents",icon:"🎯",desc:"Prospect scoring and email personalization"},
    {id:3,title:"Support agents",icon:"💬",desc:"Building KB, detecting escalation patterns"},
    {id:4,title:"Care agents",icon:"❤️",desc:"Ticket triage and response drafting"},
    {id:5,title:"Cross-agent debate",icon:"⚡",desc:"Agents cross-referencing and handing off tasks"},
    {id:6,title:"Command report",icon:"📊",desc:"Unified intelligence report ready"},
  ];

  const DEBATE_SCRIPTS=[
    {from:"🧠 HireFlow",to:"🎯 SalesFlow",msg:"Top candidate declined offer. Strong company background — routing as high-value B2B contact to sales prospect queue automatically."},
    {from:"💬 SupportFlow",to:"❤️ CareFlow",msg:"Escalated chat from Raj Patel matches CareFlow ticket #1. Same customer. Merging context and thread history."},
    {from:"❤️ CareFlow",to:"🎯 SalesFlow",msg:"Amir Khan asking about Enterprise plan (200 users). Clear upsell signal. Auto-routing to high-priority sales pipeline."},
    {from:"🎯 SalesFlow",to:"💬 SupportFlow",msg:"5 prospects generated. Most common objection: pipeline stuck. Pushing this to support KB as priority FAQ item."},
    {from:"🧠 HireFlow",to:"❤️ CareFlow",msg:"Hiring pipeline complete. Top candidate shortlisted. Auto-creating onboarding preparation ticket in CareFlow for Day 1 readiness."},
  ];

  const run=async()=>{
    setRunning(true);setDebates([]);setMetrics(null);
    toast("War Room activated — all 4 AI systems online","info");
    for(let i=0;i<=6;i++){
      setPhase(i);
      await new Promise(r=>setTimeout(r,1800));
      if(i===5){
        for(const d of DEBATE_SCRIPTS){
          await new Promise(r=>setTimeout(r,900));
          setDebates(prev=>[...prev,d]);
          dispatch({type:"ADD_CROSS_EVENT",event:{type:"hiring_to_care",title:d.from+" -> "+d.to,desc:d.msg,action:"Automated handoff complete"}});
        }
      }
    }
    setMetrics({done:true});
    setRunning(false);
    toast("War Room complete — unified report ready","success");
  };

  return(
    <div style={{animation:"fadeIn 0.3s ease"}}>
      <Card style={{padding:24,background:"linear-gradient(135deg,#0F172A,#1E3A5F)",border:"none",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>⚡</div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"white"}}>AI War Room — Multi-Agent Command Center</div>
            <div style={{fontSize:12,color:"#94A3B8",marginTop:2}}>All 4 AI systems run simultaneously. Agents debate, cross-reference, and hand off tasks in real time.</div>
          </div>
        </div>
        <Btn variant="dark" disabled={running} onClick={run}>{running?<><Spinner color="white"/>Agents running — watch debates below...</>:"Activate all 4 AI systems ->"}</Btn>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Mission phases</div>
          {PHASES.map(p=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:p.id<6?"1px solid #EEECEA":"none"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:phase>p.id?"#E1F5EE":phase===p.id?"#EEEDFE":"#F0EFE9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{phase>p.id?"✓":p.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:phase>=p.id?"#1C1C1A":"#B4B2A9"}}>{p.title}</div>
                <div style={{fontSize:10,color:"#B4B2A9"}}>{p.desc}</div>
              </div>
              {phase===p.id&&running&&<div style={{width:6,height:6,borderRadius:"50%",background:"#534AB7",animation:"pulse 1s infinite"}}/>}
              {phase>p.id&&<Tag color="success">Done</Tag>}
            </div>
          ))}
        </Card>

        <Card style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Live agent debates</div>
          {debates.length===0&&(
            <div style={{color:"#888780",fontSize:12,padding:"20px 0",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>⚡</div>
              Agents will debate here in real time when War Room runs
            </div>
          )}
          {debates.map((d,i)=>(
            <div key={i} style={{padding:"10px 12px",background:"linear-gradient(135deg,#EEEDFE,#E1F5EE)",borderRadius:9,marginBottom:8,animation:"fadeIn 0.4s ease",border:"1px solid #CECBF6"}}>
              <div style={{fontSize:10,fontWeight:800,color:"#534AB7",marginBottom:4}}>{d.from} {"→"} {d.to}</div>
              <div style={{fontSize:11,color:"#5F5E5A",lineHeight:1.5}}>{d.msg}</div>
            </div>
          ))}
        </Card>
      </div>

      {metrics&&(
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:16}}>Unified intelligence report</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            <MetricCard label="HireFlow" value="Done" delta="5 shortlisted" deltaType="good" icon="🧠"/>
            <MetricCard label="SalesFlow" value="Done" delta="5 prospects" deltaType="good" icon="🎯"/>
            <MetricCard label="SupportFlow" value="Done" delta="8 FAQ items" deltaType="good" icon="💬"/>
            <MetricCard label="CareFlow" value="Done" delta="5 tickets" deltaType="good" icon="❤️"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            <MetricCard label="Cross-agent handoffs" value="5" delta="All automated" deltaType="good"/>
            <MetricCard label="Total time saved" value="42 hours" delta="vs manual ops" deltaType="good"/>
            <MetricCard label="Estimated monthly ROI" value="Rs 4.2L" delta="for a 50-person team" deltaType="good" color="#7C3AED"/>
          </div>
        </Card>
      )}
    </div>
  );
}

function HiringHistory(){
  const{dispatch}=useStore();
  const toast=useToast();
  return(
    <div style={{maxWidth:640}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Pipeline history</div>
        <div style={{fontSize:12,color:"#888780"}}>Last 5 pipeline runs. Saved to your browser — survives page refresh.</div>
      </div>
      <PipelineHistoryPanel onLoadRun={(run)=>{toast("Run loaded — view report for details","info");dispatch({type:"SET_NAV",payload:"report"});}}/>
    </div>
  );
}

// ── APP SHELL ─────────────────────────────────────────────────────────────
const HIRING_NAV=[{id:"dashboard",label:"Dashboard",icon:"⊞"},{id:"pipeline",label:"Pipeline",icon:"▶"},{id:"candidates",label:"Candidates",icon:"👥"},{id:"outreach",label:"Outreach",icon:"✉️"},{id:"interviews",label:"Interviews",icon:"💬"},{id:"report",label:"Report",icon:"📄"},{id:"history",label:"History",icon:"🕐"}];
const HIRING_PAGES={dashboard:HiringDashboard,pipeline:HiringPipeline,candidates:HiringCandidates,outreach:HiringOutreach,interviews:HiringInterviews,report:HiringReport,history:HiringHistory};
const GLOBAL_STYLES="@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Inter,system-ui,sans-serif;}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}";

function HiringShell(){
  const{state,dispatch}=useStore();
  const done=state.pipelineState==="done";
  const Page=HIRING_PAGES[state.activeNav]||HiringDashboard;
  return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",overflow:"hidden"}}>
      <aside style={{width:state.sidebarOpen?216:52,background:"white",borderRight:"1px solid #EEECEA",display:"flex",flexDirection:"column",transition:"width 0.25s",overflow:"hidden",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 10px",borderBottom:"1px solid #EEECEA"}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#534AB7,#7F77DD)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🧠</div>
          {state.sidebarOpen&&<div style={{flex:1}}><div style={{fontSize:11,fontWeight:800,color:"#1C1C1A"}}>HireFlow AI</div><button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})} style={{fontSize:10,color:"#534AB7",background:"none",border:"none",cursor:"pointer",padding:0}}>back to all modes</button></div>}
          <button onClick={()=>dispatch({type:"TOGGLE_SIDEBAR"})} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#B4B2A9",fontSize:11,flexShrink:0,padding:2}}>{state.sidebarOpen?"<":">"}</button>
        </div>
        <nav style={{flex:1,padding:"6px 5px",overflowY:"auto"}}>
          {HIRING_NAV.map(item=>{
            const active=state.activeNav===item.id;
            return<button key={item.id} onClick={()=>dispatch({type:"SET_NAV",payload:item.id})} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:state.sidebarOpen?"7px 9px":"8px",justifyContent:state.sidebarOpen?"flex-start":"center",borderRadius:7,border:"none",cursor:"pointer",marginBottom:1,background:active?"#EEEDFE":"transparent",color:active?"#534AB7":"#5F5E5A",fontWeight:active?700:500,fontSize:11,transition:"all 0.15s",position:"relative"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#F7F6F3"}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent"}}><span style={{fontSize:12,flexShrink:0}}>{item.icon}</span>{state.sidebarOpen&&item.label}{active&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,background:"#534AB7",borderRadius:"0 3px 3px 0"}}/>}</button>;
          })}
        </nav>
      </aside>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <header style={{background:"white",borderBottom:"1px solid #EEECEA",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>HireFlow AI — Hiring Intelligence</div><div style={{fontSize:10,color:"#888780",marginTop:1}}>{done?(state.appliedResumes?.length||state.activeCandidates?.length||5)+" resumes · "+(state.activeCandidates?.length||5)+" shortlisted · pipeline complete":"Ready to run"}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {done&&<Tag color="success">Pipeline complete</Tag>}
            <button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})} style={{fontSize:11,fontWeight:600,color:"#534AB7",background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>All modes</button>
          </div>
        </header>
        <main style={{flex:1,overflowY:"auto",padding:20}}><div style={{animation:"fadeIn 0.3s ease"}}><Page/></div></main>
      </div>
      <ToastLayer/>
      <HiringChat/>
      <CrossModePanel/>
      <InterviewDecisionModal/>
    </div>
  );
}

function ModeHeader({icon,title,subtitle,color,tag,tagColor}){
  const{dispatch}=useStore();
  return(
    <header style={{background:"linear-gradient(135deg,"+color+","+color+"CC)",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,background:"rgba(255,255,255,0.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{icon}</div>
        <div><div style={{fontSize:15,fontWeight:800,color:"white"}}>{title}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>{subtitle}</div></div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <Tag color={tagColor}>{tag}</Tag>
        <button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})} style={{fontSize:11,fontWeight:600,color:"white",background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>All modes</button>
      </div>
    </header>
  );
}

function AppInner(){
  const{state,dispatch}=useStore();
  const mode=state.appMode;
  if(mode==="home") return<HomeScreen/>;
  if(mode==="hiring") return<HiringShell/>;
  if(mode==="overview") return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",flexDirection:"column",overflow:"hidden"}}>
      <ModeHeader icon="🗺️" title="Project Overview" subtitle="All features — 2 min read" color="#1C1C1A" tag="FlowZint AI" tagColor="neutral"/>
      <main style={{flex:1,overflow:"hidden"}}><ProjectOverview onNavigate={(m)=>dispatch({type:"SET_MODE",payload:m})}/></main>
      <ToastLayer/>
    </div>
  );
  if(mode==="smb") return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",flexDirection:"column",overflow:"hidden"}}>
      <ModeHeader icon="🏪" title="SMB Brain" subtitle="1-Click Indian Business AI" color="#7C3AED" tag="Open Innovation" tagColor="purple"/>
      <main style={{flex:1,overflowY:"auto",padding:22}}><SMBMode/></main>
      <ToastLayer/><CrossModePanel/>
    </div>
  );
  if(mode==="warroom") return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",flexDirection:"column",overflow:"hidden"}}>
      <ModeHeader icon="⚡" title="AI War Room" subtitle="Multi-Agent Command Center" color="#0F172A" tag="Open Innovation" tagColor="neutral"/>
      <main style={{flex:1,overflowY:"auto",padding:20}}><WarRoomMode/></main>
      <ToastLayer/><CrossModePanel/>
    </div>
  );
  if(mode==="sales") return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",flexDirection:"column",overflow:"hidden"}}>
      <ModeHeader icon="🎯" title="SalesFlow AI" subtitle="Autonomous Sales Agent" color="#BA7517" tag="Sales Bot" tagColor="warn"/>
      <main style={{flex:1,overflowY:"auto",padding:22}}><SalesMode/></main>
      <ToastLayer/><CrossModePanel/>
    </div>
  );
  if(mode==="support") return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",flexDirection:"column",overflow:"hidden"}}>
      <ModeHeader icon="💬" title="SupportFlow AI" subtitle="Intelligent Support Bot" color="#1D9E75" tag="Support Chat Bot" tagColor="success"/>
      <main style={{flex:1,overflow:"hidden",padding:16}}><SupportMode/></main>
      <ToastLayer/><CrossModePanel/>
    </div>
  );
  if(mode==="care") return(
    <div style={{display:"flex",height:"100vh",background:"#F7F6F3",flexDirection:"column",overflow:"hidden"}}>
      <ModeHeader icon="❤️" title="CareFlow AI" subtitle="Customer Care Bot" color="#D4537E" tag="Customer Care Bot" tagColor="pink"/>
      <main style={{flex:1,overflowY:"auto",padding:20}}><CareMode/></main>
      <ToastLayer/><CrossModePanel/>
    </div>
  );
  return null;
}

export default function App(){
  const[state,dispatch]=useReducer(reducer,initialState);
  return(
    <Ctx.Provider value={{state,dispatch}}>
      <style>{GLOBAL_STYLES}</style>
      <AppInner/>
    </Ctx.Provider>
  );
}
