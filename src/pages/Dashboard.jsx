import { useStore } from '../../lib/store'
import { MetricCard, Button, Card, EmptyState } from '../../components/ui/index'
import { AgentTimeline } from '../../components/agents/AgentTimeline'
import { CandidateCard } from '../../components/candidates/CandidateCard'
import { CANDIDATES } from '../../lib/constants'

export default function Dashboard() {
  const { state, dispatch } = useStore()
  const { pipelineState, biasReport } = state
  const done = pipelineState === 'done'

  const goTo = (nav, candidate) => {
    if (candidate) dispatch({ type: 'SET_CANDIDATE', payload: candidate })
    dispatch({ type: 'SET_NAV', payload: nav })
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Resumes processed" value={done ? '42' : '—'} delta={done ? '↑ 12 since yesterday' : 'Run pipeline to start'} deltaType={done ? 'good' : 'neutral'} />
        <MetricCard label="Shortlisted" value={done ? '5' : '—'} delta={done ? 'Top 12% of pool' : ''} deltaType="good" />
        <MetricCard label="Outreach ready" value={done ? '5' : '—'} delta={done ? 'Awaiting your approval' : ''} deltaType="neutral" />
        <MetricCard label="Bias flags" value={done ? '2' : '—'} delta={done ? '⚠ Review recommended' : ''} deltaType={done ? 'warn' : 'neutral'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Agent timeline */}
        <Card className="p-5">
          <AgentTimeline />
          {pipelineState === 'idle' && (
            <Button variant="primary" fullWidth className="mt-4" onClick={() => goTo('pipeline')}>
              ▶ Start first pipeline →
            </Button>
          )}
        </Card>

        {/* Top candidates + bias */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-sm font-bold text-ink-primary mb-1">Top candidates</div>
            <div className="text-xs text-ink-tertiary mb-4">Ranked by AI match score</div>
            {!done ? (
              <div className="text-center py-8 text-ink-tertiary text-sm">
                Run the pipeline to see ranked candidates
              </div>
            ) : (
              <div className="space-y-2">
                {CANDIDATES.slice(0, 3).map(c => (
                  <CandidateCard key={c.id} candidate={c}
                    selected={state.selectedCandidate?.id === c.id}
                    onClick={() => goTo('candidates', c)} />
                ))}
                <button onClick={() => goTo('candidates')}
                  className="w-full text-center text-xs font-semibold text-brand-600 py-2 cursor-pointer bg-transparent border-none hover:underline">
                  View all 5 candidates →
                </button>
              </div>
            )}
          </Card>

          {done && biasReport && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-ink-primary">Bias audit snapshot</div>
                <button onClick={() => goTo('bias')} className="text-xs text-brand-600 font-semibold bg-transparent border-none cursor-pointer hover:underline">View full →</button>
              </div>
              {[
                ['Gender neutral', biasReport.genderNeutral ?? 88, '#1D9E75'],
                ['Inclusive language', biasReport.inclusive ?? 72, '#534AB7'],
                ['Over-req risk', biasReport.overReq ?? 35, '#D85A30'],
              ].map(([label, val, color]) => (
                <div key={label} className="flex items-center gap-3 mb-2.5">
                  <div className="text-[11px] text-ink-secondary w-28 flex-shrink-0">{label}</div>
                  <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${val}%`, background: color }} />
                  </div>
                  <div className="text-[11px] font-bold w-8 text-right" style={{ color }}>{val}%</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
