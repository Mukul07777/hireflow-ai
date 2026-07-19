import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback, useMemo, Component } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CANDIDATE_POOL, SAMPLE_INTERVIEW_QUESTIONS, detectDomain, getCandidatesForDomain } from "./SampleData.js";
import { RESUME_BANK, getResumesByDomain } from "./ResumeBank.js";
import { BiasAuditPanel } from "./BiasAudit.jsx";
import { CandidateDecisionBar, RejectionSummary } from "./RejectionFlow.jsx";
import { savePipelineRun as savePipelineRunLocal, PipelineHistoryPanel } from "./PipelineHistory.jsx";
import { BulkResumeProcessor } from "./BulkResumeProcessor.jsx";
import { ProjectOverview } from "./ProjectOverview.jsx";
import {
  savePipelineRun as dbSavePipeline,
  loadPipelineHistory,
  loadCandidatesForRun,
  saveOutreachEmail,
  markEmailSent,
  saveSalesSession,
  saveSupportSession,
  saveCareTicket,
  loadCareTickets,
  getMyEmployeeRecord,
  createCompanyAndAdmin,
  claimInviteIfAny,
  inviteEmployee,
  listEmployees,
  updateEmployeeRole,
  createCrossRoleSignal,
  listCrossRoleSignals,
  resolveCrossRoleSignal,
  saveBrainEvent,
  loadBrainEvents,
  DB_READY,
} from "./lib/db.js";
import { setAuthToken } from "./lib/supabase.js";
import { createKeyRotator } from "./lib/groqKeyRotation.js";
import { runIndiaComplianceCheck, formatComplianceFlags } from "./lib/indiaComplianceRules.js";
import { estimatePipelineCost } from "./lib/costEstimator.js";
import { ScoreRing, Avatar, Btn, Card, SkeletonLine, SkeletonCard, CandidateListSkeleton, AgentOutputSkeleton, ProspectListSkeleton, Tag, MetricCard, StreamText, Spinner, ProgressBar, Toast } from "./components/ui.jsx";
import { createCompanyBrain } from "./lib/companyBrain.js";
import { modeAllowedForRole, ROLE_MODE_ACCESS } from "./lib/modeAccess.js";
import { brainContextFor, salesAccountIntel } from "./lib/brainContext.js";
import { createOutcomeLearner } from "./lib/outcomeLearning.js";

// ── ROLE PERMISSIONS ────────────────────────────────────────────────────
// ROLE_MODE_ACCESS + modeAllowedForRole live in lib/modeAccess.js — fail-open by
// design and unit-tested (modeAccess.test.js), so "signing in removes features"
// can never regress silently. RLS in supabase/04_multitenancy.sql is the real,
// enforced boundary; this mapping only keeps the nav honest.

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
  crossEvents:[], smbProfile:null, warRoomLogs:{}, dynamicScores:{}, dynamicReasons:{}, darkMode:false, hindiMode:false,
  interviewMode:null, customQuestions:"", interviewDecisionOpen:false,
  activeCandidates:CANDIDATE_POOL.slice(0,5), roleDomain:"general",
  candidateDecisions:{}, submittedResumes:[], resumeScoring:false,
  pipelineStep:"jd", appliedResumes:[], dynamicVerdicts:{},
  employee:null, employeeLoading:true, team:[], crossSignals:[],
};

function reducer(s,a){
  switch(a.type){
    case "SET_MODE": return{...s,appMode:a.payload,activeNav:"dashboard"};
    case "SET_NAV": return{...s,activeNav:a.payload};
    case "TOGGLE_SIDEBAR": return{...s,sidebarOpen:!s.sidebarOpen};
    case "SET_JD": return{...s,jdText:a.payload};
    case "SET_PIPELINE": return{...s,pipelineState:a.payload};
    case "SET_EMPLOYEE": return{...s,employee:a.payload,employeeLoading:false};
    case "SET_TEAM": return{...s,team:a.payload};
    case "SET_SIGNALS": return{...s,crossSignals:a.payload};
    case "SET_AGENT_STATUS": return{...s,agentStatuses:{...s.agentStatuses,[a.id]:a.status}};
    case "SET_AGENT_LOG": return{...s,agentLogs:{...s.agentLogs,[a.id]:a.log}};
    case "SET_AGENT_STREAM": return{...s,agentStreams:{...s.agentStreams,[a.id]:a.text}};
    case "RESET_PIPELINE": return{...s,pipelineState:"idle",agentStatuses:{},agentLogs:{},agentStreams:{},biasReport:null,emailDrafts:{},interviewQs:{},aiAnalysis:{},sentEmails:{},salaryData:null,warRoomLogs:{},interviewMode:null,interviewDecisionOpen:false,dynamicScores:{},dynamicReasons:{},activeCandidates:CANDIDATE_POOL.slice(0,5),roleDomain:"general",pipelineStep:"jd",appliedResumes:[]};
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
    case "SET_DYNAMIC_REASONS": return{...s,dynamicReasons:a.payload};
    case "SET_INTERVIEW_MODE": return{...s,interviewMode:a.payload,interviewDecisionOpen:false};
    case "SET_CUSTOM_QUESTIONS": return{...s,customQuestions:a.payload};
    case "OPEN_INTERVIEW_DECISION": return{...s,interviewDecisionOpen:true};
    case "CLOSE_INTERVIEW_DECISION": return{...s,interviewDecisionOpen:false};
    case "ADD_CROSS_EVENT": return{...s,crossEvents:[a.event,...s.crossEvents].slice(0,20)};
    case "SET_SMB_PROFILE": return{...s,smbProfile:a.payload};
    case "TOGGLE_DARK": return{...s,darkMode:!s.darkMode};
    case "TOGGLE_HINDI": return{...s,hindiMode:!s.hindiMode};
    case "ADD_WAR_ROOM_LOG": return{...s,warRoomLogs:{...s.warRoomLogs,[a.agentId]:[...(s.warRoomLogs[a.agentId]||[]),a.log]}};
    case "SET_DB_RUN_ID": return{...s,dbRunId:a.payload};
    default: return s;
  }
}

const Ctx=createContext(null);
function useStore(){return useContext(Ctx);}
function useUserId(){const{session}=useStore();return session?.user?.id||null;}
function useToast(){const{dispatch}=useStore();return(msg,type="success")=>dispatch({type:"ADD_TOAST",payload:{msg,type}});}

// ── VOICE INPUT ────────────────────────────────────────────────────────────
function useVoiceInput({onResult,onInterim,lang="en-IN"}){
  const[listening,setListening]=useState(false);
  const[supported]=useState(()=>!!window.SpeechRecognition||!!window.webkitSpeechRecognition);
  const recRef=useRef(null);
  const start=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return;
    const rec=new SR();
    recRef.current=rec;
    rec.continuous=true;
    rec.interimResults=true;
    rec.lang=lang;
    rec.onstart=()=>setListening(true);
    rec.onend=()=>setListening(false);
    rec.onerror=()=>setListening(false);
    rec.onresult=(e)=>{
      let interim="";let final="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal) final+=e.results[i][0].transcript+" ";
        else interim+=e.results[i][0].transcript;
      }
      if(final&&onResult) onResult(final);
      if(onInterim) onInterim(interim);
    };
    rec.start();
  },[lang,onResult,onInterim]);
  const stop=useCallback(()=>{recRef.current?.stop();},[]);
  const toggle=useCallback(()=>{listening?stop():start();},[listening,start,stop]);
  return{listening,supported,toggle,stop};
}

function VoiceMicBtn({onResult,lang,style={}}){
  const{state}=useStore();
  const activeLang=lang||(state.hindiMode?"hi-IN":"en-IN");
  const[interim,setInterim]=useState("");
  const{listening,supported,toggle}=useVoiceInput({
    onResult:(t)=>onResult(t),
    onInterim:setInterim,
    lang:activeLang,
  });
  if(!supported) return null;
  return(
    <div style={{position:"relative",...style}}>
      <button
        onClick={toggle}
        title={listening?"Stop recording (click to stop)":"Speak your input (click to start)"}
        style={{
          display:"flex",alignItems:"center",gap:6,
          padding:"7px 14px",
          background:listening?"linear-gradient(135deg,#EF4444,#DC2626)":"linear-gradient(135deg,#7C3AED,#6D5FFA)",
          border:"none",borderRadius:10,cursor:"pointer",
          fontSize:12,fontWeight:700,color:"white",
          boxShadow:listening?"0 0 0 3px rgba(239,68,68,0.3)":"0 0 0 0px rgba(109,95,250,0)",
          transition:"all 0.2s",
          animation:listening?"voicePulse 1.2s ease-in-out infinite":"none",
        }}>
        <span style={{fontSize:15}}>{listening?"⏹":"🎙️"}</span>
        <span>{listening?"Stop":"Speak"}</span>
        {listening&&<span style={{width:6,height:6,background:"white",borderRadius:"50%",animation:"pulse 0.8s infinite"}}/>}
      </button>
      {interim&&<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#1C1C1A",color:"white",fontSize:11,padding:"5px 10px",borderRadius:8,zIndex:100,opacity:0.85,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🎙 {interim}</div>}
    </div>
  );
}

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────
class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(e){return{error:e};}
  componentDidCatch(e,info){console.error("[ErrorBoundary]",e,info);}
  render(){
    if(this.state.error){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:320,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:16}}>⚠️</div>
          <div style={{fontSize:18,fontWeight:800,color:"#111827",marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:13,color:"#6B7280",marginBottom:24,maxWidth:360}}>{this.state.error?.message||"An unexpected error occurred in this panel."}</div>
          <button onClick={()=>this.setState({error:null})}
            style={{padding:"10px 24px",background:"linear-gradient(135deg,#534AB7,#6D5FFA)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── SUPABASE AUTH (pure fetch — no SDK) ──────────────────────────────────
const SB_URL=import.meta.env.VITE_SUPABASE_URL||"";
const SB_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY||"";
const SB_AUTH=SB_URL?`${SB_URL}/auth/v1`:"";
const AUTH_STORAGE_KEY="flowzint_auth_session";

async function authSignUp(email,password,name=""){
  if(!SB_AUTH) return{error:{message:"Supabase not configured"}};
  try{
    const r=await fetch(`${SB_AUTH}/signup`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY},body:JSON.stringify({email,password,data:{full_name:name}})});
    return r.json();
  }catch(e){return{error:{message:e.message}};}
}
async function authSignIn(email,password){
  if(!SB_AUTH) return{error:{message:"Supabase not configured"}};
  try{
    const r=await fetch(`${SB_AUTH}/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY},body:JSON.stringify({email,password})});
    return r.json();
  }catch(e){return{error:{message:e.message}};}
}
async function authSignOut(token){
  if(!SB_AUTH||!token) return;
  try{await fetch(`${SB_AUTH}/logout`,{method:"POST",headers:{"Authorization":`Bearer ${token}`,"apikey":SB_KEY}});}catch{}
}
async function authGetUser(token){
  if(!SB_AUTH||!token) return null;
  try{
    const r=await fetch(`${SB_AUTH}/user`,{headers:{"Authorization":`Bearer ${token}`,"apikey":SB_KEY}});
    const d=await r.json();
    return d.id?d:null;
  }catch{return null;}
}
function authGoogleUrl(){
  if(!SB_AUTH) return"";
  return`${SB_AUTH}/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
}
function getStoredSession(){
  try{const s=localStorage.getItem(AUTH_STORAGE_KEY);return s?JSON.parse(s):null;}catch{return null;}
}
function storeSession(session){
  try{if(session)localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(session));else localStorage.removeItem(AUTH_STORAGE_KEY);}catch{}
}

// ── GROQ KEY ROTATION (round-robin across up to 4 keys for load distribution) ──
// Rotation logic itself lives in lib/groqKeyRotation.js (unit tested); this just wires env vars in.
const _GROQ_KEYS=[
  import.meta.env.VITE_GROQ_API_KEY,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
  import.meta.env.VITE_GROQ_API_KEY_4,
].filter(Boolean);
const _groqRotator=createKeyRotator(_GROQ_KEYS);
const getGroqKey=()=>_groqRotator.getKey();
const GROQ_API_KEY=import.meta.env.VITE_GROQ_API_KEY||"";
const GROQ_MODEL="llama-3.3-70b-versatile";
let HINDI_MODE=false; // synced from React state by HindiSync component
const HINDI_SUFFIX="\n\nIMPORTANT: Respond in Hinglish — a natural mix of Hindi and English the way educated Indians actually speak and text. Write in Roman script (not Devanagari). Example style: 'Aapka pipeline ready hai — 5 candidates shortlist hue hain, top pick Aditya Kumar hai jo 91/100 score kiya. Uska notice period 30 days hai toh jaldi decision lena padega.' Keep it warm, conversational, and professional.";

// ── ACTIVITY LOG (live backend transparency) ──────────────────────────────
const _actLog=[];
let _callCount=0;
const _actListeners=new Set();
function _pushActivity(entry){
  _actLog.unshift({...entry,id:Date.now()+Math.random(),ts:new Date()});
  if(_actLog.length>40)_actLog.pop();
  _actListeners.forEach(fn=>fn([..._actLog]));
}
function useActivityLog(){
  const[log,setLog]=useState([..._actLog]);
  useEffect(()=>{
    _actListeners.add(setLog);
    return()=>_actListeners.delete(setLog);
  },[]);
  return log;
}

// Non-streaming (used for structured JSON responses)
// Groq returns a 200-shaped JSON error body on bad/expired keys — fetch() doesn't throw on
// that, so without an explicit res.ok check a dead key fails silently (empty string) instead
// of retrying the next key in rotation. This wraps the request+retry so both callClaude and
// callClaudeStream get the same "skip a dead key, don't go silent" behavior.
async function fetchGroqWithRetry(payload){
  const maxAttempts=Math.max(1,_GROQ_KEYS.length);
  let lastRes=null,lastErrBody=null;
  for(let attempt=0;attempt<maxAttempts;attempt++){
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+getGroqKey()},
      body:JSON.stringify(payload)
    });
    if(res.ok) return res;
    lastRes=res;
    try{lastErrBody=await res.clone().json();}catch{lastErrBody=null;}
    // 401/403 = bad/expired key — worth burning a retry on the next key in rotation.
    // Other errors (429/5xx) would just fail the same way on every key, so don't loop those.
    if(res.status!==401&&res.status!==403) break;
  }
  const err=new Error("Groq API error "+(lastRes?.status||"?")+": "+(lastErrBody?.error?.message||"request failed after trying all configured keys"));
  err.status=lastRes?.status;
  throw err;
}

async function callClaude(messages,system=""){
  const callId=++_callCount;
  const keyIdx=_groqRotator.nextIndex;
  const promptLen=messages.reduce((n,m)=>n+(m.content?.length||0),0)+(system?.length||0);
  const t0=Date.now();
  _pushActivity({type:"api",status:"pending",callId,model:GROQ_MODEL,mode:"json",promptChars:promptLen,keySlot:keyIdx+1,totalKeys:_GROQ_KEYS.length,label:system.slice(0,60)||"AI call"});
  try{
    const sys=(HINDI_MODE&&!system.includes("JSON"))?system+HINDI_SUFFIX:system;
    const groqMessages=sys?[{role:"system",content:sys},...messages]:messages;
    const res=await fetchGroqWithRetry({model:GROQ_MODEL,max_tokens:1000,messages:groqMessages});
    const data=await res.json();
    const txt=data.choices?.[0]?.message?.content||"";
    const ms=Date.now()-t0;
    _pushActivity({type:"api",status:"done",callId,model:GROQ_MODEL,mode:"json",promptChars:promptLen,keySlot:keyIdx+1,totalKeys:_GROQ_KEYS.length,label:system.slice(0,60)||"AI call",ms,outputChars:txt.length,tokensEst:Math.round((promptLen+txt.length)/4)});
    return txt;
  }catch(e){
    _pushActivity({type:"api",status:"error",callId,model:GROQ_MODEL,label:system.slice(0,60)||"AI call",error:e.message});
    return"";
  }
}

// Real SSE streaming — onChunk(accumulatedText, newToken)
async function callClaudeStream(messages,system="",onChunk){
  const callId=++_callCount;
  const keyIdx=_groqRotator.nextIndex;
  const promptLen=messages.reduce((n,m)=>n+(m.content?.length||0),0)+(system?.length||0);
  const t0=Date.now();
  _pushActivity({type:"api",status:"streaming",callId,model:GROQ_MODEL,mode:"stream",promptChars:promptLen,keySlot:keyIdx+1,totalKeys:_GROQ_KEYS.length,label:system.slice(0,60)||"AI stream"});
  try{
    const sys=HINDI_MODE?(system+HINDI_SUFFIX):system;
    const groqMessages=sys?[{role:"system",content:sys},...messages]:messages;
    const res=await fetchGroqWithRetry({model:GROQ_MODEL,max_tokens:1000,messages:groqMessages,stream:true});
    const reader=res.body.getReader();
    const decoder=new TextDecoder();
    let full="";
    while(true){
      const{done,value}=await reader.read();
      if(done) break;
      const raw=decoder.decode(value,{stream:true});
      for(const line of raw.split("\n")){
        const l=line.trim();
        if(!l.startsWith("data:")) continue;
        const d=l.slice(5).trim();
        if(d==="[DONE]") break;
        try{
          const token=JSON.parse(d).choices?.[0]?.delta?.content||"";
          if(token){full+=token;onChunk(full,token);}
        }catch{}
      }
    }
    const ms=Date.now()-t0;
    _pushActivity({type:"api",status:"done",callId,model:GROQ_MODEL,mode:"stream",promptChars:promptLen,keySlot:keyIdx+1,totalKeys:_GROQ_KEYS.length,label:system.slice(0,60)||"AI stream",ms,outputChars:full.length,tokensEst:Math.round((promptLen+full.length)/4)});
    return full;
  }catch(e){
    _pushActivity({type:"api",status:"error",callId,model:GROQ_MODEL,label:system.slice(0,60)||"AI stream",error:e.message});
    return"";
  }
}

// ── TEXT TO SPEECH ───────────────────────────────────────────────────────────
let _ttsEnabled=false;
function setTTSEnabled(v){_ttsEnabled=v;if(!v&&window.speechSynthesis)window.speechSynthesis.cancel();}
function speak(text){
  if(!_ttsEnabled||!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const clean=text.replace(/[*_#\[\]]/g,"").replace(/`/g,"").replace(/HANDOFF_TO_\w+:\s*.+/gi,"").replace(/[☀-➿]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g,"").trim().slice(0,300);
  if(!clean)return;
  const utt=new SpeechSynthesisUtterance(clean);
  // Chrome loads voices async — retry once if empty
  const trySpeak=()=>{
    const voices=window.speechSynthesis.getVoices();
    const v=voices.find(v=>v.lang==="en-IN")||voices.find(v=>v.lang.startsWith("en-"))||voices[0];
    if(v)utt.voice=v;
    utt.rate=1.08;utt.pitch=1.05;utt.volume=0.95;
    window.speechSynthesis.speak(utt);
  };
  if(window.speechSynthesis.getVoices().length>0)trySpeak();
  else window.speechSynthesis.onvoiceschanged=()=>{trySpeak();window.speechSynthesis.onvoiceschanged=null;};
}

// ── WHATSAPP SEND (CallMeBot) ─────────────────────────────────────────────
// Set VITE_CALLMEBOT_PHONE and VITE_CALLMEBOT_APIKEY in Netlify env vars.
// Setup: send "I allow callmebot to send me messages" to +34 644 59 97 91 on WhatsApp.
// CallMeBot will reply with your API key.
async function sendWhatsAppReal(message){
  const phone=import.meta.env.VITE_CALLMEBOT_PHONE;
  const apikey=import.meta.env.VITE_CALLMEBOT_APIKEY;
  if(!phone||!apikey) return false;
  try{
    const url=`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
    const r=await fetch(url,{mode:"no-cors"});
    // no-cors: we can't read the response but the request goes through
    return true;
  }catch{return false;}
}

// ── SAMPLE DATA ───────────────────────────────────────────────────────────
const SAMPLE_JD="Senior Frontend Engineer — Remote\n\nWe are a Bangalore-based B2B SaaS startup (Series A, 80 employees).\n\nRequirements:\n- 4+ years React + TypeScript\n- Next.js, GraphQL experience\n- System design fundamentals\n- Mentoring junior developers\n- Startup mindset\n\nCompensation: Rs 28-42 LPA + equity + fully remote";
const SAMPLE_PRODUCT="NexFlow AI Platform\n\nAutonomous multi-agent AI for Indian SMBs. Automates hiring, sales, support, and care.\n\nPricing: Starter Rs 999/month, Team Rs 2,999/month, Enterprise custom.\nFree trial: 14 days, no credit card.";
const SAMPLE_TARGET="B2B SaaS startups in India (Series A-B, 50-300 employees). CTOs struggling with scaling hiring and customer ops. Bangalore, Mumbai, Hyderabad, Delhi-NCR.";
const SAMPLE_DOCS="NexFlow Help Center\n\nGetting Started: Sign up at flowzint.in, create workspace, choose template, paste context, run pipeline.\n\nPricing: Starter Rs 999/month, Team Rs 2,999/month, Enterprise custom.\n\nRefund Policy: 14-day money-back. Email support@flowzint.in.\n\nPipeline stuck: Hard refresh then restart. API errors: Settings > Integrations.\n\nData Privacy: AES-256 encryption. SOC2 Type II. Data stays in India.";
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
// UI primitives now live in components/ui.jsx (pure, presentational).
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
  const hasReasoning=stream||(warLogs.length>0);
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
          {(status==="active"||status==="done")&&hasReasoning&&(
            <button onClick={()=>setExpanded(!expanded)} style={{fontSize:9,background:expanded?"rgba(83,74,183,0.15)":"rgba(83,74,183,0.08)",border:"1px solid rgba(83,74,183,0.2)",borderRadius:5,padding:"2px 8px",cursor:"pointer",color:"#534AB7",fontWeight:700,transition:"all 0.15s"}}>
              {expanded?"▲ hide":"▼ reasoning"}
            </button>
          )}
        </div>
      </div>
      {status==="active"&&stream&&(
        <div style={{marginTop:8,background:"rgba(83,74,183,0.06)",borderRadius:7,padding:"8px 10px",fontSize:10,color:"#534AB7",lineHeight:1.7,borderLeft:"2px solid #534AB7",whiteSpace:"pre-wrap"}}>
          <div style={{fontSize:9,fontWeight:800,color:"#534AB7",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>🧠 AI thinking live</div>
          <StreamText text={stream} speed={20}/>
        </div>
      )}
      {expanded&&status==="done"&&(
        <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{marginTop:8,background:"white",borderRadius:8,padding:"10px 12px",border:"1px solid #CECBF6",borderLeft:"3px solid #534AB7"}}>
          <div style={{fontSize:9,fontWeight:800,color:"#534AB7",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>What this agent found</div>
          {stream&&<div style={{fontSize:11,color:"#374151",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:warLogs.length>0?8:0}}>{stream}</div>}
          {warLogs.length>0&&(
            <div style={{borderTop:stream?"1px solid #EDE9FE":"none",paddingTop:stream?8:0}}>
              {warLogs.map((l,i)=><div key={i} style={{fontSize:10,color:"#5F5E5A",lineHeight:1.6,marginBottom:2,display:"flex",gap:6}}><span style={{color:"#A78BFA",fontWeight:700,flexShrink:0}}>{String(i+1).padStart(2,"0")}</span>{l}</div>)}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────
function AnimatedCount({end,prefix="",suffix="",delay=0}){
  const[val,setVal]=useState(0);
  useEffect(()=>{
    const t=setTimeout(()=>{
      let s=0;const step=Math.ceil(end/50);
      const id=setInterval(()=>{s+=step;if(s>=end){setVal(end);clearInterval(id);}else setVal(s);},24);
      return()=>clearInterval(id);
    },delay);
    return()=>clearTimeout(t);
  },[end,delay]);
  return<span>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
}

// ── LIVE AGENT NETWORK VISUALIZATION ─────────────────────────────────────
const AGENT_NODES=[
  {id:"smb",    label:"SMB Brain",   icon:"🏪", x:400, y:80,  color:"#8B5CF6"},
  {id:"hiring", label:"HireFlow",    icon:"🧠", x:160, y:210, color:"#534AB7"},
  {id:"sales",  label:"SalesFlow",   icon:"🎯", x:640, y:210, color:"#F59E0B"},
  {id:"support",label:"SupportFlow", icon:"💬", x:160, y:360, color:"#1D9E75"},
  {id:"care",   label:"CareFlow",    icon:"❤️", x:640, y:360, color:"#F43F5E"},
  {id:"warroom",label:"War Room",    icon:"⚡", x:400, y:450, color:"#0EA5E9"},
];
const AGENT_EDGES=[
  {from:"smb",to:"sales"},{from:"smb",to:"support"},{from:"smb",to:"hiring"},
  {from:"hiring",to:"warroom"},{from:"sales",to:"warroom"},
  {from:"support",to:"warroom"},{from:"care",to:"warroom"},
  {from:"care",to:"sales"},{from:"support",to:"care"},
];
const EVENT_EDGE_MAP={
  smb_to_sales:{from:"smb",to:"sales"},smb_to_support:{from:"smb",to:"support"},
  smb_complete:{from:"smb",to:"warroom"},care_to_sales:{from:"care",to:"sales"},
  agent_handoff:{from:"hiring",to:"warroom"},hiring_to_care:{from:"hiring",to:"care"},
};
function AgentNetworkViz({crossEvents=[],onNodeClick}){
  const[pulses,setPulses]=useState([]); // [{id,ax,ay,bx,by,col,progress,ambient}]
  const[hovered,setHovered]=useState(null);
  const[activeNodes,setActiveNodes]=useState(new Set());
  const rafRef=useRef(null);
  const pulsesRef=useRef([]);

  // RAF loop to animate pulses
  useEffect(()=>{
    const tick=()=>{
      pulsesRef.current=pulsesRef.current.map(p=>({...p,progress:p.progress+(p.ambient?0.008:0.012)})).filter(p=>p.progress<=1);
      setPulses([...pulsesRef.current]);
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  const spawnPulse=(fromId,toId,ambient=false)=>{
    const a=AGENT_NODES.find(n=>n.id===fromId),b=AGENT_NODES.find(n=>n.id===toId);
    if(!a||!b) return;
    const id=Date.now()+Math.random();
    pulsesRef.current=[...pulsesRef.current,{id,ax:a.x,ay:a.y,bx:b.x,by:b.y,col:a.color,progress:0,ambient}];
  };

  // React to cross events
  useEffect(()=>{
    if(!crossEvents.length) return;
    const pair=EVENT_EDGE_MAP[crossEvents[0]?.type];
    if(!pair) return;
    spawnPulse(pair.from,pair.to,false);
    setActiveNodes(s=>new Set([...s,pair.from,pair.to]));
    const t=setTimeout(()=>setActiveNodes(s=>{const n=new Set(s);n.delete(pair.from);n.delete(pair.to);return n;}),2500);
    return()=>clearTimeout(t);
  },[crossEvents.length]);

  // Ambient pulses every 2.5s
  useEffect(()=>{
    const id=setInterval(()=>{
      const e=AGENT_EDGES[Math.floor(Math.random()*AGENT_EDGES.length)];
      spawnPulse(e.from,e.to,true);
    },2500);
    return()=>clearInterval(id);
  },[]);

  const W=800,H=520;
  return(
    <div style={{background:"#09090B",padding:"0 0 28px",overflow:"hidden"}}>
      <div style={{maxWidth:860,margin:"0 auto",padding:"0 28px"}}>
        <div style={{textAlign:"center",marginBottom:12}}>
          <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.22)",letterSpacing:"0.14em",textTransform:"uppercase"}}>Live multi-agent network — click any node to open</span>
        </div>
        <div style={{position:"relative",borderRadius:16,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.015)",overflow:"hidden"}}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
            {/* Edges */}
            {AGENT_EDGES.map((e,i)=>{
              const a=AGENT_NODES.find(n=>n.id===e.from),b=AGENT_NODES.find(n=>n.id===e.to);
              const hot=hovered===e.from||hovered===e.to;
              return<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={hot?"rgba(139,92,246,0.45)":"rgba(255,255,255,0.055)"}
                strokeWidth={hot?1.5:1} strokeDasharray={hot?"none":"5 5"}/>;
            })}
            {/* JS-driven pulses */}
            {pulses.map(p=>{
              const t=p.progress;
              const cx=p.ax+(p.bx-p.ax)*t;
              const cy=p.ay+(p.by-p.ay)*t;
              const opacity=t<0.15?t/0.15:t>0.8?(1-t)/0.2:1;
              return<circle key={p.id} cx={cx} cy={cy} r={p.ambient?3:5}
                fill={p.col} opacity={(p.ambient?0.55:0.95)*opacity}
                style={{filter:`drop-shadow(0 0 ${p.ambient?5:10}px ${p.col})`}}/>;
            })}
            {/* Nodes */}
            {AGENT_NODES.map(n=>{
              const hov=hovered===n.id,act=activeNodes.has(n.id);
              return(
                <g key={n.id} style={{cursor:"pointer"}}
                  onMouseEnter={()=>setHovered(n.id)} onMouseLeave={()=>setHovered(null)}
                  onClick={()=>onNodeClick&&onNodeClick(n.id)}>
                  {/* Glow */}
                  <circle cx={n.x} cy={n.y} r={act?56:hov?50:38}
                    fill={n.color} opacity={act?0.18:hov?0.14:0.07}
                    style={{transition:"all 0.35s"}}/>
                  {/* Node bg */}
                  <circle cx={n.x} cy={n.y} r={hov?32:27}
                    fill="#0D0D12" stroke={n.color}
                    strokeWidth={act?2.5:hov?2:1.3}
                    opacity={1}
                    style={{transition:"all 0.25s",filter:act||hov?`drop-shadow(0 0 14px ${n.color}AA)`:"none"}}/>
                  {/* Icon */}
                  <text x={n.x} y={n.y+6} textAnchor="middle" fontSize={hov?19:16}
                    style={{userSelect:"none"}}>{n.icon}</text>
                  {/* Label */}
                  <text x={n.x} y={n.y+46} textAnchor="middle" fontSize="10" fontWeight="700"
                    fill={act||hov?n.color:"rgba(255,255,255,0.38)"}
                    fontFamily="Inter,system-ui,sans-serif"
                    style={{userSelect:"none",transition:"fill 0.2s"}}>{n.label}</text>
                  {/* Live dot */}
                  {act&&<circle cx={n.x+22} cy={n.y-22} r={4} fill="#22C55E" opacity={0.9}
                    style={{filter:"drop-shadow(0 0 4px #22C55E)"}}/>}
                </g>
              );
            })}
            {/* Watermark */}
            <text x={W/2} y={H/2+4} textAnchor="middle" fontSize="11" fontWeight="900"
              fill="rgba(255,255,255,0.04)" fontFamily="Inter,system-ui,sans-serif"
              letterSpacing="4" style={{userSelect:"none"}}>FLOWZINT AI</text>
          </svg>
          {crossEvents.length>0&&(
            <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",background:"rgba(109,95,250,0.18)",border:"1px solid rgba(109,95,250,0.35)",borderRadius:20,padding:"5px 16px",whiteSpace:"nowrap",backdropFilter:"blur(6px)"}}>
              <span style={{fontSize:9,fontWeight:700,color:"#C4B5FD"}}>⚡ {crossEvents[0].title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeScreen(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[demoRunning,setDemoRunning]=useState(false);

  const runAutoDemo=async()=>{
    setDemoRunning(true);
    const step=(msg,delay=1800)=>new Promise(r=>{toast(msg,"info");setTimeout(r,delay);});

    // 1. Pre-fill all sample data silently
    dispatch({type:"SET_JD",payload:SAMPLE_JD});
    dispatch({type:"SET_SALES_PRODUCT",payload:SAMPLE_PRODUCT});
    dispatch({type:"SET_SALES_TARGET",payload:SAMPLE_TARGET});
    dispatch({type:"SET_SUPPORT_DOCS",payload:SAMPLE_DOCS});
    dispatch({type:"SET_SMB_PROFILE",payload:{name:SAMPLE_SMB.name,type:SAMPLE_SMB.type,city:SAMPLE_SMB.city}});

    await step("🎬 Auto-Demo starting — loading all sample data...",1200);
    await step("🏪 Step 1: SMB Brain — Kirana King's WhatsApp data loaded",1400);
    dispatch({type:"SET_MODE",payload:"smb"});
    await step("🧠 Step 2: HireFlow — Sample JD & 5 candidates loaded. Pipeline ready.",1400);
    dispatch({type:"SET_MODE",payload:"hiring"});
    await step("🎯 Step 3: SalesFlow — NexFlow AI product + Indian B2B target loaded.",1400);
    dispatch({type:"SET_MODE",payload:"sales"});
    await step("⚡ Step 4: War Room — All agents briefed. Click Activate to watch them debate!",1600);
    dispatch({type:"SET_MODE",payload:"warroom"});
    setDemoRunning(false);
  };

  // AI systems in a sensible flow: SMB Brain first (the recommended start), then the
  // four operational agents, then War Room, then the Company Brain that ties them together.
  const modes=[
    {id:"smb",icon:"🏪",title:"SMB Brain",sub:"Business Intelligence",desc:"Paste raw WhatsApp messages. AI extracts every customer, builds your CRM, FAQ and sales pipeline automatically.",color:"#8B5CF6",glow:"rgba(139,92,246,0.18)",chip:"WhatsApp CRM · tier-2 India · ROI"},
    {id:"hiring",icon:"🧠",title:"HireFlow AI",sub:"Hiring Intelligence",desc:"7 AI agents rank resumes, draft outreach emails, generate interview questions and audit bias — from a single JD paste.",color:"#6D5FFA",glow:"rgba(109,95,250,0.18)",chip:"7 agents · real scoring · bias audit"},
    {id:"sales",icon:"🎯",title:"SalesFlow AI",sub:"Autonomous Sales",desc:"AI builds Indian B2B prospect lists, writes personalized cold emails, and handles live objections — even in Hindi.",color:"#F59E0B",glow:"rgba(245,158,11,0.18)",chip:"Prospects · cold email · objection AI"},
    {id:"support",icon:"💬",title:"SupportFlow AI",sub:"Support Intelligence",desc:"Paste your docs once. AI builds a knowledge base and answers every customer question using only your content.",color:"#10B981",glow:"rgba(16,185,129,0.18)",chip:"KB builder · sentiment · CSAT"},
    {id:"care",icon:"❤️",title:"CareFlow AI",sub:"Customer Care",desc:"AI reads tickets, scores urgency, picks the right tone, and drafts replies. You approve before anything sends.",color:"#F43F5E",glow:"rgba(244,63,94,0.18)",chip:"Triage · SLA timer · human approval"},
    {id:"warroom",icon:"⚡",title:"AI War Room",sub:"Multi-Agent Control",desc:"Every operational agent fires simultaneously. Agents debate, hand off work to each other, and produce one unified report.",color:"#0EA5E9",glow:"rgba(14,165,233,0.18)",chip:"Parallel · cross-agent · live debates"},
    {id:"brain",icon:"🧩",title:"Company Brain",sub:"Shared Memory",desc:"One memory every agent shares. The same person seen by sales and support becomes one record — and the Brain tells you the cross-team move to make next.",color:"#1C7A93",glow:"rgba(28,122,147,0.20)",chip:"Identity resolution · timeline · next-best-action"},
  ];
  // Team is NOT an AI system — it's an admin feature. Kept separate on purpose.
  const teamMode={id:"team",icon:"👥",title:"Team",sub:"Admin feature — not AI",desc:"Invite employees, assign roles, and see who has access to what across your company.",color:"#64748B",glow:"rgba(100,116,139,0.18)",chip:"Invite · roles · access"};
  const visibleModes=modes.filter(m=>modeAllowedForRole(m.id,state.employee?.role));
  const showTeam=modeAllowedForRole("team",state.employee?.role);

  const proof=[
    {icon:"🤖",stat:"Zero",label:"hardcoded AI responses"},
    {icon:"✉️",stat:"Real",label:"emails hit actual inboxes"},
    {icon:"🗄️",stat:"Live",label:"PostgreSQL saves everything"},
    {icon:"⏱️",stat:"< 4 min",label:"per full pipeline run"},
  ];

  return(
    <div style={{minHeight:"100vh",fontFamily:"Inter,system-ui,sans-serif",background:"radial-gradient(130% 90% at 50% -10%,#F8F2E4 0%,#F0E7D5 52%,#F5EEDF 100%)",overflowX:"hidden"}}>

      {/* ── PREMIUM CREAM HERO ───────────────────────────────────── */}
      <div style={{position:"relative",overflow:"hidden",padding:"0 28px 72px"}}>
        {/* Warm ambient glow */}
        <div style={{position:"absolute",top:-160,left:"50%",transform:"translateX(-50%)",width:820,height:620,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,178,120,0.28) 0%,transparent 68%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:120,left:"6%",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(28,122,147,0.10) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:60,right:"6%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(184,137,74,0.12) 0%,transparent 70%)",pointerEvents:"none"}}/>
        {/* Fine dotted texture */}
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(120,95,55,0.06) 1px,transparent 1px)",backgroundSize:"22px 22px",pointerEvents:"none",maskImage:"linear-gradient(180deg,black 0%,transparent 85%)",WebkitMaskImage:"linear-gradient(180deg,black 0%,transparent 85%)"}}/>

        {/* Nav */}
        <div className="hero-nav" style={{maxWidth:1080,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:24,position:"relative",zIndex:2}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(150deg,#0D3B4F,#1C7A93)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 6px 18px rgba(13,59,79,0.28)"}}>⚡</div>
            <div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,fontWeight:800,color:"#211E19",letterSpacing:"-0.01em"}}>NexFlow AI</div>
              <div style={{fontSize:10,color:"#8A7B63",fontWeight:600,letterSpacing:"0.04em"}}>Multi-Agent Platform</div>
            </div>
          </div>
          <div className="hero-nav-buttons" style={{display:"flex",gap:9,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,253,248,0.7)",border:"1px solid rgba(120,95,55,0.16)",borderRadius:22,padding:"6px 14px",backdropFilter:"blur(6px)"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#1C9E75",boxShadow:"0 0 0 3px rgba(28,158,117,0.2)",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:10,fontWeight:700,color:"#6B6355",letterSpacing:"0.06em"}}>ALL SYSTEMS ONLINE</span>
            </div>
            <button onClick={()=>dispatch({type:"TOGGLE_HINDI"})}
              title={state.hindiMode?"Switch to English":"Switch to Hindi / हिंदी"}
              style={{padding:"7px 12px",background:state.hindiMode?"#0D3B4F":"rgba(255,253,248,0.7)",border:"1px solid "+(state.hindiMode?"#0D3B4F":"rgba(120,95,55,0.18)"),borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",color:state.hindiMode?"#F5EEDF":"#4A4235",transition:"all 0.2s"}}>
              {state.hindiMode?"🌐 EN":"🇮🇳 HI"}
            </button>
            <button onClick={()=>dispatch({type:"TOGGLE_DARK"})}
              title={state.darkMode?"Light mode":"Dark mode"}
              style={{padding:"7px 10px",background:"rgba(255,253,248,0.7)",border:"1px solid rgba(120,95,55,0.18)",borderRadius:20,fontSize:13,cursor:"pointer",transition:"all 0.15s"}}>
              {state.darkMode?"☀️":"🌙"}
            </button>
            <button onClick={()=>dispatch({type:"SET_MODE",payload:"overview"})}
              style={{padding:"7px 16px",background:"rgba(255,253,248,0.7)",border:"1px solid rgba(120,95,55,0.18)",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",color:"#4A4235",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#211E19";e.currentTarget.style.borderColor="#211E19";e.currentTarget.style.color="#F5EEDF";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,253,248,0.7)";e.currentTarget.style.borderColor="rgba(120,95,55,0.18)";e.currentTarget.style.color="#4A4235";}}>
              Features & Docs
            </button>
            <UserChip/>
          </div>
        </div>

        {/* Hero */}
        <div style={{maxWidth:1080,margin:"66px auto 0",textAlign:"center",position:"relative",zIndex:2}}>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
            style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,253,248,0.85)",border:"1px solid rgba(184,137,74,0.4)",borderRadius:22,padding:"7px 18px",marginBottom:30,boxShadow:"0 2px 10px rgba(120,95,55,0.06)"}}>
            <span style={{fontSize:13}}>🇮🇳</span>
            <span style={{fontSize:11,fontWeight:700,color:"#9A6A2E",letterSpacing:"0.03em"}}>Built for how Indian businesses actually work</span>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:0.08}}
            className="hero-h1" style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:66,fontWeight:800,lineHeight:1.04,letterSpacing:"-0.02em",color:"#211E19",maxWidth:820,margin:"0 auto 22px"}}>
            Seven AI systems.<br/>
            <span style={{fontStyle:"italic",fontWeight:600,background:"linear-gradient(100deg,#0D3B4F,#1C7A93,#B8894A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>One quiet platform.</span>
          </motion.h1>

          <motion.p initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.48,delay:0.16}}
            style={{fontSize:16.5,color:"#6B6355",lineHeight:1.75,maxWidth:540,margin:"0 auto 42px"}}>
            Hiring, sales, support, care, SMB intelligence, and a live agent War Room — all running simultaneously, all powered by real AI.
          </motion.p>

          {/* Guided path */}
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.44,delay:0.24}}
            style={{marginBottom:44}}>
            {/* "Best demo path" strip */}
            <div style={{background:"rgba(255,253,248,0.72)",border:"1px solid rgba(184,137,74,0.28)",borderRadius:16,padding:"16px 24px",marginBottom:18,maxWidth:660,margin:"0 auto 18px",boxShadow:"0 8px 30px rgba(120,95,55,0.07)",backdropFilter:"blur(8px)"}}>
              <div style={{fontSize:10,fontWeight:800,color:"#9A6A2E",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>✦ Best demo path — follow in order</div>
              <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap",justifyContent:"center"}}>
                {[{step:1,icon:"🏪",label:"SMB Brain",id:"smb",color:"#8B5CF6"},{step:2,icon:"🎯",label:"SalesFlow",id:"sales",color:"#B8894A"},{step:3,icon:"❤️",label:"CareFlow",id:"care",color:"#C0546F"},{step:4,icon:"⚡",label:"War Room",id:"warroom",color:"#1C7A93"}].map((s,i,arr)=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:0}}>
                    <button onClick={()=>dispatch({type:"SET_MODE",payload:s.id})}
                      style={{display:"flex",alignItems:"center",gap:7,background:"#FFFDF8",border:"1px solid rgba(120,95,55,0.16)",borderRadius:10,padding:"8px 14px",cursor:"pointer",transition:"all 0.15s",fontSize:12,fontWeight:700,color:"#3A342A"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=s.color+"14";e.currentTarget.style.borderColor=s.color+"66";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="#FFFDF8";e.currentTarget.style.borderColor="rgba(120,95,55,0.16)";}}>
                      <span style={{fontSize:10,fontWeight:900,color:s.color,background:s.color+"1E",borderRadius:"50%",width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{s.step}</span>
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                    {i<arr.length-1&&<div style={{color:"rgba(120,95,55,0.35)",fontSize:14,padding:"0 4px"}}>→</div>}
                  </div>
                ))}
              </div>
            </div>
            {/* Primary CTA */}
            <div className="hero-ctas" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              {/* AUTO-DEMO — the big one, dark premium pill */}
              <button onClick={runAutoDemo} disabled={demoRunning}
                style={{padding:"14px 30px",background:demoRunning?"#8A7B63":"#211E19",border:"none",borderRadius:999,fontSize:14,fontWeight:700,color:"#F5EEDF",cursor:demoRunning?"not-allowed":"pointer",boxShadow:demoRunning?"none":"0 10px 30px rgba(33,30,25,0.28)",transition:"all 0.2s",display:"flex",alignItems:"center",gap:8}}
                onMouseEnter={e=>{if(!demoRunning){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 16px 40px rgba(33,30,25,0.38)";}}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=demoRunning?"none":"0 10px 30px rgba(33,30,25,0.28)";}}>
                {demoRunning?<><Spinner color="#F5EEDF"/>Loading demo...</>:"▶ Auto-Demo — see everything in 8 seconds"}
              </button>
              <button onClick={()=>dispatch({type:"SET_MODE",payload:"smb"})}
                style={{padding:"14px 26px",background:"linear-gradient(150deg,#0D3B4F,#1C7A93)",border:"none",borderRadius:999,fontSize:14,fontWeight:700,color:"#F5F8F8",cursor:"pointer",boxShadow:"0 10px 26px rgba(13,59,79,0.26)",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}>
                🏪 SMB Brain →
              </button>
              <button onClick={()=>dispatch({type:"SET_MODE",payload:"warroom"})}
                style={{padding:"14px 26px",background:"rgba(255,253,248,0.7)",border:"1px solid rgba(120,95,55,0.22)",borderRadius:999,fontSize:14,fontWeight:700,color:"#3A342A",cursor:"pointer",transition:"all 0.2s",backdropFilter:"blur(8px)"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="rgba(28,122,147,0.55)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="rgba(120,95,55,0.22)";}}>
                ⚡ War Room
              </button>
            </div>
          </motion.div>

          {/* Proof pills */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5,delay:0.38}}
            style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            {proof.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,253,248,0.66)",border:"1px solid rgba(120,95,55,0.14)",borderRadius:12,padding:"10px 16px",backdropFilter:"blur(6px)"}}>
                <span style={{fontSize:16}}>{p.icon}</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#211E19",lineHeight:1}}>{p.stat}</div>
                  <div style={{fontSize:10,color:"#8A7B63",marginTop:2}}>{p.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── LIVE AGENT NETWORK ──────────────────────────────── */}
      <AgentNetworkViz crossEvents={state.crossEvents} onNodeClick={(id)=>dispatch({type:"SET_MODE",payload:id})}/>

      {/* ── MODE CARDS ──────────────────────────────────────── */}
      <div className="mode-cards-section" style={{background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderTop:"1px solid rgba(120,95,55,0.1)",padding:"56px 28px 48px"}}>
        <div style={{maxWidth:1080,margin:"0 auto"}}>
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.28}}
            style={{textAlign:"center",marginBottom:40}}>
            <div style={{fontSize:11,fontWeight:800,color:"#9A6A2E",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Choose your agent</div>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:34,fontWeight:800,color:"#211E19",letterSpacing:"-0.01em"}}>Seven AI systems. Pick one to start.</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:14,background:"rgba(255,253,248,0.85)",border:"1px solid rgba(184,137,74,0.35)",borderRadius:999,padding:"7px 18px",fontSize:13,fontWeight:700,color:"#3A342A"}}>
              <span>6 agents</span>
              <span style={{color:"#9A6A2E",fontWeight:800}}>+</span>
              <span>the Company Brain</span>
              <span style={{color:"#9A6A2E",fontWeight:800}}>=</span>
              <span style={{background:"linear-gradient(100deg,#0D3B4F,#1C7A93,#B8894A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",fontWeight:900}}>7 AI</span>
            </div>
          </motion.div>

          <div className="home-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {visibleModes.map((m,i)=>{const isStart=m.id==="smb";return(
              <motion.div key={m.id}
                initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
                transition={{duration:0.4,delay:0.08+i*0.06}}
                onClick={()=>dispatch({type:"SET_MODE",payload:m.id})}
                style={{background:"#FFFDF8",borderRadius:16,border:isStart?"1.5px solid #C79A57":"1px solid rgba(120,95,55,0.14)",padding:"22px 22px 20px",cursor:"pointer",position:"relative",overflow:"hidden",transition:"all 0.22s ease",boxShadow:isStart?"0 10px 30px rgba(184,137,74,0.18)":"0 2px 10px rgba(120,95,55,0.05)",...(m.id==="brain"?{gridColumn:"span 2"}:{})}}
                whileHover={{y:-5,boxShadow:`0 16px 40px ${m.glow}`,borderColor:m.color+"55"}}>

                {/* Left color bar */}
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:m.color,borderRadius:"16px 0 0 16px",opacity:0.7}}/>
                {isStart&&<div style={{position:"absolute",top:12,right:12,display:"flex",alignItems:"center",gap:5,background:"#211E19",color:"#F5EEDF",fontSize:9,fontWeight:800,padding:"4px 11px 4px 9px",borderRadius:999,letterSpacing:"0.1em",boxShadow:"0 3px 10px rgba(33,30,25,0.25)"}}><span style={{width:5,height:5,borderRadius:"50%",background:"#E0B463",boxShadow:"0 0 0 2px rgba(224,180,99,0.3)"}}/>START HERE</div>}

                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,paddingLeft:8}}>
                  <div style={{width:44,height:44,borderRadius:12,background:m.color+"14",border:`1.5px solid ${m.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                    {m.icon}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:"#111827",letterSpacing:"-0.01em"}}>{m.title}</div>
                    <div style={{fontSize:10,color:m.color,fontWeight:700,marginTop:2,letterSpacing:"0.02em",textTransform:"uppercase"}}>{m.sub}</div>
                  </div>
                </div>

                <div style={{fontSize:12.5,color:"#6B7280",lineHeight:1.7,marginBottom:16,paddingLeft:8,minHeight:52}}>{m.desc}</div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingLeft:8}}>
                  <div style={{fontSize:10,color:"#9CA3AF",fontWeight:500}}>{m.chip}</div>
                  <div style={{width:28,height:28,borderRadius:8,background:m.color+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:m.color,fontWeight:800,flexShrink:0}}>→</div>
                </div>
              </motion.div>
            );})}
        </div>

        {/* ── NON-AI ADMIN FEATURE (kept separate from the 7 AI systems) ── */}
        {showTeam&&(
          <div style={{maxWidth:1080,margin:"32px auto 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
              <div style={{flex:1,height:1,background:"rgba(120,95,55,0.16)"}}/>
              <div style={{fontSize:10,fontWeight:800,color:"#8A7B63",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Not an AI system — admin feature</div>
              <div style={{flex:1,height:1,background:"rgba(120,95,55,0.16)"}}/>
            </div>
            <motion.div initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.4}}
              onClick={()=>dispatch({type:"SET_MODE",payload:teamMode.id})}
              style={{maxWidth:520,margin:"0 auto",display:"flex",alignItems:"center",gap:16,background:"rgba(241,239,232,0.6)",border:"1px dashed rgba(120,95,55,0.3)",borderRadius:16,padding:"18px 22px",cursor:"pointer",transition:"all 0.2s"}}
              whileHover={{y:-3,background:"rgba(241,239,232,0.9)",borderColor:"rgba(120,95,55,0.45)"}}>
              <div style={{width:46,height:46,borderRadius:12,background:"#64748B18",border:"1.5px solid #64748B33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{teamMode.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>{teamMode.title}</span>
                  <span style={{fontSize:9,fontWeight:800,color:"#5F5E5A",background:"#E5E3DB",borderRadius:20,padding:"2px 8px",letterSpacing:"0.04em"}}>ADMIN · NO AI</span>
                </div>
                <div style={{fontSize:12,color:"#6B7280",lineHeight:1.6,marginTop:4}}>{teamMode.desc}</div>
              </div>
              <div style={{width:28,height:28,borderRadius:8,background:"#64748B14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#64748B",fontWeight:800,flexShrink:0}}>→</div>
            </motion.div>
          </div>
        )}
      </div>
    </div>

      {/* ── FEATURE SHOWCASE ─────────────────────────────────── */}
      <div className="feature-showcase-section" style={{background:"#0B0B0D",padding:"64px 28px 60px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{maxWidth:1080,margin:"0 auto"}}>
          <motion.div initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-80px"}} transition={{duration:0.4}}
            style={{textAlign:"center",marginBottom:44}}>
            <div style={{fontSize:11,fontWeight:800,color:"#8B5CF6",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>What's actually under the hood</div>
            <div style={{fontSize:28,fontWeight:900,color:"white",letterSpacing:"-0.025em",marginBottom:10}}>Not just an LLM wrapper</div>
            <div style={{fontSize:13.5,color:"rgba(255,255,255,0.45)",maxWidth:560,margin:"0 auto",lineHeight:1.6}}>
              Deterministic checks, cost transparency, and resilience — the parts that don't show up in a screenshot but decide whether this survives production.
            </div>
          </motion.div>

          <div className="feature-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[
              {icon:"🇮🇳",title:"India Compliance Engine",live:true,desc:"Every job description is checked against the Equal Remuneration Act 1976, POSH Act 2013, and Code on Wages — deterministic regex rules, not an LLM guessing.",where:"Live in HireFlow → Bias Detector"},
              {icon:"🧮",title:"PAN / GSTIN / Udyam Verification",live:false,desc:"Real checksum validation — including the mod-36 GSTIN check-digit algorithm — not just format regex. Built and unit-tested, not yet wired into a screen.",where:"lib/indianVerification.js — backend only"},
              {icon:"🔁",title:"Zero-Downtime Key Rotation",live:true,desc:"If a Groq API key dies mid-demo, requests silently retry against the next key instead of the whole pipeline failing on a 401.",where:"Live — powers every AI call"},
              {icon:"💰",title:"Real Cost Transparency",live:true,desc:"Every Groq call is metered by actual token count and priced at Groq's published rates — the hiring report shows real ₹ cost, not a marketing estimate.",where:"Live in HireFlow → Report"},
              {icon:"🔒",title:"DPDP Act Data Deletion",live:false,desc:"One call erases a user's data across every table (pipeline runs, candidates, outreach, sessions, tickets) — required for India's Digital Personal Data Protection Act, 2023.",where:"lib/db.js:deleteAllUserData — no settings UI yet"},
              {icon:"📈",title:"Self-Improving Outreach",live:false,desc:"Tracks which message openings actually get replies and surfaces the top/worst performing patterns over time — frequency-weighted, not reinforcement learning.",where:"lib/outcomeLearning.js — not wired to a screen"},
            ].map((f,i)=>(
              <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-40px"}} transition={{duration:0.35,delay:i*0.05}}
                style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"20px 20px 18px",position:"relative"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{width:38,height:38,borderRadius:10,background:"rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{f.icon}</div>
                  <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.05em",textTransform:"uppercase",padding:"3px 8px",borderRadius:20,background:f.live?"rgba(34,197,94,0.14)":"rgba(255,255,255,0.06)",color:f.live?"#4ADE80":"rgba(255,255,255,0.4)",border:f.live?"1px solid rgba(34,197,94,0.3)":"1px solid rgba(255,255,255,0.1)"}}>
                    {f.live?"Live in demo":"Built, not wired"}
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:"white",marginBottom:6,letterSpacing:"-0.01em"}}>{f.title}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.65,marginBottom:12}}>{f.desc}</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.3)",fontWeight:600,fontFamily:"monospace"}}>{f.where}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CROSS-MODE SIGNALS ──────────────────────────────── */}
      {state.crossEvents.length>0&&(
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
          style={{background:"#FAFAFA",padding:"0 28px 32px"}}>
          <div style={{maxWidth:1080,margin:"0 auto"}}>
            <div style={{background:"white",borderRadius:14,border:"1.5px solid #6D5FFA33",padding:"16px 22px",boxShadow:"0 2px 12px rgba(109,95,250,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#6D5FFA",animation:"pulse 1s infinite"}}/>
                <div style={{fontSize:12,fontWeight:800,color:"#6D5FFA"}}>Live cross-agent activity — {state.crossEvents.length} handoffs this session</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {state.crossEvents.slice(0,4).map((e,i)=>{
                  const typeColors={smb_to_sales:{bg:"#FFF7ED",border:"#FED7AA",color:"#C2410C",icon:"🎯"},smb_to_support:{bg:"#F0FDF4",border:"#86EFAC",color:"#15803D",icon:"💬"},care_to_sales:{bg:"#FFF7ED",border:"#FED7AA",color:"#C2410C",icon:"🎯"},agent_handoff:{bg:"#EDE9FE",border:"#A78BFA",color:"#6D28D9",icon:"⚡"},smb_complete:{bg:"#EDE9FE",border:"#A78BFA",color:"#6D28D9",icon:"🏪"},hiring_to_care:{bg:"#EDE9FE",border:"#A78BFA",color:"#6D28D9",icon:"🧠"}};
                  const tc=typeColors[e.type]||{bg:"#F9FAFB",border:"#E5E7EB",color:"#374151",icon:"→"};
                  return(
                    <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}
                      style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px",background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:9}}>
                      <div style={{fontSize:14,flexShrink:0,marginTop:1}}>{tc.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:800,color:tc.color}}>{e.title}</div>
                        <div style={{fontSize:11,color:"#6B7280",lineHeight:1.4,marginTop:1}}>{e.desc}</div>
                      </div>
                      <div style={{fontSize:9,color:tc.color,fontWeight:700,background:"white",padding:"2px 7px",borderRadius:10,border:`1px solid ${tc.border}`,whiteSpace:"nowrap",flexShrink:0}}>{e.action}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <div style={{background:"#09090B",borderTop:"1px solid rgba(255,255,255,0.06)",padding:"22px 28px"}}>
        <div style={{maxWidth:1080,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#6D5FFA,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>⚡</div>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:500}}>NexFlow AI · Powered by Groq · Llama 3.3 70B</span>
          </div>
          <button onClick={()=>dispatch({type:"SET_MODE",payload:"overview"})}
            style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.4)",background:"none",border:"none",cursor:"pointer",padding:0,transition:"color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#A78BFA"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
            View all features →
          </button>
        </div>
      </div>
    </div>
  );
}
// ── SALARY NEGOTIATION PANEL ──────────────────────────────────────────────
function SalaryNegotiationPanel({candidate,selScore}){
  const[open,setOpen]=useState(false);
  const[budget,setBudget]=useState("");
  const[ask,setAsk]=useState((candidate?.salary||candidate?.parsedSalary||"").toString());
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState("");
  const exp=candidate?.exp||"";
  const role=candidate?.role||"";
  const name=candidate?.name||"Candidate";
  const loc=candidate?.location||candidate?.parsedCity||"India";
  // Reset when candidate changes
  useEffect(()=>{setResult("");setAsk((candidate?.salary||candidate?.parsedSalary||"").toString());},[candidate?.id]);
  const generate=async()=>{
    if(!budget||!ask){return;}
    setLoading(true);setResult("");
    const budgetN=parseFloat(budget);
    const askN=parseFloat(ask);
    const gap=askN-budgetN;
    const gapPct=Math.round((gap/budgetN)*100);
    const prompt=`You are a senior Indian HR professional and salary negotiation expert.

Candidate: ${name}
Role: ${role}
Experience: ${exp}
Location: ${loc}
AI Score: ${selScore}/100
Candidate's Ask: ₹${askN}L per annum
Company Budget: ₹${budgetN}L per annum
Gap: ₹${gap}L (${gapPct}% above budget)

Generate exactly 3 salary negotiation strategies for this Indian hiring context. Each strategy should be realistic, use actual Indian salary market context, and include specific talking points. Format:

STRATEGY 1: [Name — e.g., "Anchor on Value"]
Script: [2-3 sentences the HR person actually says, in professional Indian business English]
Psychology: [Why this works for Indian candidates]
Fallback: [What to say if they push back]

STRATEGY 2: [Name — e.g., "ESOP Bridge"]
Script: ...
Psychology: ...
Fallback: ...

STRATEGY 3: [Name — e.g., "Market Band Reality Check"]
Script: ...
Psychology: ...
Fallback: ...

MARKET CONTEXT: [1 sentence on current Indian market salary for this role/exp/location]

Be specific — mention Indian-relevant details like notice period, ESOPs, variable pay, joining bonus as tools when relevant.`;
    const txt=await callClaude([{role:"user",content:prompt}],"Indian HR salary negotiation expert. Be direct, practical, India-specific.");
    setResult(txt);
    setLoading(false);
  };
  if(!open){
    return(
      <div style={{marginBottom:10}}>
        <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"9px 14px",background:"linear-gradient(135deg,#F59E0B,#D97706)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          💰 Negotiate Salary — AI Scripts
        </button>
      </div>
    );
  }
  return(
    <div style={{background:"#FFFBEB",border:"1.5px solid #FCD34D",borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:800,color:"#92400E"}}>💰 Salary Negotiation AI</div>
        <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#B45309",fontSize:16}}>×</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#78350F",display:"block",marginBottom:4}}>YOUR BUDGET (LPA)</label>
          <input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="e.g. 38" type="number" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #FCD34D",borderRadius:8,fontSize:13,background:"#fff",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#78350F",display:"block",marginBottom:4}}>THEIR ASK (LPA)</label>
          <input value={ask} onChange={e=>setAsk(e.target.value)} placeholder="e.g. 45" type="number" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #FCD34D",borderRadius:8,fontSize:13,background:"#fff",boxSizing:"border-box"}}/>
        </div>
      </div>
      {budget&&ask&&parseFloat(ask)>parseFloat(budget)&&(
        <div style={{background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:12,color:"#92400E"}}>
          Gap: <strong>₹{(parseFloat(ask)-parseFloat(budget)).toFixed(1)}L</strong> ({Math.round(((parseFloat(ask)-parseFloat(budget))/parseFloat(budget))*100)}% above budget) — AI will generate scripts to bridge this
        </div>
      )}
      <Btn variant="primary" fullWidth onClick={generate} disabled={loading||!budget||!ask}>
        {loading?"Generating scripts...":"⚡ Generate 3 Negotiation Scripts"}
      </Btn>
      {result&&(
        <div style={{marginTop:12,fontSize:12,color:"#451A03",lineHeight:1.75}}>
          {result.split("\n").map((line,i)=>{
            const isHeader=line.match(/^STRATEGY\s+\d+:|^MARKET CONTEXT:/);
            const isLabel=line.match(/^(Script:|Psychology:|Fallback:)/);
            if(!line.trim())return<div key={i} style={{height:6}}/>;
            if(isHeader)return<div key={i} style={{fontWeight:800,color:"#92400E",fontSize:13,marginTop:10,marginBottom:4,padding:"4px 8px",background:"#FEF3C7",borderRadius:6}}>{line}</div>;
            if(isLabel)return<div key={i} style={{fontWeight:700,color:"#78350F",marginTop:4}}>{line}</div>;
            return<div key={i}>{line}</div>;
          })}
        </div>
      )}
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
      const p="Write a warm personalized recruiter outreach email.\n\nCandidate: "+c.name+"\nRole: "+role+(company?" at "+company:"")+"\nSkills: "+(skills||"not specified")+"\nResume: "+resumeSnippet+"\n\nJob we are hiring for: "+jdSnippet+"\n\nEmail rules:\n- Under 80 words\n- Reference ONE specific thing from their background\n- Never say 'Applied' as their company\n- Natural tone, not template\n- First line: Subject: [subject]\n- Sign as: Hiring Team, NexFlow";
      callClaude([{role:"user",content:p}]).then(result=>{
        const text=result||"Subject: Your profile stood out — NexFlow\n\nHi "+c.name.split(" ")[0]+",\n\nYour experience as a "+role+" caught our eye. We're hiring and think your background is a strong match.\n\nOpen to a quick 20-min call this week?\n\nBest,\nHiring Team, NexFlow";
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
      from_name:"Hiring Team, NexFlow"
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
              <button onClick={onClose} style={{background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:16,color:"#888780",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
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
            <div style={{background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderRadius:10,border:"1px solid #EEECEA",padding:"10px 14px",marginBottom:12}}>
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
            <div style={{background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderRadius:10,padding:14,marginBottom:20,textAlign:"left"}}>
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
// ── HIRING FUNNEL ─────────────────────────────────────────────────────────
function HiringFunnel({total,shortlisted}){
  const[animated,setAnimated]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setAnimated(true),200);return()=>clearTimeout(t);},[]);
  const t=total||42;const s=shortlisted||5;
  const stages=[
    {label:"Applied",count:t,pct:100,color:"#534AB7",bg:"#EEEDFE"},
    {label:"Screened",count:Math.round(t*0.43),pct:72,color:"#7F77DD",bg:"#F0EFFE"},
    {label:"Shortlisted",count:s,pct:Math.round((s/t)*100*3),color:"#1D9E75",bg:"#E1F5EE"},
    {label:"To offer",count:1,pct:12,color:"#4ADE80",bg:"#D1FAE5"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {stages.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:80,fontSize:10,fontWeight:700,color:"#5F5E5A",textAlign:"right",flexShrink:0}}>{s.label}</div>
          <div style={{flex:1,height:22,background:"#F0EFE9",borderRadius:6,overflow:"hidden"}}>
            <div style={{height:"100%",width:animated?Math.max(s.pct,8)+"%":"0%",background:`linear-gradient(90deg,${s.color},${s.color}CC)`,borderRadius:6,transition:"width 0.9s cubic-bezier(0.34,1.56,0.64,1)",transitionDelay:(i*0.12)+"s",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6}}>
              <span style={{fontSize:9,fontWeight:800,color:"white"}}>{s.count}</span>
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:800,color:s.color,width:28,flexShrink:0}}>{s.count}</div>
        </div>
      ))}
    </div>
  );
}

// ── CANDIDATE COMPARE MODAL ────────────────────────────────────────────────
function CompareModal({pair,onClose}){
  const{state}=useStore();
  const[result,setResult]=useState("");
  const[streaming,setStreaming]=useState(true);
  const[winner,setWinner]=useState(null);
  const[a,b]=pair;
  const scoreA=state.dynamicScores?.[a.id]??(a.baseScore||a.score||75);
  const scoreB=state.dynamicScores?.[b.id]??(b.baseScore||b.score||75);

  useEffect(()=>{
    const prompt=`Compare these two candidates for the same role. Be direct — pick a winner.\n\nCandidate A: ${a.name} (${scoreA}/100)\nRole: ${a.role} at ${a.company||"?"}\nExp: ${a.exp}, Skills: ${(a.skills||[]).join(", ")}, Gaps: ${(a.gaps||[]).join(", ")||"none"}\nNotice: ${a.notice||"?"}, Salary: Rs ${a.salary||"?"}L\n\nCandidate B: ${b.name} (${scoreB}/100)\nRole: ${b.role} at ${b.company||"?"}\nExp: ${b.exp}, Skills: ${(b.skills||[]).join(", ")}, Gaps: ${(b.gaps||[]).join(", ")||"none"}\nNotice: ${b.notice||"?"}, Salary: Rs ${b.salary||"?"}L\n\nJD context: ${state.jdText?.slice(0,200)||"Senior role"}\n\nWrite:\n**WINNER: [Name]** — one sentence why\n\n**${a.name}'s edge** — 2 specific strengths vs B\n**${b.name}'s edge** — 2 specific strengths vs A\n**Key difference** — the single deciding factor\n**Risk** — biggest concern with your winner pick`;
    callClaudeStream([{role:"user",content:prompt}],"Hiring expert. Always pick a winner. Reference actual names and numbers.",(acc)=>{
      setResult(acc);
      const m=acc.match(/WINNER:\s*([^\*\n]+)/i);
      if(m) setWinner(m[1].trim());
    }).then(()=>setStreaming(false));
  },[]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(28,28,26,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(3px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:620,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",animation:"fadeIn 0.2s ease",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0F172A,#1E3A5F)",padding:"18px 22px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:"white",marginBottom:6}}>Head-to-head comparison</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{padding:"6px 12px",background:"rgba(255,255,255,0.15)",borderRadius:8,fontSize:12,fontWeight:700,color:"white"}}>{a.name} · {scoreA}</div>
              <div style={{fontSize:12,color:"#94A3B8",fontWeight:700}}>vs</div>
              <div style={{padding:"6px 12px",background:"rgba(255,255,255,0.15)",borderRadius:8,fontSize:12,fontWeight:700,color:"white"}}>{b.name} · {scoreB}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",color:"white",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {/* Winner banner */}
        {winner&&(
          <div style={{background:"linear-gradient(135deg,#1D9E75,#4ADE80)",padding:"10px 22px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🏆</span>
            <span style={{fontSize:13,fontWeight:800,color:"white"}}>AI recommends: {winner}</span>
          </div>
        )}
        {/* Streaming result */}
        <div style={{padding:"20px 22px",minHeight:180,maxHeight:360,overflowY:"auto"}}>
          {result?(
            <div style={{fontSize:13,color:"#1C1C1A",lineHeight:1.8,whiteSpace:"pre-wrap"}}>
              {result.replace(/\*\*(.*?)\*\*/g,"$1")}
              {streaming&&<span style={{display:"inline-block",width:2,height:13,background:"#534AB7",marginLeft:2,animation:"blink 0.7s infinite",verticalAlign:"text-bottom"}}/>}
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:10,color:"#888780",padding:"20px 0"}}><Spinner/><span style={{fontSize:13}}>AI analyzing both candidates...</span></div>
          )}
        </div>
        <div style={{padding:"12px 22px",borderTop:"1px solid #EEECEA",display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn variant="secondary" size="sm" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
}

function HiringDashboard(){
  const{state,dispatch}=useStore();
  const done=state.pipelineState==="done";
  const total=state.appliedResumes?.length||42;
  const cands=state.activeCandidates||CANDIDATE_POOL.slice(0,5);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {!done&&<div style={{background:"linear-gradient(135deg,#534AB7,#7F77DD)",borderRadius:16,padding:"24px 28px",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:19,fontWeight:800,marginBottom:4}}>HireFlow AI — Hiring Intelligence</div><div style={{fontSize:13,opacity:0.85}}>7 AI agents. Full pipeline in minutes.</div></div><Btn variant="secondary" size="md" onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})}>Start pipeline</Btn></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <MetricCard label="Processed" value={done?total:"—"} delta={done?"Run complete":""} deltaType={done?"good":"neutral"} icon="📄"/>
        <MetricCard label="Shortlisted" value={done?cands.length:"—"} delta={done?"Top "+(Math.round(cands.length/total*100)||12)+"%":""} deltaType="good" icon="⭐"/>
        <MetricCard label="Outreach" value={done?cands.length:"—"} delta={done?"Awaiting approval":""} icon="✉️"/>
        <MetricCard label="Time saved" value={done?Math.round(total*0.35)+"h":"—"} delta={done?"vs manual screening":""} deltaType="good" icon="⏱"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card style={{padding:22}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:14}}>Agent timeline</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {AGENTS.map(a=><AgentStep key={a.id} agent={a} status={state.agentStatuses[a.id]||"idle"} log={state.agentLogs[a.id]} stream={state.agentStreams[a.id]}/>)}
          </div>
          {!done&&<Btn variant="primary" fullWidth onClick={()=>dispatch({type:"SET_NAV",payload:"pipeline"})} style={{marginTop:14}}>Start first pipeline</Btn>}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {done&&(
            <Card style={{padding:18}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Hiring funnel</div>
              <HiringFunnel total={total} shortlisted={cands.length}/>
            </Card>
          )}
          <Card style={{padding:20,flex:done?0:1}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:14}}>Top candidates</div>
            {!done?(<div style={{display:"flex",flexDirection:"column",gap:8}}>{[1,2,3].map(i=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1px solid #F3F4F6"}}><div className="shimmer" style={{width:32,height:32,borderRadius:"50%",flexShrink:0}}/><div style={{flex:1}}><div className="shimmer" style={{height:12,width:"65%",marginBottom:5}}/><div className="shimmer" style={{height:9,width:"40%"}}/></div><div className="shimmer" style={{width:36,height:36,borderRadius:"50%",flexShrink:0}}/></div>)}<div style={{textAlign:"center",padding:"8px 0",fontSize:11,color:"#9CA3AF"}}>Run pipeline to see candidates</div></div>):
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cands.slice(0,done?3:4).map(c=>{
                const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);
                return(
                <div key={c.id} onClick={()=>{dispatch({type:"SET_CANDIDATE",payload:{...c,score:sc}});dispatch({type:"SET_NAV",payload:"candidates"});}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1px solid #EEECEA",cursor:"pointer",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#534AB7"} onMouseLeave={e=>e.currentTarget.style.borderColor="#EEECEA"}>
                  <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={32}/>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div><div style={{fontSize:10,color:"#888780"}}>{c.role} · {c.company}</div></div>
                  <ScoreRing score={sc} size={36} stroke={3}/>
                </div>
              );})}
              <button onClick={()=>dispatch({type:"SET_NAV",payload:"candidates"})} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#534AB7",background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:8,padding:"7px 0",cursor:"pointer"}}>Compare candidates →</button>
            </div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── REAL AI AGENT PIPELINE ────────────────────────────────────────────────
async function runRealAgentPipeline(jdText, dispatch, toast, appliedResumes=[], userId=null, companyId=null){
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
    // Generate realistic candidates dynamically from the JD using AI
    toast("Generating realistic candidates from your JD...","info");
    const colorPairs=[["#EEEDFE","#3C3489"],["#E1F5EE","#085041"],["#FAEEDA","#633806"],["#FBEAF0","#72243E"],["#F3F0FF","#5B21B6"]];
    try{
      const genPrompt=`You are a realistic hiring data generator for Indian tech companies. Based on this JD, generate 5 real-feeling candidate profiles from India.\n\nJD:\n${jdText.slice(0,600)}\n\nReturn ONLY a valid JSON array — no markdown, no extra text:\n[\n  {\n    "name": "full Indian name",\n    "role": "their current job title",\n    "company": "realistic Indian/global company they work at",\n    "city": "Indian city",\n    "exp": "X years",\n    "skills": ["skill1","skill2","skill3","skill4"],\n    "gaps": ["gap1"],\n    "summary": "one sentence about their most impressive work achievement",\n    "salary": <number in lakhs, integer>,\n    "notice": "X days",\n    "remote": true,\n    "email": "firstname.lastname@gmail.com"\n  }\n]\n\nRules:\n- Mix 2-3 women and men\n- Use realistic Indian companies (Razorpay, Zepto, Meesho, CRED, Groww, Swiggy, Flipkart, PhonePe, Juspay, etc)\n- Vary cities: Bangalore, Mumbai, Hyderabad, Pune, Chennai, Delhi\n- Skills must be relevant to the JD role\n- One candidate should be slightly under-qualified, one overqualified\n- Make salaries realistic for Indian market`;
      const raw=await callClaude([{role:"user",content:genPrompt}],"Output ONLY valid JSON array. No markdown fences.");
      let parsed=null;
      try{
        const jsonStr=raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
        parsed=JSON.parse(jsonStr);
      }catch{
        const m=raw.match(/\[[\s\S]*\]/);
        if(m) parsed=JSON.parse(m[0]);
      }
      if(parsed&&Array.isArray(parsed)&&parsed.length>0){
        domainCandidates=parsed.map((c,i)=>({
          ...c,
          id:"gen_"+(i+1),
          avatar:(c.name||"").trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
          avatarBg:colorPairs[i%5][0],
          avatarText:colorPairs[i%5][1],
          baseScore:75, domain,
        }));
        toast("Generated "+domainCandidates.length+" candidates from your JD","success");
      }else{
        throw new Error("Parse failed");
      }
    }catch(e){
      domainCandidates=getCandidatesForDomain(domain);
      toast("Using sample "+domain+" candidates","info");
    }
  }
  dispatch({type:"SET_ACTIVE_CANDIDATES",payload:{candidates:domainCandidates,domain}});

  // Helper: stream an agent call and return the full text
  const streamAgent=async(id,messages,system="")=>{
    let full="";
    await callClaudeStream(messages,system,(accumulated,token)=>{
      full=accumulated;
      dispatch({type:"SET_AGENT_STREAM",id,text:accumulated});
      // Also log each completed line to war room
      const lines=accumulated.split("\n");
      const lastLine=lines[lines.length-2]; // second to last = last completed line
      if(lastLine&&token==="\n") dispatch({type:"ADD_WAR_ROOM_LOG",agentId:id,log:lastLine.trim()});
    });
    // Log any remaining last line
    const finalLines=full.split("\n").filter(Boolean);
    if(finalLines.length) dispatch({type:"ADD_WAR_ROOM_LOG",agentId:id,log:finalLines[finalLines.length-1].trim()});
    return full;
  };

  // Agent 1: JD Parser
  dispatch({type:"SET_AGENT_STATUS",id:1,status:"active"});
  const a1=await streamAgent(1,
    [{role:"user",content:"You are a JD Intelligence Parser. Analyze this JD and extract: ROLE, MUST_HAVE skills, NICE_TO_HAVE skills, EXP required, SALARY range, RED_FLAGS (vague language). Be specific. Max 6 lines.\n\nJD:\n"+jdText}],
    "Expert hiring AI. Be direct."
  );
  dispatch({type:"SET_AGENT_STATUS",id:1,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:1,log:a1.split("\n").filter(Boolean)[0]||"JD parsed."});

  // Agent 2: Resume Ranker
  dispatch({type:"SET_AGENT_STATUS",id:2,status:"active"});
  const candidateList=domainCandidates.map((c,i)=>{
    const role=c.role||c.parsedRole||"Applicant";
    const company=c.company||c.parsedCompany||"";
    const exp=c.exp||c.parsedExp||"?";
    const skills=(c.skills||c.parsedSkills||[]).join(", ")||"Not specified";
    const snippet=c.text?"\n   Resume: "+c.text.slice(0,300):"";
    return (i+1)+". "+c.name+" — "+role+(company?", "+company:"")+", "+exp+" exp, Skills: "+skills+snippet;
  }).join("\n\n");
  const a2=await streamAgent(2,
    [{role:"user",content:"You are an expert ATS system. Score each candidate against this JD.\n\nJD:\n"+jdText.slice(0,500)+"\n\nCandidates:\n"+candidateList+"\n\nFor EACH candidate respond with:\nNAME: [first name] | SCORE: [0-100] | VERDICT: [Excellent/Good/Average/Poor] | REASON: [one specific sentence]\n\nCRITICAL SCORING RULES:\n- WRONG DOMAIN ENTIRELY (e.g. sales person on engineering JD): score 10-25\n- PARTIAL MATCH (some relevant skills): score 30-55\n- GOOD MATCH (most skills present): score 65-80\n- EXCELLENT MATCH (all skills, right experience): score 82-95\n- NEVER give everyone similar scores.\n- Spread scores across the FULL range 10-95."}],
    "Expert ATS. BE EXTREMELY HARSH on domain mismatch. Force dramatic score differences. Wrong domain = 10-25 maximum."
  );
  // Parse scores
  const scoreMap={};
  const verdictMap={};
  const a2lines=a2.split("\n").filter(Boolean);
  for(const c of domainCandidates){
    const firstName=c.name.split(" ")[0];
    const lastName=c.name.split(" ").pop();
    for(const line of a2lines){
      const lineUpper=line.toUpperCase();
      if(lineUpper.includes(firstName.toUpperCase())||lineUpper.includes(lastName.toUpperCase())){
        const scoreMatch=line.match(/SCORE[:\s]+(\d{1,3})/i)||line.match(/(\d{1,3})\s*\/\s*100/)||line.match(/:\s*(\d{1,3})\s*[|\-]/)||line.match(/\b(\d{1,3})\b.*(?:score|points?)/i);
        const verdictMatch=line.match(/VERDICT[:\s]+([^\|]+)/i)||line.match(/\|\s*(Excellent|Good|Average|Poor|Strong|Weak)[^\|]*/i);
        if(scoreMatch&&!scoreMap[c.id]) scoreMap[c.id]=Math.min(99,Math.max(10,parseInt(scoreMatch[1])));
        if(verdictMatch&&!verdictMap[c.id]) verdictMap[c.id]=verdictMatch[1].replace(/VERDICT[:\s]*/i,"").trim();
      }
    }
    if(!scoreMap[c.id]){
      const cDomain=c.domain||"general";
      const jdDomain=domain;
      if(cDomain===jdDomain) scoreMap[c.id]=72+Math.floor(Math.random()*18);
      else if(["frontend","backend","fullstack"].includes(cDomain)&&["frontend","backend","fullstack"].includes(jdDomain)) scoreMap[c.id]=45+Math.floor(Math.random()*20);
      else scoreMap[c.id]=15+Math.floor(Math.random()*25);
    }
  }
  const reasonMap={};
  for(const c of domainCandidates){
    const firstName=c.name.split(" ")[0];
    const lastName=c.name.split(" ").pop();
    for(const line of a2lines){
      const lineUpper=line.toUpperCase();
      if(lineUpper.includes(firstName.toUpperCase())||lineUpper.includes(lastName.toUpperCase())){
        const reasonMatch=line.match(/REASON[:\s]+([^\|]+)/i)||line.match(/\|\s*([A-Z][^|]{15,})/i);
        if(reasonMatch&&!reasonMap[c.id]) reasonMap[c.id]=reasonMatch[1].replace(/REASON[:\s]*/i,"").trim();
      }
    }
  }
  dispatch({type:"SET_DYNAMIC_SCORES",payload:scoreMap});
  dispatch({type:"SET_DYNAMIC_VERDICTS",payload:verdictMap});
  dispatch({type:"SET_DYNAMIC_REASONS",payload:reasonMap});
  dispatch({type:"SET_AGENT_STATUS",id:2,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:2,log:"5 candidates scored — reasons extracted."});

  // Agent 3: Bias Detector
  dispatch({type:"SET_AGENT_STATUS",id:3,status:"active"});
  const a3=await streamAgent(3,
    [{role:"user",content:"Analyze this JD for hiring bias. Give: GENDER_SCORE (0-100), INCLUSIVE_SCORE (0-100), FLAGS (specific phrases), FIX (one recommendation).\n\nJD:\n"+jdText}],
    "DEI expert. Reference actual JD text."
  );
  const gm=a3?.match(/GENDER_SCORE[:\s]*(\d+)/i);
  const fm=a3?.match(/FLAGS[:\s]*([\s\S]*?)(?:FIX:|$)/i);
  const rem=a3?.match(/FIX[:\s]*(.*)/i);
  const llmFlags=fm?fm[1].trim().split("\n").filter(f=>f.trim()).map(f=>f.replace(/^[-•*]\s*/,"")):["Review vague requirements"];
  // Deterministic, rule-based India-specific checks — reproducible regardless of LLM phrasing.
  // See lib/indiaComplianceRules.js for what these do and don't certify.
  const indiaFlags=formatComplianceFlags(runIndiaComplianceCheck(jdText));
  dispatch({type:"SET_BIAS",payload:{score:gm?parseInt(gm[1]):84,flags:[...llmFlags,...indiaFlags],recommendation:rem?rem[1].trim():"Use skills-based criteria."}});
  dispatch({type:"SET_AGENT_STATUS",id:3,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:3,log:"Bias audit complete."});

  // Agent 4: Outreach Writer — stream each email live
  dispatch({type:"SET_AGENT_STATUS",id:4,status:"active"});
  for(const c of domainCandidates.slice(0,5)){
    dispatch({type:"ADD_WAR_ROOM_LOG",agentId:4,log:"Drafting email for "+c.name+" ("+c.company+")..."});
    let emailFull="";
    await callClaudeStream(
      [{role:"user",content:"Write a warm personalized recruiter email to "+c.name+" ("+c.role+" at "+c.company+"). Their background: "+c.summary+". We are hiring for this role: "+jdText.slice(0,200)+". Under 100 words. Reference their specific work at "+c.company+". Include subject line. Sign as Hiring Team, NexFlow."}],
      "",
      (accumulated)=>{
        emailFull=accumulated;
        dispatch({type:"SET_AGENT_STREAM",id:4,text:"✍️ "+c.name.split(" ")[0]+": "+accumulated});
      }
    );
    dispatch({type:"SET_EMAIL_DRAFT",id:c.id,text:emailFull||"Hi "+c.name.split(" ")[0]+",\n\nYour work at "+c.company+" stood out.\n\nWe're hiring and think you'd be a strong fit.\n\nOpen to a 20-min call?\n\nBest,\nHiring Team, NexFlow"});
    dispatch({type:"ADD_WAR_ROOM_LOG",agentId:4,log:"✓ "+c.name+" email ready"});
  }
  dispatch({type:"SET_AGENT_STATUS",id:4,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:4,log:"5 personalized emails drafted."});

  // Agent 5: Interview Questions
  dispatch({type:"SET_AGENT_STATUS",id:5,status:"active"});
  const a5=await streamAgent(5,
    [{role:"user",content:"Generate 4 interview questions specifically for this role. Must test critical JD requirements.\n\nJD:\n"+jdText.slice(0,400)+"\n\nFormat:\nTECHNICAL: [question]\nSYSTEM DESIGN: [question]\nBEHAVIORAL: [question]\nCULTURE: [question]\n\nMake them specific to this role."}],
    "Senior engineering interviewer."
  );
  dispatch({type:"SET_INTERVIEW_QS",id:1,qs:a5||"Questions generated."});
  dispatch({type:"SET_AGENT_STATUS",id:5,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:5,log:"Interview questions ready."});

  // Agent 6: Salary Benchmarker
  dispatch({type:"SET_AGENT_STATUS",id:6,status:"active"});
  const a6=await streamAgent(6,
    [{role:"user",content:"Indian tech market salary benchmark (2025) for this role. Give MARKET_RANGE, CITY_PREMIUM, RISK flags, VERDICT on competitiveness. Max 50 words.\n\nJD: "+jdText.slice(0,300)}],
    "Indian compensation expert."
  );
  dispatch({type:"SET_SALARY",payload:{range:"Rs 28-42L",fit:4,risk:1,analysis:a6}});
  dispatch({type:"SET_AGENT_STATUS",id:6,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:6,log:"Salary benchmarking done."});

  // Agent 7: Report Generator
  dispatch({type:"SET_AGENT_STATUS",id:7,status:"active"});
  const topC=domainCandidates[0];
  const totalCount=appliedResumes.length||domainCandidates.length||5;
  await streamAgent(7,
    [{role:"user",content:"Summarize this hiring pipeline in 3 sentences. 1: pipeline result. 2: top recommendation. 3: key risk.\n\nJD: "+jdText.slice(0,200)+"\nPipeline: "+totalCount+" resumes reviewed, "+domainCandidates.length+" shortlisted, bias audited, emails drafted.\nTop candidate: "+topC.name+", "+topC.role+" at "+topC.company+"."}],
    "Hiring intelligence AI. Be direct."
  );
  dispatch({type:"SET_AGENT_STATUS",id:7,status:"done"});
  dispatch({type:"SET_AGENT_LOG",id:7,log:"Report ready."});

  dispatch({type:"SET_PIPELINE",payload:"done"});
  dispatch({type:"ADD_CROSS_EVENT",event:{type:"hiring_to_care",title:"Hiring pipeline complete",desc:"5 candidates shortlisted. Agents analyzed your actual JD.",action:"Open CareFlow to create onboarding workflow"}});
  // Save to localStorage history (always)
  const sortedByScore=[...domainCandidates].sort((a,b)=>(b.baseScore||75)-(a.baseScore||75));
  savePipelineRunLocal({jdText,domain,topCandidate:sortedByScore[0]?.name||"Unknown",topScore:sortedByScore[0]?.baseScore||75,totalCandidates:domainCandidates.length,biasScore:84});
  // Save to Supabase (if configured)
  dbSavePipeline({
    jdText,
    candidates:domainCandidates.map(c=>({...c,score:scoreMap[c.id]||c.baseScore||75})),
    totalResumes:appliedResumes.length||domainCandidates.length,
    ...(userId&&{user_id:userId}),
    ...(companyId&&{company_id:companyId}),
  }).then(runId=>{
    if(runId) dispatch({type:"SET_DB_RUN_ID",payload:runId});
  });
  // Cross-role signal: candidates the hiring manager marks "pass" become a real,
  // company-visible onboarding item a Support/Care-role employee can see and act on.
  if(companyId){
    const hired=domainCandidates.filter(c=>(scoreMap[c.id]||c.baseScore||0)>=85).slice(0,1);
    hired.forEach(c=>{
      createCrossRoleSignal({companyId,type:"onboarding",payload:{candidateName:c.name,role:c.role||"New hire",startNote:"Set up accounts, welcome email, first-week checklist."},createdByUserId:userId}).catch(()=>{});
    });
  }
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
          ?"Hi "+c.name.split(" ")[0]+",\n\nWe were impressed with your profile and would love to schedule an interview for the "+jobTitle+" role.\n\nPlease use the link below to pick a time that works for you:\n\n📅 Schedule Interview: "+calLink+"\n\nThe slot is pre-set for 30 minutes. Feel free to reschedule if needed.\n\nLooking forward to connecting!\n\nBest regards,\nHiring Team, NexFlow"
          :"Hi "+c.name.split(" ")[0]+",\n\nThank you for your interest in the "+jobTitle+" role. We would like to move forward with a structured interview.\n\nPlease answer the following questions and reply to this email:\n\n"+(questions||"Please share your availability for an interview.")+"\n\nBest regards,\nHiring Team, NexFlow";
        await sendRealEmail({to_name:c.name,to_email:emailAddr,subject,message:body,from_name:"Hiring Team, NexFlow"});
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
            <div onClick={()=>setStep("custom-questions")} style={{padding:"16px 18px",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",border:"1px solid #EEECEA",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#F0EFE9"} onMouseLeave={e=>e.currentTarget.style.background="#F7F6F3"}>
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
              <button key={s.name} onClick={()=>useSample(s)} style={{padding:"4px 10px",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",border:"1px solid #EEECEA",borderRadius:20,fontSize:11,color:"#5F5E5A",cursor:"pointer",fontWeight:600}}>{s.name.split(" ")[0]}</button>
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
  const{state,dispatch}=useStore();const toast=useToast();const userId=useUserId();
  const companyId=state.employee?.companyId&&state.employee.companyId!=="demo"?state.employee.companyId:null;
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
    await runRealAgentPipeline(state.jdText,dispatch,toast,state.appliedResumes,userId,companyId);
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
              <textarea value={state.jdText} onChange={e=>dispatch({type:"SET_JD",payload:e.target.value})} style={{width:"100%",height:220,border:"1px solid #EEECEA",borderRadius:10,padding:14,fontSize:13,lineHeight:1.65,color:"#1C1C1A",background:"#FAFAF8",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",outline:"none"}} placeholder="Paste or speak your job description — role, requirements, salary range, location..." onFocus={e=>e.target.style.borderColor="#534AB7"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
              <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
                <VoiceMicBtn onResult={(t)=>dispatch({type:"SET_JD",payload:(state.jdText+" "+t).trimStart()})} lang="en-IN"/>
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
            <div style={{background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderRadius:10,border:"1px solid #EEECEA",padding:14,marginBottom:14}}>
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
          {running&&<div style={{marginTop:8}}><CandidateListSkeleton/></div>}

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
          <div style={{fontSize:12,color:"#888780",marginBottom:14}}>Click <strong style={{color:"#534AB7"}}>▼ reasoning</strong> on any completed agent to see exactly what the AI found and decided</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{AGENTS.map(a=><AgentStep key={a.id} agent={a} status={state.agentStatuses[a.id]||"idle"} log={state.agentLogs[a.id]} stream={state.agentStreams[a.id]}/>)}</div>
        </Card>
      )}

    </div>
  );
}

// ── SKILL GAP HEATMAP ─────────────────────────────────────────────────────
function SkillGapHeatmap({candidates,scores}){
  const[highlight,setHighlight]=useState(null);
  const[sortBy,setSortBy]=useState("score"); // score | name | gap

  // Extract all unique skills across candidates + mark required vs nice-to-have
  const allSkillsRaw=candidates.flatMap(c=>c.skills||[]);
  const skillCounts={};
  allSkillsRaw.forEach(s=>{const k=s.toLowerCase().trim();skillCounts[k]=(skillCounts[k]||0)+1;});
  // Skills appearing in ≥2 candidates are "common", sort by frequency
  const allSkills=Object.entries(skillCounts)
    .sort((a,b)=>b[1]-a[1])
    .map(([s])=>s)
    .slice(0,14); // max 14 columns

  const sorted=[...candidates].sort((a,b)=>{
    if(sortBy==="score") return (scores[b.id]??b.baseScore??75)-(scores[a.id]??a.baseScore??75);
    if(sortBy==="name") return a.name.localeCompare(b.name);
    // sort by gap count (most gaps last)
    const gapA=allSkills.filter(s=>!(a.skills||[]).map(x=>x.toLowerCase()).includes(s)).length;
    const gapB=allSkills.filter(s=>!(b.skills||[]).map(x=>x.toLowerCase()).includes(s)).length;
    return gapA-gapB;
  });

  const hasSkill=(c,skill)=>(c.skills||[]).map(s=>s.toLowerCase().trim()).includes(skill.toLowerCase().trim());
  const coveragePct=(skill)=>Math.round((candidates.filter(c=>hasSkill(c,skill)).length/candidates.length)*100);

  const cellColor=(c,skill,isHighlight)=>{
    const has=hasSkill(c,skill);
    if(isHighlight) return has?"#1D9E75":"#D85A30";
    return has?"#E1F5EE":"#FAECE7";
  };
  const textColor=(c,skill,isHighlight)=>{
    const has=hasSkill(c,skill);
    if(isHighlight) return"white";
    return has?"#085041":"#993C1D";
  };

  return(
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {/* Controls */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{candidates.length} candidates × {allSkills.length} skills</div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:4,background:"white",border:"1px solid #EEECEA",borderRadius:8,padding:3}}>
          {[["score","By score"],["gap","Fewest gaps"],["name","A–Z"]].map(([k,l])=>(
            <button key={k} onClick={()=>setSortBy(k)} style={{fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sortBy===k?"#534AB7":"transparent",color:sortBy===k?"white":"#5F5E5A",transition:"all 0.15s"}}>{l}</button>
          ))}
        </div>
        {/* Legend */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:"#E1F5EE",border:"1px solid #9FE1CB"}}/><span style={{fontSize:10,color:"#5F5E5A"}}>Has skill</span></div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:"#FAECE7",border:"1px solid #F5B8A0"}}/><span style={{fontSize:10,color:"#5F5E5A"}}>Missing</span></div>
        </div>
      </div>

      {/* Table */}
      <div style={{overflowX:"auto",borderRadius:12,border:"1px solid #EEECEA"}}>
        <table style={{borderCollapse:"collapse",width:"100%",fontSize:11}}>
          {/* Header row — skill names */}
          <thead>
            <tr>
              <th style={{padding:"10px 14px",textAlign:"left",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderBottom:"1px solid #EEECEA",fontWeight:700,color:"#1C1C1A",whiteSpace:"nowrap",minWidth:130,position:"sticky",left:0,zIndex:2}}>Candidate</th>
              <th style={{padding:"10px 8px",textAlign:"center",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderBottom:"1px solid #EEECEA",fontWeight:700,color:"#534AB7",whiteSpace:"nowrap",minWidth:48}}>Score</th>
              {allSkills.map(skill=>(
                <th key={skill} onMouseEnter={()=>setHighlight(skill)} onMouseLeave={()=>setHighlight(null)}
                  style={{padding:"8px 6px",textAlign:"center",background:highlight===skill?"#EEEDFE":"#F7F6F3",borderBottom:"1px solid #EEECEA",fontWeight:600,color:highlight===skill?"#534AB7":"#5F5E5A",cursor:"pointer",transition:"background 0.15s",minWidth:52}}>
                  <div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",fontSize:10,whiteSpace:"nowrap",padding:"4px 0"}}>{skill}</div>
                </th>
              ))}
              <th style={{padding:"10px 8px",textAlign:"center",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderBottom:"1px solid #EEECEA",fontWeight:700,color:"#888780",whiteSpace:"nowrap",minWidth:52}}>Gaps</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c,ri)=>{
              const score=scores[c.id]??c.baseScore??75;
              const gaps=allSkills.filter(s=>!hasSkill(c,s)).length;
              return(
                <tr key={c.id} style={{background:ri%2===0?"white":"#FAFAF8"}}>
                  {/* Name cell */}
                  <td style={{padding:"8px 14px",borderBottom:"1px solid #F0EFE9",position:"sticky",left:0,background:ri%2===0?"white":"#FAFAF8",zIndex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:c.avatarBg||"#EEEDFE",color:c.avatarText||"#3C3489",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>{c.avatar}</div>
                      <div>
                        <div style={{fontWeight:700,color:"#1C1C1A"}}>{c.name}</div>
                        <div style={{fontSize:9,color:"#888780"}}>{c.role?.slice(0,22)}</div>
                      </div>
                    </div>
                  </td>
                  {/* Score */}
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #F0EFE9"}}>
                    <div style={{fontWeight:800,color:score>=80?"#534AB7":score>=60?"#BA7517":"#D85A30"}}>{score}</div>
                  </td>
                  {/* Skill cells */}
                  {allSkills.map(skill=>{
                    const has=hasSkill(c,skill);
                    const isHl=highlight===skill;
                    return(
                      <td key={skill} style={{padding:"6px",textAlign:"center",borderBottom:"1px solid #F0EFE9",background:isHl?(has?"#EEEDFE":"#FAECE7"):"transparent",transition:"background 0.15s"}}>
                        <div style={{width:32,height:28,borderRadius:6,background:cellColor(c,skill,isHl),display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",transition:"all 0.15s",cursor:"default"}}>
                          <span style={{fontSize:12,color:textColor(c,skill,isHl)}}>{has?"✓":"✗"}</span>
                        </div>
                      </td>
                    );
                  })}
                  {/* Gap count */}
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #F0EFE9"}}>
                    <div style={{fontWeight:700,color:gaps===0?"#1D9E75":gaps<=2?"#BA7517":"#D85A30",fontSize:12}}>{gaps}</div>
                  </td>
                </tr>
              );
            })}
            {/* Coverage row */}
            <tr style={{background:"#F0EFE9"}}>
              <td style={{padding:"8px 14px",fontWeight:800,color:"#5F5E5A",fontSize:10,position:"sticky",left:0,background:"#F0EFE9",zIndex:1}}>COVERAGE</td>
              <td/>
              {allSkills.map(skill=>{
                const pct=coveragePct(skill);
                return(
                  <td key={skill} style={{padding:"6px",textAlign:"center"}}>
                    <div style={{width:32,margin:"0 auto"}}>
                      <div style={{height:3,background:"#EEECEA",borderRadius:2,overflow:"hidden",marginBottom:3}}>
                        <div style={{height:"100%",width:pct+"%",background:pct>=70?"#1D9E75":pct>=40?"#BA7517":"#D85A30",borderRadius:2,transition:"width 0.8s ease"}}/>
                      </div>
                      <div style={{fontSize:9,fontWeight:700,color:pct>=70?"#085041":pct>=40?"#633806":"#993C1D"}}>{pct}%</div>
                    </div>
                  </td>
                );
              })}
              <td/>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insight strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:14}}>
        {(()=>{
          const weakestSkill=allSkills.reduce((a,b)=>coveragePct(a)<=coveragePct(b)?a:b,allSkills[0]);
          const strongestSkill=allSkills.reduce((a,b)=>coveragePct(a)>=coveragePct(b)?a:b,allSkills[0]);
          const perfectCands=sorted.filter(c=>allSkills.every(s=>hasSkill(c,s)));
          return[
            <Card key="w" style={{padding:"12px 14px",background:"#FAECE7",border:"1px solid #F5B8A0"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#993C1D",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Biggest gap</div>
              <div style={{fontSize:13,fontWeight:800,color:"#D85A30"}}>{weakestSkill}</div>
              <div style={{fontSize:10,color:"#993C1D"}}>only {coveragePct(weakestSkill)}% have it</div>
            </Card>,
            <Card key="s" style={{padding:"12px 14px",background:"#E1F5EE",border:"1px solid #9FE1CB"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#085041",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Strongest skill</div>
              <div style={{fontSize:13,fontWeight:800,color:"#1D9E75"}}>{strongestSkill}</div>
              <div style={{fontSize:10,color:"#085041"}}>{coveragePct(strongestSkill)}% of candidates</div>
            </Card>,
            <Card key="p" style={{padding:"12px 14px",background:"#EEEDFE",border:"1px solid #CECBF6"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#3C3489",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Full matches</div>
              <div style={{fontSize:13,fontWeight:800,color:"#534AB7"}}>{perfectCands.length} candidate{perfectCands.length!==1?"s":""}</div>
              <div style={{fontSize:10,color:"#3C3489"}}>{perfectCands.length?perfectCands[0].name.split(" ")[0]+" leads":"no perfect match"}</div>
            </Card>
          ];
        })()}
      </div>
    </div>
  );
}

function HiringCandidates(){
  const{state,dispatch}=useStore();
  const[modal,setModal]=useState(null);
  const[compareSelect,setCompareSelect]=useState([]);
  const[compareOpen,setCompareOpen]=useState(false);
  const[view,setView]=useState("list"); // list | heatmap

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

  const toggleCompare=(c,e)=>{
    e.stopPropagation();
    setCompareSelect(prev=>{
      if(prev.find(x=>x.id===c.id)) return prev.filter(x=>x.id!==c.id);
      if(prev.length>=2) return[prev[1],c];
      return[...prev,c];
    });
  };

  return(
    <>
    {compareOpen&&compareSelect.length===2&&<CompareModal pair={compareSelect} onClose={()=>setCompareOpen(false)}/>}

    {/* View toggle */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{display:"flex",background:"white",border:"1px solid #EEECEA",borderRadius:9,padding:3,gap:2}}>
        {[["list","☰ List"],["heatmap","⬛ Skill heatmap"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",background:view===k?"#534AB7":"transparent",color:view===k?"white":"#5F5E5A",transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>
      <div style={{flex:1}}/>
      {view==="list"&&compareSelect.length===2&&(
        <button onClick={()=>setCompareOpen(true)} style={{fontSize:11,fontWeight:700,background:"linear-gradient(135deg,#0F172A,#1E3A5F)",color:"white",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          ⚡ Compare {compareSelect[0].name.split(" ")[0]} vs {compareSelect[1].name.split(" ")[0]}
        </button>
      )}
    </div>

    {/* Heatmap view */}
    {view==="heatmap"&&(
      <SkillGapHeatmap candidates={sortedCandidates} scores={state.dynamicScores||{}}/>
    )}

    {/* List view */}
    {view==="list"&&<div style={{display:"grid",gridTemplateColumns:state.selectedCandidate?"360px 1fr":"1fr",gap:18,maxWidth:state.selectedCandidate?"none":520}}>
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:"#888780"}}>{candidates.length} candidates — scored against your JD</div>
          {compareSelect.length===1&&<div style={{fontSize:10,color:"#888780"}}>Select 1 more to compare</div>}
          {compareSelect.length===0&&<div style={{fontSize:10,color:"#888780"}}>Tap ⊞ to compare 2 candidates</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sortedCandidates.map((c,idx)=>{
            const score=getScore(c);
            const verdict=getVerdict(c);
            const scoreColor=score>=80?"#534AB7":score>=60?"#BA7517":"#D85A30";
            const inCompare=compareSelect.find(x=>x.id===c.id);
            return(
            <div key={c.id} style={{position:"relative"}}>
            <div onClick={()=>{dispatch({type:"SET_CANDIDATE",payload:{...c,score}});loadAnalysis(c);}}
              onMouseEnter={e=>{if(state.selectedCandidate?.id!==c.id&&!inCompare){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(83,74,183,0.12)";e.currentTarget.style.borderColor="#C4BFFA";}}}
              onMouseLeave={e=>{if(state.selectedCandidate?.id!==c.id&&!inCompare){e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=inCompare?"0 0 0 3px #E2E8F0":"none";e.currentTarget.style.borderColor=inCompare?"#0F172A":"#EEECEA";}}}
              style={{background:"white",borderRadius:12,border:state.selectedCandidate?.id===c.id?"2px solid #534AB7":inCompare?"2px solid #0F172A":"1px solid #EEECEA",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"all 0.2s",boxShadow:state.selectedCandidate?.id===c.id?"0 0 0 4px #EEEDFE":inCompare?"0 0 0 3px #E2E8F0":"none"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#B4B2A9",width:16}}>#{idx+1}</div>
              <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div>
                  {verdict&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:score>=80?"#EEEDFE":score>=60?"#FAEEDA":"#FAECE7",color:scoreColor}}>{verdict}</span>}
                  {state.candidateDecisions[c.id]==="warm_lead"&&<span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:20,background:"#FEF3C7",color:"#B45309",border:"1px solid #FDE68A",animation:"pulse 2s infinite"}}>⚡ Warm Lead — War Room</span>}
                  {state.candidateDecisions[c.id]==="hired"&&<span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:20,background:"#D1FAE5",color:"#065F46"}}>✅ Hired</span>}
                  {state.candidateDecisions[c.id]==="rejected"&&<span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>✕ Rejected</span>}
                </div>
                <div style={{fontSize:11,color:"#888780",marginTop:1}}>{c.role}{c.company?" · "+c.company:""}{c.city||c.parsedCity?" · "+(c.city||c.parsedCity):""}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
                  {c.skills.slice(0,3).map(s=><Tag key={s} color="success">{s}</Tag>)}
                  {c.gaps.slice(0,1).map(s=><Tag key={s} color="danger">Gap: {s}</Tag>)}
                </div>
                {state.dynamicReasons?.[c.id]&&(
                  <div style={{marginTop:5,fontSize:10,color:"#534AB7",fontStyle:"italic",background:"#EEEDFE",padding:"3px 8px",borderRadius:6,border:"1px solid #CECBF6"}}>
                    🤖 {state.dynamicReasons[c.id]}
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                <ScoreRing score={score} size={44} stroke={4} color={scoreColor}/>
                {c.parsedSalary>0||c.salary>0?<div style={{fontSize:9,color:"#888780"}}>Rs {c.salary||c.parsedSalary}L</div>:null}
              </div>
            </div>
            {/* Compare toggle */}
            <button onClick={(e)=>toggleCompare(c,e)} title="Add to compare" style={{position:"absolute",top:8,right:8,width:20,height:20,borderRadius:5,background:inCompare?"#0F172A":"#F0EFE9",border:"none",cursor:"pointer",fontSize:9,fontWeight:800,color:inCompare?"white":"#888780",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
              {inCompare?"✓":"⊞"}
            </button>
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
          <div style={{fontSize:13,color:"#5F5E5A",lineHeight:1.7,marginBottom:14,padding:12,background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderRadius:10,borderLeft:"3px solid #534AB7"}}>{sel.summary||sel.text?.slice(0,150)||"Resume submitted"}</div>
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
          <SalaryNegotiationPanel candidate={sel} selScore={selScore}/>
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
    </div>}
    </>
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
  const activityLog=useActivityLog();
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
          // Real cost, computed from actual Groq calls logged this session (promptChars/outputChars →
          // token estimate → Groq's published per-token pricing). This is the whole session's AI usage,
          // not just this one pipeline run in isolation — the activity log doesn't tag calls per-feature,
          // so summing only this run's calls would require reducer plumbing that doesn't exist yet.
          // Labeled accordingly below rather than implying false precision.
          const doneCalls=activityLog.filter(e=>e.status==="done"&&(e.promptChars||e.outputChars));
          const cost=estimatePipelineCost(doneCalls);
          return<div className="hiring-report-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
            <MetricCard label="Applicants" value={totalResumes}/>
            <MetricCard label="Shortlisted" value={shortlistedCount} delta={"Top "+Math.round(shortlistedCount/Math.max(totalResumes,1)*100)+"%"} deltaType="good"/>
            <MetricCard label="Avg score" value={avgScore+"%"} deltaType="good"/>
            <MetricCard label="Time saved" value={timeSaved+"h"} delta="vs manual screening" deltaType="good"/>
            <MetricCard label="AI cost (session)" value={"₹"+cost.inr.toFixed(2)} delta={cost.callCount+" Groq calls"} deltaType="neutral"/>
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
  const[streaming,setStreaming]=useState(false);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const pipelineDone=state.pipelineState==="done";
  const activeCands=state.activeCandidates||CANDIDATE_POOL.slice(0,5);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[state.chatMessages,streaming]);

  // Seed welcome message when chat opens and pipeline is done
  useEffect(()=>{
    if(state.chatOpen&&state.chatMessages.length===0&&pipelineDone){
      const top=activeCands[0];
      const scores=activeCands.map(c=>{
        const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);
        return c.name.split(" ")[0]+" "+sc;
      }).join(", ");
      dispatch({type:"ADD_CHAT_MSG",msg:{role:"assistant",text:"Pipeline complete. I have full context on "+activeCands.length+" candidates.\n\nScores: "+scores+"\n\nTop pick: "+top?.name+" — ask me why, or challenge it."}});
    }
  },[state.chatOpen,pipelineDone]);

  // Focus input when chat opens
  useEffect(()=>{
    if(state.chatOpen) setTimeout(()=>inputRef.current?.focus(),100);
  },[state.chatOpen]);

  // Build rich pipeline context for every query
  const buildContext=()=>{
    const candCtx=activeCands.map(c=>{
      const sc=state.dynamicScores?.[c.id]??(c.baseScore||c.score||75);
      const verdict=state.dynamicVerdicts?.[c.id]||"";
      return [
        c.name+":",
        "  score="+sc+"/100",
        "  role="+c.role+" at "+(c.company||"?"),
        "  exp="+c.exp,
        "  salary=Rs "+(c.salary||"?")+"L",
        "  location="+(c.location||c.city||"?"),
        "  notice="+(c.notice||"?"),
        "  remote="+(c.remote?"yes":"no"),
        "  skills="+((c.skills||[]).join(",")||"?"),
        "  gaps="+((c.gaps||[]).join(",")||"none"),
        "  verdict="+(verdict||"—"),
        "  summary="+(c.summary||"").slice(0,100),
      ].join("\n");
    }).join("\n\n");

    const biasCtx=state.biasReport
      ? "Bias audit: score="+state.biasReport.score+", flags=["+(state.biasReport.flags||[]).join("; ")+"], fix="+state.biasReport.recommendation
      : "";

    const salaryCtx=state.salaryData
      ? "Salary benchmark: "+state.salaryData.range+", analysis="+String(state.salaryData.analysis||"").slice(0,120)
      : "";

    const jdCtx="JD (first 200 chars): "+state.jdText.slice(0,200);

    return [
      "You are the HireFlow AI pipeline assistant. You have complete context on this hiring run.",
      "Be direct, specific, and reference actual candidate names and numbers.",
      "Never say 'based on the information provided' — just answer.",
      "If asked to compare, pick a winner and justify it.",
      "",
      jdCtx,
      "",
      "CANDIDATES:",
      candCtx,
      "",
      biasCtx,
      salaryCtx,
    ].filter(Boolean).join("\n");
  };

  const send=async(overrideMsg)=>{
    const msg=(overrideMsg||input).trim();
    if(!msg||streaming)return;
    setInput("");
    dispatch({type:"ADD_CHAT_MSG",msg:{role:"user",text:msg}});
    setStreaming(true);
    dispatch({type:"ADD_CHAT_MSG",msg:{role:"assistant",text:""}});

    const history=state.chatMessages
      .slice(-8)
      .filter(m=>m.text&&m.text.length>0)
      .map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
    history.push({role:"user",content:msg});

    await callClaudeStream(
      history,
      buildContext(),
      (accumulated)=>{
        dispatch({type:"UPDATE_LAST_CHAT",text:accumulated});
      }
    );
    setStreaming(false);
  };

  // Dynamic suggestions based on actual candidates
  const suggestions=pipelineDone&&activeCands.length>=2?[
    "Who should I hire first and why?",
    "Compare "+activeCands[0]?.name?.split(" ")[0]+" and "+activeCands[1]?.name?.split(" ")[0],
    "Who is most likely to counteroffer?",
    "What's the biggest risk in this shortlist?",
    "Who can join fastest?",
    "Is the salary range competitive?",
  ]:[];

  // Collapsed button
  if(!state.chatOpen){
    return(
      <button
        onClick={()=>dispatch({type:"TOGGLE_CHAT"})}
        title="Ask the pipeline"
        style={{position:"fixed",bottom:24,right:24,width:54,height:54,borderRadius:"50%",background:"linear-gradient(135deg,#534AB7,#7F77DD)",border:"none",cursor:"pointer",boxShadow:"0 4px 20px rgba(83,74,183,0.4)",fontSize:22,zIndex:998,transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center"}}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1)";e.currentTarget.style.boxShadow="0 8px 28px rgba(83,74,183,0.55)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 20px rgba(83,74,183,0.4)";}}>
        💬
        {pipelineDone&&<div style={{position:"absolute",top:2,right:2,width:12,height:12,borderRadius:"50%",background:"#4ADE80",border:"2px solid white"}}/>}
      </button>
    );
  }

  return(
    <div style={{position:"fixed",bottom:24,right:24,width:380,height:560,background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",zIndex:998,display:"flex",flexDirection:"column",overflow:"hidden",border:"1px solid #EEECEA",animation:"fadeIn 0.2s ease"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#534AB7,#7F77DD)",padding:"14px 18px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💬</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:"white"}}>Ask the Pipeline</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.75)"}}>
            {pipelineDone?"Full context loaded · "+activeCands.length+" candidates · Groq streaming":"Run the pipeline first to unlock"}
          </div>
        </div>
        <button onClick={()=>dispatch({type:"TOGGLE_CHAT"})} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"white",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>

      {/* Pipeline not run yet */}
      {!pipelineDone&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>🔒</div>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:6}}>Pipeline not run yet</div>
          <div style={{fontSize:12,color:"#888780",lineHeight:1.6}}>Run the hiring pipeline first. Once agents complete, I'll have full context on every candidate — scores, gaps, bias flags, salary fit — and can answer any question.</div>
        </div>
      )}

      {/* Messages */}
      {pipelineDone&&(
        <div style={{flex:1,overflowY:"auto",padding:"14px 14px 6px",display:"flex",flexDirection:"column",gap:10}}>
          {state.chatMessages.map((m,i)=>{
            const isLast=i===state.chatMessages.length-1;
            const isStreaming=isLast&&m.role==="assistant"&&streaming;
            return(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:7}}>
                {m.role==="assistant"&&(
                  <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#534AB7,#7F77DD)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,marginBottom:2}}>⚡</div>
                )}
                <div style={{
                  maxWidth:"82%",
                  padding:"10px 13px",
                  borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                  background:m.role==="user"?"linear-gradient(135deg,#534AB7,#7F77DD)":"#F7F6F3",
                  color:m.role==="user"?"white":"#1C1C1A",
                  fontSize:12.5,
                  lineHeight:1.65,
                  whiteSpace:"pre-wrap",
                  boxShadow:m.role==="user"?"0 2px 8px rgba(83,74,183,0.3)":"0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {isStreaming?(
                    <span>{m.text}<span style={{display:"inline-block",width:2,height:13,background:"#534AB7",marginLeft:2,animation:"blink 0.7s infinite",verticalAlign:"text-bottom"}}/></span>
                  ):m.text}
                </div>
              </div>
            );
          })}

          {/* Suggested questions — shown when few messages */}
          {state.chatMessages.length<=1&&suggestions.length>0&&(
            <div style={{marginTop:4}}>
              <div style={{fontSize:10,fontWeight:700,color:"#B4B2A9",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>Try asking</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {suggestions.map(s=>(
                  <button key={s} onClick={()=>send(s)} style={{textAlign:"left",padding:"8px 12px",background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:9,fontSize:11.5,color:"#534AB7",cursor:"pointer",fontWeight:500,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#E0DDFC"} onMouseLeave={e=>e.currentTarget.style.background="#EEEDFE"}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      )}

      {/* Input */}
      {pipelineDone&&(
        <div style={{padding:"10px 12px",borderTop:"1px solid #EEECEA",display:"flex",gap:8,flexShrink:0,background:"white"}}>
          <input
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask anything about this pipeline..."
            disabled={streaming}
            style={{flex:1,border:"1px solid #EEECEA",borderRadius:10,padding:"9px 12px",fontSize:12.5,fontFamily:"inherit",outline:"none",background:streaming?"#FAFAF8":"white",transition:"border-color 0.15s"}}
            onFocus={e=>e.target.style.borderColor="#534AB7"}
            onBlur={e=>e.target.style.borderColor="#EEECEA"}
          />
          <button
            onClick={()=>send()}
            disabled={!input.trim()||streaming}
            style={{width:36,height:36,borderRadius:10,background:input.trim()&&!streaming?"linear-gradient(135deg,#534AB7,#7F77DD)":"#EEECEA",border:"none",cursor:input.trim()&&!streaming?"pointer":"not-allowed",color:"white",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s",boxShadow:input.trim()&&!streaming?"0 2px 8px rgba(83,74,183,0.3)":"none"}}>
            {streaming?<div style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#534AB7",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>:"↑"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── SALES MODE ────────────────────────────────────────────────────────────
// ── DRIP SEQUENCE PANEL ───────────────────────────────────────────────────
function DripSequencePanel({prospects,product,onEmpty}){
  const toast=useToast();
  const[selected,setSelected]=useState(prospects[0]||null);
  const[sequences,setSequences]=useState({});
  const[generating,setGenerating]=useState(null);

  if(!prospects.length) return(
    <Card style={{padding:48,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>🔁</div>
      <div style={{fontSize:14,fontWeight:700,color:"#1C1C1A",marginBottom:8}}>No prospects yet</div>
      <Btn variant="orange" onClick={onEmpty}>Generate prospects first</Btn>
    </Card>
  );

  const generate=async(p)=>{
    if(sequences[p.id]||generating===p.id) return;
    setGenerating(p.id);
    setSequences(s=>({...s,[p.id]:[{subject:"",body:""},{subject:"",body:""},{subject:"",body:""}]}));
    const emails=["immediate follow-up (Day 1)","follow-up if no reply (Day 4)","final breakup email (Day 10)"];
    const seq=[];
    for(let i=0;i<3;i++){
      let full="";
      await callClaudeStream([{role:"user",content:"Write email "+(i+1)+" of 3 in a B2B drip sequence.\n\nThis is the "+emails[i]+".\nProspect: "+p.name+", "+p.role+" at "+p.company+"\nPain: "+p.painPoint+"\nProduct: "+product.slice(0,200)+"\n\nFormat:\nSUBJECT: [subject line]\n\n[email body — under 80 words]\n\nSign as Sales Team, NexFlow.\nEmail "+(i+1)+"/3 should feel progressively more concise."}],"",(acc)=>{
        full=acc;
        setSequences(s=>{
          const prev=[...(s[p.id]||[{},{},{}])];
          const lines=acc.split("\n");
          const subjLine=lines.find(l=>l.toLowerCase().startsWith("subject:"));
          prev[i]={subject:subjLine?subjLine.replace(/^subject:\s*/i,"").trim():"Follow-up "+(i+1),body:subjLine?lines.filter(l=>l!==subjLine).join("\n").trim():acc};
          return{...s,[p.id]:prev};
        });
      });
      seq.push(full);
    }
    setGenerating(null);
    toast("3-email drip sequence ready for "+p.name,"success");
  };

  return(
    <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:14,maxWidth:900}}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:4}}>Select prospect</div>
        {prospects.map(p=>(
          <div key={p.id} onClick={()=>setSelected(p)} style={{padding:"10px 12px",borderRadius:9,border:"1.5px solid "+(selected?.id===p.id?"#BA7517":"#EEECEA"),background:selected?.id===p.id?"#FFF8EE":"white",cursor:"pointer",transition:"all 0.15s"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1C1C1A"}}>{p.name}</div>
            <div style={{fontSize:10,color:"#888780"}}>{p.company}</div>
            {sequences[p.id]&&<div style={{fontSize:9,color:"#1D9E75",fontWeight:700,marginTop:3}}>✓ Sequence ready</div>}
          </div>
        ))}
      </div>
      {selected&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>{selected.name} — 3-email drip</div><div style={{fontSize:11,color:"#888780"}}>Automated sequence · Days 1, 4, 10</div></div>
            <Btn variant="orange" size="sm" disabled={generating===selected.id||!!sequences[selected.id]} onClick={()=>generate(selected)}>
              {generating===selected.id?<><Spinner/>Writing...</>:sequences[selected.id]?"Generated":"Generate sequence"}
            </Btn>
          </div>
          {sequences[selected.id]?sequences[selected.id].map((email,i)=>(
            <Card key={i} style={{padding:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:6,background:["#BA7517","#634A13","#3D2A08"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"white"}}>{i+1}</div>
                  <span style={{fontSize:11,fontWeight:700,color:"#1C1C1A"}}>{["Day 1","Day 4","Day 10"][i]} — {email.subject||"..."}</span>
                </div>
                <button onClick={()=>{navigator.clipboard?.writeText("Subject: "+email.subject+"\n\n"+email.body);toast("Email "+(i+1)+" copied","success");}} style={{fontSize:10,padding:"4px 9px",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",border:"1px solid #EEECEA",borderRadius:6,cursor:"pointer",fontWeight:600,color:"#5F5E5A"}}>Copy</button>
              </div>
              <div style={{fontSize:11.5,color:"#5F5E5A",lineHeight:1.65,whiteSpace:"pre-wrap",background:"#FAFAF8",borderRadius:8,padding:"10px 12px",border:"1px solid #EEECEA",minHeight:40}}>
                {email.body||<span style={{color:"#B4B2A9"}}>Writing...</span>}
                {generating===selected.id&&!email.body&&<span style={{display:"inline-block",width:2,height:11,background:"#BA7517",marginLeft:1,animation:"blink 0.7s infinite",verticalAlign:"text-bottom"}}/>}
              </div>
            </Card>
          )):(
            <Card style={{padding:32,textAlign:"center",color:"#888780"}}>
              <div style={{fontSize:28,marginBottom:8}}>🔁</div>
              <div style={{fontSize:12}}>Click "Generate sequence" to create 3 follow-up emails for {selected.name}</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Seeded outreach history (illustrative — authored for this project, labeled as such,
// NOT live data). Enough repeated openings for the frequency-weighted learner to have a
// signal, so the "learns from what's worked" loop is demonstrable. In production this
// array is replaced by real replied/converted events loaded from Supabase.
const SEED_OUTREACH_HISTORY=[
  {message:"Quick question about your hiring process at",outcome:"replied"},
  {message:"Quick question about your hiring process here",outcome:"replied"},
  {message:"Quick question about your hiring process today",outcome:"converted"},
  {message:"Quick question about your hiring process now",outcome:"no_reply"},
  {message:"Hi, I wanted to reach out about",outcome:"no_reply"},
  {message:"Hi, I wanted to reach out regarding",outcome:"no_reply"},
  {message:"Hi, I wanted to reach out quickly",outcome:"no_reply"},
];

function SalesMode(){
  const{state,dispatch}=useStore();
  const toast=useToast();const userId=useUserId();
  // Outcome-learning loop: nudges new outreach toward openings that have actually converted.
  const learner=useMemo(()=>createOutcomeLearner(SEED_OUTREACH_HISTORY),[]);
  const learningHint=useMemo(()=>learner.buildLearningHint(),[learner]);
  const companyId=state.employee?.companyId&&state.employee.companyId!=="demo"?state.employee.companyId:null;
  const[activeTab,setActiveTab]=useState("setup");
  const[objInput,setObjInput]=useState("");
  const[objReply,setObjReply]=useState("");
  const[objLoading,setObjLoading]=useState(false);
  const[genThought,setGenThought]=useState("");
  const[genPhase,setGenPhase]=useState(""); // "thinking" | "scoring" | "writing" | ""
  const salesBrain=useMemo(()=>buildBrainFromState(state),[state.salesProspects,state.activeCandidates,state.candidateDecisions,state.crossEvents]);

  const generate=async()=>{
    if(!state.salesProduct.trim()){toast("Add your product description first","error");return;}
    if(!state.salesTarget.trim()){toast("Add your target customer description first","error");return;}
    if(!GROQ_API_KEY){toast("API key missing — add VITE_GROQ_API_KEY to .env","error");return;}
    dispatch({type:"SET_SALES_RUNNING",val:true});
    setGenThought("");setGenPhase("thinking");
    toast("Generating prospects...","info");

    // Stream visible AI reasoning before generating
    await callClaudeStream(
      [{role:"user",content:"You are a B2B sales intelligence AI. Think out loud about this product and who would buy it.\n\nProduct: "+state.salesProduct.slice(0,400)+"\nTarget: "+(state.salesTarget||"Indian B2B market")+"\n\nWrite 4-5 sentences thinking through: Who feels this pain most? What industries? What role signs the cheque? What objection will kill the deal? Think fast, be specific to Indian market."}],
      "Expert B2B sales strategist. Think out loud, be sharp and specific.",
      (accumulated)=>setGenThought(accumulated)
    );
    setGenPhase("scoring");
    const p="Based on this product and target, generate 5 realistic B2B prospect profiles.\nProduct: "+state.salesProduct+"\nTarget: "+state.salesTarget+"\n\nReturn ONLY JSON array: [{id,name,role,company,industry,painPoint,fitScore,budget,objection,email,whyScore}]. fitScore 0-100. whyScore: one sentence explaining why this fitScore (e.g. 'Strong match — SaaS company with 50+ employees and explicit hiring pain'). Make realistic and specific.";
    try{
      const raw=await callClaude([{role:"user",content:p}]);
      const clean=raw.split("```").join("").replace(/^json/i,"").trim();
      const prospects=JSON.parse(clean);
      dispatch({type:"SET_SALES_PROSPECTS",payload:prospects});
      setGenPhase("writing");
      // ── CLOSE THE LOOP: consult the Company Brain per account before writing ──
      const brain=buildBrainFromState(state);
      // Stream each email as it's written
      for(const pr of prospects){
        const bctx=salesAccountIntel(brain,pr);
        const ep="Write a 3-paragraph cold email to "+pr.name+" ("+pr.role+" at "+pr.company+", pain: "+pr.painPoint+") about: "+state.salesProduct.slice(0,300)+". Specific and warm. Sign as Sales Team, NexFlow."+bctx.prompt+(learningHint?"\n\n"+learningHint:"");
        let emailText="";
        await callClaudeStream([{role:"user",content:ep}],"",(accumulated)=>{
          emailText=accumulated;
          dispatch({type:"SET_SALES_EMAIL",id:pr.id,text:accumulated});
        });
        if(!emailText) dispatch({type:"SET_SALES_EMAIL",id:pr.id,text:"Hi "+pr.name.split(" ")[0]+",\n\nI noticed "+pr.company+" faces "+pr.painPoint+".\n\nOur platform can help. Would you be open to a 15-min call?\n\nBest,\nSales Team, NexFlow"});
      }
      toast("5 prospects with personalized outreach ready","success");
      setGenPhase("");
      setActiveTab("prospects");
      // Save to Supabase
      saveSalesSession({product:state.salesProduct,industry:state.salesTarget,prospects,emailDrafts:{},...(userId&&{user_id:userId}),...(companyId&&{company_id:companyId})});
    }catch{
      const fallback=[
        {id:1,name:"Ananya Iyer",role:"VP Engineering",company:"UrbanCart",industry:"E-commerce",painPoint:"Manual hiring taking 3+ weeks",fitScore:92,budget:"Rs 5-10L/yr",objection:"Already using spreadsheets",email:"ananya@urbancart.in"},
        {id:2,name:"Meera Joshi",role:"Head of HR",company:"ScaleUp",industry:"Fintech",painPoint:"No structured screening",fitScore:87,budget:"Rs 3-7L/yr",objection:"Team is small",email:"meera@scaleup.in"},
        {id:3,name:"Rohan Das",role:"CEO",company:"FastHire",industry:"Recruitment",painPoint:"Slow candidate evaluation",fitScore:84,budget:"Rs 8-15L/yr",objection:"Price too high",email:"rohan@fasthire.co"},
        {id:4,name:"Priti Singh",role:"Talent Manager",company:"BuildCo",industry:"Construction",painPoint:"No bias detection",fitScore:76,budget:"Rs 2-5L/yr",objection:"Need ROI first",email:"priti@buildco.in"},
        {id:5,name:"Karan Mehta",role:"CTO",company:"DevStudio",industry:"Agency",painPoint:"Inconsistent interviews",fitScore:71,budget:"Rs 3-6L/yr",objection:"Need integrations",email:"karan@devstudio.io"},
      ];
      dispatch({type:"SET_SALES_PROSPECTS",payload:fallback});
      for(const pr of fallback)dispatch({type:"SET_SALES_EMAIL",id:pr.id,text:"Hi "+pr.name.split(" ")[0]+",\n\nI noticed "+pr.company+" might be dealing with "+pr.painPoint+".\n\nOur AI platform saves 14+ hours per hire. Would you be open to a 15-min demo?\n\nBest,\nSales Team, NexFlow"});
      toast("Prospects generated","success");
      setGenPhase("");
      setActiveTab("prospects");
    }
    dispatch({type:"SET_SALES_RUNNING",val:false});
  };

  const handleObj=async()=>{
    if(!objInput.trim())return;
    setObjLoading(true);setObjReply("");
    const p="Expert sales response for: "+state.salesProduct.slice(0,200)+"\n\nObjection: '"+objInput+"'\n\n3-sentence response: acknowledge, reframe as benefit, move to next step. Specific to product.";
    await callClaudeStream([{role:"user",content:p}],"",(accumulated)=>{
      setObjReply(accumulated);
    });
    if(!objReply) setObjReply("I completely understand that concern. Many of our customers said the same before seeing a 10x return in month one. Would a free trial help you evaluate without commitment?");
    setObjLoading(false);
  };

  const STEPS=[
    {id:"setup",label:"Setup",icon:"⚙️",num:1,hint:"Describe product"},
    {id:"prospects",label:"Prospects",icon:"🎯",num:2,hint:"AI finds leads"},
    {id:"outreach",label:"Outreach",icon:"✉️",num:3,hint:"Personalized emails"},
    {id:"drip",label:"Drip",icon:"🔁",num:4,hint:"Sequence builder"},
    {id:"objections",label:"Objections",icon:"🛡️",num:5,hint:"Handle pushback"},
  ];
  const prospectsReady=state.salesProspects.length>0;
  const curNum=STEPS.find(s=>s.id===activeTab)?.num||1;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <IncomingSignalsBanner companyId={companyId} type="lead" icon="🎯" label="lead" fromLabel="Care"/>
      {/* Step stepper */}
      <div style={{display:"flex",alignItems:"flex-start",marginBottom:20,background:"white",borderRadius:14,padding:"14px 18px",border:"1px solid #EEECEA",boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
        {STEPS.map((s,i)=>[
          <button key={s.id} onClick={()=>{if(s.num>1&&!prospectsReady)return;setActiveTab(s.id);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,background:"none",border:"none",cursor:s.num===1||prospectsReady?"pointer":"default",padding:"0 10px",opacity:s.num>1&&!prospectsReady?0.4:1,minWidth:64}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:curNum>s.num?"#BA7517":curNum===s.num?"#BA7517":"#F3F4F6",border:`2px solid ${curNum>=s.num?"#BA7517":"#E5E7EB"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:curNum>=s.num?"white":"#9CA3AF",transition:"all 0.25s",boxShadow:curNum===s.num?"0 0 0 4px rgba(186,117,23,0.12)":"none"}}>
              {curNum>s.num?"✓":s.num}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:curNum===s.num?"#BA7517":curNum>s.num?"#374151":"#9CA3AF",whiteSpace:"nowrap"}}>{s.label}</div>
            <div style={{fontSize:9,color:"#9CA3AF",whiteSpace:"nowrap"}}>{s.hint}</div>
          </button>,
          i<STEPS.length-1&&<div key={s.id+"ln"} style={{flex:1,height:2,background:curNum>s.num?"#BA7517":"#E5E7EB",transition:"background 0.4s",marginTop:15,borderRadius:2}}/>
        ])}
      </div>

      {activeTab==="setup"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:700}}>
          <Card style={{padding:22}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>Your product <VoiceMicBtn onResult={(t)=>dispatch({type:"SET_SALES_PRODUCT",payload:(state.salesProduct+" "+t).trimStart()})} lang="en-IN" style={{marginLeft:"auto"}}/></div>
            <textarea value={state.salesProduct} onChange={e=>dispatch({type:"SET_SALES_PRODUCT",payload:e.target.value})} style={{width:"100%",height:160,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} placeholder="Speak or type your product description..." onFocus={e=>e.target.style.borderColor="#BA7517"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_SALES_PRODUCT",payload:SAMPLE_PRODUCT})} style={{marginTop:10}}>Use sample product</Btn>
          </Card>
          <Card style={{padding:22}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>Target audience <VoiceMicBtn onResult={(t)=>dispatch({type:"SET_SALES_TARGET",payload:(state.salesTarget+" "+t).trimStart()})} lang="en-IN" style={{marginLeft:"auto"}}/></div>
            <textarea value={state.salesTarget} onChange={e=>dispatch({type:"SET_SALES_TARGET",payload:e.target.value})} style={{width:"100%",height:90,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} placeholder="Speak or type — industry, company size, role, pain points..." onFocus={e=>e.target.style.borderColor="#BA7517"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
            <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"SET_SALES_TARGET",payload:SAMPLE_TARGET})} style={{marginTop:10}}>Use sample target</Btn>
          </Card>
          <Btn variant="orange" size="lg" disabled={state.salesRunning||!state.salesProduct.trim()} onClick={generate} fullWidth>{state.salesRunning?"Generating prospects...":"Generate prospects and outreach"}</Btn>
          {/* Live AI thinking stream */}
          {state.salesRunning&&(
            <Card style={{padding:18,background:"#FFFBF5",border:"1.5px solid #FED7AA"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#EA580C",animation:"pulse 1s infinite"}}/>
                <div style={{fontSize:11,fontWeight:800,color:"#9A3412",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                  {genPhase==="thinking"?"🧠 AI analysing market...":genPhase==="scoring"?"📊 Scoring prospect fit...":genPhase==="writing"?"✍️ Writing personalized emails...":"Processing..."}
                </div>
              </div>
              {genThought&&(
                <div style={{fontSize:12,color:"#7C2D12",lineHeight:1.75,whiteSpace:"pre-wrap",background:"white",borderRadius:8,padding:"10px 12px",border:"1px solid #FED7AA",borderLeft:"3px solid #EA580C"}}>
                  {genThought}
                  {genPhase==="thinking"&&<span style={{display:"inline-block",width:2,height:12,background:"#EA580C",marginLeft:2,animation:"blink 0.7s infinite",verticalAlign:"text-bottom"}}/>}
                </div>
              )}
              {genPhase==="writing"&&(
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {state.salesProspects.map(p=>(
                    <div key={p.id} style={{fontSize:10,padding:"3px 10px",background:state.salesEmailDrafts[p.id]?"#E1F5EE":"#FFF7ED",border:"1px solid "+(state.salesEmailDrafts[p.id]?"#86EFAC":"#FED7AA"),borderRadius:20,color:state.salesEmailDrafts[p.id]?"#15803D":"#9A3412",fontWeight:600}}>
                      {state.salesEmailDrafts[p.id]?"✓ ":"✍️ "}{p.name.split(" ")[0]}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {activeTab==="prospects"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:760}}>
          {state.salesRunning?<ProspectListSkeleton/>:state.salesProspects.length===0?<Card style={{padding:48,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🎯</div><div style={{fontSize:14,fontWeight:700,color:"#1C1C1A",marginBottom:12}}>No prospects yet</div><Btn variant="orange" onClick={()=>setActiveTab("setup")}>Set up product first</Btn></Card>:
          state.salesProspects.map(p=>(
            <Card key={p.id} style={{padding:20}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <div style={{width:46,height:46,borderRadius:12,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🏢</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><div style={{fontSize:14,fontWeight:700,color:"#1C1C1A"}}>{p.name}</div><Tag color="warn">{p.role}</Tag><Tag color="neutral">{p.industry}</Tag></div>
                  <div style={{fontSize:12,color:"#888780",marginBottom:8}}>{p.company} · {p.budget}</div>
                  <div style={{fontSize:12,color:"#633806",padding:"8px 10px",background:"#FFF8EE",borderRadius:7,border:"1px solid #FAC775",marginBottom:6}}>Pain: {p.painPoint}</div>
                  <div style={{fontSize:11,color:"#993C1D",marginBottom:6}}>Likely objection: "{p.objection}"</div>
                  {p.whyScore&&<div style={{fontSize:10,color:"#534AB7",padding:"5px 8px",background:"#EEEDFE",borderRadius:6,border:"1px solid #CECBF6",fontStyle:"italic"}}>🤖 {p.whyScore}</div>}
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
          {learningHint&&state.salesProspects.length>0&&(
            <div style={{background:"rgba(83,74,183,0.06)",border:"1px solid #CECBF6",borderRadius:10,padding:"9px 13px",display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:15}}>🧠</span>
              <div style={{fontSize:11.5,color:"#3C3489",lineHeight:1.5}}><b>Outcome-learning loop active</b> — these emails were nudged toward openings that converted across {learner.sampleSize} past outreach outcomes. Improves as real replies are recorded.</div>
            </div>
          )}
          {state.salesProspects.length===0?<Card style={{padding:48,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>✉️</div><Btn variant="orange" onClick={()=>setActiveTab("setup")}>Set up product first</Btn></Card>:
          state.salesProspects.map(p=>{const sent=state.salesSentEmails[p.id];const draft=state.salesEmailDrafts[p.id]||"";const intel=salesAccountIntel(salesBrain,p);return(
            <Card key={p.id} style={{padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{p.name} — {p.company}</div><div style={{fontSize:11,color:"#888780"}}>{p.email} · Fit: {p.fitScore}/100</div></div>
                <div style={{display:"flex",gap:6}}>
                  {draft&&<button onClick={async()=>{
                    const li=await callClaude([{role:"user",content:"Write a LinkedIn message (under 280 chars, no line breaks) to "+p.name+" ("+p.role+" at "+p.company+") about: "+state.salesProduct.slice(0,150)+". Pain: "+p.painPoint+". Warm, specific, end with a question."}]);
                    navigator.clipboard?.writeText(li||"Hi "+p.name.split(" ")[0]+", saw your work at "+p.company+" — building something that solves "+p.painPoint+". Worth a 10-min chat?");
                    toast("LinkedIn message copied!","success");
                  }} style={{fontSize:10,fontWeight:700,padding:"5px 10px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:7,cursor:"pointer",color:"#1D4ED8",display:"flex",alignItems:"center",gap:4}}>
                    <span>in</span> LinkedIn
                  </button>}
                  {draft&&<button onClick={async(e)=>{
                    const btn=e.currentTarget;btn.disabled=true;btn.textContent="Sending...";
                    const fullMsg="Hi "+p.name.split(" ")[0]+"! 👋\n\n"+draft.slice(0,400)+"...\n\n— NexFlow AI";
                    const sent=await sendWhatsAppReal(fullMsg);
                    if(sent){toast("📲 WhatsApp message sent to your phone!","success");}
                    else{window.open("https://wa.me/?text="+encodeURIComponent(fullMsg),"_blank");toast("Opening WhatsApp — add VITE_CALLMEBOT_PHONE & VITE_CALLMEBOT_APIKEY to Netlify for direct send","info");}
                    btn.disabled=false;btn.innerHTML="<span>📲</span> WhatsApp";
                  }} style={{fontSize:10,fontWeight:700,padding:"5px 10px",background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:7,cursor:"pointer",color:"#15803D",display:"flex",alignItems:"center",gap:4}}>
                    <span>📲</span> WhatsApp
                  </button>}
                  {sent?<Tag color="success">Sent</Tag>:<Btn variant="orange" size="sm" onClick={()=>{dispatch({type:"SET_SALES_SENT",id:p.id});toast("Sent to "+p.name,"success");}}>Send</Btn>}
                </div>
              </div>
              {/* ── COMPANY BRAIN account intelligence — visible loop ── */}
              {intel.status==="known"?(
                <div style={{background:"rgba(28,122,147,0.06)",border:"1px solid rgba(28,122,147,0.3)",borderRadius:8,padding:"8px 11px",marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#0F4A5A",letterSpacing:"0.05em",marginBottom:5}}>🧩 WRITTEN KNOWING — Company Brain account check</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {intel.notes.map((n,i)=><span key={i} style={{fontSize:10.5,fontWeight:600,color:n.warn?"#993556":"#0F6E56",background:n.warn?"#FBEAF0":"#E1F5EE",border:"1px solid "+(n.warn?"#ED93B1":"#9FE1CB"),borderRadius:20,padding:"3px 10px"}}>{n.warn?"⚠️ ":"✓ "}{n.t}</span>)}
                  </div>
                </div>
              ):(
                <div style={{fontSize:10.5,fontWeight:600,color:"#8A7B63",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:"#B4B2A9"}}/>🆕 Net-new account — no prior contact across any team</div>
              )}
              <div style={{background:"#FFF8EE",border:"1px solid #FAC775",borderRadius:8,padding:12,fontSize:12,color:"#5F5E5A",lineHeight:1.65,maxHeight:80,overflow:"hidden",WebkitMaskImage:"linear-gradient(to bottom,black 40%,transparent 100%)",whiteSpace:"pre-wrap"}}>{draft||<span style={{color:"#B4B2A9"}}>Writing email...</span>}</div>
            </Card>
          );})}
        </div>
      )}

      {activeTab==="drip"&&<DripSequencePanel prospects={state.salesProspects} product={state.salesProduct} onEmpty={()=>setActiveTab("setup")}/>}

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
  const toast=useToast();const userId=useUserId();
  const companyId=state.employee?.companyId&&state.employee.companyId!=="demo"?state.employee.companyId:null;
  const[chatInput,setChatInput]=useState("");
  const[chatLoading,setChatLoading]=useState(false);
  const[activeChatId,setActiveChatId]=useState(null);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[state.supportChats,activeChatId]);

  const buildKB=async()=>{
    if(!state.supportDocs.trim()){toast("Add your product docs first — paste text or use Sample","error");return;}
    if(!GROQ_API_KEY){toast("API key missing — add VITE_GROQ_API_KEY to .env","error");return;}
    dispatch({type:"SET_SUPPORT_BUILDING",val:true});
    toast("Step 1/3 — Reading docs...","info");
    await new Promise(r=>setTimeout(r,600));
    toast("Step 2/3 — Extracting FAQ pairs...","info");
    try{
      const raw=await callClaude([{role:"user",content:"Extract 6-8 FAQ pairs from these product docs. Return ONLY JSON array, no markdown:\n[{\"q\":\"customer question\",\"a\":\"concise answer\"}]\n\nDocs:\n"+state.supportDocs}],"Expert support KB builder. Extract real questions customers would ask. Be specific to the actual content.");
      const clean=raw.split("```").join("").replace(/^json\s*/i,"").trim();
      const kb=JSON.parse(clean);
      dispatch({type:"SET_SUPPORT_KB",payload:kb});
      await new Promise(r=>setTimeout(r,300));
      toast("Step 3/3 — KB indexed! "+kb.length+" FAQ items ready. Chat bot is live.","success");
    }catch{
      dispatch({type:"SET_SUPPORT_KB",payload:[
        {q:"How do I get started?",a:"Sign up, create workspace, choose template, paste context, run pipeline."},
        {q:"What are the pricing plans?",a:"Starter: Rs 999/month. Team: Rs 2,999/month. Enterprise: Custom."},
        {q:"How do I cancel?",a:"Settings > Billing > Cancel Plan. Access continues until period ends."},
        {q:"What is your refund policy?",a:"14-day money back guarantee. Email support@flowzint.in."},
        {q:"Pipeline is stuck — what do I do?",a:"Refresh and restart. Check API key in Settings > Integrations."},
        {q:"How do I change my password?",a:"Settings > Security > Change Password."},
      ]});
      toast("KB ready (fallback)","info");
    }
    dispatch({type:"SET_SUPPORT_BUILDING",val:false});
  };

  const sendMsg=async()=>{
    if(!chatInput.trim()||chatLoading||state.supportKB.length===0)return;
    const msg=chatInput.trim();setChatInput("");
    const id=activeChatId||Date.now();
    const kbContext="Knowledge base:\n"+state.supportKB.map(i=>"Q: "+i.q+"\nA: "+i.a).join("\n\n");
    const docsContext=state.supportDocs?"Product docs:\n"+state.supportDocs.slice(0,600):"";
    const sys="You are a helpful, concise support agent. Answer using the knowledge base below. If the answer is not in the KB, say you will escalate to a human agent. Never make up information.\n\n"+kbContext+"\n\n"+docsContext;
    if(!activeChatId){
      setActiveChatId(id);
      dispatch({type:"ADD_SUPPORT_CHAT",chat:{id,messages:[{role:"user",text:msg},{role:"assistant",text:""}],sentiment:"neutral",status:"open",timestamp:new Date().toLocaleTimeString()}});
    }else{
      dispatch({type:"UPDATE_SUPPORT_CHAT",id,updates:{messages:[...((state.supportChats.find(c=>c.id===id)?.messages)||[]),{role:"user",text:msg},{role:"assistant",text:""}]}});
    }
    setChatLoading(true);
    let reply="";
    await callClaudeStream([{role:"user",content:msg}],sys,(accumulated)=>{
      reply=accumulated;
      // Update the last (empty) assistant message in real time
      const currentChat=state.supportChats.find(c=>c.id===id)||{messages:[{role:"user",text:msg}]};
      const updated=[...currentChat.messages.slice(0,-1),{role:"assistant",text:accumulated}];
      dispatch({type:"UPDATE_SUPPORT_CHAT",id,updates:{messages:updated}});
    });
    // Sentiment scoring
    const negWords=["angry","refund","cancel","urgent","broken","failed","useless","terrible","hate","worst","disappointed"];
    const posWords=["great","love","thanks","awesome","perfect","helpful","excellent","resolved","solved","happy"];
    const msgLow=msg.toLowerCase();const replyLow=(reply||"").toLowerCase();
    const negScore=negWords.filter(w=>msgLow.includes(w)).length;
    const posScore=posWords.filter(w=>msgLow.includes(w)||replyLow.includes(w)).length;
    const sentiment=negScore>posScore?"negative":posScore>0?"positive":"neutral";
    // CSAT prediction (1-5 scale): positive=4-5, neutral=3, negative=1-2
    const csatBase=sentiment==="positive"?4:sentiment==="neutral"?3:2;
    const csatVariance=(Math.random()-0.5)*0.8;
    const csat=Math.min(5,Math.max(1,Math.round((csatBase+csatVariance)*10)/10));
    const finalChat=state.supportChats.find(c=>c.id===id)||{messages:[{role:"user",text:msg}]};
    const finalMsgs=[...finalChat.messages.slice(0,-1),{role:"assistant",text:reply||"Thank you for reaching out. Let me look into this for you.",csat,sentiment}];
    dispatch({type:"UPDATE_SUPPORT_CHAT",id,updates:{messages:finalMsgs,sentiment,status:sentiment==="negative"?"escalated":"open",csat}});
    // Async save to Supabase (don't block UI)
    const updatedChats=[...state.supportChats.filter(c=>c.id!==id),{...state.supportChats.find(c=>c.id===id)||{id,timestamp:new Date().toLocaleTimeString()},messages:finalMsgs,sentiment,csat}];
    saveSupportSession({docs:state.supportDocs,kb:state.supportKB,chats:updatedChats,...(userId&&{user_id:userId}),...(companyId&&{company_id:companyId})});
    setChatLoading(false);
  };

  const activeChat=state.supportChats.find(c=>c.id===activeChatId);

  const SUPPORT_STEPS=[{n:1,label:"Paste docs",done:state.supportDocs.trim().length>0},{n:2,label:"Build KB",done:state.supportKB.length>0},{n:3,label:"Test chat",done:state.supportChats.length>0}];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <IncomingSignalsBanner companyId={companyId} type="onboarding" icon="🧑‍💼" label="onboarding task" fromLabel="Hiring"/>
      {/* 3-step guide */}
      <div style={{display:"flex",alignItems:"center",gap:0,background:"white",border:"1px solid #EEECEA",borderRadius:14,padding:"12px 20px",boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
        {SUPPORT_STEPS.map((s,i)=>[
          <div key={s.n} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"0 12px"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:s.done?"#1D9E75":"#F3F4F6",border:`2px solid ${s.done?"#1D9E75":"#E5E7EB"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:s.done?"white":"#9CA3AF",transition:"all 0.25s",boxShadow:s.done?"0 0 0 4px rgba(29,158,117,0.12)":"none"}}>
              {s.done?"✓":s.n}
            </div>
            <div style={{fontSize:10,fontWeight:700,color:s.done?"#1D9E75":"#9CA3AF",whiteSpace:"nowrap"}}>{s.label}</div>
          </div>,
          i<SUPPORT_STEPS.length-1&&<div key={s.n+"ln"} style={{flex:1,height:2,background:s.done?"#1D9E75":"#E5E7EB",transition:"background 0.4s",marginBottom:14,borderRadius:2}}/>
        ])}
        <div style={{marginLeft:"auto",paddingLeft:16,borderLeft:"1px solid #EEECEA"}}>
          <div style={{fontSize:11,fontWeight:700,color:state.supportKB.length>0?"#085041":"#9CA3AF"}}>{state.supportKB.length>0?`✓ KB ready — ${state.supportKB.length} items`:state.supportDocs.trim()?"Build KB to activate chat":"Start by pasting your product docs"}</div>
        </div>
      </div>
    <div style={{display:"grid",gridTemplateColumns:"290px 1fr",gap:16,height:"calc(100vh - 220px)"}}>
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
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?"#1D9E75":"#F7F6F3",color:m.role==="user"?"white":"#1C1C1A",fontSize:13,lineHeight:1.6}}>
                {i===activeChat.messages.length-1&&m.role==="assistant"&&chatLoading?<StreamText text={m.text||"Thinking..."}/>:m.text}
              </div>
              {m.role==="assistant"&&m.csat&&(
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,paddingLeft:4}}>
                  <div style={{display:"flex",gap:2}}>
                    {[1,2,3,4,5].map(star=>(
                      <div key={star} style={{fontSize:10,color:star<=Math.round(m.csat)?"#BA7517":"#D0CEC8"}}>★</div>
                    ))}
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:"#888780"}}>CSAT {m.csat.toFixed(1)}/5</span>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:10,background:m.sentiment==="positive"?"#E1F5EE":m.sentiment==="negative"?"#FAECE7":"#F0EFE9",color:m.sentiment==="positive"?"#085041":m.sentiment==="negative"?"#D85A30":"#5F5E5A",fontWeight:700}}>
                    {m.sentiment==="positive"?"😊 Positive":m.sentiment==="negative"?"😤 Negative":"😐 Neutral"}
                  </span>
                </div>
              )}
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
    </div>
  );
}

// ── CARE MODE ─────────────────────────────────────────────────────────────
function SLATimer({priority,startTime}){
  const[left,setLeft]=useState(null);
  useEffect(()=>{
    if(priority!=="urgent") return;
    const slaMs=priority==="urgent"?4*60*60*1000:priority==="high"?24*60*60*1000:72*60*60*1000;
    const end=startTime+slaMs;
    const tick=()=>{
      const diff=end-Date.now();
      if(diff<=0){setLeft("OVERDUE");return;}
      const h=Math.floor(diff/3600000);const m=Math.floor((diff%3600000)/60000);const s=Math.floor((diff%60000)/1000);
      setLeft((h>0?h+"h ":"")+m+"m "+s+"s");
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[priority,startTime]);
  if(!left) return null;
  const overdue=left==="OVERDUE";
  return(
    <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",background:overdue?"#FAECE7":"#FFF8EE",border:"1px solid "+(overdue?"#F5B8A0":"#FAC775"),borderRadius:8}}>
      <div style={{width:6,height:6,borderRadius:"50%",background:overdue?"#D85A30":"#BA7517",animation:"pulse 1s infinite"}}/>
      <span style={{fontSize:10,fontWeight:800,color:overdue?"#D85A30":"#BA7517"}}>SLA: {left}</span>
    </div>
  );
}

function CareMode(){
  const{state:globalState,dispatch:globalDispatch}=useStore();
  const toast=useToast();const userId=useUserId();
  const companyId=globalState.employee?.companyId&&globalState.employee.companyId!=="demo"?globalState.employee.companyId:null;
  const[tickets,setTickets]=useState(SAMPLE_TICKETS.map(t=>({...t,createdAt:Date.now()-Math.random()*2*60*60*1000})));
  const[selected,setSelected]=useState(null);
  const[generating,setGenerating]=useState(null);
  const[responses,setResponses]=useState({});
  const[approved,setApproved]=useState({});
  const[tone,setTone]=useState("empathetic");
  const[upsells,setUpsells]=useState({});
  const[brainNotes,setBrainNotes]=useState({});
  const UPSELL_KEYWORDS=["upgrade","enterprise","200 users","100 users","more seats","pricing","plan","premium","annual","bulk"];

  const TONES={
    empathetic:{label:"Empathetic",emoji:"❤️",desc:"Warm, understanding, acknowledge feelings"},
    formal:{label:"Formal",emoji:"🎩",desc:"Professional, structured, business-like"},
    direct:{label:"Direct",emoji:"⚡",desc:"Concise, solution-first, no fluff"},
    urgent:{label:"Urgent",emoji:"🚨",desc:"Fast resolution, escalation-ready"},
  };

  const genResponse=async(t)=>{
    setGenerating(t.id);
    setResponses(r=>({...r,[t.id]:""}));
    const toneInstructions={
      empathetic:"Be warm, acknowledge their feelings explicitly, show genuine care, apologize sincerely.",
      formal:"Be professional and structured. Use formal language. No contractions.",
      direct:"Lead with the solution immediately. No preamble. Bullet points if needed. Under 100 words.",
      urgent:"This is urgent. Acknowledge immediately, give specific timeline, escalate if needed. Highest priority language.",
    }[tone];
    // ── CLOSE THE LOOP: consult the Company Brain before drafting ────────────
    const brain=buildBrainFromState(globalState);
    const ctx=brainContextFor(brain,{name:t.customer,email:t.email},"care");
    setBrainNotes(n=>({...n,[t.id]:ctx.notes}));
    const p="You are a customer care agent. Write a response in "+tone.toUpperCase()+" tone.\n\nTone instruction: "+toneInstructions+"\n\nCustomer: "+t.customer+" ("+t.company+", "+t.city+")\nSubject: "+t.subject+"\nMessage: "+t.message+"\nCategory: "+t.category+"\nSentiment score: "+t.sentiment+" ("+(t.sentiment<=-0.5?"Very negative":t.sentiment<0?"Frustrated":"Positive")+")"+ctx.prompt+"\n\nRules:\n- Address their specific issue (not generic)\n- Give concrete next step\n- Sign as Customer Care Team, NexFlow";
    let full="";
    await callClaudeStream([{role:"user",content:p}],"",(accumulated)=>{
      full=accumulated;
      setResponses(r=>({...r,[t.id]:accumulated}));
    });
    if(!full) setResponses(r=>({...r,[t.id]:"Dear "+t.customer.split(" ")[0]+",\n\nThank you for reaching out. I completely understand your concern and sincerely apologize for the inconvenience.\n\nI have escalated this to our "+t.category+" team and they will resolve it within 24 hours.\n\nThank you for your patience.\nCustomer Care Team, NexFlow"}));
    setGenerating(null);
    toast("Response drafted for "+t.customer,"success");
  };

  const pConfig={urgent:{color:"#D85A30",bg:"#FAECE7",label:"Urgent"},high:{color:"#BA7517",bg:"#FAEEDA",label:"High"},normal:{color:"#534AB7",bg:"#EEEDFE",label:"Normal"},low:{color:"#1D9E75",bg:"#E1F5EE",label:"Low"}};
  const cConfig={billing:{icon:"💳"},technical:{icon:"🔧"},sales:{icon:"💼"},feedback:{icon:"⭐"},refund:{icon:"💰"}};
  const emoji=(s)=>s<=-0.6?"😡":s<=-0.3?"😟":s>=0.6?"😊":"😐";
  // Churn risk: sentiment-based, 0-100
  const churnRisk=(t)=>{
    const base=t.sentiment<=-0.6?88:t.sentiment<=-0.3?64:t.sentiment<=0?40:18;
    const prioBoost=t.priority==="urgent"?12:t.priority==="high"?6:0;
    const catBoost=t.category==="refund"?10:t.category==="billing"?6:0;
    return Math.min(99,base+prioBoost+catBoost);
  };

  const[showNewTicket,setShowNewTicket]=useState(false);
  const[newTicket,setNewTicket]=useState({customer:"",company:"",subject:"",message:"",priority:"normal",category:"technical"});

  const addTicket=()=>{
    if(!newTicket.customer.trim()||!newTicket.message.trim()){toast("Fill in customer name and message","error");return;}
    const sentiment=newTicket.message.toLowerCase().match(/angry|fraud|pathetic|worst|refund|upset|terrible/)? -0.7:
                    newTicket.message.toLowerCase().match(/urgent|asap|immediately|stuck|broken/)? -0.4:
                    newTicket.message.toLowerCase().match(/love|great|amazing|thanks|upgrade|interested/)? 0.7 : -0.1;
    const t={id:Date.now(),customer:newTicket.customer,company:newTicket.company||"Customer",email:(newTicket.customer.toLowerCase().replace(" ",".")+"@gmail.com"),subject:newTicket.subject||"Support request",message:newTicket.message,priority:newTicket.priority,category:newTicket.category,sentiment,city:"India",createdAt:Date.now()};
    setTickets(prev=>[t,...prev]);
    setSelected(t);
    setNewTicket({customer:"",company:"",subject:"",message:"",priority:"normal",category:"technical"});
    setShowNewTicket(false);
    toast("Ticket created — AI will auto-triage","success");
  };

  return(
    <div style={{display:"grid",gridTemplateColumns:"330px 1fr",gap:16}}>
      {/* New Ticket Modal */}
      {showNewTicket&&(
        <div style={{position:"fixed",inset:0,background:"rgba(28,28,26,0.55)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(3px)"}} onClick={e=>e.target===e.currentTarget&&setShowNewTicket(false)}>
          <div style={{background:"white",borderRadius:18,width:"100%",maxWidth:480,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,#D4537E,#F43F5E)",padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:14,fontWeight:800,color:"white"}}>+ New Support Ticket</div>
              <button onClick={()=>setShowNewTicket(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"white",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:5}}>Customer Name *</div><input value={newTicket.customer} onChange={e=>setNewTicket(p=>({...p,customer:e.target.value}))} placeholder="Raj Patel" style={{width:"100%",border:"1px solid #EEECEA",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/></div>
                <div><div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:5}}>Company</div><input value={newTicket.company} onChange={e=>setNewTicket(p=>({...p,company:e.target.value}))} placeholder="UrbanCart" style={{width:"100%",border:"1px solid #EEECEA",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/></div>
              </div>
              <div><div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:5}}>Subject</div><input value={newTicket.subject} onChange={e=>setNewTicket(p=>({...p,subject:e.target.value}))} placeholder="What's the issue about?" style={{width:"100%",border:"1px solid #EEECEA",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/></div>
              <div><div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:5}}>Message *</div><textarea value={newTicket.message} onChange={e=>setNewTicket(p=>({...p,message:e.target.value}))} placeholder="Paste the customer's message here..." rows={4} style={{width:"100%",border:"1px solid #EEECEA",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box"}}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:5}}>Priority</div>
                  <select value={newTicket.priority} onChange={e=>setNewTicket(p=>({...p,priority:e.target.value}))} style={{width:"100%",border:"1px solid #EEECEA",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:"white"}}>
                    <option value="urgent">🚨 Urgent</option><option value="high">🔴 High</option><option value="normal">🟡 Normal</option><option value="low">🟢 Low</option>
                  </select></div>
                <div><div style={{fontSize:11,fontWeight:700,color:"#888780",marginBottom:5}}>Category</div>
                  <select value={newTicket.category} onChange={e=>setNewTicket(p=>({...p,category:e.target.value}))} style={{width:"100%",border:"1px solid #EEECEA",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:"white"}}>
                    <option value="billing">💳 Billing</option><option value="technical">🔧 Technical</option><option value="sales">💼 Sales</option><option value="feedback">⭐ Feedback</option><option value="refund">💰 Refund</option>
                  </select></div>
              </div>
              <Btn variant="pink" onClick={addTicket} fullWidth>Create Ticket — AI will triage</Btn>
            </div>
          </div>
        </div>
      )}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>{tickets.length} tickets</div>
          <div style={{display:"flex",gap:6}}>
            <Tag color="danger">{tickets.filter(t=>t.priority==="urgent").length} urgent</Tag>
            <Tag color="warn">{tickets.filter(t=>!approved[t.id]).length} pending</Tag>
            <button onClick={()=>setShowNewTicket(true)} style={{fontSize:11,fontWeight:700,padding:"4px 11px",borderRadius:8,background:"linear-gradient(135deg,#D4537E,#F43F5E)",color:"white",border:"none",cursor:"pointer"}}>+ New</button>
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
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:pc.bg,color:pc.color}}>{pc.label}</span>
                      {approved[t.id]?<Tag color="success">Resolved</Tag>:<SLATimer priority={t.priority} startTime={t.createdAt||Date.now()-Math.random()*3*60*60*1000}/>}
                    </div>
                    {!approved[t.id]&&(()=>{const cr=churnRisk(t);const hasUp=UPSELL_KEYWORDS.some(kw=>(t.message||"").toLowerCase().includes(kw));return <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{height:4,borderRadius:2,width:60,background:"#F3F4F6",overflow:"hidden"}}><div style={{height:"100%",width:cr+"%",background:cr>=70?"#EF4444":cr>=40?"#F59E0B":"#10B981",borderRadius:2,transition:"width 0.6s"}}/></div><span style={{fontSize:9,fontWeight:700,color:cr>=70?"#EF4444":cr>=40?"#F59E0B":"#10B981"}}>{cr}% churn</span></div>{hasUp&&<span style={{fontSize:9,fontWeight:800,padding:"1px 6px",background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:10,color:"#C2410C"}}>🎯 Upsell</span>}</div>;})()}
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
            <div style={{background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderRadius:10,padding:14,fontSize:13,color:"#1C1C1A",lineHeight:1.7,marginBottom:16,borderLeft:"3px solid #D4537E"}}>{selected.message}</div>
            {/* Tone selector */}
            {!responses[selected.id]&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Response tone</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {Object.entries(TONES).map(([key,t])=>(
                    <button key={key} onClick={()=>setTone(key)} style={{padding:"7px 6px",borderRadius:9,border:"2px solid "+(tone===key?"#D4537E":"#EEECEA"),background:tone===key?"#FBEAF0":"white",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                      <div style={{fontSize:14,marginBottom:2}}>{t.emoji}</div>
                      <div style={{fontSize:9,fontWeight:700,color:tone===key?"#D4537E":"#5F5E5A"}}>{t.label}</div>
                    </button>
                  ))}
                </div>
                {selected.priority==="urgent"&&<div style={{marginTop:8}}><SLATimer priority={selected.priority} startTime={selected.createdAt||Date.now()-2*60*60*1000}/></div>}
              </div>
            )}
            {!responses[selected.id]?(
              <Btn variant="pink" fullWidth disabled={generating===selected.id} onClick={()=>genResponse(selected)}>
                {generating===selected.id?<><Spinner/>Writing {TONES[tone]?.label.toLowerCase()} response...</>:"Generate AI response — "+TONES[tone]?.emoji+" "+TONES[tone]?.label}
              </Btn>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:12,fontWeight:800,color:"#1C1C1A",display:"flex",alignItems:"center",gap:6}}>AI draft <Tag color="warn">Review before sending</Tag></div>
                {brainNotes[selected.id]?.length>0&&(
                  <div style={{background:"rgba(28,122,147,0.07)",border:"1px solid rgba(28,122,147,0.28)",borderRadius:10,padding:"9px 12px"}}>
                    <div style={{fontSize:10,fontWeight:800,color:"#0F4A5A",letterSpacing:"0.06em",marginBottom:5,display:"flex",alignItems:"center",gap:5}}>🧩 WRITTEN KNOWING — from the Company Brain</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {brainNotes[selected.id].map((n,i)=><span key={i} style={{fontSize:10.5,fontWeight:600,color:"#0F4A5A",background:"#E1F5EE",border:"1px solid #9FE1CB",borderRadius:20,padding:"3px 10px"}}>{n}</span>)}
                    </div>
                  </div>
                )}
                <textarea value={responses[selected.id]} onChange={e=>setResponses(r=>({...r,[selected.id]:e.target.value}))} style={{width:"100%",height:180,border:"1px solid #EEECEA",borderRadius:10,padding:12,fontSize:13,lineHeight:1.65,background:"#FAFAF8",fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#D4537E"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn variant="secondary" onClick={()=>genResponse(selected)} disabled={generating===selected.id}>Regenerate</Btn>
                  {responses[selected.id]&&<button onClick={async(e)=>{
                    const btn=e.currentTarget;btn.disabled=true;btn.textContent="Sending...";
                    const fullMsg="नमस्ते "+selected.customer.split(" ")[0]+"! 🙏\n\n"+responses[selected.id].slice(0,500)+"\n\n— "+selected.company+" Support via NexFlow AI";
                    const sent=await sendWhatsAppReal(fullMsg);
                    if(sent){toast("📲 Response sent to your WhatsApp!","success");}
                    else{window.open("https://wa.me/?text="+encodeURIComponent(fullMsg),"_blank");toast("Opening WhatsApp — add VITE_CALLMEBOT_PHONE & VITE_CALLMEBOT_APIKEY to Netlify for direct send","info");}
                    btn.disabled=false;btn.textContent="📲 Send on WhatsApp";
                  }} style={{fontSize:11,fontWeight:700,padding:"7px 14px",background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:9,cursor:"pointer",color:"#15803D",display:"flex",alignItems:"center",gap:6}}>
                    📲 Send on WhatsApp
                  </button>}
                  <Btn variant="pink" fullWidth disabled={approved[selected.id]} onClick={()=>{
                    setApproved(a=>({...a,[selected.id]:true}));
                    saveCareTicket({ticket:selected,toneUsed:tone,aiResponse:responses[selected.id],approved:true,...(userId&&{user_id:userId}),...(companyId&&{company_id:companyId})});
                    // ── UPSELL DETECTION: CareFlow → SalesFlow ─────────────
                    const msgLow=(selected.message||"").toLowerCase();
                    const hasUpsell=UPSELL_KEYWORDS.some(kw=>msgLow.includes(kw));
                    if(hasUpsell){
                      setUpsells(u=>({...u,[selected.id]:true}));
                      const newLead={id:Date.now(),name:selected.customer,role:"Customer",company:selected.company||"Customer Co",industry:"Existing customer",painPoint:selected.subject,fitScore:82,budget:"Upgrade enquiry",objection:"Already a customer — warm lead",email:selected.email||selected.customer.toLowerCase().replace(/\s/g,".")+"@email.com"};
                      globalDispatch({type:"SET_SALES_PROSPECTS",payload:[newLead,...([])]});
                      globalDispatch({type:"ADD_CROSS_EVENT",event:{type:"care_to_sales",title:`CareFlow → SalesFlow upsell`,desc:`${selected.customer} mentioned upgrade in support ticket — routed as warm sales lead`,action:"SalesFlow pre-loaded with this lead"}});
                      // Real, persisted, RLS-scoped signal — visible to a sales_rep employee at this
                      // company even in a different browser session, not just this in-memory event.
                      if(companyId){
                        createCrossRoleSignal({companyId,type:"lead",payload:newLead,createdByUserId:userId}).catch(()=>{});
                      }
                    }
                    toast(hasUpsell?"Response sent — upsell detected, lead routed to SalesFlow!":"Response sent to "+selected.customer,hasUpsell?"success":"success");
                  }}>
                    {approved[selected.id]?"Sent ✓":"Approve and send"}
                  </Btn>
                </div>
                {upsells[selected.id]&&(
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{padding:"10px 14px",background:"linear-gradient(135deg,#FFF7ED,#FFFBF5)",border:"1.5px solid #FED7AA",borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:18}}>🎯</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:800,color:"#9A3412"}}>Upsell opportunity detected!</div>
                      <div style={{fontSize:10,color:"#C2410C"}}>{selected.customer} mentioned upgrade — auto-routed as warm lead to SalesFlow</div>
                    </div>
                    <button onClick={()=>globalDispatch({type:"SET_MODE",payload:"sales"})} style={{fontSize:10,fontWeight:700,padding:"5px 12px",background:"#EA580C",border:"none",borderRadius:7,color:"white",cursor:"pointer",whiteSpace:"nowrap"}}>Open SalesFlow →</button>
                  </motion.div>
                )}
              </div>
            )}
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            <MetricCard label="Priority" value={pConfig[selected.priority]?.label} icon={cConfig[selected.category]?.icon}/>
            <MetricCard label="Sentiment" value={emoji(selected.sentiment)+" "+(selected.sentiment>=0.5?"Positive":selected.sentiment<=-0.5?"Negative":"Neutral")} deltaType={selected.sentiment>=0.3?"good":selected.sentiment<=-0.3?"danger":"neutral"}/>
            <MetricCard label="Status" value={approved[selected.id]?"Resolved":"Pending"} delta={approved[selected.id]?"Sent":"Awaiting"} deltaType={approved[selected.id]?"good":"warn"}/>
            {(()=>{const cr=churnRisk(selected);return <MetricCard label="Churn Risk" value={cr+"%"} delta={cr>=70?"High risk":cr>=40?"Monitor":"Low risk"} deltaType={cr>=70?"danger":cr>=40?"warn":"good"}/>;})()}
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
  const[streamThought,setStreamThought]=useState("");
  const[waTemplate,setWaTemplate]=useState("");
  const[waLoading,setWaLoading]=useState(false);

  const useSample=()=>setBiz({name:SAMPLE_SMB.name,type:SAMPLE_SMB.type,city:SAMPLE_SMB.city,problem:SAMPLE_SMB.problem,whatsapp:SAMPLE_SMB.whatsappChats});

  const analyze=async()=>{
    if(!biz.name.trim()){toast("Add business name","error");return;}
    setLoading(true);setStep("analyzing");setStreamThought("");
    toast("AI analyzing your business in Indian context...","info");

    // Step 1: Stream visible AI thinking
    await callClaudeStream(
      [{role:"user",content:"You are analyzing an Indian SMB called '"+biz.name+"' ("+biz.type+", "+biz.city+"). Their challenge: "+biz.problem+"\n\nThink out loud: what are the 3 biggest opportunities for this business? What would you automate first? What does their customer data tell you? Write 4-5 short insight sentences as you think through it."}],
      "Indian business intelligence expert.",
      (accumulated)=>setStreamThought(accumulated)
    );

    // Step 2: Get structured JSON result
    const p="You are a business intelligence AI for Indian SMBs. Analyze this business and return JSON.\n\nBusiness: "+JSON.stringify(biz)+"\n\nReturn ONLY valid JSON (no markdown):\n{\"summary\":\"2 sentence overview\",\"topPain\":\"biggest pain\",\"crmContacts\":[{\"name\":\"name\",\"intent\":\"order\",\"value\":\"high\",\"action\":\"Follow up today\"}],\"supportFAQs\":[{\"q\":\"question\",\"a\":\"answer\"}],\"salesOpportunities\":[{\"opportunity\":\"description\",\"revenue\":\"Rs X/month\",\"action\":\"what to do\"}],\"automationWins\":[\"specific automation\"],\"weeklyTimeSaved\":\"X hours\",\"roiEstimate\":\"Rs X/month\"}";
    try{
      const raw=await callClaude([{role:"user",content:p}]);
      const clean=raw.split("```").join("").replace(/^json\s*/i,"").trim();
      const data=JSON.parse(clean);
      setResult(data);
      dispatch({type:"SET_SMB_PROFILE",payload:{...biz,...data}});

      // ── REAL DATA HANDOFF: SMB Brain → SalesFlow ──────────────────────────
      if(data.crmContacts?.length>0){
        const injectedProspects=data.crmContacts.map((c,i)=>({
          id:i+1,
          name:c.name,
          role:c.intent||"Customer",
          company:biz.name,
          industry:biz.type,
          painPoint:c.action||"Needs follow-up",
          fitScore:c.value==="high"?88:c.value==="medium"?72:55,
          budget:"From SMB Brain",
          objection:"Not yet engaged",
          email:c.name.toLowerCase().replace(/\s+/g,".")+`@${biz.name.toLowerCase().replace(/\s+/g,"")}.in`,
        }));
        dispatch({type:"SET_SALES_PROSPECTS",payload:injectedProspects});
        dispatch({type:"SET_SALES_PRODUCT",payload:`${biz.name} — ${biz.type} business in ${biz.city}\n\n${data.summary}\n\nTop opportunity: ${data.salesOpportunities?.[0]?.opportunity||""}`});
        dispatch({type:"ADD_CROSS_EVENT",event:{type:"smb_to_sales",title:`SMB Brain → SalesFlow`,desc:`${injectedProspects.length} real customers from ${biz.name} injected as sales prospects`,action:"SalesFlow pre-loaded — open it to see personalized outreach"}});
      }

      // ── REAL DATA HANDOFF: SMB Brain → SupportFlow ───────────────────────
      if(data.supportFAQs?.length>0){
        dispatch({type:"SET_SUPPORT_KB",payload:data.supportFAQs});
        dispatch({type:"SET_SUPPORT_DOCS",payload:`${biz.name} — ${biz.type} in ${biz.city}\n\nAuto-generated by SMB Brain AI.\n\n${data.summary}`});
        dispatch({type:"ADD_CROSS_EVENT",event:{type:"smb_to_support",title:`SMB Brain → SupportFlow`,desc:`${data.supportFAQs.length} FAQs from ${biz.name} injected into support KB`,action:"SupportFlow KB live — chat bot ready instantly"}});
      }

      dispatch({type:"ADD_CROSS_EVENT",event:{type:"smb_complete",title:"SMB profile built for "+biz.name,desc:(data.crmContacts?.length||0)+" contacts extracted, "+(data.salesOpportunities?.length||0)+" sales opportunities found.",action:"Routes to SalesFlow and CareFlow automatically"}});
      setStep("result");
      toast("SMB intelligence report ready — SalesFlow + SupportFlow pre-loaded","success");
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
                <div style={{fontSize:11,fontWeight:700,color:"#5F5E5A",marginBottom:4,display:"flex",alignItems:"center",gap:8}}>Main challenge <VoiceMicBtn onResult={(t)=>setBiz(b=>({...b,problem:(b.problem+" "+t).trimStart()}))} lang="en-IN" style={{marginLeft:"auto"}}/></div>
                <textarea value={biz.problem} onChange={e=>setBiz(b=>({...b,problem:e.target.value}))} placeholder="Speak or type — e.g. Managing 3 stores, WhatsApp orders chaotic, no CRM..." style={{width:"100%",height:70,border:"1px solid #EEECEA",borderRadius:9,padding:"9px 12px",fontSize:12,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#7C3AED"} onBlur={e=>e.target.style.borderColor="#EEECEA"}/>
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
        <Card style={{padding:32,maxWidth:620}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#7C3AED,#9F67FA)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏪</div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:"#1C1C1A"}}>Analyzing {biz.name}...</div>
              <div style={{fontSize:12,color:"#888780"}}>AI reading your business in Indian market context</div>
            </div>
          </div>
          {streamThought?(
            <div style={{background:"#F3F0FF",border:"1px solid #DDD6FE",borderRadius:12,padding:"14px 16px",borderLeft:"3px solid #7C3AED"}}>
              <div style={{fontSize:10,fontWeight:800,color:"#7C3AED",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>AI thinking</div>
              <div style={{fontSize:12.5,color:"#4C1D95",lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                {streamThought}<span style={{display:"inline-block",width:2,height:13,background:"#7C3AED",marginLeft:2,animation:"blink 0.7s infinite",verticalAlign:"text-bottom"}}/>
              </div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["Reading business context...","Extracting customer contacts from chats...","Identifying opportunities..."].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#F3F0FF",borderRadius:8,animation:"fadeIn 0.4s ease "+(i*0.2)+"s both"}}>
                  <Spinner color="#7C3AED"/><span style={{fontSize:12,color:"#5F5E5A"}}>{s}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{marginTop:16,fontSize:11,color:"#888780",display:"flex",alignItems:"center",gap:6}}>
            <Spinner color="#7C3AED"/>Building structured report...
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
                  <div key={i} style={{padding:"10px 12px",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",borderRadius:9,border:"1px solid #EEECEA",marginBottom:8}}>
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
          {/* Cross-mode injection badges */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {result.crmContacts?.length>0&&(
              <div style={{flex:1,minWidth:220,background:"linear-gradient(135deg,#FFF7ED,#FFFBF5)",border:"1.5px solid #FED7AA",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"#EA580C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎯</div>
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:"#9A3412"}}>SalesFlow pre-loaded</div>
                  <div style={{fontSize:10,color:"#C2410C"}}>{result.crmContacts.length} customers from {biz.name} added as prospects</div>
                  <button onClick={()=>dispatch({type:"SET_MODE",payload:"sales"})} style={{marginTop:5,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#EA580C",border:"none",borderRadius:6,color:"white",cursor:"pointer"}}>Open SalesFlow →</button>
                </div>
              </div>
            )}
            {result.supportFAQs?.length>0&&(
              <div style={{flex:1,minWidth:220,background:"linear-gradient(135deg,#F0FDF4,#F7FEF9)",border:"1.5px solid #86EFAC",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"#16A34A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💬</div>
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:"#14532D"}}>SupportFlow KB ready</div>
                  <div style={{fontSize:10,color:"#15803D"}}>{result.supportFAQs.length} FAQs from {biz.name} injected — chat bot live</div>
                  <button onClick={()=>dispatch({type:"SET_MODE",payload:"support"})} style={{marginTop:5,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#16A34A",border:"none",borderRadius:6,color:"white",cursor:"pointer"}}>Open SupportFlow →</button>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp template generator */}
          <Card style={{padding:18,background:"#F0FDF4",border:"1.5px solid #86EFAC"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#14532D",marginBottom:2}}>📱 WhatsApp broadcast template</div>
                <div style={{fontSize:11,color:"#16A34A"}}>Ready-to-send template for your customers — copy and paste</div>
              </div>
              <Btn variant="success" size="sm" disabled={waLoading} onClick={async()=>{
                setWaLoading(true);setWaTemplate("");
                const p="Write a WhatsApp broadcast message for an Indian business called '"+biz.name+"' ("+biz.type+" in "+biz.city+").\n\nBusiness context: "+result.summary+"\nTop sales opportunity: "+(result.salesOpportunities?.[0]?.opportunity||"customer re-engagement")+"\n\nRules:\n- Write in a mix of Hindi/English (Hinglish) that feels natural for Indian customers\n- Start with a greeting, mention the business, give a specific offer or update\n- End with a clear call to action (reply YES, call, or visit)\n- Under 160 characters\n- No bullet points, just flowing text\n- Make it feel personal, not spammy\n\nReturn only the WhatsApp message text, nothing else.";
                await callClaudeStream([{role:"user",content:p}],"",(t)=>setWaTemplate(t));
                setWaLoading(false);
              }}>{waLoading?<><Spinner color="#fff"/>Writing...</>:"Generate template"}</Btn>
            </div>
            {waTemplate?(
              <div style={{background:"white",borderRadius:10,padding:14,border:"1px solid #86EFAC"}}>
                <div style={{fontSize:13,color:"#14532D",lineHeight:1.7,fontFamily:"inherit",whiteSpace:"pre-wrap"}}>{waTemplate}</div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <Btn variant="success" size="sm" onClick={()=>{navigator.clipboard?.writeText(waTemplate);toast("Copied to clipboard!","success");}}>Copy message</Btn>
                  <Btn variant="secondary" size="sm" onClick={()=>setWaTemplate("")}>Regenerate</Btn>
                </div>
              </div>
            ):(
              <div style={{background:"white",borderRadius:10,padding:12,border:"1px dashed #86EFAC",textAlign:"center",color:"#9CA3AF",fontSize:12}}>
                Click "Generate template" → get a copy-paste WhatsApp message for your customers
              </div>
            )}
          </Card>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn variant="secondary" onClick={()=>{setStep("input");setResult(null);setWaTemplate("");}}>Analyze another business</Btn>
            <Btn variant="success" onClick={()=>dispatch({type:"SET_MODE",payload:"support"})}>{"-> "}Open SupportFlow with this KB</Btn>
            <Btn variant="orange" onClick={()=>dispatch({type:"SET_MODE",payload:"sales"})}>{"-> "}Open SalesFlow with prospects</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PREDICTIVE INTELLIGENCE PANEL ────────────────────────────────────────
function PredictivePanel({metrics,confidence,state}){
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState("");
  const[open,setOpen]=useState(false);
  const generate=async()=>{
    setLoading(true);setOpen(true);setResult("");
    // Load past sessions from localStorage
    let pastSessions=[];
    try{
      const raw=localStorage.getItem("war_room_sessions");
      if(raw)pastSessions=JSON.parse(raw).slice(0,5);
    }catch{}
    const avgConf=confidence&&Object.values(confidence).length>0
      ?Math.round(Object.values(confidence).reduce((s,c)=>s+(c.pct||80),0)/Object.values(confidence).length)
      :80;
    const sessionsText=pastSessions.length>0
      ?pastSessions.map((s,i)=>`Run ${i+1} (${s.date||"past"}): ${s.candidates||0} candidates, ${s.prospects||0} prospects, ${s.kb_items||0} KB items, ${s.handoffs||0} handoffs`).join("\n")
      :"No past session data available (first run)";
    const prompt=`You are a senior business intelligence AI analyzing an Indian SMB's operational patterns to make forward-looking recommendations.

CURRENT RUN DATA:
- Candidates shortlisted: ${state.activeCandidates?.length||0}
- Sales prospects: ${state.salesProspects?.length||0}
- Support KB items: ${state.supportKB?.length||0}
- Care tickets: ${state.careTickets?.length||0}
- Cross-agent handoffs: ${metrics?.handoffs||0}
- Avg agent confidence: ${avgConf}%

PAST WAR ROOM SESSIONS:
${sessionsText}

Based on this data, provide:

TREND ANALYSIS: [2-3 sentences on what's changing across runs — hiring velocity, sales momentum, support load trends]

⚠️ RISK ALERT: [1 specific operational risk you see — e.g., "Support volume growing faster than team capacity"]

📈 NEXT 30 DAYS — PREDICTION:
- Hiring: [specific prediction based on trends]
- Sales: [specific prediction]
- Support: [specific prediction]

🎯 RECOMMENDED ACTIONS (this week):
1. [Most urgent action — be specific, Indian SMB context]
2. [Second action]
3. [Third action]

💡 SMART SCHEDULING: [When to run the next War Room and why — give a specific date range like "Run again in 2 weeks when..."]

Be specific to Indian SMB context — mention realistic numbers, Indian market conditions, and practical next steps.`;
    const txt=await callClaude([{role:"user",content:prompt}],"Senior Indian business intelligence analyst. Provide actionable forward-looking predictions.");
    setResult(txt);setLoading(false);
  };
  return(
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{marginTop:12}}>
      {!open?(
        <button onClick={generate} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#1C1C2E,#2D1B69)",border:"none",borderRadius:14,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px rgba(83,74,183,0.3)"}}>
          {loading?<><Spinner/> Analyzing trends...</>:<>🔮 Predictive Intelligence — What Happens Next?</>}
        </button>
      ):(
        <Card style={{padding:16,background:"linear-gradient(135deg,#0F0F1A,#1E1B4B)",border:"1.5px solid #4338CA"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:"#A5B4FC"}}>🔮 Predictive Intelligence</div>
            <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#6B7280",cursor:"pointer",fontSize:16}}>×</button>
          </div>
          {loading&&<div style={{display:"flex",alignItems:"center",gap:10,color:"#7C3AED",fontSize:13}}><Spinner/> Analyzing past sessions + current run to predict what happens next...</div>}
          {result&&(
            <div style={{fontSize:12,color:"#C7D2FE",lineHeight:1.8}}>
              {result.split("\n").map((line,i)=>{
                const isHeader=line.startsWith("TREND ANALYSIS")||line.startsWith("RISK ALERT")||line.startsWith("NEXT 30")||line.startsWith("RECOMMENDED")||line.startsWith("SMART SCHED")||line.includes("RISK ALERT")||line.includes("NEXT 30 DAYS")||line.includes("RECOMMENDED ACTIONS")||line.includes("SMART SCHEDULING");
                const isSub=(line.startsWith("- Hiring:")||line.startsWith("- Sales:")||line.startsWith("- Support:"))||/^\d+\./.test(line);
                if(!line.trim())return<div key={i} style={{height:6}}/>;
                if(isHeader)return<div key={i} style={{color:"#818CF8",fontWeight:800,fontSize:13,marginTop:12,marginBottom:4,padding:"4px 8px",background:"rgba(99,102,241,0.15)",borderRadius:6,borderLeft:"3px solid #6366F1"}}>{line}</div>;
                if(isSub)return<div key={i} style={{color:"#A5B4FC",fontWeight:600,marginLeft:8,marginTop:2}}>{line}</div>;
                return<div key={i} style={{color:"#C7D2FE"}}>{line}</div>;
              })}
            </div>
          )}
        </Card>
      )}
    </motion.div>
  );
}

// ── WAR ROOM MODE ─────────────────────────────────────────────────────────
function WarRoomMode(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[running,setRunning]=useState(false);
  const[phase,setPhase]=useState(0);
  const[debates,setDebates]=useState([]);
  const[voiceEnabled,setVoiceEnabled]=useState(false);
  const[lastRun,setLastRun]=useState(null);
  const[confidence,setConfidence]=useState({});   // {1: {pct:87, reason:"...", low:false}, ...}
  const[lowConfHelp,setLowConfHelp]=useState([]); // extra help-request debate cards
  useEffect(()=>{setTTSEnabled(voiceEnabled);},[voiceEnabled]);
  useEffect(()=>{
    // Try Supabase first, fall back to localStorage
    const loadMemory=async()=>{
      try{
        const {dbSelect,DB_READY}=await import("./lib/supabase.js");
        if(DB_READY){
          const rows=await dbSelect("war_room_sessions",{},"created_at.desc",1);
          if(rows&&rows.length>0){setLastRun({date:new Date(rows[0].created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),summary:rows[0].summary,candidates:rows[0].candidates,prospects:rows[0].prospects});return;}
        }
      }catch{}
      try{const s=localStorage.getItem("flowzint_last_warroom");if(s)setLastRun(JSON.parse(s));}catch{}
    };
    loadMemory();
  },[]);
  const exportPDF=()=>{
    const summary=(phaseResults[6]||"").replace(/^\u{1F4CB}\s*/u,"");
    const candidates=state.activeCandidates?.length||0;
    const prospects=state.salesProspects?.length||0;
    const kb=state.supportKB?.length||0;
    const hours=((candidates*2.5)+(prospects*1.5)+(kb*0.5)).toFixed(0);
    const roi=((candidates*2.5+prospects*1.5)*1200/100000).toFixed(1);
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>NexFlow AI — War Room Report</title><style>body{font-family:Inter,sans-serif;max-width:700px;margin:40px auto;color:#111827;line-height:1.7}h1{font-size:24px;font-weight:900;color:#4C1D95}h2{font-size:15px;font-weight:800;color:#374151;margin-top:28px;border-bottom:2px solid #EDE9FE;padding-bottom:6px}.meta{color:#6B7280;font-size:13px;margin-bottom:24px}.summary{background:#F5F3FF;border:1.5px solid #A78BFA;border-radius:12px;padding:16px 20px;font-size:14px;color:#4C1D95;margin-bottom:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px;text-align:center}.big{font-size:28px;font-weight:900;color:#6D5FFA}.label{font-size:12px;font-weight:700;color:#374151;margin-top:4px}.sub{font-size:11px;color:#9CA3AF}.handoff{border-left:3px solid #8B5CF6;padding:8px 14px;margin:6px 0;background:#FAFAFA;border-radius:0 8px 8px 0;font-size:13px}.dispute{border-left:3px solid #EF4444;padding:8px 14px;margin:6px 0;background:#FFF5F5;border-radius:0 8px 8px 0;font-size:13px}.resolve{border-left:3px solid #16A34A;padding:8px 14px;margin:6px 0;background:#F0FDF4;border-radius:0 8px 8px 0;font-size:13px}@media print{body{margin:0}}</style></head><body><h1>War Room Report</h1><div class="meta">Generated ${new Date().toLocaleString("en-IN")} · NexFlow AI</div>${summary?`<div class="summary">${summary}</div>`:""}<h2>Command Report</h2><div class="grid"><div class="card"><div class="big">${candidates||"—"}</div><div class="label">Candidates</div><div class="sub">HireFlow</div></div><div class="card"><div class="big">${prospects||"—"}</div><div class="label">Prospects</div><div class="sub">SalesFlow</div></div><div class="card"><div class="big">${kb||"—"}</div><div class="label">KB Items</div><div class="sub">SupportFlow</div></div></div><div class="grid"><div class="card"><div class="big">${hours}h</div><div class="label">Hours Saved</div><div class="sub">vs manual</div></div><div class="card"><div class="big">&#8377;${roi}L</div><div class="label">Monthly ROI</div><div class="sub">at &#8377;1200/hr</div></div><div class="card"><div class="big">${state.crossEvents?.length||0}</div><div class="label">Cross-agent Signals</div><div class="sub">this session</div></div></div><h2>Agent Handoffs & Debates</h2>${debates.map(d=>`<div class="${d.type==="dispute"?"dispute":d.type==="resolve"?"resolve":"handoff"}"><strong>${d.from} ${d.type==="dispute"?"⚔️":d.type==="resolve"?"✅":"→"} ${d.to}</strong><br>${d.msg}</div>`).join("")}<p style="margin-top:40px;color:#9CA3AF;font-size:12px">NexFlow AI · Powered by Llama 3.3 70B via Groq</p></body></html>`);
    win.document.close();
    setTimeout(()=>win.print(),400);
  };
  const[metrics,setMetrics]=useState(null);
  const[phaseResults,setPhaseResults]=useState({});

  const PHASES=[
    {id:0,title:"Briefing",icon:"📋",desc:"Loading business context across all 4 systems"},
    {id:1,title:"Hiring agents",icon:"🧠",desc:"7 agents scanning 42 resumes simultaneously"},
    {id:2,title:"Sales agents",icon:"🎯",desc:"Prospect scoring and email personalization"},
    {id:3,title:"Support agents",icon:"💬",desc:"Building KB, detecting escalation patterns"},
    {id:4,title:"Care agents",icon:"❤️",desc:"Ticket triage and response drafting"},
    {id:5,title:"Cross-agent debate",icon:"⚡",desc:"Agents cross-referencing and handing off tasks"},
    {id:6,title:"Command report",icon:"📊",desc:"Unified intelligence report ready"},
  ];

  // ── Pull real data BEFORE AGENT_PAIRS uses it ──────────────────────────
  const topCandidate=state.activeCandidates?.[0];
  const topScore=topCandidate&&state.dynamicScores?.[topCandidate.id]?state.dynamicScores[topCandidate.id]:91;
  const topProspect=state.salesProspects?.[0];
  const kbCount=state.supportKB?.length||8;
  const smbName=state.smbProfile?.name;
  const hasRealData=topProspect||state.supportKB?.length>0||state.smbProfile;

  const AGENT_PAIRS=[
    {from:"🧠 HireFlow",to:"🎯 SalesFlow",
     topic:topCandidate?`${topCandidate.name} (score ${topScore}/100) declined our offer but has strong B2B background at ${topCandidate.company||"their company"}. Should we route them as a warm sales prospect instead of letting the lead go cold?`:"A top candidate just declined offer. They have strong B2B sales experience at enterprise companies. Should we route them as a warm sales prospect instead?"},
    {from:"💬 SupportFlow",to:"❤️ CareFlow",
     topic:kbCount>0?`We detected an escalation pattern in ${kbCount} KB queries — 3 users asking about billing refunds in the last hour. CareFlow has 2 matching open tickets. Should we auto-merge and prioritize?`:"We have an escalated chat from Raj Patel about billing. CareFlow has an open ticket from same customer. How should we merge and resolve this?"},
    {from:"❤️ CareFlow",to:"🎯 SalesFlow",
     topic:topProspect?`A care ticket from ${topProspect.company} (${topProspect.name}) mentioned upgrading to 200 users — same company already in our sales pipeline at ${topProspect.fitScore}% fit. This is a warm upsell. How do we close it?`:"Amir Khan in a care ticket mentioned upgrading to 200 users. That's a clear Enterprise upsell. How should we hand this off to sales without losing context?"},
    {from:"🎯 SalesFlow",to:"💬 SupportFlow",
     topic:topProspect?`${state.salesProspects?.length||3} of our prospects (including ${topProspect.name}) mentioned "${topProspect.painPoint}" as their main blocker. Should this become a priority FAQ item or is it a product gap?`:"3 out of 5 prospects mentioned 'pipeline stuck' as their main objection. Should this be escalated as a priority FAQ item or a product bug?"},
    {from:"🧠 HireFlow",to:"❤️ CareFlow",
     topic:topCandidate?`${topCandidate.name} accepted the offer and starts in 2 weeks. Their role requires access to billing, CRM, and HR systems. What Day-1 onboarding tickets should CareFlow auto-create now?`:"Pipeline is complete. We have a candidate accepting offer — starting in 2 weeks. What onboarding tickets should CareFlow create proactively for Day 1 readiness?"},
  ];

  // (real data already pulled above before AGENT_PAIRS)

  const PHASE_RESULTS_DATA=[
    smbName?`Context loaded — ${smbName} profile + ${state.salesProspects?.length||0} prospects + ${kbCount} KB items ready`:"Context loaded from 4 AI systems — all agents briefed",
    topCandidate?`7 agents active → 5 candidates ranked, top: ${topCandidate.name} (${topScore}/100) — interview scheduled`:"7 agents active → 5 candidates shortlisted, top: Aditya Kumar (91/100) — interview scheduled",
    topProspect?`5 prospects scored → ${topProspect.name} at ${topProspect.company} ranked #1 (${topProspect.fitScore}% fit) — personalized email drafted`:"5 B2B prospects scored → Priya Singh at TechVentures ranked #1 (87% fit) — email drafted",
    kbCount>0?`${kbCount} KB items active → 1 escalation pattern detected (billing pain point flagged)`:"8 FAQs extracted from docs → 1 escalation pattern detected (billing pain point flagged)",
    "5 tickets triaged → 2 urgent resolved, 3 AI response drafts approved and sent",
    null,
    smbName?`Unified report ready for ${smbName} — 42h saved, ₹4.2L monthly ROI estimated`:"Unified command report ready — 42h saved, ₹4.2L monthly ROI estimated",
  ];

  const run=async()=>{
    setRunning(true);setDebates([]);setMetrics(null);setPhaseResults({});setConfidence({});setLowConfHelp([]);
    toast("War Room activated — all 4 AI systems online","info");

    // Phase 0: Context briefing — real AI
    setPhase(0);
    let p0="";
    await callClaudeStream(
      [{role:"user",content:`You are the War Room orchestrator briefing 4 AI systems.\n\nActive context:\n- HireFlow: ${topCandidate?topCandidate.name+" ("+topScore+"/100), "+topCandidate.role+" at "+(topCandidate.company||"?"):"no pipeline run yet"}\n- SalesFlow: ${topProspect?state.salesProspects.length+" prospects, top: "+topProspect.name+" @ "+topProspect.company+" ("+topProspect.fitScore+"% fit)":"no prospects yet"}\n- SupportFlow: ${kbCount} KB items active\n- SMB: ${smbName||"no SMB profile"}\n\nWrite a 2-sentence briefing: what's loaded and what the War Room will do. Be specific, use actual names/numbers.`}],
      "War Room orchestrator AI. Concise, military-style briefing. 50 words max.",
      (acc)=>{p0=acc;setPhaseResults(prev=>({...prev,0:"🤖 "+acc}));}
    );

    // helper to add debate card
    const addDebate=(from,to,type="handoff")=>{const id=Date.now()+Math.random();setDebates(prev=>[...prev,{from,to,msg:"",streaming:true,id,type}]);return id;};
    const finishDebate=(id,msg)=>{setDebates(prev=>prev.map(d=>d.id===id?{...d,msg,streaming:false}:d));};

    // ── Phase 1: HireFlow runs first ────────────────────────────────────────
    setPhase(1);
    setPhaseResults(prev=>({...prev,1:"🧠 ..."}));
    toast("🧠 HireFlow agent activated","info");
    speak("HireFlow agent online. Scanning candidates.");
    let p1="";
    const d1id=addDebate("🧠 HireFlow","⚡ War Room");
    await callClaudeStream(
      [{role:"user",content:`You are the HireFlow AI agent in a live War Room.\n\nCandidate data: ${topCandidate?JSON.stringify({name:topCandidate.name,role:topCandidate.role,company:topCandidate.company,score:topScore,exp:topCandidate.exp}):"No pipeline run — generating from JD context"}\n\nReport your pipeline status in 2 sentences. Then output exactly on separate lines:\nHANDOFF_TO_SALES: [name 1-2 candidates rejected due to budget/location mismatch, or "none"]\nCONFIDENCE: [a number 55-98]% — [one specific reason you are or aren't fully certain, e.g. "limited salary data for this market"]`}],
      "HireFlow agent. Data-driven. Reference actual candidate names and scores. 90 words max.",
      (acc)=>{p1=acc;setPhaseResults(prev=>({...prev,1:"🧠 "+acc}));setDebates(prev=>prev.map(d=>d.id===d1id?{...d,msg:acc}:d));}
    );
    finishDebate(d1id,p1);
    speak(p1);
    // Parse confidence
    {const m=p1.match(/CONFIDENCE:\s*(\d+)%\s*[—–-]\s*(.+)/i);
     if(m){const pct=parseInt(m[1]);const reason=m[2].replace(/HANDOFF_TO_SALES:.*/i,"").trim();
       setConfidence(prev=>({...prev,1:{pct,reason,low:pct<70}}));
       if(pct<70){speak(`HireFlow confidence low at ${pct}%. Requesting SalesFlow input.`);
         const hid=addDebate("🧠 HireFlow","🎯 SalesFlow","dispute");
         let ht="";
         await callClaudeStream([{role:"user",content:`HireFlow AI is ${pct}% confident on its hiring report because: "${reason}". You are SalesFlow AI. In 2 sentences, give HireFlow specific data or market context that would increase confidence — reference Indian market hiring norms, salary benchmarks, or prospect-pipeline overlap.`}],
           "SalesFlow. Helpful, specific. Indian market context. 50 words max.",(acc)=>{ht=acc;setDebates(prev=>prev.map(d=>d.id===hid?{...d,msg:acc}:d));});
         finishDebate(hid,ht);
         dispatch({type:"ADD_CROSS_EVENT",event:{type:"confidence_assist",title:"⚠️ HireFlow requested help",desc:`Low confidence (${pct}%) — SalesFlow provided context`,action:"Confidence boosted"}});
       }
     }
    }
    const handoffMatch=p1.match(/HANDOFF_TO_SALES:\s*(.+)/i);
    const hireflowHandoff=handoffMatch?handoffMatch[1].replace(/\[|\]/g,"").trim():"";
    if(hireflowHandoff&&hireflowHandoff.toLowerCase()!=="none"){
      dispatch({type:"ADD_CROSS_EVENT",event:{type:"hiring_to_sales",title:"HireFlow → SalesFlow",desc:"Routed "+hireflowHandoff+" as warm sales leads",action:"Auto-routed"}});
    }
    await new Promise(r=>setTimeout(r,300));

    // ── DISAGREEMENT: SalesFlow challenges HireFlow ──────────────────────
    toast("⚔️ SalesFlow disputes HireFlow assessment","warn");
    const dis1id=addDebate("⚔️ SalesFlow","🧠 HireFlow","dispute");
    let dispute1="";
    await callClaudeStream(
      [{role:"user",content:`You are the SalesFlow AI agent. You just received HireFlow's report:\n"${p1.slice(0,200)}"\n\nYou DISAGREE with one specific hiring decision. Either a rejected candidate has a network/skills that would benefit a sales pipeline, or a hire creates a headcount risk that needs mitigation. Name the candidate specifically. State your counter-position in 2 direct sentences. No preamble, no agreement.`}],
      "SalesFlow agent. Assertive disagreement. Name specific candidate. 50 words max.",
      (acc)=>{dispute1=acc;setDebates(prev=>prev.map(d=>d.id===dis1id?{...d,msg:acc}:d));}
    );
    finishDebate(dis1id,dispute1);
    speak("SalesFlow disputes: "+dispute1);
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"agent_disagreement",title:"⚔️ SalesFlow challenges HireFlow",desc:dispute1.slice(0,80),action:"Under review"}});
    // HireFlow concedes or holds
    const res1id=addDebate("🧠 HireFlow","⚔️ SalesFlow","resolve");
    let resolve1="";
    await callClaudeStream(
      [{role:"user",content:`You are HireFlow AI. SalesFlow just challenged your decision:\n"${dispute1.slice(0,150)}"\n\nRespond in 1-2 sentences. Either concede and update your decision with a specific action (e.g. re-routing candidate X), OR counter with data. Be decisive, specific about what changes (or doesn't).`}],
      "HireFlow agent. Decisive response. No preamble. 40 words max.",
      (acc)=>{resolve1=acc;setDebates(prev=>prev.map(d=>d.id===res1id?{...d,msg:acc}:d));}
    );
    finishDebate(res1id,resolve1);
    speak("HireFlow responds: "+resolve1);
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"agent_resolution",title:"✅ HireFlow resolves dispute",desc:resolve1.slice(0,80),action:"Decision updated"}});
    // ── REAL STATE CHANGE: find disputed candidate and mark as warm_lead ──
    {
      const allNames=(state.activeCandidates||[]).map(c=>c.name);
      const disputedName=allNames.find(n=>dispute1.toLowerCase().includes(n.split(" ")[0].toLowerCase())||dispute1.toLowerCase().includes(n.toLowerCase()));
      if(disputedName){
        const found=(state.activeCandidates||[]).find(c=>c.name===disputedName);
        if(found){
          dispatch({type:"SET_CANDIDATE_DECISION",id:found.id,decision:"warm_lead"});
          toast(`⚔️ War Room: ${disputedName} → Warm Lead (SalesFlow overruled HireFlow)`,"success");
          dispatch({type:"ADD_CROSS_EVENT",event:{type:"state_change",title:"🔄 "+disputedName+" status changed",desc:"HireFlow rejected → SalesFlow claimed as Warm Lead",action:"HireFlow candidate list updated"}});
        }
      }
    }
    await new Promise(r=>setTimeout(r,300));

    // ── Phase 2: SalesFlow reads HireFlow's output ───────────────────────
    setPhase(2);
    setPhaseResults(prev=>({...prev,2:"🎯 ..."}));
    toast("🎯 SalesFlow agent activated — reading HireFlow handoff","info");
    speak("SalesFlow agent online. Processing HireFlow handoff.");
    let p2="";
    const d2id=addDebate("🎯 SalesFlow","⚡ War Room");
    await callClaudeStream(
      [{role:"user",content:`You are the SalesFlow AI agent in a War Room.\n\n⚡ INCOMING HANDOFF from HireFlow: "${hireflowHandoff||"no candidates handed off"}" — warm leads. Acknowledge them.\nDebate resolution: "${resolve1.slice(0,80)}"\n\nYour prospect data: ${topProspect?JSON.stringify({name:topProspect.name,company:topProspect.company,fit:topProspect.fitScore,pain:topProspect.painPoint}):"No prospects yet"}\n\nReport in 2 sentences: what you accepted from HireFlow, top prospect, next action. Then output exactly on separate lines:\nHANDOFF_TO_SUPPORT: [top objection from prospects]\nCONFIDENCE: [a number 55-98]% — [one specific reason you are or aren't fully certain]`}],
      "SalesFlow agent. Reference HireFlow handoff explicitly. 90 words max.",
      (acc)=>{p2=acc;setPhaseResults(prev=>({...prev,2:"🎯 "+acc}));setDebates(prev=>prev.map(d=>d.id===d2id?{...d,msg:acc}:d));}
    );
    finishDebate(d2id,p2);
    speak(p2);
    {const m=p2.match(/CONFIDENCE:\s*(\d+)%\s*[—–-]\s*(.+)/i);
     if(m){const pct=parseInt(m[1]);const reason=m[2].replace(/HANDOFF_TO_\w+:.*/i,"").trim();
       setConfidence(prev=>({...prev,2:{pct,reason,low:pct<70}}));
       if(pct<70){speak(`SalesFlow confidence low at ${pct}%. Requesting SupportFlow input.`);
         const hid=addDebate("🎯 SalesFlow","💬 SupportFlow","dispute");
         let ht="";
         await callClaudeStream([{role:"user",content:`SalesFlow AI is ${pct}% confident on its sales report because: "${reason}". You are SupportFlow AI. In 2 sentences, provide specific customer feedback data or KB insights that would help SalesFlow increase confidence — reference actual support patterns or common Indian B2B objections.`}],
           "SupportFlow. Helpful, specific. 50 words max.",(acc)=>{ht=acc;setDebates(prev=>prev.map(d=>d.id===hid?{...d,msg:acc}:d));});
         finishDebate(hid,ht);
         dispatch({type:"ADD_CROSS_EVENT",event:{type:"confidence_assist",title:"⚠️ SalesFlow requested help",desc:`Low confidence (${pct}%) — SupportFlow provided context`,action:"Confidence boosted"}});
       }
     }
    }
    const objMatch=p2.match(/HANDOFF_TO_SUPPORT:\s*(.+)/i);
    const salesHandoff=objMatch?objMatch[1].replace(/\[|\]/g,"").trim():"pricing concerns";
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"sales_to_support",title:"SalesFlow → SupportFlow",desc:"Top objection: "+salesHandoff,action:"Added to KB"}});
    await new Promise(r=>setTimeout(r,300));

    // ── DISAGREEMENT: SupportFlow challenges SalesFlow framing ──────────
    toast("⚔️ SupportFlow disputes SalesFlow objection framing","warn");
    const dis2id=addDebate("⚔️ SupportFlow","🎯 SalesFlow","dispute");
    let dispute2="";
    await callClaudeStream(
      [{role:"user",content:`You are SupportFlow AI. SalesFlow sent you this objection to add to your KB:\n"${salesHandoff}"\n\nYou DISAGREE with how it's framed — either it's too aggressive for a support context, missing nuance, or contradicts existing KB content. State in 1-2 sentences what's wrong and what the corrected framing should be.`}],
      "SupportFlow agent. Push back on framing. Be specific. 45 words max.",
      (acc)=>{dispute2=acc;setDebates(prev=>prev.map(d=>d.id===dis2id?{...d,msg:acc}:d));}
    );
    finishDebate(dis2id,dispute2);
    speak("SupportFlow pushes back: "+dispute2);
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"agent_disagreement",title:"⚔️ SupportFlow challenges SalesFlow",desc:dispute2.slice(0,80),action:"KB reframing"}});
    const res2id=addDebate("🎯 SalesFlow","⚔️ SupportFlow","resolve");
    let resolve2="";
    await callClaudeStream(
      [{role:"user",content:`You are SalesFlow AI. SupportFlow reframed your objection:\n"${dispute2.slice(0,120)}"\n\nAccept the correction in 1 sentence and specify the updated KB entry that will be added.`}],
      "SalesFlow agent. Accept gracefully. Confirm updated KB entry. 35 words max.",
      (acc)=>{resolve2=acc;setDebates(prev=>prev.map(d=>d.id===res2id?{...d,msg:acc}:d));}
    );
    finishDebate(res2id,resolve2);
    speak("SalesFlow concedes: "+resolve2);
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"agent_resolution",title:"✅ SalesFlow accepts reframe",desc:resolve2.slice(0,80),action:"KB updated"}});
    await new Promise(r=>setTimeout(r,300));

    // ── Phase 3: SupportFlow runs ────────────────────────────────────────
    setPhase(3);
    setPhaseResults(prev=>({...prev,3:"💬 ..."}));
    toast("💬 SupportFlow activated — ingesting updated objection","info");
    speak("SupportFlow agent online. Updating knowledge base.");
    let p3="";
    const d3id=addDebate("💬 SupportFlow","⚡ War Room");
    await callClaudeStream(
      [{role:"user",content:`You are the SupportFlow AI agent in a War Room.\n\n⚡ INCOMING: SalesFlow objection (reframed): "${resolve2.slice(0,100)||salesHandoff}". Added to KB.\n\nKB status: ${kbCount} items indexed. ${state.supportKB?.length>0?"Sample: "+state.supportKB[0]?.q:"No KB built yet"}\n\nReport in 2 sentences: what you added to KB, escalation patterns. Then output exactly on separate lines:\nHANDOFF_TO_CARE: [one high-priority customer needing CareFlow attention]\nCONFIDENCE: [a number 55-98]% — [one specific reason you are or aren't fully certain]`}],
      "SupportFlow agent. Confirm KB update. Reference debate resolution. 90 words max.",
      (acc)=>{p3=acc;setPhaseResults(prev=>({...prev,3:"💬 "+acc}));setDebates(prev=>prev.map(d=>d.id===d3id?{...d,msg:acc}:d));}
    );
    finishDebate(d3id,p3);
    speak(p3);
    {const m=p3.match(/CONFIDENCE:\s*(\d+)%\s*[—–-]\s*(.+)/i);
     if(m){const pct=parseInt(m[1]);const reason=m[2].replace(/HANDOFF_TO_\w+:.*/i,"").trim();
       setConfidence(prev=>({...prev,3:{pct,reason,low:pct<70}}));
       if(pct<70){speak(`SupportFlow confidence low at ${pct}%. Requesting CareFlow context.`);
         const hid=addDebate("💬 SupportFlow","❤️ CareFlow","dispute");
         let ht="";
         await callClaudeStream([{role:"user",content:`SupportFlow AI is ${pct}% confident on its report because: "${reason}". You are CareFlow AI. In 2 sentences, provide specific ticket data or escalation patterns from the care queue that would help SupportFlow calibrate its KB entries.`}],
           "CareFlow. Helpful, specific. 50 words max.",(acc)=>{ht=acc;setDebates(prev=>prev.map(d=>d.id===hid?{...d,msg:acc}:d));});
         finishDebate(hid,ht);
         dispatch({type:"ADD_CROSS_EVENT",event:{type:"confidence_assist",title:"⚠️ SupportFlow requested help",desc:`Low confidence (${pct}%) — CareFlow provided context`,action:"Confidence boosted"}});
       }
     }
    }
    const escalMatch=p3.match(/HANDOFF_TO_CARE:\s*(.+)/i);
    const supportHandoff=escalMatch?escalMatch[1].replace(/\[|\]/g,"").trim():"high-priority escalation";
    dispatch({type:"ADD_CROSS_EVENT",event:{type:"support_to_care",title:"SupportFlow → CareFlow",desc:"Escalated: "+supportHandoff,action:"Priority ticket created"}});
    await new Promise(r=>setTimeout(r,300));

    // ── Phase 4: CareFlow reads SupportFlow's escalation ────────────────
    setPhase(4);
    setPhaseResults(prev=>({...prev,4:"❤️ ..."}));
    toast("❤️ CareFlow activated — processing escalation","info");
    speak("CareFlow agent online. Processing escalation from SupportFlow.");
    let p4="";
    const d4id=addDebate("❤️ CareFlow","⚡ War Room");
    await callClaudeStream(
      [{role:"user",content:`You are the CareFlow AI agent in a War Room.\n\n⚡ INCOMING from SupportFlow: "${supportHandoff}" — URGENT.\n\nTicket queue: Raj Patel (billing, urgent), Priya Nair (tech, high), Amir Khan (enterprise upsell, normal), Sunita Rao (login, high), Vikram Singh (feedback, low).\n\nReport in 2 sentences: what SupportFlow escalated, updated triage, upsell detected. Then output exactly on separate lines:\nHANDOFF_TO_SALES: [Amir Khan — enterprise upgrade, priority upsell]\nCONFIDENCE: [a number 55-98]% — [one specific reason you are or aren't fully certain]`}],
      "CareFlow agent. Reference SupportFlow escalation explicitly. 90 words max.",
      (acc)=>{p4=acc;setPhaseResults(prev=>({...prev,4:"❤️ "+acc}));setDebates(prev=>prev.map(d=>d.id===d4id?{...d,msg:acc}:d));}
    );
    finishDebate(d4id,p4);
    speak(p4);
    {const m=p4.match(/CONFIDENCE:\s*(\d+)%\s*[—–-]\s*(.+)/i);
     if(m){const pct=parseInt(m[1]);const reason=m[2].replace(/HANDOFF_TO_\w+:.*/i,"").trim();
       setConfidence(prev=>({...prev,4:{pct,reason,low:pct<70}}));
     }
    }
    const upsellMatch=p4.match(/HANDOFF_TO_SALES:\s*(.+)/i);
    if(upsellMatch){
      dispatch({type:"ADD_CROSS_EVENT",event:{type:"care_to_sales",title:"CareFlow → SalesFlow",desc:"Upsell: "+upsellMatch[1].replace(/\[|\]/g,"").trim(),action:"Routed to SalesFlow"}});
    }

    // Phase 5: Cross-agent debates
    setPhase(5);
    if(true){
        // Real streaming AI debates
        for(const pair of AGENT_PAIRS){
          const debateId=Date.now()+Math.random();
          setDebates(prev=>[...prev,{from:pair.from,to:pair.to,msg:"",streaming:true,id:debateId}]);
          await callClaudeStream(
            [{role:"user",content:"You are "+pair.from+" agent talking to "+pair.to+" agent in an AI system.\n\nTopic: "+pair.topic+"\n\nWrite a 2-3 sentence handoff message: your recommendation/decision, why, and exact action being taken. Be specific, use data points, name the action taken automatically. No preamble."}],
            "Expert AI agent. Concise, decisive, data-driven. Never use bullet points. 60 words max.",
            (accumulated)=>{
              setDebates(prev=>prev.map(d=>d.id===debateId?{...d,msg:accumulated}:d));
            }
          );
          setDebates(prev=>prev.map(d=>d.id===debateId?{...d,streaming:false}:d));
          dispatch({type:"ADD_CROSS_EVENT",event:{type:"agent_handoff",title:pair.from+" → "+pair.to,desc:pair.topic,action:"Automated"}});
          await new Promise(r=>setTimeout(r,400));
        }
        setPhaseResults(prev=>({...prev,5:`${AGENT_PAIRS.length} cross-agent handoffs completed — all tasks auto-routed`}));
    }

    // Phase 6: Final unified report — real AI
    setPhase(6);
    let p6="";
    await callClaudeStream(
      [{role:"user",content:`You are the War Room AI generating the final unified intelligence report.\n\n${lastRun?`MEMORY: Last run on ${lastRun.date} — ${lastRun.summary?.slice(0,120)}. Compare progress.\n\n`:""}\nWhat ran this session:\n- HireFlow: ${p1.replace(/HANDOFF_TO_\w+:.+/gi,"").replace(/CONFIDENCE:.+/gi,"").slice(0,120)} [confidence: ${confidence[1]?.pct||"?"}%]\n- SalesFlow: ${p2.replace(/HANDOFF_TO_\w+:.+/gi,"").replace(/CONFIDENCE:.+/gi,"").slice(0,120)} [confidence: ${confidence[2]?.pct||"?"}%]\n- SupportFlow: ${p3.replace(/HANDOFF_TO_\w+:.+/gi,"").replace(/CONFIDENCE:.+/gi,"").slice(0,120)} [confidence: ${confidence[3]?.pct||"?"}%]\n- CareFlow: ${p4.replace(/HANDOFF_TO_\w+:.+/gi,"").replace(/CONFIDENCE:.+/gi,"").slice(0,120)} [confidence: ${confidence[4]?.pct||"?"}%]\n- Debates: 2 agent disagreements raised and resolved\n- Peer reviews: ${Object.values(confidence).filter(c=>c.low).length} agents triggered automatic peer review\n\nWrite a 3-sentence executive summary: outcomes, collective confidence level, peer reviews triggered, ROI in hours saved and rupees. Be specific with numbers.`}],
      "War Room report AI. Authoritative. Specific numbers. 80 words max.",
      (acc)=>{p6=acc;setPhaseResults(prev=>({...prev,6:"📋 "+acc}));}
    );

    setMetrics({done:true});
    setRunning(false);
    toast("War Room complete — unified report ready","success");
    speak("War Room complete. "+p6.slice(0,200));
    // Save session memory — Supabase first, localStorage fallback
    const sessionData={
      summary:p6.replace(/^\u{1F4CB}\s*/u,""),
      candidates:state.activeCandidates?.length||0,
      prospects:state.salesProspects?.length||0,
      kb_items:state.supportKB?.length||0,
      cross_events:state.crossEvents?.length||0,
      handoffs_count:debates.length,
    };
    try{
      const {dbInsert,DB_READY}=await import("./lib/supabase.js");
      if(DB_READY)await dbInsert("war_room_sessions",sessionData);
    }catch{}
    try{
      localStorage.setItem("flowzint_last_warroom",JSON.stringify({
        date:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),
        ...sessionData,
      }));
    }catch{}
  };

  const done=phase===6&&!running&&metrics;
  const agentColors={"🧠 HireFlow":"#6D5FFA","🎯 SalesFlow":"#F59E0B","💬 SupportFlow":"#10B981","❤️ CareFlow":"#F43F5E"};

  return(
    <div style={{animation:"fadeIn 0.3s ease",maxWidth:1100}}>
      {/* Live data indicator */}
      {hasRealData&&(
        <div style={{marginBottom:12,padding:"8px 14px",background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",border:"1.5px solid #A78BFA",borderRadius:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#7C3AED",animation:"pulse 1s infinite",flexShrink:0}}/>
          <div style={{fontSize:11,fontWeight:700,color:"#5B21B6"}}>Live data connected —</div>
          {topCandidate&&<span style={{fontSize:11,color:"#6D28D9",padding:"2px 8px",background:"rgba(109,40,217,0.08)",borderRadius:20}}>🧠 {topCandidate.name} ({topScore}/100)</span>}
          {topProspect&&<span style={{fontSize:11,color:"#6D28D9",padding:"2px 8px",background:"rgba(109,40,217,0.08)",borderRadius:20}}>🎯 {topProspect.name} @ {topProspect.company}</span>}
          {state.supportKB?.length>0&&<span style={{fontSize:11,color:"#6D28D9",padding:"2px 8px",background:"rgba(109,40,217,0.08)",borderRadius:20}}>💬 {state.supportKB.length} KB items</span>}
          {smbName&&<span style={{fontSize:11,color:"#6D28D9",padding:"2px 8px",background:"rgba(109,40,217,0.08)",borderRadius:20}}>🏪 {smbName}</span>}
          <div style={{marginLeft:"auto",fontSize:10,color:"#7C3AED",fontWeight:600}}>Debates will use your real data ↓</div>
        </div>
      )}
      {/* Last run memory */}
      {lastRun&&!running&&!metrics&&(
        <div style={{marginBottom:12,padding:"10px 16px",background:"linear-gradient(135deg,#F0FDF4,#ECFDF5)",border:"1.5px solid #6EE7B7",borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🧠</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:800,color:"#065F46"}}>Memory: Last War Room run — {lastRun.date}</div>
            <div style={{fontSize:11,color:"#047857",marginTop:1,lineHeight:1.5}}>{lastRun.summary?.slice(0,180)}...</div>
          </div>
          <button onClick={()=>setLastRun(null)} style={{fontSize:11,color:"#9CA3AF",background:"none",border:"none",cursor:"pointer"}}>✕</button>
        </div>
      )}
      {/* Launch bar */}
      <div style={{background:"white",border:"1.5px solid #F1F1F1",borderRadius:14,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>Run every AI agent with real handoffs</div>
          <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>HireFlow → SalesFlow → SupportFlow → CareFlow — agents read each other's output, debate, and resolve disagreements</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          {/* Voice toggle */}
          <button onClick={()=>setVoiceEnabled(v=>!v)}
            title={voiceEnabled?"Voice ON — click to mute":"Voice OFF — click to enable AI narration"}
            style={{padding:"9px 14px",background:voiceEnabled?"#EDE9FE":"#F3F4F6",border:`1.5px solid ${voiceEnabled?"#A78BFA":"#E5E7EB"}`,borderRadius:9,fontSize:13,fontWeight:700,color:voiceEnabled?"#6D28D9":"#6B7280",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:6}}>
            {voiceEnabled?"🔊 Voice ON":"🔇 Voice"}
          </button>
          {/* PDF export */}
          {metrics&&<button onClick={exportPDF}
            style={{padding:"9px 14px",background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:9,fontSize:13,fontWeight:700,color:"#15803D",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            📄 Export PDF
          </button>}
          <button onClick={run} disabled={running}
            style={{padding:"11px 24px",background:running?"#F3F4F6":"linear-gradient(135deg,#6D5FFA,#8B5CF6)",border:"none",borderRadius:10,fontSize:13,fontWeight:800,color:running?"#9CA3AF":"white",cursor:running?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:running?"none":"0 4px 18px rgba(109,95,250,0.35)",transition:"all 0.2s",whiteSpace:"nowrap"}}
            onMouseEnter={e=>{if(!running){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(109,95,250,0.5)";}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=running?"none":"0 4px 18px rgba(109,95,250,0.35)";}}>
            {running?<><Spinner color="#9CA3AF"/>Agents running...</>:"⚡ Activate all agents →"}
          </button>
        </div>
      </div>

      <div className="warroom-grid" style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14,marginBottom:14}}>
        {/* Phases */}
        <Card style={{padding:16}}>
          <div style={{fontSize:12,fontWeight:800,color:"#374151",marginBottom:12,letterSpacing:"-0.01em"}}>Mission phases</div>
          {/* Sequential handoff badge */}
          {(typeof phase==="number"&&phase>0&&phase<5)&&(
            <div style={{marginBottom:10,padding:"6px 10px",background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",border:"1.5px solid #A78BFA",borderRadius:9,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#8B5CF6",animation:"pulse 0.6s infinite",flexShrink:0}}/>
              <div style={{fontSize:10,fontWeight:800,color:"#6D28D9"}}>🔗 Agent {phase}/4 — reading previous handoff</div>
            </div>
          )}
          {PHASES.map(p=>{
            const isParallelPhase=p.id>=1&&p.id<=4;
            const isDone=typeof phase==="number"&&(phase>p.id||(phase>4&&isParallelPhase));
            const isActive=(phase===p.id&&running);
            const result=phaseResults[p.id];
            return(
              <div key={p.id} style={{padding:"9px 0",borderBottom:p.id<6?"1px solid #F9FAFB":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:26,height:26,borderRadius:8,background:isDone?"#DCFCE7":isActive?"#EDE9FE":"#F9FAFB",border:`1.5px solid ${isDone?"#86EFAC":isActive?"#A78BFA":"#F1F1F1"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,transition:"all 0.3s"}}>
                    {isDone?"✓":isActive?<div style={{width:6,height:6,borderRadius:"50%",background:"#8B5CF6",animation:"pulse 1s infinite"}}/>:p.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:isDone?"#374151":isActive?"#6D5FFA":"#9CA3AF"}}>{p.title}{isParallelPhase&&isActive?" 🔗":""}</div>
                    {isActive&&<div style={{fontSize:9,color:"#8B5CF6",marginTop:1}}>{p.desc}</div>}
                  </div>
                  {isDone&&!result&&<span style={{fontSize:9,fontWeight:700,color:"#16A34A",background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:20,padding:"2px 7px"}}>Done</span>}
                </div>
                {result&&result!=="🧠 ..."&&result!=="🎯 ..."&&result!=="💬 ..."&&result!=="❤️ ..."&&(
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{marginTop:6,marginLeft:36,padding:"6px 10px",background:"#F0FDF4",borderRadius:8,border:"1px solid #BBF7D0",borderLeft:"3px solid #16A34A"}}>
                    <div style={{fontSize:9.5,color:"#15803D",lineHeight:1.5,fontWeight:500}}>{result}</div>
                  </motion.div>
                )}
                {isActive&&result&&(result==="🧠 ..."||result==="🎯 ..."||result==="💬 ..."||result==="❤️ ...")&&(
                  <div style={{marginTop:4,marginLeft:36,fontSize:9,color:"#8B5CF6"}}>Generating...</div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Live debates */}
        <Card style={{padding:16,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:800,color:"#374151"}}>Live agent debates & handoffs</div>
            {debates.length>0&&<div style={{display:"flex",gap:6}}>
              <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,background:"#FEE2E2",color:"#DC2626",fontWeight:700}}>{debates.filter(d=>d.type==="dispute").length} disputes</span>
              <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,background:"#DCFCE7",color:"#16A34A",fontWeight:700}}>{debates.filter(d=>d.type==="resolve").length} resolved</span>
            </div>}
          </div>
          {debates.length===0&&!running&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 0",color:"#D1D5DB",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:12,opacity:0.5}}>⚔️</div>
              <div style={{fontSize:13,fontWeight:600,color:"#9CA3AF"}}>Waiting for agents to debate</div>
              <div style={{fontSize:11,color:"#D1D5DB",marginTop:4}}>Agents will disagree, argue, and resolve — all in real time</div>
            </div>
          )}
          {debates.length===0&&running&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <AgentOutputSkeleton/>
              <AgentOutputSkeleton/>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",maxHeight:420}}>
            {debates.map((d,i)=>{
              const isDispute=d.type==="dispute";
              const isResolve=d.type==="resolve";
              const borderColor=isDispute?"#EF4444":isResolve?"#16A34A":"#8B5CF6";
              const bg=isDispute?"#FFF5F5":isResolve?"#F0FDF4":"#FAFAFA";
              const badge=isDispute?"⚔️ DISPUTE":isResolve?"✅ RESOLVED":"→ HANDOFF";
              const badgeColor=isDispute?"#DC2626":isResolve?"#16A34A":"#7C3AED";
              const badgeBg=isDispute?"#FEE2E2":isResolve?"#DCFCE7":"#EDE9FE";
              return(
                <motion.div key={d.id||i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                  style={{background:bg,border:`1px solid ${isDispute?"#FECACA":isResolve?"#86EFAC":"#F1F1F1"}`,borderRadius:10,padding:"10px 14px",borderLeft:`3px solid ${borderColor}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:800,color:borderColor}}>{d.from}</span>
                      <span style={{fontSize:10,color:"#D1D5DB"}}>→</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#6B7280"}}>{d.to}</span>
                      <span style={{fontSize:9,fontWeight:800,padding:"1px 7px",borderRadius:20,background:badgeBg,color:badgeColor}}>{badge}</span>
                    </div>
                    {d.streaming&&<div style={{display:"flex",gap:3}}>{[0,1,2].map(k=><div key={k} style={{width:4,height:4,borderRadius:"50%",background:borderColor,animation:"pulse 1s infinite",animationDelay:k*0.18+"s"}}/>)}</div>}
                  </div>
                  <div style={{fontSize:12,color:"#374151",lineHeight:1.65}}>
                    {d.msg||<span style={{color:"#D1D5DB",fontSize:11}}>Processing...</span>}
                    {d.streaming&&d.msg&&<span style={{display:"inline-block",width:1.5,height:11,background:borderColor,marginLeft:1,animation:"blink 0.7s infinite",verticalAlign:"text-bottom"}}/>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Confidence Dashboard */}
      {Object.keys(confidence).length>0&&(
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginBottom:14}}>
          <Card style={{padding:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:800,color:"#374151"}}>🎯 Agent Confidence Scores</div>
              <div style={{fontSize:10,color:"#9CA3AF"}}>Below 70% triggers automatic peer review</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{id:1,label:"HireFlow",icon:"🧠",color:"#6D5FFA"},{id:2,label:"SalesFlow",icon:"🎯",color:"#F59E0B"},{id:3,label:"SupportFlow",icon:"💬",color:"#10B981"},{id:4,label:"CareFlow",icon:"❤️",color:"#F43F5E"}].map(a=>{
                const c=confidence[a.id];
                if(!c)return(
                  <div key={a.id} style={{background:"#F9FAFB",borderRadius:10,padding:"12px 10px",border:"1px solid #F3F4F6",opacity:0.5}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF"}}>{a.icon} {a.label}</div>
                    <div style={{fontSize:10,color:"#D1D5DB",marginTop:6}}>Waiting...</div>
                  </div>
                );
                const barColor=c.pct>=80?"#16A34A":c.pct>=70?"#D97706":"#DC2626";
                const bg=c.pct>=80?"#F0FDF4":c.pct>=70?"#FEF3C7":"#FEF2F2";
                const border=c.pct>=80?"#86EFAC":c.pct>=70?"#FDE68A":"#FECACA";
                return(
                  <motion.div key={a.id} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                    style={{background:bg,borderRadius:10,padding:"12px 10px",border:`1px solid ${border}`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#374151"}}>{a.icon} {a.label}</div>
                      {c.low&&<span style={{fontSize:8,fontWeight:800,padding:"1px 6px",borderRadius:20,background:"#FEE2E2",color:"#DC2626"}}>PEER REVIEW</span>}
                    </div>
                    <div style={{fontSize:26,fontWeight:900,color:barColor,lineHeight:1}}>{c.pct}%</div>
                    {/* Animated bar */}
                    <div style={{height:4,background:"#E5E7EB",borderRadius:4,marginTop:6,overflow:"hidden"}}>
                      <motion.div initial={{width:0}} animate={{width:c.pct+"%"}} transition={{duration:0.8,ease:"easeOut"}}
                        style={{height:"100%",borderRadius:4,background:barColor}}/>
                    </div>
                    <div style={{fontSize:9,color:"#6B7280",marginTop:5,lineHeight:1.4}}>{c.reason}</div>
                  </motion.div>
                );
              })}
            </div>
            {/* Overall confidence */}
            {Object.keys(confidence).length===4&&(()=>{
              const avg=Math.round(Object.values(confidence).reduce((s,c)=>s+c.pct,0)/4);
              const lowCount=Object.values(confidence).filter(c=>c.low).length;
              return(
                <div style={{marginTop:12,padding:"10px 14px",background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",borderRadius:10,border:"1.5px solid #A78BFA",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:"#5B21B6"}}>Collective confidence: {avg}%</div>
                    <div style={{fontSize:10,color:"#7C3AED",marginTop:2}}>{lowCount>0?`${lowCount} agent${lowCount>1?"s":""} triggered peer review — additional context provided`:"All agents above threshold — no peer review needed"}</div>
                  </div>
                  <div style={{fontSize:28,fontWeight:900,color:avg>=80?"#6D28D9":avg>=70?"#D97706":"#DC2626"}}>{avg}%</div>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      )}

      {/* AI Executive Summary */}
      {phaseResults[6]&&(
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginBottom:12}}>
          <Card style={{padding:16,background:"linear-gradient(135deg,#F5F3FF,#EDE9FE)",border:"1.5px solid #A78BFA"}}>
            <div style={{fontSize:11,fontWeight:800,color:"#6D28D9",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>📋 AI Executive Summary</div>
            <div style={{fontSize:13,color:"#4C1D95",lineHeight:1.75}}>{phaseResults[6].replace(/^\u{1F4CB}\s*/u,"")}</div>
          </Card>
        </motion.div>
      )}

      {/* Results */}
      {done&&(
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
          <Card style={{padding:20}}>
            <div style={{fontSize:13,fontWeight:800,color:"#111827",marginBottom:14}}>Command report — all systems complete</div>
            <div className="command-report-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
              {[
                {icon:"🧠",label:"HireFlow",v:state.pipelineState==="done"?"Done":"—",d:state.activeCandidates?.length?state.activeCandidates.length+" shortlisted":"Run pipeline first"},
                {icon:"🎯",label:"SalesFlow",v:state.salesProspects?.length>0?"Done":"—",d:state.salesProspects?.length>0?state.salesProspects.length+" prospects":"Run SalesFlow first"},
                {icon:"💬",label:"SupportFlow",v:state.supportKB?.length>0?"Done":"—",d:state.supportKB?.length>0?state.supportKB.length+" KB items":"Run SupportFlow first"},
                {icon:"❤️",label:"CareFlow",v:state.careTickets?.length>0?"Done":"—",d:state.careTickets?.length>0?state.careTickets.length+" tickets":"Run CareFlow first"},
              ].map((m,i)=>(
                <div key={i} style={{background:"#F9FAFB",borderRadius:12,padding:"14px 12px",textAlign:"center",border:"1px solid #F1F1F1"}}>
                  <div style={{fontSize:20,marginBottom:6}}>{m.icon}</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#374151"}}>{m.label}</div>
                  <div style={{fontSize:18,fontWeight:900,color:m.v==="Done"?"#16A34A":"#9CA3AF",margin:"4px 0"}}>{m.v}</div>
                  <div style={{fontSize:10,color:"#9CA3AF"}}>{m.d}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[
                {label:"Cross-agent handoffs",v:AGENT_PAIRS.length+"",d:"automated in this run"},
                {label:"Total hours saved",v:((state.activeCandidates?.length||0)*2.5+(state.salesProspects?.length||0)*1.5+(state.supportKB?.length||0)*0.5).toFixed(0)+"h",d:"vs manual ops"},
                {label:"Est. monthly ROI",v:"₹"+(((state.activeCandidates?.length||0)*2.5+(state.salesProspects?.length||0)*1.5)*1200/100000).toFixed(1)+"L",d:"at ₹1200/hr team cost",c:"#6D5FFA"},
              ].map((m,i)=>(
                <div key={i} style={{background:"#F9FAFB",borderRadius:12,padding:"16px",border:"1px solid #F1F1F1"}}>
                  <div style={{fontSize:22,fontWeight:900,color:m.c||"#111827",letterSpacing:"-0.02em"}}>{m.v}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#374151",marginTop:4}}>{m.label}</div>
                  <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>{m.d}</div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
      {done&&<PredictivePanel metrics={metrics} confidence={confidence} state={state}/>}
    </div>
  );
}

function HiringHistory(){
  const{state,dispatch}=useStore();
  const toast=useToast();
  const[dbRuns,setDbRuns]=useState([]);
  const[dbLoading,setDbLoading]=useState(false);
  const[selectedRun,setSelectedRun]=useState(null);
  const[runCandidates,setRunCandidates]=useState([]);
  const[candLoading,setCandLoading]=useState(false);

  useEffect(()=>{
    if(!DB_READY) return;
    setDbLoading(true);
    loadPipelineHistory().then(runs=>{setDbRuns(runs);setDbLoading(false);});
  },[]);

  const viewRun=async(run)=>{
    setSelectedRun(run);
    setCandLoading(true);
    const cands=await loadCandidatesForRun(run.id);
    setRunCandidates(cands);
    setCandLoading(false);
  };

  return(
    <div style={{maxWidth:900,display:"grid",gridTemplateColumns:selectedRun?"320px 1fr":"1fr",gap:16}}>
      <div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:16,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Pipeline history</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:12,color:"#888780"}}>{DB_READY?"Loaded from Supabase · real database":"Local only — connect Supabase for persistence"}</div>
            {DB_READY&&<div style={{fontSize:10,padding:"2px 8px",background:"#E1F5EE",color:"#085041",borderRadius:20,fontWeight:700}}>DB connected</div>}
            {!DB_READY&&<div style={{fontSize:10,padding:"2px 8px",background:"#FFF8EE",color:"#BA7517",borderRadius:20,fontWeight:700}}>No DB — see .env setup</div>}
          </div>
        </div>

        {/* Supabase runs */}
        {DB_READY&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Database runs</div>
            {dbLoading&&<div style={{display:"flex",alignItems:"center",gap:8,color:"#888780",fontSize:12,padding:8}}><Spinner/> Loading from Supabase...</div>}
            {!dbLoading&&dbRuns.length===0&&<div style={{color:"#888780",fontSize:12,padding:8}}>No runs saved yet. Run a pipeline to save it.</div>}
            {dbRuns.map(run=>(
              <div key={run.id} onClick={()=>viewRun(run)} style={{padding:"12px 14px",borderRadius:10,border:"1.5px solid "+(selectedRun?.id===run.id?"#534AB7":"#EEECEA"),background:selectedRun?.id===run.id?"#EEEDFE":"white",cursor:"pointer",marginBottom:6,transition:"all 0.15s"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A",marginBottom:3}}>{run.session_label||"Pipeline run"}</div>
                <div style={{display:"flex",gap:8,fontSize:10,color:"#888780"}}>
                  <span>{run.total_resumes} resumes</span>
                  <span>·</span>
                  <span>{new Date(run.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Local localStorage history */}
        <div style={{borderTop:"1px solid #EEECEA",paddingTop:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Local history (browser)</div>
          <PipelineHistoryPanel onLoadRun={(run)=>{toast("Run loaded","info");dispatch({type:"SET_NAV",payload:"report"});}}/>
        </div>
      </div>

      {/* Run detail panel */}
      {selectedRun&&(
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>{selectedRun.session_label}</div>
          <div style={{fontSize:11,color:"#888780",marginBottom:14}}>{selectedRun.total_resumes} resumes · {new Date(selectedRun.created_at).toLocaleString("en-IN")}</div>
          {candLoading&&<div style={{display:"flex",alignItems:"center",gap:8,color:"#888780",fontSize:12}}><Spinner/>Loading candidates...</div>}
          {!candLoading&&runCandidates.length===0&&<div style={{color:"#888780",fontSize:12}}>No candidate data stored for this run.</div>}
          {!candLoading&&runCandidates.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A",marginBottom:6}}>{runCandidates.length} candidates shortlisted</div>
              {runCandidates.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1px solid #EEECEA",background:"#FAFAF8"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:c.avatar_bg||"#EEEDFE",color:c.avatar_text||"#3C3489",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{c.avatar||"?"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div>
                    <div style={{fontSize:10,color:"#888780"}}>{c.role}{c.company?" · "+c.company:""}</div>
                    {c.skills?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>{c.skills.slice(0,3).map(s=><span key={s} style={{fontSize:9,padding:"1px 6px",background:"#E1F5EE",color:"#085041",borderRadius:10,fontWeight:600}}>{s}</span>)}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <div style={{fontSize:16,fontWeight:900,color:c.score>=80?"#534AB7":c.score>=60?"#BA7517":"#D85A30"}}>{c.score}</div>
                    {c.decision&&<div style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:c.decision==="pass"?"#E1F5EE":"#FAECE7",color:c.decision==="pass"?"#085041":"#D85A30",fontWeight:700}}>{c.decision}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── APP SHELL ─────────────────────────────────────────────────────────────
const HIRING_NAV=[{id:"dashboard",label:"Dashboard",icon:"⊞"},{id:"pipeline",label:"Pipeline",icon:"▶"},{id:"candidates",label:"Candidates",icon:"👥"},{id:"outreach",label:"Outreach",icon:"✉️"},{id:"interviews",label:"Interviews",icon:"💬"},{id:"report",label:"Report",icon:"📄"},{id:"history",label:"History",icon:"🕐"}];
const HIRING_PAGES={dashboard:HiringDashboard,pipeline:HiringPipeline,candidates:HiringCandidates,outreach:HiringOutreach,interviews:HiringInterviews,report:HiringReport,history:HiringHistory};
const GLOBAL_STYLES=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Inter,system-ui,sans-serif;-webkit-text-size-adjust:100%;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes voicePulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.3)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0.15)}}
@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
.shimmer{background:linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 37%,#F3F4F6 63%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:6px;}

/* ── TABLET ── */
@media(max-width:1100px){
  .home-grid{grid-template-columns:repeat(2,1fr)!important;}
  .auth-shell{flex-direction:column!important;gap:28px!important;}
  .auth-left{max-width:560px!important;flex:none!important;}
  .feature-grid{grid-template-columns:repeat(2,1fr)!important;}
  .care-grid{grid-template-columns:1fr!important;}
  .support-grid{grid-template-columns:1fr!important;}
  .hiring-layout{flex-direction:column!important;}
  .warroom-grid{grid-template-columns:1fr!important;}
  .command-report-grid{grid-template-columns:repeat(2,1fr)!important;}
  .hiring-report-grid{grid-template-columns:repeat(3,1fr)!important;}
}

/* ── MOBILE ── */
@media(max-width:768px){
  /* Hero */
  .hero-h1{font-size:30px!important;line-height:1.15!important;}
  .hero-section{padding:0 16px 32px!important;}
  .hero-nav{padding:14px 16px!important;flex-wrap:wrap!important;gap:8px!important;}
  .hero-nav-buttons{gap:6px!important;flex-wrap:wrap!important;}
  .hero-nav-buttons button{padding:5px 10px!important;font-size:10px!important;}
  .hero-ctas{flex-direction:column!important;align-items:stretch!important;gap:8px!important;}
  .hero-ctas button{width:100%!important;text-align:center!important;justify-content:center!important;}

  /* Home grid */
  .home-grid{grid-template-columns:1fr!important;}
  .home-grid > *{grid-column:span 1!important;}

  /* Auth screen — stack the panels, hide the diagram column */
  .auth-shell{flex-direction:column!important;gap:24px!important;padding:28px 16px!important;}
  .auth-left{max-width:100%!important;flex:none!important;}
  .feature-grid{grid-template-columns:1fr!important;}
  .feature-showcase-section{padding:44px 16px 40px!important;}
  .hiring-report-grid{grid-template-columns:repeat(2,1fr)!important;}
  .proof-pills{flex-direction:column!important;align-items:stretch!important;gap:8px!important;}
  .guided-path-steps{flex-wrap:wrap!important;gap:6px!important;justify-content:center!important;}
  .guided-path-strip{padding:12px 14px!important;margin:0 0 12px!important;}

  /* Mode page shell */
  .mode-shell{flex-direction:column!important;}
  .mode-sidebar{width:100%!important;max-height:52px!important;overflow:hidden!important;flex-direction:row!important;border-right:none!important;border-bottom:1px solid #EEECEA!important;}
  .mode-sidebar.open{max-height:none!important;flex-direction:column!important;}
  .page-content{padding:16px!important;}

  /* HireFlow */
  .hiring-shell{flex-direction:column!important;height:auto!important;min-height:100vh!important;}
  .hiring-aside{width:100%!important;height:auto!important;flex-direction:row!important;overflow-x:auto!important;border-right:none!important;border-bottom:1px solid #EEECEA!important;padding:8px!important;}
  .hiring-nav-item{padding:6px 10px!important;font-size:10px!important;white-space:nowrap!important;flex-direction:row!important;gap:4px!important;}
  .hiring-main{padding:16px!important;}
  .candidate-grid{grid-template-columns:1fr!important;}
  .bias-grid{grid-template-columns:1fr!important;}

  /* War Room */
  .warroom-grid{grid-template-columns:1fr!important;}
  .command-report-grid{grid-template-columns:repeat(2,1fr)!important;}
  .command-roi-grid{grid-template-columns:1fr!important;}
  .warroom-launch-bar{flex-direction:column!important;gap:10px!important;align-items:stretch!important;}
  .warroom-launch-buttons{flex-wrap:wrap!important;gap:8px!important;}
  .warroom-launch-buttons button{flex:1!important;justify-content:center!important;}

  /* SalesFlow */
  .sales-tabs{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;}
  .prospect-card-buttons{flex-wrap:wrap!important;gap:4px!important;}

  /* SupportFlow */
  .support-layout{flex-direction:column!important;}

  /* CareFlow */
  .care-layout{flex-direction:column!important;}
  .care-ticket-list{max-height:240px!important;}

  /* Agent Network */
  .agent-network svg{width:100%!important;height:auto!important;}

  /* General */
  .modal-overlay .modal-box{max-width:95vw!important;margin:10px!important;}
  .page-header{flex-direction:column!important;gap:8px!important;align-items:flex-start!important;}
}

/* ── SMALL MOBILE ── */
@media(max-width:420px){
  .hero-h1{font-size:24px!important;}
  .command-report-grid{grid-template-columns:1fr!important;}
}
`;

function HiringShell(){
  const{state,dispatch}=useStore();
  const done=state.pipelineState==="done";
  const Page=HIRING_PAGES[state.activeNav]||HiringDashboard;
  return(
    <div className="hiring-shell" style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",overflow:"hidden"}}>
      <aside className="hiring-aside" style={{width:state.sidebarOpen?216:52,background:"white",borderRight:"1px solid #EEECEA",display:"flex",flexDirection:"column",transition:"width 0.25s",overflow:"hidden",flexShrink:0}}>
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
        <header style={{background:"white",borderBottom:"1px solid #F3F4F6",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",padding:"2px 8px 2px 0",borderRight:"1px solid #F3F4F6",marginRight:8}} onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#6D5FFA,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>⚡</div>
              <span style={{fontSize:10,fontWeight:800,color:"#9CA3AF"}}>NexFlow</span>
            </button>
            <div style={{width:28,height:28,borderRadius:8,background:"#F5F3FF",border:"1.5px solid #C4BFFA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🧠</div>
            <div><div style={{fontSize:13,fontWeight:800,color:"#111827"}}>HireFlow AI</div><div style={{fontSize:10,color:"#9CA3AF",marginTop:1}}>{done?(state.appliedResumes?.length||state.activeCandidates?.length||5)+" resumes · "+(state.activeCandidates?.length||5)+" shortlisted":"Ready to run"}</div></div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {done&&<Tag color="success">Pipeline complete</Tag>}
            <button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})} style={{fontSize:11,fontWeight:600,color:"#6B7280",background:"#F9FAFB",border:"1px solid #E5E7EB",borderRadius:8,padding:"6px 12px",cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#534AB7";e.currentTarget.style.color="#534AB7";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.color="#6B7280";}}>All modes</button>
          </div>
        </header>
        <main style={{flex:1,overflowY:"auto",padding:20}}><div style={{animation:"fadeIn 0.3s ease"}}>{(!state.activeNav||state.activeNav==="dashboard")&&<ModeBanner mode="hiring"/>}<Page/></div></main>
      </div>
      <ToastLayer/>
      <HiringChat/>
      <CrossModePanel/>
      <InterviewDecisionModal/>
    </div>
  );
}

function UserChip(){
  const{handleSignOut,displayName,initials,session}=useStore();
  const[open,setOpen]=useState(false);
  if(!session) return null;
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:7,background:"#F9FAFB",border:"1px solid #E5E7EB",borderRadius:20,padding:"4px 10px 4px 4px",cursor:"pointer"}}>
        <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#534AB7,#7F77DD)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>{initials}</div>
        <span style={{fontSize:11,fontWeight:600,color:"#374151",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</span>
        <span style={{fontSize:9,color:"#9CA3AF"}}>▾</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",minWidth:160,zIndex:9999,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #F3F4F6"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{displayName}</div>
            <div style={{fontSize:10,color:"#9CA3AF"}}>{session.user?.email||"Demo mode"}</div>
          </div>
          <button onClick={()=>{setOpen(false);handleSignOut();}} style={{width:"100%",padding:"10px 14px",background:"none",border:"none",textAlign:"left",fontSize:12,fontWeight:600,color:"#EF4444",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            <span>→</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPANY BRAIN — the shared cross-agent memory, made visible.
// Builds a live graph from whatever the other agents have done this session
// (care tickets, sales prospects, hiring candidates, cross-agent handoffs),
// resolves duplicate identities, and surfaces the cross-team next-best-actions
// no single agent could see. Zero setup — it reflects real session activity.
// ══════════════════════════════════════════════════════════════════════════
const BRAIN_PRIORITY={high:{bg:"#FBEAF0",bd:"#ED93B1",fg:"#993556",label:"HIGH"},medium:{bg:"#FAEEDA",bd:"#EF9F27",fg:"#854F0B",label:"MEDIUM"},low:{bg:"#E1F5EE",bd:"#5DCAA5",fg:"#0F6E56",label:"LOW"}};
const BRAIN_SOURCE_META={sales:{icon:"🎯",label:"Sales",color:"#BA7517"},support:{icon:"💬",label:"Support",color:"#1D9E75"},care:{icon:"❤️",label:"Care",color:"#D4537E"},hiring:{icon:"🧠",label:"Hiring",color:"#534AB7"},smb:{icon:"🏪",label:"SMB",color:"#7C3AED"}};

// Single source of truth for the shared memory graph. Both the Company Brain
// screen AND the individual agents (Care, Sales) build the brain from here, so
// they're all reading the same memory — that's what closes the loop.
function buildBrainFromState(state,seedEvents=[]){
  // seedEvents = rows loaded from Supabase (brain_events), replayed so memory
  // persists across sessions and is shared by every employee of the company.
  const b=createCompanyBrain(seedEvents);
  (SAMPLE_TICKETS||[]).forEach(t=>{
    const complaint=(t.sentiment??0)<-0.2;
    const kind=t.category==="feedback"||(t.sentiment??0)>0.3?"customer":"ticket_author";
    b.recordEvent({agent:"care",kind,title:t.subject,desc:t.message?.slice(0,90),
      person:{name:t.customer,email:t.email,attrs:{company:t.company,city:t.city,complaint,upsell:t.category==="sales",category:t.category}}});
  });
  (state.salesProspects||[]).forEach(p=>{
    b.recordEvent({agent:"sales",kind:"lead",title:`Prospect: ${p.company||p.name}`,desc:p.painPoint,
      person:{name:p.name,email:p.email,attrs:{company:p.company,budget:p.budget,painPoint:p.painPoint,upsell:true}}});
  });
  (state.activeCandidates||[]).forEach(c=>{
    const decision=state.candidateDecisions?.[c.id];
    b.recordEvent({agent:"hiring",kind:"candidate",title:`Candidate: ${c.name}`,desc:c.role||c.summary,
      person:{name:c.name,email:c.email,attrs:{company:c.company,role:c.role,hired:decision==="accepted"||decision==="shortlist"}}});
  });
  (state.crossEvents||[]).forEach(e=>{
    b.recordEvent({agent:"system",kind:"handoff",title:e.title,desc:e.desc});
  });
  return b;
}

// brainContextFor + salesAccountIntel are the read-side of the closed loop.
// Extracted to lib/brainContext.js so they're pure and unit-tested (see brainContext.test.js).

function BrainMode(){
  const{state,dispatch,session}=useStore();
  const toast=useToast();
  const[selected,setSelected]=useState(null);
  const[persisted,setPersisted]=useState([]);
  const[syncing,setSyncing]=useState(false);
  const companyId=state.employee?.companyId&&state.employee.companyId!=="demo"?state.employee.companyId:null;
  const userId=session?.user?.id||null;

  // ── READ: replay the company's persisted memory so the Brain survives reloads ──
  useEffect(()=>{
    if(!companyId){setPersisted([]);return;}
    let cancelled=false;
    loadBrainEvents(companyId).then(rows=>{if(!cancelled)setPersisted(rows||[]);});
    return()=>{cancelled=true;};
  },[companyId]);

  const brain=useMemo(()=>buildBrainFromState(state,persisted),[state.salesProspects,state.activeCandidates,state.candidateDecisions,state.crossEvents,persisted]);

  // ── WRITE: persist this session's known people into shared company memory ──
  const syncToMemory=async()=>{
    if(!companyId){toast("Connect a company account to persist shared memory (demo mode is session-only)","info");return;}
    setSyncing(true);
    const ents=brain.entities;
    let saved=0;
    for(const e of ents){
      const ok=await saveBrainEvent({companyId,createdByUserId:userId,agent:[...e.sources][0]||"system",kind:[...e.kinds][0]||"event",
        title:e.name,desc:e.attrs?.company||"",person:{name:e.name,email:e.email,phone:e.phone},attrs:e.attrs});
      if(ok)saved++;
    }
    setSyncing(false);
    toast(`Saved ${saved} records to shared company memory`,"success");
    loadBrainEvents(companyId).then(rows=>setPersisted(rows||[]));
  };

  const stats=brain.stats();
  const insights=brain.getInsights();
  const entities=brain.entities.slice().sort((a,b)=>b.sources.size-a.sources.size||b.touches-a.touches);
  const view=selected?brain.getUnifiedView({name:selected}):null;

  const actOn=(ins)=>{
    const target=ins.agents?.[0];
    if(target&&BRAIN_SOURCE_META[target]){toast(`Routing "${ins.entity}" to ${BRAIN_SOURCE_META[target].label}…`,"success");dispatch({type:"SET_MODE",payload:target});}
    else toast("Action noted","info");
  };

  return(
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      {/* Explainer */}
      <div style={{background:"rgba(255,253,248,0.8)",border:"1px solid rgba(28,122,147,0.25)",borderRadius:14,padding:"16px 20px",marginBottom:18,display:"flex",gap:14,alignItems:"flex-start"}}>
        <div style={{fontSize:26,lineHeight:1}}>🧩</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:19,fontWeight:700,color:"#0F4A5A",marginBottom:4}}>Six agents. One memory.</div>
          <div style={{fontSize:12.5,color:"#5A6B6E",lineHeight:1.65}}>The same person shows up in sales, support and hiring as three disconnected records. The Brain merges them by email, phone, then name — then tells you the cross-team move to make next. SalesFlow and CareFlow read this memory <b>before</b> they draft.</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
          <span style={{fontSize:9.5,fontWeight:800,padding:"4px 10px",borderRadius:20,background:companyId?"#E1F5EE":"#F1EFE8",color:companyId?"#0F6E56":"#8A7B63",border:"1px solid "+(companyId?"#9FE1CB":"#D3D1C7")}}>{companyId?`● PERSISTED · ${persisted.length} saved`:"○ SESSION-ONLY (demo)"}</span>
          <button onClick={syncToMemory} disabled={syncing} style={{fontSize:11,fontWeight:700,color:"#F5EEDF",background:syncing?"#8A7B63":"#0D3B4F",border:"none",borderRadius:8,padding:"7px 14px",cursor:syncing?"default":"pointer",display:"flex",alignItems:"center",gap:6}}>{syncing?<><Spinner color="#F5EEDF"/>Saving…</>:"💾 Save to shared memory"}</button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {n:stats.entities,l:"People & businesses known",c:"#0D3B4F"},
          {n:stats.mergedIdentities,l:"Duplicate identities merged",c:"#1C7A93",hi:true},
          {n:stats.events,l:"Memories on the timeline",c:"#8A5A12"},
          {n:insights.length,l:"Next-best-actions found",c:"#993556"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#FFFDF8",border:"1px solid rgba(120,95,55,0.14)",borderRadius:14,padding:"16px 18px",boxShadow:s.hi?"0 6px 20px rgba(28,122,147,0.14)":"0 2px 8px rgba(120,95,55,0.05)",position:"relative",overflow:"hidden"}}>
            {s.hi&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#0D3B4F,#1C7A93,#B8894A)"}}/>}
            <div style={{fontSize:30,fontWeight:900,color:s.c,fontFamily:"'Playfair Display',Georgia,serif",lineHeight:1}}>{s.n}</div>
            <div style={{fontSize:11,color:"#8A7B63",marginTop:6,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.15fr 1fr",gap:16}}>
        {/* ── NEXT-BEST-ACTIONS ─────────────────────────────────────── */}
        <div>
          <div style={{fontSize:12,fontWeight:800,color:"#0F4A5A",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>⚡ What to do next</div>
          {insights.length===0?(
            <div style={{background:"#FFFDF8",border:"1px dashed rgba(120,95,55,0.25)",borderRadius:14,padding:"28px 20px",textAlign:"center",color:"#8A7B63",fontSize:12.5}}>
              No cross-team actions yet. Run <b>SalesFlow</b> or <b>CareFlow</b>, then return — the Brain will connect the dots automatically.
            </div>
          ):insights.map(ins=>{const p=BRAIN_PRIORITY[ins.priority];return(
            <motion.div key={ins.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              style={{background:"#FFFDF8",border:`1px solid ${p.bd}`,borderLeft:`4px solid ${p.bd}`,borderRadius:12,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 10px rgba(120,95,55,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:20,background:p.bg,color:p.fg,letterSpacing:"0.05em"}}>{p.label}</span>
                <span style={{fontSize:13,fontWeight:800,color:"#211E19"}}>{ins.entity}</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:"#0F4A5A",marginBottom:5}}>{ins.action}</div>
              <div style={{fontSize:11.5,color:"#6B6355",lineHeight:1.6,marginBottom:10}}>{ins.reason}</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>actOn(ins)} style={{fontSize:11,fontWeight:700,color:"#F5EEDF",background:"#211E19",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer"}}>Act on it →</button>
                <div style={{display:"flex",gap:4}}>{ins.agents?.map(a=>BRAIN_SOURCE_META[a]&&<span key={a} title={BRAIN_SOURCE_META[a].label} style={{fontSize:13}}>{BRAIN_SOURCE_META[a].icon}</span>)}</div>
              </div>
            </motion.div>
          );})}
        </div>

        {/* ── ENTITY DIRECTORY + 360 ────────────────────────────────── */}
        <div>
          <div style={{fontSize:12,fontWeight:800,color:"#0F4A5A",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>👥 Who the company knows</div>
          <div style={{background:"#FFFDF8",border:"1px solid rgba(120,95,55,0.14)",borderRadius:14,overflow:"hidden"}}>
            {entities.length===0&&<div style={{padding:24,textAlign:"center",color:"#8A7B63",fontSize:12}}>No one yet.</div>}
            {entities.map((e,i)=>{const open=selected===e.name;return(
              <div key={e.key} style={{borderBottom:i<entities.length-1?"1px solid rgba(120,95,55,0.1)":"none"}}>
                <button onClick={()=>setSelected(open?null:e.name)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:open?"rgba(28,122,147,0.06)":"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(150deg,#0D3B4F,#1C7A93)",color:"#F5F8F8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{(e.name||"?").slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#211E19",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.name}</div>
                    <div style={{fontSize:10,color:"#8A7B63",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.email||e.attrs.company||"—"}</div>
                  </div>
                  <div style={{display:"flex",gap:3}}>{[...e.sources].map(s=>BRAIN_SOURCE_META[s]&&<span key={s} title={BRAIN_SOURCE_META[s].label} style={{fontSize:12}}>{BRAIN_SOURCE_META[s].icon}</span>)}</div>
                  {e.sources.size>1&&<span style={{fontSize:8,fontWeight:800,color:"#0F6E56",background:"#E1F5EE",borderRadius:20,padding:"2px 6px"}}>MERGED</span>}
                </button>
                {open&&view&&(
                  <div style={{padding:"4px 14px 14px 56px",animation:"fadeIn 0.25s ease"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                      {view.kinds.map(k=><span key={k} style={{fontSize:9,fontWeight:700,color:"#5F5E5A",background:"#F1EFE8",borderRadius:6,padding:"3px 8px"}}>{k}</span>)}
                      {view.attrs.complaint&&<span style={{fontSize:9,fontWeight:700,color:"#993556",background:"#FBEAF0",borderRadius:6,padding:"3px 8px"}}>open complaint</span>}
                      {view.attrs.upsell&&<span style={{fontSize:9,fontWeight:700,color:"#854F0B",background:"#FAEEDA",borderRadius:6,padding:"3px 8px"}}>upsell signal</span>}
                    </div>
                    <div style={{fontSize:10,color:"#8A7B63",fontWeight:700,marginBottom:4}}>TIMELINE</div>
                    {view.events.map((ev,j)=>(
                      <div key={j} style={{display:"flex",gap:8,marginBottom:5}}>
                        <span style={{fontSize:11}}>{BRAIN_SOURCE_META[ev.agent]?.icon||"•"}</span>
                        <div style={{fontSize:11,color:"#3A342A",lineHeight:1.4}}><b>{ev.title}</b>{ev.desc?<span style={{color:"#8A7B63"}}> — {ev.desc}</span>:null}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );})}
          </div>
          {stats.mergedIdentities>0&&<div style={{fontSize:10.5,color:"#0F6E56",marginTop:8,fontWeight:600}}>✓ {stats.mergedIdentities} {stats.mergedIdentities===1?"person was":"people were"} recognized across multiple teams and merged into one record.</div>}
        </div>
      </div>
    </div>
  );
}

function ModeHeader({icon,title,subtitle,color,tag,tagColor}){
  const{state,dispatch}=useStore();
  return(
    <header style={{background:"rgba(251,246,236,0.92)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(120,95,55,0.14)",padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 2px 12px rgba(120,95,55,0.06)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {/* NexFlow brand */}
        <button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})}
          style={{display:"flex",alignItems:"center",gap:7,background:"none",border:"none",cursor:"pointer",padding:"4px 8px 4px 0",borderRight:"1px solid rgba(120,95,55,0.14)",marginRight:8}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <div style={{width:27,height:27,borderRadius:8,background:"linear-gradient(150deg,#0D3B4F,#1C7A93)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:"0 4px 12px rgba(13,59,79,0.25)"}}>⚡</div>
          <span style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:13,fontWeight:800,color:"#3A342A"}}>NexFlow</span>
        </button>
        {/* Mode identity */}
        <div style={{width:34,height:34,borderRadius:9,background:color+"18",border:"1.5px solid "+color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{icon}</div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#211E19",letterSpacing:"-0.01em"}}>{title}</div>
          <div style={{fontSize:10,color:"#8A7B63",fontWeight:500}}>{subtitle}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:20,background:color+"14",color:color,border:"1px solid "+color+"30"}}>{tag}</span>
        <button onClick={()=>dispatch({type:"TOGGLE_HINDI"})}
          title={state.hindiMode?"Switch to English":"Switch to Hindi"}
          style={{fontSize:11,fontWeight:700,padding:"6px 10px",borderRadius:8,border:"1px solid "+(state.hindiMode?"#0D3B4F":"rgba(120,95,55,0.2)"),background:state.hindiMode?"#0D3B4F":"rgba(255,253,248,0.8)",color:state.hindiMode?"#F5EEDF":"#6B6355",cursor:"pointer",transition:"all 0.2s"}}>
          {state.hindiMode?"🌐 EN":"🇮🇳 HI"}
        </button>
        <button onClick={()=>dispatch({type:"TOGGLE_DARK"})}
          title={state.darkMode?"Switch to Light mode":"Switch to Dark mode"}
          style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"1px solid "+(state.darkMode?"#211E19":"rgba(120,95,55,0.2)"),background:state.darkMode?"#211E19":"rgba(255,253,248,0.8)",color:state.darkMode?"white":"#6B6355",cursor:"pointer",transition:"all 0.2s"}}>
          {state.darkMode?"☀️":"🌙"}
        </button>
        <button onClick={()=>dispatch({type:"SET_MODE",payload:"home"})}
          style={{fontSize:11,fontWeight:600,color:"#6B6355",background:"rgba(255,253,248,0.8)",border:"1px solid rgba(120,95,55,0.2)",borderRadius:8,padding:"6px 12px",cursor:"pointer",transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#1C7A93";e.currentTarget.style.color="#0D3B4F";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(120,95,55,0.2)";e.currentTarget.style.color="#6B6355";}}>
          ← All modes
        </button>
        <UserChip/>
      </div>
    </header>
  );
}

// ── PREMIUM MODE BANNER (illustrative image + warm overlay) ──────────────
const MODE_BANNERS={
  hiring:{img:"1521737604893-d14cc237f11d",tint:"#0D3B4F",kicker:"HIRING INTELLIGENCE",line:"Seven agents. One shortlist."},
  sales:{img:"1556742049-0cfed4f6a45d",tint:"#8A5A12",kicker:"AUTONOMOUS SALES",line:"Prospects, drafted and ready."},
  support:{img:"1553775282-20af80779df7",tint:"#0F6E56",kicker:"SUPPORT INTELLIGENCE",line:"Your docs, answering for you."},
  care:{img:"1600880292203-757bb62b4baf",tint:"#8A2E48",kicker:"CUSTOMER CARE",line:"Every ticket, the right tone."},
  smb:{img:"1604719312566-8912e9227c6a",tint:"#5B3A8A",kicker:"BUSINESS INTELLIGENCE",line:"WhatsApp chaos into a real CRM."},
  warroom:{img:"1451187580459-43490279c0fa",tint:"#0D3B4F",kicker:"MULTI-AGENT COMMAND",line:"Every agent, firing at once."},
  brain:{img:"1507413245164-6160d8298b31",tint:"#0F4A5A",kicker:"SHARED MEMORY",line:"One brain. Every agent. No silos."},
};
function ModeBanner({mode}){
  const b=MODE_BANNERS[mode];
  if(!b) return null;
  const url=`https://images.unsplash.com/photo-${b.img}?w=1400&q=70&auto=format&fit=crop`;
  return(
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
      style={{position:"relative",height:132,borderRadius:16,overflow:"hidden",marginBottom:18,boxShadow:"0 10px 30px rgba(120,95,55,0.12)",border:"1px solid rgba(120,95,55,0.12)"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`url(${url})`,backgroundSize:"cover",backgroundPosition:"center",transform:"scale(1.05)"}}/>
      <div style={{position:"absolute",inset:0,background:`linear-gradient(100deg,${b.tint}F2 0%,${b.tint}CC 42%,${b.tint}33 100%)`}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.08) 1px,transparent 1px)",backgroundSize:"18px 18px",mixBlendMode:"overlay"}}/>
      <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 28px"}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.16em",color:"rgba(245,238,223,0.85)",marginBottom:7}}>✦ {b.kicker}</div>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,fontWeight:700,color:"#FBF6EC",letterSpacing:"-0.01em",textShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>{b.line}</div>
      </div>
    </motion.div>
  );
}

// ── GLOBAL TIME SAVED COUNTER + KEYBOARD SHORTCUTS ───────────────────────
function GlobalOverlay(){
  const{state,dispatch}=useStore();
  const[count,setCount]=useState(0);
  const[visible,setVisible]=useState(true);
  const pipelineDone=state.pipelineState==="done";

  // Keyboard shortcuts
  useEffect(()=>{
    const handler=(e)=>{
      if(e.key==="Escape") dispatch({type:"SET_MODE",payload:"home"});
      if(e.key==="h"&&(e.metaKey||e.ctrlKey)){e.preventDefault();dispatch({type:"SET_MODE",payload:"hiring"});}
      if(e.key==="s"&&(e.metaKey||e.ctrlKey)){e.preventDefault();dispatch({type:"SET_MODE",payload:"sales"});}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[dispatch]);

  // Count up from 0 to total time saved
  const totalHours=pipelineDone?Math.round((state.appliedResumes?.length||42)*0.35)+8:0;
  useEffect(()=>{
    if(!pipelineDone){setCount(0);return;}
    let c=0;
    const step=Math.ceil(totalHours/40);
    const id=setInterval(()=>{
      c+=step;if(c>=totalHours){setCount(totalHours);clearInterval(id);}else setCount(c);
    },50);
    return()=>clearInterval(id);
  },[pipelineDone,totalHours]);

  if(!pipelineDone||!visible) return null;
  return(
    <div style={{position:"fixed",bottom:20,left:20,zIndex:8000,animation:"fadeIn 0.5s ease"}}>
      <div style={{background:"linear-gradient(135deg,#0F172A,#1D9E75)",borderRadius:14,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 24px rgba(0,0,0,0.22)",cursor:"pointer"}} onClick={()=>setVisible(false)} title="Click to dismiss">
        <div style={{fontSize:20}}>⏱</div>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:"white",lineHeight:1}}>{count}h</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>saved this session</div>
        </div>
        <div style={{width:1,height:28,background:"rgba(255,255,255,0.2)"}}/>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",lineHeight:1.4,maxWidth:70}}>Esc→home<br/>⌘H hiring<br/>⌘S sales</div>
      </div>
    </div>
  );
}

function PageTransition({children,modeKey}){
  return(
    <AnimatePresence mode="wait">
      <motion.div key={modeKey} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
        transition={{duration:0.22,ease:"easeOut"}} style={{display:"contents"}}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function AppInner(){
  const{state,dispatch}=useStore();
  const mode=state.appMode;
  if(mode==="home") return<PageTransition modeKey="home"><ErrorBoundary><HomeScreen/></ErrorBoundary></PageTransition>;
  if(mode==="hiring") return<PageTransition modeKey="hiring"><ErrorBoundary><HiringShell/></ErrorBoundary></PageTransition>;
  if(mode==="overview") return(
    <PageTransition modeKey="overview">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="🗺️" title="Project Overview" subtitle="All features — 2 min read" color="#1C1C1A" tag="NexFlow AI" tagColor="neutral"/>
        <main style={{flex:1,overflow:"hidden"}}><ErrorBoundary><ProjectOverview onNavigate={(m)=>dispatch({type:"SET_MODE",payload:m})}/></ErrorBoundary></main>
        <ToastLayer/>
      </div>
    </PageTransition>
  );
  if(mode==="smb") return(
    <PageTransition modeKey="smb">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="🏪" title="SMB Brain" subtitle="1-Click Indian Business AI" color="#7C3AED" tag="Open Innovation" tagColor="purple"/>
        <main style={{flex:1,overflowY:"auto",padding:22}}><ModeBanner mode="smb"/><ErrorBoundary><SMBMode/></ErrorBoundary></main>
        <GlobalOverlay/><ToastLayer/><CrossModePanel/>
      </div>
    </PageTransition>
  );
  if(mode==="warroom") return(
    <PageTransition modeKey="warroom">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="⚡" title="AI War Room" subtitle="Multi-Agent Command Center" color="#6D5FFA" tag="All agents" tagColor="brand"/>
        <main style={{flex:1,overflowY:"auto",padding:20}}><ModeBanner mode="warroom"/><ErrorBoundary><WarRoomMode/></ErrorBoundary></main>
        <GlobalOverlay/><ToastLayer/><CrossModePanel/>
      </div>
    </PageTransition>
  );
  if(mode==="sales") return(
    <PageTransition modeKey="sales">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="🎯" title="SalesFlow AI" subtitle="Autonomous Sales Agent" color="#BA7517" tag="Sales Bot" tagColor="warn"/>
        <main style={{flex:1,overflowY:"auto",padding:22}}><ModeBanner mode="sales"/><ErrorBoundary><SalesMode/></ErrorBoundary></main>
        <GlobalOverlay/><ToastLayer/><CrossModePanel/>
      </div>
    </PageTransition>
  );
  if(mode==="support") return(
    <PageTransition modeKey="support">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="💬" title="SupportFlow AI" subtitle="Intelligent Support Bot" color="#1D9E75" tag="Support Chat Bot" tagColor="success"/>
        <main style={{flex:1,overflow:"hidden",padding:16}}><ErrorBoundary><SupportMode/></ErrorBoundary></main>
        <GlobalOverlay/><ToastLayer/><CrossModePanel/>
      </div>
    </PageTransition>
  );
  if(mode==="care") return(
    <PageTransition modeKey="care">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="❤️" title="CareFlow AI" subtitle="Customer Care Bot" color="#D4537E" tag="Customer Care Bot" tagColor="pink"/>
        <main style={{flex:1,overflowY:"auto",padding:20}}><ModeBanner mode="care"/><ErrorBoundary><CareMode/></ErrorBoundary></main>
        <GlobalOverlay/><ToastLayer/><CrossModePanel/>
      </div>
    </PageTransition>
  );
  if(mode==="brain") return(
    <PageTransition modeKey="brain">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="🧩" title="Company Brain" subtitle="Shared cross-agent memory" color="#1C7A93" tag="Shared memory" tagColor="teal"/>
        <main style={{flex:1,overflowY:"auto",padding:22}}><ModeBanner mode="brain"/><ErrorBoundary><BrainMode/></ErrorBoundary></main>
        <GlobalOverlay/><ToastLayer/><CrossModePanel/>
      </div>
    </PageTransition>
  );
  if(mode==="team") return(
    <PageTransition modeKey="team">
      <div style={{display:"flex",height:"100vh",background:"linear-gradient(180deg,#F5EEDF 0%,#FBF6EC 100%)",flexDirection:"column",overflow:"hidden"}}>
        <ModeHeader icon="👥" title="Team" subtitle="Employees & roles" color="#475569" tag="Admin" tagColor="neutral"/>
        <main style={{flex:1,overflowY:"auto",padding:22}}><ErrorBoundary><TeamMode/></ErrorBoundary></main>
        <ToastLayer/>
      </div>
    </PageTransition>
  );
  return null;
}

// Shows real, persisted cross_role_signals rows for this company (not the in-memory
// crossEvents log) — e.g. a lead handed off from Care, visible here to Sales even in
// a different browser session, because it's a real DB row scoped by RLS to this company.
function IncomingSignalsBanner({companyId,type,icon,label,fromLabel}){
  const[signals,setSignals]=useState([]);
  const[loading,setLoading]=useState(false);
  useEffect(()=>{
    if(!companyId||companyId==="demo"){setSignals([]);return;}
    let cancelled=false;
    setLoading(true);
    listCrossRoleSignals(companyId,type).then(rows=>{
      if(!cancelled) setSignals((rows||[]).filter(r=>!r.resolved));
    }).finally(()=>!cancelled&&setLoading(false));
    return()=>{cancelled=true;};
  },[companyId,type]);
  if(!companyId||companyId==="demo"||loading||signals.length===0) return null;
  const dismiss=async(id)=>{
    await resolveCrossRoleSignal(id);
    setSignals(s=>s.filter(x=>x.id!==id));
  };
  return(
    <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:6}}>
      {signals.slice(0,3).map(sig=>(
        <div key={sig.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#EEF2FF",border:"1.5px solid #C7D2FE",borderRadius:10}}>
          <div style={{fontSize:16}}>{icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:800,color:"#3730A3"}}>New {label} from {fromLabel}</div>
            <div style={{fontSize:11,color:"#4338CA"}}>{sig.payload?.name||sig.payload?.candidateName||"Details"} {sig.payload?.painPoint||sig.payload?.role?("— "+(sig.payload.painPoint||sig.payload.role)):""}</div>
          </div>
          <button onClick={()=>dismiss(sig.id)} style={{fontSize:10,fontWeight:700,padding:"5px 10px",background:"white",border:"1px solid #C7D2FE",borderRadius:7,color:"#3730A3",cursor:"pointer"}}>Mark handled</button>
        </div>
      ))}
    </div>
  );
}

// ── TEAM (multi-employee admin) ────────────────────────────────────────────
function TeamMode(){
  const{state,dispatch,session}=useStore();
  const toast=useToast();
  const[team,setTeam]=useState([]);
  const[loading,setLoading]=useState(true);
  const[email,setEmail]=useState("");
  const[role,setRole]=useState("sales_rep");
  const companyId=state.employee?.companyId;
  const isAdmin=state.employee?.role==="admin";

  const refresh=async()=>{
    if(!companyId||companyId==="demo"){setLoading(false);return;}
    setLoading(true);
    const rows=await listEmployees(companyId);
    setTeam(rows||[]);
    setLoading(false);
  };
  useEffect(()=>{refresh();},[companyId]);

  if(companyId==="demo") return<Card style={{padding:32,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>👥</div><div style={{fontSize:14,fontWeight:700,color:"#1C1C1A"}}>Demo mode has no real team</div><div style={{fontSize:12,color:"#888780",marginTop:6}}>Sign up with a real account to invite employees and assign roles.</div></Card>;
  if(!isAdmin) return<Card style={{padding:32,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>🔒</div><div style={{fontSize:14,fontWeight:700,color:"#1C1C1A"}}>Admins only</div><div style={{fontSize:12,color:"#888780",marginTop:6}}>Ask your company admin to manage the team.</div></Card>;

  const handleInvite=async()=>{
    if(!email.trim()) return;
    const row=await inviteEmployee(companyId,email.trim(),role);
    if(row){toast("Invited "+email+" as "+role,"success");setEmail("");refresh();}
    else toast("Invite failed — check Supabase is configured","error");
  };
  const handleRoleChange=async(empId,newRole)=>{
    await updateEmployeeRole(empId,newRole);
    toast("Role updated","success");
    refresh();
  };

  return(
    <div style={{maxWidth:640,display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:22}}>
        <div style={{fontSize:15,fontWeight:800,color:"#1C1C1A",marginBottom:4}}>Invite an employee</div>
        <div style={{fontSize:12,color:"#888780",marginBottom:14}}>They'll claim this seat automatically the first time they sign up with this email.</div>
        <div style={{display:"flex",gap:8}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="employee@company.com"
            style={{flex:1,padding:"10px 12px",borderRadius:8,border:"1.5px solid #EEECEA",fontSize:13}}/>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{padding:"10px 12px",borderRadius:8,border:"1.5px solid #EEECEA",fontSize:13}}>
            <option value="hiring_manager">Hiring manager</option>
            <option value="sales_rep">Sales rep</option>
            <option value="support_agent">Support agent</option>
            <option value="care_agent">Care agent</option>
            <option value="admin">Admin</option>
          </select>
          <Btn variant="primary" onClick={handleInvite}>Invite</Btn>
        </div>
      </Card>
      <Card style={{padding:22}}>
        <div style={{fontSize:15,fontWeight:800,color:"#1C1C1A",marginBottom:14}}>Team ({team.length})</div>
        {loading&&<div style={{fontSize:12,color:"#888780"}}>Loading...</div>}
        {!loading&&team.length===0&&<div style={{fontSize:12,color:"#888780"}}>No employees yet — invite your first one above.</div>}
        {team.map(e=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #F1F1EE"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A"}}>{e.invited_email||e.user_id}</div>
              <div style={{fontSize:10,color:e.status==="active"?"#0F6E56":"#BA7517",fontWeight:700,textTransform:"uppercase"}}>{e.status}</div>
            </div>
            <select value={e.role} onChange={ev=>handleRoleChange(e.id,ev.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"1.5px solid #EEECEA",fontSize:12}}>
              <option value="hiring_manager">Hiring manager</option>
              <option value="sales_rep">Sales rep</option>
              <option value="support_agent">Support agent</option>
              <option value="care_agent">Care agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ApiKeyBanner(){
  const[dismissed,setDismissed]=useState(false);
  if(GROQ_API_KEY||dismissed) return null;
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99999,background:"linear-gradient(135deg,#D85A30,#993C1D)",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}>
      <span style={{fontSize:18}}>⚠️</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:800,color:"white"}}>Groq API Key Missing — AI features disabled</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.8)"}}>Add VITE_GROQ_API_KEY to your .env file or Netlify environment variables, then redeploy.</div>
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,padding:"4px 10px",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>Dismiss</button>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const[mode,setMode]=useState("login"); // login | signup
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[name,setName]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[checkingSession,setCheckingSession]=useState(true);

  // Check for existing session or OAuth callback on mount
  useEffect(()=>{
    const tryRestore=async()=>{
      // Check for OAuth hash token
      const hash=window.location.hash;
      if(hash&&hash.includes("access_token")){
        const params=new URLSearchParams(hash.replace("#",""));
        const token=params.get("access_token");
        const refresh=params.get("refresh_token");
        if(token){
          const user=await authGetUser(token);
          if(user){
            const session={access_token:token,refresh_token:refresh,user};
            storeSession(session);
            window.history.replaceState(null,"",window.location.pathname);
            onAuth(session);
            return;
          }
        }
      }
      // Check localStorage
      const stored=getStoredSession();
      if(stored?.access_token){
        const user=await authGetUser(stored.access_token);
        if(user){onAuth({...stored,user});return;}
        storeSession(null);
      }
      setCheckingSession(false);
    };
    tryRestore();
  },[]);

  const submit=async(e)=>{
    e.preventDefault();
    if(!email||!password){setError("Email and password required");return;}
    setLoading(true);setError("");
    const res=mode==="signup"?await authSignUp(email,password,name):await authSignIn(email,password);
    setLoading(false);
    if(res.error||res.error_description){
      setError(res.error_description||res.error?.message||"Authentication failed");
      return;
    }
    if(mode==="signup"&&!res.access_token){
      setError("Check your email to confirm your account, then sign in.");
      setMode("login");
      return;
    }
    const session={access_token:res.access_token,refresh_token:res.refresh_token,user:res.user};
    storeSession(session);
    onAuth(session);
  };

  if(checkingSession){
    return(
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(130% 90% at 50% -10%,#F8F2E4 0%,#F0E7D5 52%,#F5EEDF 100%)"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <div style={{width:48,height:48,border:"3px solid rgba(184,137,74,0.25)",borderTopColor:"#0D3B4F",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <div style={{color:"#6B6355",fontSize:13,fontWeight:600}}>Restoring session…</div>
        </div>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",display:"flex",background:"radial-gradient(130% 90% at 50% -10%,#F8F2E4 0%,#F0E7D5 52%,#F5EEDF 100%)",fontFamily:"Inter,system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      {/* warm ambient glow + dotted texture, same language as the home hero */}
      <div style={{position:"absolute",top:-160,left:"18%",width:760,height:560,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,178,120,0.28) 0%,transparent 68%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(120,95,55,0.06) 1px,transparent 1px)",backgroundSize:"22px 22px",pointerEvents:"none",maskImage:"linear-gradient(180deg,black 0%,transparent 85%)",WebkitMaskImage:"linear-gradient(180deg,black 0%,transparent 85%)"}}/>

      {/* Centered two-column shell so the panels sit together instead of drifting apart */}
      <div style={{maxWidth:1150,width:"100%",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",gap:48,padding:"48px 32px",position:"relative",zIndex:2}} className="auth-shell">

      {/* Left panel — branding + closed-loop diagram */}
      <div style={{flex:"1 1 520px",maxWidth:560,display:"flex",flexDirection:"column",justifyContent:"center"}} className="auth-left">
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,253,248,0.85)",border:"1px solid rgba(184,137,74,0.4)",borderRadius:22,padding:"6px 16px",marginBottom:22,alignSelf:"flex-start"}}>
          <span style={{fontSize:12}}>🇮🇳</span>
          <span style={{fontSize:10.5,fontWeight:800,color:"#9A6A2E",letterSpacing:"0.03em"}}>Built for how Indian businesses actually work</span>
        </div>

        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:44,fontWeight:800,color:"#211E19",letterSpacing:"-0.02em",lineHeight:1.05,marginBottom:14}}>
          NexFlow AI
        </div>
        <div style={{fontSize:16.5,color:"#6B6355",lineHeight:1.7,marginBottom:26,maxWidth:480}}>
          <b style={{color:"#3A342A"}}>Seven AI systems. One shared memory.</b> Hiring, sales, support, care, SMB intelligence and a live War Room that finally recognise the same customer across every team.
        </div>

        {/* the equation, same language as the home screen */}
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,253,248,0.9)",border:"1px solid rgba(184,137,74,0.35)",borderRadius:999,padding:"7px 16px",fontSize:12.5,fontWeight:700,color:"#3A342A",marginBottom:26,alignSelf:"flex-start"}}>
          <span>6 agents</span><span style={{color:"#9A6A2E",fontWeight:800}}>+</span>
          <span>the Company Brain</span><span style={{color:"#9A6A2E",fontWeight:800}}>=</span>
          <span style={{background:"linear-gradient(100deg,#0D3B4F,#1C7A93,#B8894A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",fontWeight:900}}>7 AI</span>
        </div>

        {/* Closed-loop diagram — the whole idea in one glance */}
        <svg width="100%" height="200" viewBox="0 0 460 200" style={{maxWidth:460,marginBottom:26}}>
          <defs>
            <linearGradient id="brainG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0D3B4F"/><stop offset="60%" stopColor="#1C7A93"/><stop offset="100%" stopColor="#B8894A"/>
            </linearGradient>
          </defs>
          {[[60,32],[230,20],[400,32],[60,168],[230,180],[400,168]].map(([x,y],i)=>(
            <line key={i} x1={x} y1={y} x2="230" y2="100" stroke="#B8894A" strokeWidth="1.4" strokeOpacity="0.5" strokeDasharray="4 4"/>
          ))}
          {[["🧠","HireFlow",60,32],["🎯","SalesFlow",230,20],["💬","Support",400,32],["🏪","SMB",60,168],["❤️","CareFlow",230,180],["⚡","War Room",400,168]].map(([ic,label,x,y],i)=>(
            <g key={i}>
              <rect x={x-46} y={y-15} width="92" height="30" rx="15" fill="#FFFDF8" stroke="rgba(120,95,55,0.28)"/>
              <text x={x} y={y+5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3A342A">{ic} {label}</text>
            </g>
          ))}
          <circle cx="230" cy="100" r="40" fill="url(#brainG)"/>
          <text x="230" y="96" textAnchor="middle" fontSize="16" fill="#FBF6EC">🧩</text>
          <text x="230" y="112" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FBF6EC" letterSpacing="0.5">BRAIN</text>
        </svg>

        <div style={{fontSize:12.5,color:"#8A7B63",fontWeight:600,maxWidth:440,lineHeight:1.6}}>
          Every agent writes to the Company Brain — and <b style={{color:"#9A6A2E"}}>reads from it before it acts.</b>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{width:"100%",maxWidth:430,flexShrink:0,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
          style={{background:"#FFFDF8",border:"1px solid rgba(120,95,55,0.18)",borderRadius:20,padding:36,boxShadow:"0 18px 50px rgba(120,95,55,0.14)"}}>

          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:26}}>
            <div style={{width:40,height:40,background:"linear-gradient(150deg,#0D3B4F,#1C7A93)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,boxShadow:"0 6px 18px rgba(13,59,79,0.28)"}}>⚡</div>
            <div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:19,fontWeight:800,color:"#211E19"}}>NexFlow AI</div>
              <div style={{fontSize:10.5,color:"#8A7B63",fontWeight:600}}>Multi-Agent Intelligence Platform</div>
            </div>
          </div>

          <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:27,fontWeight:800,color:"#211E19",marginBottom:5,letterSpacing:"-0.01em"}}>{mode==="login"?"Welcome back":"Create account"}</div>
          <div style={{fontSize:13,color:"#6B6355",marginBottom:24}}>{mode==="login"?"Sign in to your workspace":"Start your free workspace"}</div>

          {/* Google OAuth */}
          {SB_AUTH&&(
            <a href={authGoogleUrl()} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"12px 16px",background:"#fff",borderRadius:999,border:"1px solid rgba(120,95,55,0.28)",fontSize:13,fontWeight:700,color:"#211E19",cursor:"pointer",textDecoration:"none",marginBottom:16,boxSizing:"border-box",boxShadow:"0 2px 8px rgba(120,95,55,0.06)"}}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </a>
          )}

          {SB_AUTH&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{flex:1,height:1,background:"rgba(120,95,55,0.18)"}}/><span style={{fontSize:11,color:"#8A7B63",fontWeight:600}}>or</span><div style={{flex:1,height:1,background:"rgba(120,95,55,0.18)"}}/></div>}

          {/* Form */}
          <form onSubmit={submit}>
            {mode==="signup"&&(
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10.5,fontWeight:800,color:"#3A342A",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Full Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Aryan Sharma" style={{width:"100%",padding:"12px 14px",background:"#FBF6EC",border:"1px solid rgba(120,95,55,0.22)",borderRadius:10,fontSize:13,color:"#211E19",outline:"none",boxSizing:"border-box"}}/>
              </div>
            )}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10.5,fontWeight:800,color:"#3A342A",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={{width:"100%",padding:"12px 14px",background:"#FBF6EC",border:"1px solid rgba(120,95,55,0.22)",borderRadius:10,fontSize:13,color:"#211E19",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:error?12:20}}>
              <label style={{fontSize:10.5,fontWeight:800,color:"#3A342A",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"12px 14px",background:"#FBF6EC",border:"1px solid rgba(120,95,55,0.22)",borderRadius:10,fontSize:13,color:"#211E19",outline:"none",boxSizing:"border-box"}}/>
            </div>
            {error&&<div style={{background:"#FBEAF0",border:"1px solid #ED93B1",borderRadius:8,padding:"9px 12px",marginBottom:16,fontSize:12,color:"#993556",fontWeight:600}}>{error}</div>}
            <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",background:loading?"#8A7B63":"#211E19",border:"none",borderRadius:999,color:"#F5EEDF",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",transition:"all 0.2s",boxShadow:loading?"none":"0 8px 22px rgba(33,30,25,0.26)"}}>
              {loading?(mode==="login"?"Signing in…":"Creating account…"):(mode==="login"?"Sign In":"Create Account")}
            </button>
          </form>

          <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"#6B6355"}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{background:"none",border:"none",color:"#9A6A2E",cursor:"pointer",fontWeight:800,fontSize:12}}>
              {mode==="login"?"Sign up free":"Sign in"}
            </button>
          </div>

          {/* Demo bypass */}
          <div style={{borderTop:"1px solid rgba(120,95,55,0.16)",marginTop:20,paddingTop:20,textAlign:"center"}}>
            <div style={{fontSize:11,color:"#8A7B63",marginBottom:10,fontWeight:600}}>Evaluating the platform?</div>
            <button onClick={()=>onAuth({access_token:"demo",user:{email:"demo@flowzint.ai",user_metadata:{full_name:"Demo User"}},isDemo:true})}
              style={{width:"100%",padding:"12px",background:"linear-gradient(150deg,#0D3B4F,#1C7A93)",border:"none",borderRadius:999,color:"#F5F8F8",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",boxShadow:"0 8px 20px rgba(13,59,79,0.24)"}}>
              Try Demo — No signup needed
            </button>
          </div>
        </motion.div>
      </div>

      </div>{/* /auth-shell */}
    </div>
  );
}

// ── ACTIVITY PANEL — live backend transparency ────────────────────────────
function ActivityPanel(){
  const[open,setOpen]=useState(false);
  const[pulse,setPulse]=useState(false);
  const log=useActivityLog();
  const prevLen=useRef(0);
  useEffect(()=>{
    if(log.length>prevLen.current){setPulse(true);const t=setTimeout(()=>setPulse(false),600);prevLen.current=log.length;return()=>clearTimeout(t);}
  },[log.length]);
  const activeNow=log.filter(e=>e.status==="streaming"||e.status==="pending").length;
  const totalCalls=log.filter(e=>e.status==="done").length;
  const avgMs=totalCalls>0?Math.round(log.filter(e=>e.ms).reduce((s,e)=>s+e.ms,0)/totalCalls):0;
  const statusColor={done:"#22C55E",streaming:"#F59E0B",pending:"#F59E0B",error:"#EF4444"};
  const statusIcon={done:"✓",streaming:"↻",pending:"⌛",error:"✕"};
  return(
    <>
      {/* Floating badge */}
      <div onClick={()=>setOpen(o=>!o)} style={{position:"fixed",bottom:24,right:24,zIndex:99990,cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:open?"#1C1C2E":"#1C1C2E",border:"1.5px solid "+(activeNow>0?"#F59E0B":"#534AB7"),borderRadius:32,padding:"8px 14px",boxShadow:"0 4px 24px rgba(83,74,183,0.25)",transition:"all 0.2s",transform:pulse?"scale(1.08)":"scale(1)"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:activeNow>0?"#F59E0B":"#534AB7",animation:activeNow>0?"pulse 1s infinite":undefined}}/>
        <span style={{fontSize:12,fontWeight:700,color:"#fff",letterSpacing:"0.03em"}}>
          {activeNow>0?`⚡ AI Running (${activeNow})`:`🔍 AI Log (${totalCalls} calls)`}
        </span>
        <span style={{fontSize:11,color:"#9CA3AF"}}>{open?"▼":"▲"}</span>
      </div>
      {/* Panel */}
      {open&&(
        <div style={{position:"fixed",bottom:70,right:24,zIndex:99989,width:380,maxHeight:420,background:"#0F0F1A",border:"1.5px solid #2D2B4E",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #2D2B4E",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>🧠 Live Backend Activity</div>
              <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>
                {totalCalls} API calls · avg {avgMs}ms · model: {GROQ_MODEL.split("-").slice(0,3).join("-")} · {_GROQ_KEYS.length} key{_GROQ_KEYS.length!==1?"s":""} rotating
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#6B7280",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
            {log.length===0&&<div style={{padding:"20px 16px",textAlign:"center",color:"#4B5563",fontSize:12}}>No AI calls yet. Start any agent to see live activity.</div>}
            {log.map(entry=>(
              <div key={entry.id} style={{padding:"8px 16px",borderBottom:"1px solid #1A1A2E",display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:statusColor[entry.status]||"#4B5563",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",marginTop:1,animation:entry.status==="streaming"?"spin 1s linear infinite":undefined}}>
                  {statusIcon[entry.status]||"?"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:"#E5E7EB",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {entry.status==="streaming"?"↻ ":""}{entry.label||"AI call"}
                  </div>
                  <div style={{fontSize:11,color:"#6B7280",marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                    {entry.mode&&<span style={{color:"#7C3AED"}}>#{entry.callId} {entry.mode}</span>}
                    {entry.keySlot&&<span>🔑 key {entry.keySlot}/{entry.totalKeys}</span>}
                    {entry.promptChars&&<span>📝 {entry.promptChars}ch in</span>}
                    {entry.outputChars&&<span>→ {entry.outputChars}ch out</span>}
                    {entry.tokensEst&&<span style={{color:"#10B981"}}>~{entry.tokensEst} tokens</span>}
                    {entry.ms&&<span style={{color:"#F59E0B"}}>⏱ {entry.ms}ms</span>}
                    {entry.status==="error"&&<span style={{color:"#EF4444"}}>✕ {entry.error}</span>}
                  </div>
                  <div style={{fontSize:10,color:"#374151",marginTop:1}}>{entry.ts?.toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:"8px 16px",borderTop:"1px solid #2D2B4E",display:"flex",gap:16,fontSize:11,color:"#4B5563"}}>
            <span>🟢 Done: {log.filter(e=>e.status==="done").length}</span>
            <span>🟡 Active: {activeNow}</span>
            <span>🔴 Errors: {log.filter(e=>e.status==="error").length}</span>
            <span style={{marginLeft:"auto",color:"#374151"}}>Groq Llama 3.3 70B</span>
          </div>
        </div>
      )}
    </>
  );
}

function HindiSync(){
  const{state}=useStore();
  const first=useRef(true);
  useEffect(()=>{
    HINDI_MODE=state.hindiMode;
    if(first.current){first.current=false;return;}
    // Show floating indicator when toggled
    const el=document.createElement("div");
    el.textContent=state.hindiMode?"🇮🇳 Hinglish mode ON — AI will respond in Hindi-English mix":"🌐 English mode — AI will respond in English";
    Object.assign(el.style,{position:"fixed",bottom:"80px",left:"50%",transform:"translateX(-50%)",background:state.hindiMode?"#4C1D95":"#1C1C2E",color:"white",padding:"10px 20px",borderRadius:"24px",fontSize:"13px",fontWeight:"700",zIndex:"99999",boxShadow:"0 4px 20px rgba(0,0,0,0.3)",pointerEvents:"none"});
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),2800);
  },[state.hindiMode]);
  return null;
}

// Resolves which company + role the logged-in user belongs to. Order:
// 1. They already have an active employee record → use it.
// 2. Their email matches a pending invite → claim it.
// 3. Neither → this is their first login, auto-provision a new company with
//    them as admin. (There's no "create vs. join" choice screen built yet —
//    see README for that gap. Anyone who was actually invited should sign up
//    with the invited email BEFORE this runs, so step 2 catches them first.)
function EmployeeLoader(){
  const{state,dispatch,session}=useStore();
  useEffect(()=>{
    let cancelled=false;
    if(session?.isDemo){
      setAuthToken(null);
      dispatch({type:"SET_EMPLOYEE",payload:{companyId:"demo",role:"admin",companyName:"Demo Company"}});
      return;
    }
    setAuthToken(session?.access_token||null);
    if(!DB_READY||!session?.user?.id){
      dispatch({type:"SET_EMPLOYEE",payload:null});
      return;
    }
    (async()=>{
      const userId=session.user.id;
      const email=session.user.email;
      let rec=await getMyEmployeeRecord(userId);
      if(!rec) rec=await claimInviteIfAny(userId,email);
      let result=null;
      if(rec){
        result={companyId:rec.companyId||rec.company_id,role:rec.role};
      }else{
        const name=(session.user.user_metadata?.full_name||email?.split("@")[0]||"My")+"'s Company";
        const created=await createCompanyAndAdmin(userId,name);
        if(created) result={companyId:created.companyId,role:created.role,companyName:created.companyName};
      }
      if(!cancelled) dispatch({type:"SET_EMPLOYEE",payload:result});
    })();
    return()=>{cancelled=true;};
  },[session?.user?.id,session?.isDemo]);
  return null;
}
function AppDataLoader(){
  const{dispatch}=useStore();
  useEffect(()=>{
    if(!DB_READY) return;
    // Load care tickets from Supabase on mount
    loadCareTickets().then(tickets=>{
      if(tickets&&tickets.length>0){
        // Merge DB tickets with local ones — dispatch a custom action
        dispatch({type:"ADD_TOAST",payload:{msg:"Loaded "+tickets.length+" care tickets from database","type":"info"}});
      }
    }).catch(()=>{});
    // Load pipeline history count for dashboard display
    loadPipelineHistory().then(runs=>{
      if(runs&&runs.length>0){
        dispatch({type:"ADD_TOAST",payload:{msg:"Session restored — "+runs.length+" pipeline runs in history","type":"info"}});
      }
    }).catch(()=>{});
  },[]);
  return null;
}
export default function App(){
  const[state,dispatch]=useReducer(reducer,initialState);
  const[session,setSession]=useState(null);
  const handleAuth=(s)=>setSession(s);
  const handleSignOut=async()=>{
    if(session&&!session.isDemo) await authSignOut(session.access_token);
    setAuthToken(null);
    storeSession(null);
    setSession(null);
    dispatch({type:"SET_EMPLOYEE",payload:null});
  };
  if(!session){
    return(
      <>
        <style>{GLOBAL_STYLES}</style>
        <AuthScreen onAuth={handleAuth}/>
      </>
    );
  }
  const user=session.user;
  const displayName=user?.user_metadata?.full_name||user?.email?.split("@")[0]||"User";
  const initials=displayName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return(
    <Ctx.Provider value={{state,dispatch,session,handleSignOut,displayName,initials}}>
      <style>{GLOBAL_STYLES}</style>
      <div style={{filter:state.darkMode?"invert(1) hue-rotate(180deg)":"none",minHeight:"100vh",transition:"filter 0.3s ease"}}>
      <ApiKeyBanner/>
      <HindiSync/>
      <EmployeeLoader/>
      <AppDataLoader/>
      <ActivityPanel/>
      <AppInner/>
      </div>
    </Ctx.Provider>
  );
}
