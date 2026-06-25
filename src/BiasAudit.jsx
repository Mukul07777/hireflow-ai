import { useState, useEffect } from "react";

// ── BIAS AUDIT VISUALIZATION ──────────────────────────────────────────────
// Drop-in replacement for the text-only bias report in HiringReport

function BiasGauge({label,score,desc}){
  const[d,setD]=useState(0);
  useEffect(()=>{let n=0;const t=setInterval(()=>{n+=2;if(n>=score){setD(score);clearInterval(t);}else setD(n);},16);return()=>clearInterval(t);},[score]);
  const color=score>=80?"#1D9E75":score>=60?"#BA7517":"#D85A30";
  const r=28,stroke=5,circ=2*Math.PI*r,fill=(d/100)*circ;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,flex:1}}>
      <div style={{position:"relative",width:70,height:70}}>
        <svg width={70} height={70} style={{transform:"rotate(-90deg)"}}>
          <circle cx={35} cy={35} r={r} fill="none" stroke="#EEECEA" strokeWidth={stroke}/>
          <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={fill+" "+circ} strokeLinecap="round" style={{transition:"stroke-dasharray 0.05s"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <div style={{fontSize:15,fontWeight:800,color}}>{d}</div>
          <div style={{fontSize:8,color:"#B4B2A9",fontWeight:600}}>/100</div>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#1C1C1A"}}>{label}</div>
        <div style={{fontSize:10,color:"#888780",marginTop:2,lineHeight:1.4}}>{desc}</div>
      </div>
    </div>
  );
}

export function BiasAuditPanel({report}){
  if(!report) return null;
  const overall=report.score||84;
  const genderScore=report.genderNeutral||overall;
  const inclusiveScore=report.inclusive||Math.max(60,overall-12);
  const overReqScore=report.overReq?100-report.overReq:Math.max(50,overall-18);
  const transparencyScore=report.salary||90;

  const overallColor=overall>=80?"#1D9E75":overall>=60?"#BA7517":"#D85A30";
  const overallLabel=overall>=80?"Low bias risk":overall>=60?"Moderate bias risk":"High bias risk";

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Overall score banner */}
      <div style={{background:overall>=80?"linear-gradient(135deg,#E1F5EE,#D1F0E4)":overall>=60?"linear-gradient(135deg,#FAEEDA,#F5DDB0)":"linear-gradient(135deg,#FAECE7,#F5C4B0)",border:"1px solid "+(overall>=80?"#9FE1CB":overall>=60?"#FAC775":"#F5B8A0"),borderRadius:14,padding:"18px 22px",display:"flex",alignItems:"center",gap:20}}>
        <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
          {(()=>{
            const r2=32,s2=6,c2=2*Math.PI*r2,f2=(overall/100)*c2;
            return(
              <svg width={80} height={80} style={{transform:"rotate(-90deg)"}}>
                <circle cx={40} cy={40} r={r2} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={s2}/>
                <circle cx={40} cy={40} r={r2} fill="none" stroke={overallColor} strokeWidth={s2} strokeDasharray={f2+" "+c2} strokeLinecap="round"/>
              </svg>
            );
          })()}
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:20,fontWeight:900,color:overallColor}}>{overall}</div>
            <div style={{fontSize:8,fontWeight:700,color:"#888780"}}>/100</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"#1C1C1A",marginBottom:2}}>Bias Audit Score — {overallLabel}</div>
          <div style={{fontSize:12,color:"#5F5E5A",lineHeight:1.5}}>{overall>=80?"Your JD scores well on inclusivity. Minor improvements possible.":overall>=60?"Some language patterns detected. Review flagged items below.":"JD has significant bias risks. Address flags before posting."}</div>
          <div style={{fontSize:11,fontWeight:700,color:overallColor,marginTop:8}}>{report.flags?.length||0} flags · {report.flags?.length===0?"No issues found":report.flags?.length===1?"1 item to review":report.flags?.length+" items to review"}</div>
        </div>
      </div>

      {/* 4 dimension gauges */}
      <div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",padding:"20px 24px"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:16}}>Bias dimensions</div>
        <div style={{display:"flex",gap:16,justifyContent:"space-around"}}>
          <BiasGauge label="Gender neutral" score={genderScore} desc="Language bias check"/>
          <BiasGauge label="Inclusive language" score={inclusiveScore} desc="Accessibility of JD"/>
          <BiasGauge label="Experience req" score={overReqScore} desc="Over-specification risk"/>
          <BiasGauge label="Transparency" score={transparencyScore} desc="Salary & expectations"/>
        </div>
      </div>

      {/* Flags */}
      {report.flags?.length>0&&(
        <div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",padding:"18px 22px"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#1C1C1A",marginBottom:12}}>Flags to review</div>
          {report.flags.filter(f=>f&&f.length>2).map((flag,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",background:"#FFF8EE",border:"1px solid #FAC775",borderRadius:9,marginBottom:7}}>
              <span style={{fontSize:13,flexShrink:0}}>⚠️</span>
              <div style={{fontSize:12,color:"#633806",lineHeight:1.5}}>{flag}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {report.recommendation&&(
        <div style={{background:"#EEEDFE",border:"1px solid #CECBF6",borderRadius:14,padding:"16px 20px",display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:16,flexShrink:0}}>💡</span>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#534AB7",marginBottom:4}}>AI Recommendation</div>
            <div style={{fontSize:13,color:"#3C3489",lineHeight:1.6}}>{report.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  );
}
