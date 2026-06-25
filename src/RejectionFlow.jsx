import { useState } from "react";

// ── CANDIDATE REJECTION FLOW ─────────────────────────────────────────────
// Adds pass/reject decisions to candidate cards

const REJECTION_REASONS=[
  "Salary expectations too high",
  "Skills gap too large for role",
  "Over-qualified — churn risk",
  "Location not compatible",
  "Notice period too long",
  "Not enough relevant experience",
  "Cultural fit concern",
  "Role has been filled",
  "Other",
];

export function CandidateDecisionBar({candidate,onPass,onReject,decision}){
  const[showRejectForm,setShowRejectForm]=useState(false);
  const[reason,setReason]=useState("");
  const[note,setNote]=useState("");

  if(decision==="passed"){
    return(
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#E1F5EE",borderRadius:9,border:"1px solid #9FE1CB"}}>
        <span style={{fontSize:13}}>✓</span>
        <span style={{fontSize:12,fontWeight:700,color:"#085041"}}>Moving forward</span>
        <button onClick={()=>onPass(null)} style={{marginLeft:"auto",fontSize:10,color:"#888780",background:"none",border:"none",cursor:"pointer"}}>undo</button>
      </div>
    );
  }

  if(decision?.status==="rejected"){
    return(
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#FAECE7",borderRadius:9,border:"1px solid #F5B8A0"}}>
        <span style={{fontSize:13}}>✕</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:"#712B13"}}>Not moving forward</div>
          <div style={{fontSize:10,color:"#993C1D"}}>{decision.reason}</div>
        </div>
        <button onClick={()=>onReject(null)} style={{fontSize:10,color:"#888780",background:"none",border:"none",cursor:"pointer"}}>undo</button>
      </div>
    );
  }

  if(showRejectForm){
    return(
      <div style={{background:"#FAECE7",borderRadius:9,border:"1px solid #F5B8A0",padding:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#712B13",marginBottom:8}}>Reason for not moving forward</div>
        <select value={reason} onChange={e=>setReason(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1px solid #F5B8A0",borderRadius:7,fontSize:12,fontFamily:"inherit",marginBottom:8,background:"white",outline:"none"}}>
          <option value="">Select reason...</option>
          {REJECTION_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note..." style={{width:"100%",height:56,padding:"8px 10px",border:"1px solid #F5B8A0",borderRadius:7,fontSize:12,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none",marginBottom:8}}/>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowRejectForm(false)} style={{flex:1,padding:"7px 0",border:"1px solid #EEECEA",borderRadius:7,background:"white",fontSize:12,cursor:"pointer",fontWeight:600,color:"#5F5E5A"}}>Cancel</button>
          <button onClick={()=>{if(reason){onReject({status:"rejected",reason,note});setShowRejectForm(false);}}} disabled={!reason} style={{flex:2,padding:"7px 0",border:"none",borderRadius:7,background:reason?"#D85A30":"#EEECEA",fontSize:12,cursor:reason?"pointer":"not-allowed",fontWeight:700,color:reason?"white":"#B4B2A9"}}>Confirm rejection</button>
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",gap:8}}>
      <button onClick={()=>onPass("passed")} style={{flex:1,padding:"8px 0",border:"1px solid #9FE1CB",borderRadius:9,background:"#E1F5EE",fontSize:12,cursor:"pointer",fontWeight:700,color:"#085041",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#CCF0E0"} onMouseLeave={e=>e.currentTarget.style.background="#E1F5EE"}>
        ✓ Move forward
      </button>
      <button onClick={()=>setShowRejectForm(true)} style={{flex:1,padding:"8px 0",border:"1px solid #F5B8A0",borderRadius:9,background:"#FAECE7",fontSize:12,cursor:"pointer",fontWeight:700,color:"#712B13",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#F5D0C5"} onMouseLeave={e=>e.currentTarget.style.background="#FAECE7"}>
        ✕ Not moving forward
      </button>
    </div>
  );
}

export function RejectionSummary({decisions,candidates}){
  const passed=candidates.filter(c=>decisions[c.id]==="passed");
  const rejected=candidates.filter(c=>decisions[c.id]?.status==="rejected");
  const pending=candidates.filter(c=>!decisions[c.id]);

  if(!passed.length&&!rejected.length) return null;

  return(
    <div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",padding:"18px 22px",marginTop:12}}>
      <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:14}}>Decision summary</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={{background:"#E1F5EE",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#085041"}}>{passed.length}</div>
          <div style={{fontSize:10,fontWeight:700,color:"#1D9E75",marginTop:2}}>Moving forward</div>
        </div>
        <div style={{background:"#FAECE7",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#712B13"}}>{rejected.length}</div>
          <div style={{fontSize:10,fontWeight:700,color:"#D85A30",marginTop:2}}>Not moving forward</div>
        </div>
        <div style={{background:"#F7F6F3",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#888780"}}>{pending.length}</div>
          <div style={{fontSize:10,fontWeight:700,color:"#B4B2A9",marginTop:2}}>Pending decision</div>
        </div>
      </div>
      {rejected.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Not moving forward</div>
          {rejected.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#FAFAF8",borderRadius:8,marginBottom:5,border:"1px solid #EEECEA"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:c.avatarBg,color:c.avatarText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>{c.avatar}</div>
              <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:"#1C1C1A"}}>{c.name}</div><div style={{fontSize:10,color:"#888780"}}>{decisions[c.id]?.reason}</div></div>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"#FAECE7",color:"#712B13"}}>Rejected</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
