import { useStore, useToast } from '../lib/store'
import { AGENTS, CANDIDATES } from '../lib/constants'
import { generateBiasReport, generateOutreach, generateInterviewQuestions } from '../lib/api'

export function usePipeline() {
  const { state, dispatch } = useStore()
  const toast = useToast()

  const runPipeline = async () => {
    if (!state.jdText.trim()) { toast('Paste a job description first', 'error'); return }

    dispatch({ type: 'RESET_PIPELINE' })
    dispatch({ type: 'SET_PIPELINE', payload: 'running' })

    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i]
      dispatch({ type: 'SET_AGENT_STATUS', id: agent.id, status: 'active' })
      await new Promise(r => setTimeout(r, agent.duration))

      // Real AI calls on key agents
      if (agent.id === 3) {
        try {
          const raw = await generateBiasReport(state.jdText)
          const clean = raw.replace(/```json|```/g, '').trim()
          const report = JSON.parse(clean)
          dispatch({ type: 'SET_BIAS', payload: report })
        } catch {
          dispatch({ type: 'SET_BIAS', payload: { genderNeutral: 88, inclusive: 72, overReq: 35, compensation: 95, remoteFriendly: 82, flags: ['Over-qualification risk in experience clause', 'Minor inclusive language improvements possible'], recommendation: 'Consider revising the 4+ year requirement to skills-based criteria to attract stronger candidates.' } })
        }
      }

      if (agent.id === 4) {
        // Generate email drafts for top 3 candidates
        for (const c of CANDIDATES.slice(0, 3)) {
          try {
            const email = await generateOutreach(c, state.jdText)
            dispatch({ type: 'SET_EMAIL_DRAFT', id: c.id, text: email })
          } catch {
            dispatch({ type: 'SET_EMAIL_DRAFT', id: c.id, text: `Hi ${c.name.split(' ')[0]},\n\nYour work on ${c.company}'s product caught my eye — specifically your experience with ${c.skills[0]} and ${c.skills[1]}.\n\nWe're hiring a Senior Frontend Engineer and I think there's a strong fit. Would you be open to a 20-minute conversation this week?\n\nBest,\nHiring Team` })
          }
        }
        // Static drafts for remaining
        for (const c of CANDIDATES.slice(3)) {
          dispatch({ type: 'SET_EMAIL_DRAFT', id: c.id, text: `Hi ${c.name.split(' ')[0]},\n\nYour background at ${c.company} with ${c.skills[0]} looks relevant to what we're building. Would love to connect.\n\nBest,\nHiring Team` })
        }
      }

      if (agent.id === 5) {
        for (const c of CANDIDATES.slice(0, 3)) {
          try {
            const raw = await generateInterviewQuestions(c)
            const clean = raw.replace(/```json|```/g, '').trim()
            const qs = JSON.parse(clean)
            dispatch({ type: 'SET_INTERVIEW_QS', id: c.id, qs })
          } catch {
            dispatch({ type: 'SET_INTERVIEW_QS', id: c.id, qs: [
              { question: `Walk me through a complex ${c.skills[0]} architecture decision you made at ${c.company}.`, type: 'technical', probes: 'Depth of technical thinking' },
              { question: `Tell me about a time you pushed back on a product decision and were right.`, type: 'behavioral', probes: 'Judgment and communication' },
              { question: c.gaps[0] ? `Your profile shows less ${c.gaps[0]} experience — how would you approach getting up to speed in 30 days?` : `How do you approach mentoring engineers who are struggling?`, type: 'gap', probes: 'Self-awareness and growth mindset' },
              { question: `What's the most impactful performance improvement you've shipped? Numbers?`, type: 'culture', probes: 'Ownership and metrics-driven thinking' },
            ]})
          }
        }
      }

      dispatch({ type: 'SET_AGENT_STATUS', id: agent.id, status: 'done' })
      dispatch({ type: 'SET_AGENT_LOG', id: agent.id, log: agent.log })
    }

    dispatch({ type: 'SET_PIPELINE', payload: 'done' })
    toast('Pipeline complete — 5 candidates shortlisted', 'success')
  }

  return { runPipeline, pipelineState: state.pipelineState }
}
