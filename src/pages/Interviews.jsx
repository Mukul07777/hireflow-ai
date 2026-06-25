import { useStore } from '../../lib/store'
import { EmptyState, Button, Avatar, ScoreRing, Card } from '../../components/ui/index'
import { CANDIDATES } from '../../lib/constants'

const TYPE_STYLES = {
  technical:  { bg: '#EEEDFE', text: '#3C3489', label: 'Technical' },
  behavioral: { bg: '#E1F5EE', text: '#085041', label: 'Behavioral' },
  gap:        { bg: '#FAECE7', text: '#712B13', label: 'Gap probe' },
  culture:    { bg: '#FAEEDA', text: '#633806', label: 'Culture fit' },
}

export default function Interviews() {
  const { state, dispatch } = useStore()

  if (state.pipelineState !== 'done') return (
    <EmptyState icon="💬" title="No interview questions yet"
      description="Run the pipeline to generate custom question sets per candidate"
      action={<Button variant="primary" onClick={() => dispatch({ type: 'SET_NAV', payload: 'pipeline' })}>Run pipeline →</Button>} />
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      {CANDIDATES.map(c => {
        const qs = state.interviewQs[c.id]
        return (
          <Card key={c.id} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={36} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink-primary">{c.name}</div>
                <div className="text-xs text-ink-tertiary">{c.role} · {c.company}</div>
              </div>
              <ScoreRing score={c.score} size={36} stroke={3} />
            </div>

            {!qs ? (
              <div className="text-xs text-ink-tertiary py-3 text-center">Generating questions…</div>
            ) : (
              <div className="space-y-2.5">
                {qs.map((q, i) => {
                  const style = TYPE_STYLES[q.type] || TYPE_STYLES.technical
                  return (
                    <div key={i} className="rounded-lg border border-[#EEECEA] p-3.5 bg-surface-secondary">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ background: style.bg, color: style.text }}>{style.label}</span>
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-ink-primary leading-relaxed">{q.question}</div>
                          {q.probes && (
                            <div className="text-[11px] text-ink-tertiary mt-1.5 italic">Probes: {q.probes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
