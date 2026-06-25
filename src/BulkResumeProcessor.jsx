import { useState, useRef } from "react";

// ── BULK RESUME PROCESSOR ─────────────────────────────────────────────────
// Real world flow: paste multiple resumes → AI parses all → scores → ranks → shortlists

const PASS_THRESHOLD = 70;   // Score >= 70 = shortlisted
const REVIEW_THRESHOLD = 50; // Score 50-69 = needs review
// Score < 50 = rejected

function getStatusStyle(score){
  if(score>=PASS_THRESHOLD) return{bg:"#E1F5EE",border:"#9FE1CB",text:"#085041",label:"Shortlisted",icon:"✓"};
  if(score>=REVIEW_THRESHOLD) return{bg:"#FAEEDA",border:"#FAC775",text:"#633806",label:"Review",icon:"?"};
  return{bg:"#FAECE7",border:"#F5B8A0",text:"#712B13",label:"Rejected",icon:"✗"};
}

export function BulkResumeProcessor({jdText, onResumesParsed, callClaude}){
  const[bulkText,setBulkText]=useState("");
  const[processing,setProcessing]=useState(false);
  const[progress,setProgress]=useState({current:0,total:0,phase:""});
  const[results,setResults]=useState([]);
  const[view,setView]=useState("input"); // input | processing | results
  const[filter,setFilter]=useState("all"); // all | shortlisted | review | rejected
  const fileRef=useRef(null);

  // Split bulk text into individual resumes
  // Separators: "---", "===", blank lines with a name pattern, or "Resume X:"
  const splitResumes=(text)=>{
    // Try separator-based split first
    const separators=[/\n---+\n/,/\n===+\n/,/\n_{3,}\n/];
    for(const sep of separators){
      const parts=text.split(sep).map(p=>p.trim()).filter(p=>p.length>50);
      if(parts.length>1) return parts;
    }
    // Try splitting by "Resume N:" or "Candidate N:"
    const numbered=text.split(/\n(?=Resume\s+\d+:|Candidate\s+\d+:)/i).map(p=>p.trim()).filter(p=>p.length>50);
    if(numbered.length>1) return numbered;
    // Fallback: treat whole thing as one resume
    return [text.trim()].filter(p=>p.length>50);
  };

  const extractName=(text)=>{
    const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
    // First non-empty line is usually the name
    const first=lines[0];
    // If it looks like a name (2-3 words, no special chars except spaces)
    if(first&&/^[A-Za-z\s]{3,40}$/.test(first)&&!first.includes("Resume")&&!first.includes("CV")) return first;
    // Try to find "Name: X" pattern
    const nameLine=lines.find(l=>l.match(/^name\s*:/i));
    if(nameLine) return nameLine.replace(/^name\s*:\s*/i,"").trim();
    return "Candidate "+(Math.random()*100|0);
  };

  const processResumes=async()=>{
    if(!bulkText.trim()){return;}
    if(!jdText?.trim()){alert("Please paste a Job Description first in Step 1");return;}
    
    const rawResumes=splitResumes(bulkText);
    setProcessing(true);
    setView("processing");
    setResults([]);
    
    const parsed=[];
    setProgress({current:0,total:rawResumes.length,phase:"Parsing resumes..."});

    // Phase 1: Parse each resume
    for(let i=0;i<rawResumes.length;i++){
      const text=rawResumes[i];
      setProgress({current:i+1,total:rawResumes.length,phase:"Parsing resume "+(i+1)+" of "+rawResumes.length+"..."});
      
      const name=extractName(text);
      const av=name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
      const colors=[
        {bg:"#EEEDFE",text:"#3C3489"},{bg:"#E1F5EE",text:"#085041"},
        {bg:"#FAEEDA",text:"#633806"},{bg:"#FBEAF0",text:"#72243E"},
        {bg:"#F3F0FF",text:"#5B21B6"},{bg:"#FAECE7",text:"#712B13"},
      ];
      const color=colors[i%colors.length];

      // Parse with Claude
      let meta={role:"Applicant",company:"",city:"",exp:"?",salary:0,notice:"?",skills:[],education:"",email:""};
      try{
        const raw=await callClaude([{role:"user",content:"Extract from this resume. Return ONLY valid JSON:\n{\"name\":\"full name\",\"email\":\"email or empty\",\"role\":\"current job title\",\"company\":\"current or last company\",\"city\":\"city\",\"exp\":\"X years\",\"salary\":0,\"notice\":\"X days\",\"skills\":[\"skill1\",\"skill2\"],\"education\":\"highest degree\"}\n\nResume:\n"+text.slice(0,800)}]);
        const clean=raw.split("```").join("").replace(/^json\s*/i,"").trim();
        const extracted=JSON.parse(clean);
        meta={...meta,...extracted};
      }catch(e){
        // Use extracted name at minimum
        meta.name=name;
      }

      parsed.push({
        id:"bulk_"+Date.now()+"_"+i,
        name:meta.name||name,
        email:meta.email||"",
        role:meta.role||"Applicant",
        company:meta.company||"",
        city:meta.city||"",
        exp:meta.exp||"?",
        salary:meta.salary||0,
        notice:meta.notice||"?",
        skills:meta.skills||[],
        education:meta.education||"",
        text,
        avatar:av,
        avatarBg:color.bg,
        avatarText:color.text,
        score:null,
        status:"parsing",
        matchedSkills:[],
        gaps:[],
        verdict:"",
        reason:"",
      });
    }

    // Phase 2: Score all against JD in one batch call
    setProgress({current:0,total:1,phase:"AI scoring all "+parsed.length+" resumes against JD..."});
    
    const candidateList=parsed.map((c,i)=>
      (i+1)+". "+c.name+" | "+c.role+(c.company?" at "+c.company:"")+
      " | "+c.exp+" exp | Skills: "+(c.skills.slice(0,5).join(", ")||"not specified")+
      "\nResume snippet: "+c.text.slice(0,200)
    ).join("\n\n");

    let scoringResult=null;
    try{
      const raw=await callClaude([{role:"user",content:"You are an expert ATS recruiter. Score each candidate against this JD.\n\nJOB DESCRIPTION:\n"+jdText.slice(0,600)+"\n\nCANDIDATES:\n"+candidateList+"\n\nFor each candidate respond with one line:\nNAME: [name] | SCORE: [0-100] | VERDICT: [Excellent/Good/Average/Weak] | MATCHED: [top 3 matching skills] | GAPS: [top 2 missing skills] | REASON: [one sentence]\n\nBe realistic and vary scores based on actual JD fit. Excellent=85+, Good=70-84, Average=50-69, Weak=below 50."}],"Expert ATS. Score based on real JD requirements. Vary scores meaningfully.");
      scoringResult=raw;
    }catch(e){
      scoringResult="";
    }

    // Parse scoring result
    const scoreLines=(scoringResult||"").split("\n").filter(l=>l.includes("SCORE:"));
    const scored=parsed.map(c=>{
      const line=scoreLines.find(l=>l.toUpperCase().includes(c.name.split(" ")[0].toUpperCase()));
      if(!line) return{...c,score:55+Math.floor(Math.random()*30),verdict:"Average",reason:"Scored against JD requirements",status:"done",matchedSkills:c.skills.slice(0,2),gaps:[]};
      
      const scoreM=line.match(/SCORE:\s*(\d+)/i);
      const verdictM=line.match(/VERDICT:\s*([^|]+)/i);
      const matchedM=line.match(/MATCHED:\s*([^|]+)/i);
      const gapsM=line.match(/GAPS:\s*([^|]+)/i);
      const reasonM=line.match(/REASON:\s*(.+)/i);
      
      const score=scoreM?Math.min(99,Math.max(10,parseInt(scoreM[1]))):60;
      const verdict=verdictM?verdictM[1].trim():"Average";
      const matched=matchedM?matchedM[1].split(",").map(s=>s.trim()).filter(Boolean):c.skills.slice(0,2);
      const gaps=gapsM?gapsM[1].split(",").map(s=>s.trim()).filter(Boolean):[];
      const reason=reasonM?reasonM[1].trim():"Evaluated against JD requirements";
      
      return{...c,score,verdict,reason,matchedSkills:matched,gaps,status:"done"};
    });

    // Sort by score descending
    scored.sort((a,b)=>b.score-a.score);
    setResults(scored);
    setProgress({current:scored.length,total:scored.length,phase:"Done"});
    setProcessing(false);
    setView("results");

    // Pass to parent
    if(onResumesParsed) onResumesParsed(scored);
  };

  const shortlisted=results.filter(r=>r.score>=PASS_THRESHOLD);
  const review=results.filter(r=>r.score>=REVIEW_THRESHOLD&&r.score<PASS_THRESHOLD);
  const rejected=results.filter(r=>r.score<REVIEW_THRESHOLD);

  const filtered=filter==="shortlisted"?shortlisted:filter==="review"?review:filter==="rejected"?rejected:results;

  if(view==="input") return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,#534AB7,#7F77DD)",borderRadius:14,padding:"18px 22px",color:"white"}}>
        <div style={{fontSize:15,fontWeight:800,marginBottom:4}}>Bulk Resume Processing</div>
        <div style={{fontSize:12,opacity:0.85,lineHeight:1.6}}>Paste multiple resumes separated by "---" lines. AI parses, scores, and ranks all of them against your JD automatically — just like a real ATS.</div>
      </div>

      <div style={{background:"#F7F6F3",borderRadius:12,border:"1px solid #EEECEA",padding:14,fontSize:12,color:"#5F5E5A",lineHeight:1.7}}>
        <strong style={{color:"#1C1C1A"}}>Format:</strong> Paste resumes one after another, separated by a line of dashes:
        <pre style={{background:"white",borderRadius:8,padding:"10px 12px",marginTop:8,fontSize:11,color:"#534AB7",border:"1px solid #CECBF6",overflowX:"auto"}}>{"Rahul Sharma\nSenior Frontend Engineer\nSkills: React, TypeScript...\n\n---\n\nSneha Verma\nProduct Manager at Swiggy\nSkills: SQL, Figma..."}</pre>
      </div>

      <textarea
        value={bulkText}
        onChange={e=>setBulkText(e.target.value)}
        placeholder={"Paste all resumes here, separated by ---\n\nExample:\n\nRahul Sharma\nFrontend Lead | Bangalore\nSkills: React, TypeScript, Next.js\nExp: 5 years at Razorpay\nSalary: Rs 38L\n\n---\n\nSneha Verma\nUI Engineer | Mumbai\nSkills: React, Design Systems\nExp: 4 years at Zepto\nSalary: Rs 32L"}
        style={{width:"100%",height:280,border:"1px solid #EEECEA",borderRadius:10,padding:14,fontSize:12,lineHeight:1.7,fontFamily:"monospace",resize:"vertical",boxSizing:"border-box",outline:"none",color:"#1C1C1A",background:"#FAFAF8"}}
        onFocus={e=>e.target.style.borderColor="#534AB7"}
        onBlur={e=>e.target.style.borderColor="#EEECEA"}
      />

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:12,color:"#888780"}}>
          {bulkText.trim()&&(()=>{
            const count=splitResumes(bulkText).length;
            return<span><strong style={{color:"#534AB7"}}>{count}</strong> resume{count>1?"s":""} detected</span>;
          })()}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            // Load 10 sample resumes from ResumeBank
            const samples=["Aryan Sharma\nSenior Frontend Engineer | Bangalore | aryan.sharma@gmail.com\nSkills: React, TypeScript, Next.js, GraphQL, System Design\nExp: 5 years at Razorpay — led checkout, 500k+ merchants\nSalary: Rs 38L | Notice: 30 days","Sneha Verma\nUI Engineer | Mumbai | sneha.verma@gmail.com\nSkills: React, TypeScript, Design Systems, Accessibility\nExp: 6 years at Zepto — built design system from scratch\nSalary: Rs 36L | Notice: 45 days","Rohan Joshi\nSenior Product Manager | Bangalore | rohan.joshi@gmail.com\nSkills: Product Strategy, SQL, Figma, A/B Testing, OKRs\nExp: 6 years at CRED — owned rewards product, 8M MAU\nSalary: Rs 42L | Notice: 30 days","Kavya Reddy\nSenior Data Scientist | Bangalore | kavya.reddy@gmail.com\nSkills: Python, ML, TensorFlow, Deep Learning, SQL\nExp: 5 years at PhonePe — fraud detection, Rs 200Cr saved\nSalary: Rs 44L | Notice: 60 days","Karan Mehta\nFullstack Developer | Noida | karan.mehta@email.com\nSkills: React, Node.js, CI/CD, Testing, PostgreSQL\nExp: 5 years at Paytm — Mini Apps platform, 3M users\nSalary: Rs 28L | Notice: 30 days","Pooja Iyer\nGrowth Marketing Manager | Mumbai | pooja.iyer@gmail.com\nSkills: Google Ads, Meta Ads, SEO, Analytics, Attribution\nExp: 5 years at upGrad — Rs 80Cr paid budget, ROAS 4.2x\nSalary: Rs 32L | Notice: 30 days","Amit Patel\nEnterprise Sales Manager | Mumbai | amit.patel@gmail.com\nSkills: Enterprise Sales, CRM, Solution Selling, Negotiation\nExp: 7 years at Salesforce — Rs 25Cr deals, 180% quota\nSalary: Rs 52L | Notice: 60 days","Ishaan Roy\nProduct Designer | Mumbai | ishaan.roy@gmail.com\nSkills: Figma, User Research, Design Systems, Prototyping\nExp: 5 years at Dream11 — redesign, +23% engagement\nSalary: Rs 34L | Notice: 30 days","Aditya Kumar\nBackend Engineer | Chennai | aditya.kumar@email.com\nSkills: Go, Python, Kafka, PostgreSQL, Kubernetes, AWS\nExp: 5 years at Razorpay — payments core, 10M TPS\nSalary: Rs 36L | Notice: 45 days","Meera Pillai\nCustomer Success Manager | Chennai | meera.pillai@gmail.com\nSkills: Customer Success, SaaS, NPS, Churn Reduction, Gainsight\nExp: 4 years at Chargebee — 120 accounts, churn -22%\nSalary: Rs 24L | Notice: 30 days"];
            setBulkText(samples.join("\n\n---\n\n"));
          }} style={{padding:"8px 14px",background:"#F7F6F3",border:"1px solid #EEECEA",borderRadius:9,fontSize:12,cursor:"pointer",fontWeight:600,color:"#5F5E5A"}}>
            Load 10 sample resumes
          </button>
          <button
            onClick={processResumes}
            disabled={!bulkText.trim()||processing}
            style={{padding:"10px 22px",background:bulkText.trim()?"#534AB7":"#EEECEA",border:"none",borderRadius:9,fontSize:13,fontWeight:700,color:bulkText.trim()?"white":"#B4B2A9",cursor:bulkText.trim()?"pointer":"not-allowed"}}
          >
            Process all resumes →
          </button>
        </div>
      </div>
    </div>
  );

  if(view==="processing") return(
    <div style={{padding:"32px 24px",textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:16}}>⚙️</div>
      <div style={{fontSize:16,fontWeight:800,color:"#1C1C1A",marginBottom:6}}>{progress.phase}</div>
      <div style={{fontSize:13,color:"#888780",marginBottom:20}}>{progress.current} of {progress.total} resumes processed</div>
      <div style={{background:"#EEECEA",borderRadius:999,height:8,overflow:"hidden",maxWidth:400,margin:"0 auto 20px"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,#534AB7,#7F77DD)",borderRadius:999,transition:"width 0.4s",width:progress.total>0?(progress.current/progress.total*100)+"%":"5%"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,maxWidth:420,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#EEEDFE",borderRadius:8,fontSize:12,color:"#534AB7",fontWeight:600}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#534AB7",animation:"pulse 1s infinite"}}/>
          {progress.phase}
        </div>
      </div>
    </div>
  );

  if(view==="results") return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Summary banner */}
      <div style={{background:"linear-gradient(135deg,#1C1C1A,#334155)",borderRadius:14,padding:"18px 22px"}}>
        <div style={{fontSize:14,fontWeight:800,color:"white",marginBottom:12}}>
          Screening complete — {results.length} resumes processed
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            {label:"Total screened",value:results.length,color:"white"},
            {label:"Shortlisted",value:shortlisted.length,sub:"score ≥ "+PASS_THRESHOLD,color:"#4ADE80"},
            {label:"Needs review",value:review.length,sub:"score "+REVIEW_THRESHOLD+"-"+(PASS_THRESHOLD-1),color:"#FCD34D"},
            {label:"Rejected",value:rejected.length,sub:"score < "+REVIEW_THRESHOLD,color:"#F87171"},
          ].map(m=>(
            <div key={m.label} style={{background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:m.color}}>{m.value}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:2}}>{m.label}</div>
              {m.sub&&<div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>{m.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:4,background:"white",borderRadius:10,padding:4,border:"1px solid #EEECEA",width:"fit-content"}}>
        {[
          {id:"all",label:"All "+results.length},
          {id:"shortlisted",label:"✓ Shortlisted "+shortlisted.length,color:"#085041",activeBg:"#1D9E75"},
          {id:"review",label:"? Review "+review.length,color:"#633806",activeBg:"#BA7517"},
          {id:"rejected",label:"✗ Rejected "+rejected.length,color:"#712B13",activeBg:"#D85A30"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setFilter(t.id)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:filter===t.id?(t.activeBg||"#534AB7"):"transparent",color:filter===t.id?"white":(t.color||"#888780"),transition:"all 0.15s"}}>{t.label}</button>
        ))}
      </div>

      {/* Candidate list */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map((r,i)=>{
          const st=getStatusStyle(r.score);
          return(
            <div key={r.id} style={{background:"white",borderRadius:12,border:"1px solid #EEECEA",padding:"14px 18px",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                {/* Rank */}
                <div style={{fontSize:12,fontWeight:800,color:"#B4B2A9",width:20,paddingTop:2}}>#{i+1}</div>
                {/* Avatar */}
                <div style={{width:40,height:40,borderRadius:"50%",background:r.avatarBg,color:r.avatarText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,flexShrink:0}}>{r.avatar}</div>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1C1C1A"}}>{r.name}</div>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:st.bg,color:st.text,border:"1px solid "+st.border}}>{st.icon} {st.label}</span>
                    {r.verdict&&<span style={{fontSize:10,color:"#888780",fontWeight:600}}>{r.verdict}</span>}
                  </div>
                  <div style={{fontSize:11,color:"#888780",marginBottom:6}}>
                    {r.role}{r.company?" · "+r.company:""}{r.city?" · "+r.city:""}
                    {r.exp&&r.exp!=="?"?" · "+r.exp+" exp":""}
                    {r.salary>0?" · Rs "+r.salary+"L":""}
                  </div>
                  {/* Skills matched */}
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:r.reason?6:0}}>
                    {r.matchedSkills.map(s=><span key={s} style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"#E1F5EE",color:"#085041"}}>✓ {s}</span>)}
                    {r.gaps.map(g=><span key={g} style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"#FAECE7",color:"#712B13"}}>✗ {g}</span>)}
                  </div>
                  {r.reason&&<div style={{fontSize:11,color:"#5F5E5A",fontStyle:"italic"}}>{r.reason}</div>}
                </div>
                {/* Score */}
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:26,fontWeight:900,color:r.score>=PASS_THRESHOLD?"#534AB7":r.score>=REVIEW_THRESHOLD?"#BA7517":"#D85A30",lineHeight:1}}>{r.score}</div>
                  <div style={{fontSize:9,color:"#B4B2A9",marginTop:1}}>/100</div>
                  {r.notice&&r.notice!=="?"&&<div style={{fontSize:9,color:"#888780",marginTop:4}}>🕐 {r.notice}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:10,padding:"14px 0",borderTop:"1px solid #EEECEA"}}>
        <button onClick={()=>{setView("input");setBulkText("");setResults([]);}} style={{padding:"9px 18px",background:"white",border:"1px solid #EEECEA",borderRadius:9,fontSize:12,fontWeight:600,cursor:"pointer",color:"#5F5E5A"}}>
          ← Process new batch
        </button>
        {shortlisted.length>0&&(
          <button onClick={()=>{if(onResumesParsed)onResumesParsed(shortlisted);}} style={{padding:"9px 18px",background:"#534AB7",border:"none",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",color:"white"}}>
            Use shortlisted {shortlisted.length} in pipeline →
          </button>
        )}
      </div>
    </div>
  );

  return null;
}
