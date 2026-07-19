/**
 * ui.jsx — presentational primitives shared across every agent screen.
 *
 * Pure components: they take props and render. No store, no context, no data
 * fetching, no side effects beyond their own animation timers. Extracted from
 * App.jsx so the design primitives live in one reviewable place.
 */
import { useState, useEffect } from "react";

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

// ── SKELETON LOADER ───────────────────────────────────────────────────────
function SkeletonLine({w="100%",h=12,mb=8,radius=6}){
  return<div style={{width:w,height:h,borderRadius:radius,background:"linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite",marginBottom:mb}}/>;
}
function SkeletonCard({lines=3,style={}}){
  return(
    <div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",padding:16,...style}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite",flexShrink:0}}/>
        <div style={{flex:1}}><SkeletonLine w="60%" h={11} mb={4}/><SkeletonLine w="40%" h={9}/></div>
      </div>
      {Array.from({length:lines}).map((_,i)=><SkeletonLine key={i} w={i===lines-1?"65%":"100%"} h={10} mb={6}/>)}
    </div>
  );
}
function CandidateListSkeleton(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[1,2,3,4].map(i=><SkeletonCard key={i} lines={2}/>)}
    </div>
  );
}
function AgentOutputSkeleton(){
  return(
    <div style={{background:"white",borderRadius:14,border:"1px solid #EEECEA",padding:20}}>
      <SkeletonLine w="45%" h={14} mb={16}/>
      {[1,2,3].map(i=><SkeletonLine key={i} w={i===3?"70%":"100%"} h={10} mb={8}/>)}
      <div style={{height:1,background:"#F3F4F6",margin:"14px 0"}}/>
      <SkeletonLine w="30%" h={11} mb={10}/>
      {[1,2].map(i=><SkeletonLine key={i} w={i===2?"55%":"100%"} h={10} mb={8}/>)}
    </div>
  );
}
function ProspectListSkeleton(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{background:"white",borderRadius:12,border:"1px solid #EEECEA",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite",flexShrink:0}}/>
          <div style={{flex:1}}><SkeletonLine w="50%" h={11} mb={4}/><SkeletonLine w="70%" h={9}/></div>
          <SkeletonLine w={60} h={26} radius={20}/>
        </div>
      ))}
    </div>
  );
}
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
function ProgressBar({value,color,height=7}){
  const v=Math.max(0,Math.min(100,value||0));
  const fill=color?`linear-gradient(90deg,${color},${color})`:"linear-gradient(90deg,#0D3B4F,#1C7A93 55%,#B8894A)";
  const glow=color?color+"55":"rgba(28,122,147,0.45)";
  return(
    <div style={{height,background:"linear-gradient(180deg,#EAE1CE,#F1E9D8)",borderRadius:999,overflow:"hidden",boxShadow:"inset 0 1px 2px rgba(120,95,55,0.14)"}}>
      <div style={{height:"100%",width:v+"%",background:fill,borderRadius:999,transition:"width 0.5s cubic-bezier(0.22,1,0.36,1)",position:"relative",boxShadow:`0 0 12px ${glow}`,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)",backgroundSize:"200% 100%",animation:v>0&&v<100?"shimmer 1.6s linear infinite":"none"}}/>
      </div>
    </div>
  );
}
function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
  const c={success:{bg:"#E1F5EE",border:"#9FE1CB",color:"#085041",icon:"✓"},error:{bg:"#FAECE7",border:"#F5B8A0",color:"#712B13",icon:"x"},info:{bg:"#EEEDFE",border:"#CECBF6",color:"#3C3489",icon:"i"},warn:{bg:"#FAEEDA",border:"#FAC775",color:"#633806",icon:"!"}}[type]||{bg:"#E1F5EE",border:"#9FE1CB",color:"#085041",icon:"✓"};
  return<div style={{background:c.bg,border:"1px solid "+c.border,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",animation:"slideUp 0.3s ease",minWidth:260}}><span style={{fontSize:14,color:c.color,fontWeight:800}}>{c.icon}</span><span style={{fontSize:12,fontWeight:600,color:c.color,flex:1}}>{msg}</span><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:c.color,fontSize:14,padding:0}}>x</button></div>;
}
export {
  ScoreRing, Avatar, Btn, Card,
  SkeletonLine, SkeletonCard, CandidateListSkeleton, AgentOutputSkeleton, ProspectListSkeleton,
  Tag, MetricCard, StreamText, Spinner, ProgressBar, Toast,
};
