import { useStore } from '../../lib/store'
import { EmptyState, Button, MetricCard, Card } from '../../components/ui/index'

const BARS = [
  { key: 'genderNeutral',  label: 'Gender neutral language', color: '#1D9E75', note: 'JD uses inclusive terms throughout' },
  { key: 'inclusive',      label: 'Inclusive phrasing',      color: '#534AB7', note: 'Minor improvements possible in 2 sections' },
  { key: 'compensation',   label: 'Compensation transparency', color: '#1D9E75', note: 'Salary range clearly stated — excellent' },
  { key: 'remoteFriendly', label: 'Remote-friendly language', color: '#534AB7', note: 'Flexible work mentioned' },
]

export default function BiasAudit() {
  const { state, dispatch } = useStore()
  const { biasReport } = state

  if (!biasReport) return (
    <EmptyState icon="⚖️" title="No bias analysis yet"
      description="Run the pipeline to get a full bias audit of your job description"
      action={<Button variant="primary" onClick={() => dispatch({ type: 'SET_NAV', payload: 'pipeline' })}>Run pipeline →</Button>} />
  )

  const overReqScore = 100 - (biasReport.overReq ?? 35)

  return (
    <div className="animate-fade-in max-w-2xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Gender neutrality" value={`${biasReport.genderNeutral ?? 88}%`} delta="Good" deltaType="good" />
        <MetricCard label="Inclusive language" value={`${biasReport.inclusive ?? 72}%`} delta="Acceptable" deltaType="neutral" />
        <MetricCard label="Realistic requirements" value={`${overReqScore}%`} delta="⚠ Review suggested" deltaType="warn" />
      </div>

      <Card className="p-5">
        <div className="text-sm font-bold text-ink-primary mb-4">Detailed analysis</div>
        {BARS.map(({ key, label, color, note }) => {
          const val = biasReport[key] ?? 80
          return (
            <div key={key} className="mb-4">
              <div className="flex justify-between mb-1.5">
                <div className="text-[13px] font-medium text-ink-primary">{label}</div>
                <div className="text-[13px] font-bold" style={{ color }}>{val}%</div>
              </div>
              <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${val}%`, background: color }} />
              </div>
              <div className="text-[11px] text-ink-tertiary">{note}</div>
            </div>
          )
        })}

        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <div className="text-[13px] font-medium text-ink-primary">Requirement realism</div>
            <div className="text-[13px] font-bold text-danger-strong">{overReqScore}%</div>
          </div>
          <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden mb-1">
            <div className="h-full rounded-full transition-all duration-1000 bg-danger-strong" style={{ width: `${overReqScore}%` }} />
          </div>
          <div className="text-[11px] text-ink-tertiary">"5+ years in 3+ frameworks" may deter qualified candidates</div>
        </div>
      </Card>

      {biasReport.flags?.length > 0 && (
        <Card className="p-5">
          <div className="text-sm font-bold text-ink-primary mb-3">Flags detected</div>
          <div className="space-y-2">
            {biasReport.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-warn-bg border border-warn-border rounded-lg">
                <span className="text-sm flex-shrink-0">⚠️</span>
                <span className="text-[12px] text-warn-text font-medium">{flag}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {biasReport.recommendation && (
        <Card className="p-5 bg-brand-50 border-brand-100">
          <div className="text-sm font-bold text-brand-800 mb-2">🧠 AI Recommendation</div>
          <div className="text-[13px] text-brand-900 leading-relaxed">{biasReport.recommendation}</div>
        </Card>
      )}
    </div>
  )
}
