import { useState, useEffect } from "react";

// ── PIPELINE HISTORY ──────────────────────────────────────────────────────
// Saves last 5 pipeline runs to localStorage, survives page refresh

const HISTORY_KEY="hireflow_pipeline_history";

export function savePipelineRun(run){
  try{
    const existing=loadHistory();
    const newRun={
      id:Date.now(),
      date:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),
      jdSnippet:run.jdText?.slice(0,80)+"...",
      role:extractRole(run.jdText),
      domain:run.domain||"general",
      topCandidate:run.topCandidate||"Unknown",
      topScore:run.topScore||0,
      totalCandidates:run.totalCandidates||5,
      biasScore:run.biasScore||84,
      agentsRun:7,
    };
    const updated=[newRun,...existing].slice(0,5);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(updated));
    return updated;
  }catch(e){
    console.error("Failed to save pipeline history",e);
    return [];
  }
}

export function loadHistory(){
  try{
    const raw=localStorage.getItem(HISTORY_KEY);
    return raw?JSON.parse(raw):[];
  }catch{return [];}
}

export function clearHistory(){
  try{localStorage.removeItem(HISTORY_KEY);}catch{}
}

function extractRole(jdText){
  if(!jdText) return "Unknown role";
  const lines=jdText.split("\n").filter(l=>l.trim());
  const firstLine=lines[0]?.trim()||"";
  // Try to extract role from first line (usually "Role Title — Location" or just "Role Title")
  return firstLine.split("—")[0].split("-")[0].split("|")[0].trim().slice(0,40)||"Unknown role";
}

const DOMAIN_ICONS={frontend:"⚛️",product:"📋",data:"📊",backend:"⚙️",marketing:"📢",sales:"🎯",design:"🎨",hr:"👥",finance:"💰",cs:"❤️",general:"🧠"};
const DOMAIN_COLORS={frontend:"#534AB7",product:"#BA7517",data:"#1D9E75",backend:"#0F172A",marketing:"#D4537E",sales:"#BA7517",design:"#7C3AED",hr:"#1D9E75",finance:"#085041",cs:"#D4537E",general:"#534AB7"};

export function PipelineHistoryPanel({onLoadRun}){
  const[history,setHistory]=useState([]);
  const[expanded,setExpanded]=useState(null);

  useEffect(()=>{setHistory(loadHistory());},[]);

  if(!history.length) return(
    <div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",padding:"32px 24px",textAlign:"center"}}>
      <div style={{fontSize:28,marginBottom:10}}>🕐</div>
      <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A",marginBottom:4}}>No pipeline runs yet</div>
      <div style={{fontSize:12,color:"#888780"}}>Run a pipeline and your history will appear here. Survives page refresh.</div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A"}}>Pipeline history</div>
        <button onClick={()=>{clearHistory();setHistory([]);}} style={{fontSize:11,color:"#D85A30",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Clear all</button>
      </div>
      {history.map((run,i)=>{
        const isExpanded=expanded===run.id;
        const domainColor=DOMAIN_COLORS[run.domain]||"#534AB7";
        const domainIcon=DOMAIN_ICONS[run.domain]||"🧠";
        const biasColor=run.biasScore>=80?"#1D9E75":run.biasScore>=60?"#BA7517":"#D85A30";
        return(
          <div key={run.id} style={{background:"white",borderRadius:14,border:"1.5px solid "+(isExpanded?"#534AB7":"#EEECEA"),overflow:"hidden",transition:"all 0.2s"}}>
            <div onClick={()=>setExpanded(isExpanded?null:run.id)} style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:10,background:domainColor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{domainIcon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1C1C1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{run.role}</div>
                  {i===0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"#EEEDFE",color:"#534AB7",flexShrink:0}}>Latest</span>}
                </div>
                <div style={{fontSize:10,color:"#888780"}}>{run.date} · {run.totalCandidates} candidates · {run.agentsRun} agents</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:800,color:domainColor}}>{run.topScore}</div>
                <div style={{fontSize:9,color:"#888780"}}>top score</div>
              </div>
              <div style={{fontSize:12,color:"#B4B2A9",flexShrink:0}}>{isExpanded?"▲":"▼"}</div>
            </div>
            {isExpanded&&(
              <div style={{borderTop:"1px solid #EEECEA",padding:"16px 18px",background:"#FAFAF8",animation:"fadeIn 0.2s ease"}}>
                <div style={{fontSize:11,color:"#5F5E5A",lineHeight:1.6,background:"white",borderRadius:8,padding:"10px 12px",border:"1px solid #EEECEA",marginBottom:14,fontStyle:"italic"}}>"{run.jdSnippet}"</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                  <div style={{background:"white",borderRadius:9,padding:"10px 12px",border:"1px solid #EEECEA",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,color:"#534AB7"}}>{run.topScore}/100</div>
                    <div style={{fontSize:10,color:"#888780",marginTop:2}}>Top candidate</div>
                    <div style={{fontSize:10,fontWeight:600,color:"#1C1C1A",marginTop:1}}>{run.topCandidate}</div>
                  </div>
                  <div style={{background:"white",borderRadius:9,padding:"10px 12px",border:"1px solid #EEECEA",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,color:biasColor}}>{run.biasScore}/100</div>
                    <div style={{fontSize:10,color:"#888780",marginTop:2}}>Bias score</div>
                    <div style={{fontSize:10,fontWeight:600,color:biasColor,marginTop:1}}>{run.biasScore>=80?"Low risk":run.biasScore>=60?"Moderate":"High risk"}</div>
                  </div>
                  <div style={{background:"white",borderRadius:9,padding:"10px 12px",border:"1px solid #EEECEA",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,color:"#1C1C1A"}}>{run.totalCandidates}</div>
                    <div style={{fontSize:10,color:"#888780",marginTop:2}}>Shortlisted</div>
                    <div style={{fontSize:10,fontWeight:600,color:domainColor,marginTop:1}}>{run.domain} role</div>
                  </div>
                </div>
                <button onClick={()=>onLoadRun&&onLoadRun(run)} style={{width:"100%",padding:"9px 0",background:"#534AB7",border:"none",borderRadius:9,fontSize:12,fontWeight:700,color:"white",cursor:"pointer"}}>Load this run →</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
