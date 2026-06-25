const API_URL = 'https://api.anthropic.com/v1/messages'

export async function callClaude(messages, system = '') {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages,
  }
  if (system) body.system = system

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return data.content?.map(b => b.text || '').join('') || ''
}

export async function analyzeCandidate(candidate, jd) {
  return callClaude([{
    role: 'user',
    content: `You are a senior hiring intelligence AI. Give a sharp, specific assessment of this candidate.

Respond in exactly this format — no extra text:

**Why they stand out**
[2 specific sentences about their strongest points]

**Key risk**
[1 honest sentence about the biggest concern]

**Interview focus**
[1 sentence on what to probe deeply]

---
Candidate: ${candidate.name}
Current role: ${candidate.role} at ${candidate.company}
Experience: ${candidate.exp}
Matched skills: ${candidate.skills.join(', ')}
Skill gaps: ${candidate.gaps.join(', ')}
Match score: ${candidate.score}/100
Background: ${candidate.summary}

Job requires: React, TypeScript, Next.js, system design, mentoring junior engineers.

Be direct. No filler. No hedging.`
  }])
}

export async function generateBiasReport(jd) {
  return callClaude([{
    role: 'user',
    content: `Analyze this job description for bias patterns. Respond ONLY in valid JSON, no markdown, no extra text:

{
  "genderNeutral": <number 0-100>,
  "inclusive": <number 0-100>,
  "overReq": <number 0-100>,
  "compensation": <number 0-100>,
  "remoteFriendly": <number 0-100>,
  "flags": ["<specific flag 1>", "<specific flag 2>"],
  "recommendation": "<1-2 sentence actionable recommendation>"
}

JD:
${jd}`
  }])
}

export async function generateOutreach(candidate, jd) {
  return callClaude([{
    role: 'user',
    content: `Write a personalized recruiter outreach email for this candidate. 

Rules:
- Reference their actual company and work specifically
- 3 short paragraphs max
- No generic phrases like "I came across your profile"
- End with a specific, easy CTA
- Tone: warm but professional

Candidate: ${candidate.name}
Role: ${candidate.role} at ${candidate.company}  
Skills: ${candidate.skills.join(', ')}
Background: ${candidate.summary}

Position: Senior Frontend Engineer
Key requirements: React, TypeScript, system design, mentoring`
  }])
}

export async function generateInterviewQuestions(candidate) {
  return callClaude([{
    role: 'user',
    content: `Generate 4 interview questions for this candidate. Respond ONLY in valid JSON array, no markdown:

[
  { "question": "...", "type": "technical", "probes": "..." },
  { "question": "...", "type": "behavioral", "probes": "..." },
  { "question": "...", "type": "gap", "probes": "..." },
  { "question": "...", "type": "culture", "probes": "..." }
]

Candidate: ${candidate.name}
Skills: ${candidate.skills.join(', ')}
Gaps: ${candidate.gaps.join(', ')}
Background: ${candidate.summary}

Make each question specific to their profile. The "gap" question must probe their weakest area.`
  }])
}
