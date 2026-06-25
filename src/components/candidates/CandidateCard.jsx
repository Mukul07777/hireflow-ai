import { ScoreRing, Avatar, Badge, Button, StreamingText, Spinner, Card } from '../ui/index'
import { useStore } from '../../lib/store'
import { analyzeCandidate } from '../../lib/api'

export function CandidateCard({ candidate, selected, onClick }) {
  const c = candidate
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 p-3.5 flex items-center gap-3
        ${selected ? 'border-brand-400 shadow-elevated ring-4 ring-brand-50' : 'border-[#EEECEA] hover:border-brand-200 hover:shadow-card'}`}>
      <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={40} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink-primary">{c.name}</div>
        <div className="text-[11px] text-ink-tertiary truncate">{c.role} · {c.company}</div>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {c.skills.slice(0, 2).map(s => (
            <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success-text">{s} ✓</span>
          ))}
          {c.gaps.slice(0, 1).map(s => (
            <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger-bg text-danger-text">{s} ✗</span>
          ))}
        </div>
      </div>
      <ScoreRing score={c.score} size={44} stroke={4} />
    </div>
  )
}

export function CandidateDetail({ candidate }) {
  const { state, dispatch } = useStore()
  const c = candidate
  const analysis = state.aiAnalysis[c.id]
  const isLoading = state.loadingAnalysis === c.id

  const loadAnalysis = async () => {
    if (analysis) return
    dispatch({ type: 'SET_LOADING_ANALYSIS', id: c.id })
    try {
      const text = await analyzeCandidate(c)
      dispatch({ type: 'SET_AI_ANALYSIS', id: c.id, text })
    } catch {
      dispatch({ type: 'SET_AI_ANALYSIS', id: c.id, text: `**Why they stand out**\n${c.summary}\n\n**Key risk**\nGaps in ${c.gaps[0] || 'some required areas'} need evaluation.\n\n**Interview focus**\nProbe system design depth and mentoring experience.` })
    }
    dispatch({ type: 'SET_LOADING_ANALYSIS', id: null })
  }

  // Auto-load analysis when candidate selected
  if (!analysis && !isLoading) loadAnalysis()

  return (
    <div className="bg-white rounded-xl border border-[#EEECEA] p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={52} />
        <div className="flex-1">
          <div className="text-lg font-bold text-ink-primary">{c.name}</div>
          <div className="text-xs text-ink-tertiary mt-0.5">{c.role} at {c.company} · {c.exp}</div>
          <div className="flex gap-2 mt-2">
            <a href={`https://${c.github}`} target="_blank" rel="noreferrer"
              className="text-[11px] text-brand-600 font-medium hover:underline">GitHub ↗</a>
            <a href={`https://${c.linkedin}`} target="_blank" rel="noreferrer"
              className="text-[11px] text-brand-600 font-medium hover:underline">LinkedIn ↗</a>
          </div>
        </div>
        <ScoreRing score={c.score} size={60} stroke={5} />
      </div>

      {/* Summary */}
      <div className="text-[13px] text-ink-secondary leading-relaxed mb-4 p-3 bg-surface-secondary rounded-lg border border-[#EEECEA]">
        {c.summary}
      </div>

      {/* Skills / Gaps */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-success-bg rounded-lg p-3 border border-success-border">
          <div className="text-[10px] font-bold text-success-text uppercase tracking-wider mb-2">Matched skills</div>
          {c.skills.map(s => <div key={s} className="text-[12px] text-success-text font-medium mb-1">✓ {s}</div>)}
        </div>
        <div className="bg-danger-bg rounded-lg p-3 border border-danger-border">
          <div className="text-[10px] font-bold text-danger-text uppercase tracking-wider mb-2">Skill gaps</div>
          {c.gaps.map(s => <div key={s} className="text-[12px] text-danger-text font-medium mb-1">✗ {s}</div>)}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-brand-50 rounded-lg p-3.5 border border-brand-100 mb-4 min-h-[80px]">
        <div className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-2">🧠 AI Analysis</div>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner size={14} />
            <span className="text-xs text-brand-400">Analysing candidate…</span>
          </div>
        ) : analysis ? (
          <div className="text-[13px] text-brand-900 leading-relaxed">
            <StreamingText text={analysis} speed={8} />
          </div>
        ) : (
          <div className="text-xs text-brand-400">Loading analysis…</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="primary" fullWidth
          onClick={() => dispatch({ type: 'SET_NAV', payload: 'outreach' })}>
          ✉️ Review outreach email
        </Button>
        <Button variant="secondary"
          onClick={() => dispatch({ type: 'SET_NAV', payload: 'interviews' })}>
          💬 Interview Qs
        </Button>
      </div>
    </div>
  )
}
