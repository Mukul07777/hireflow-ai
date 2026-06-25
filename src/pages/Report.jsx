import { useStore, useToast } from '../../lib/store'
import { EmptyState, Button, MetricCard, Card, Avatar, ScoreRing } from '../../components/ui/index'
import { CANDIDATES } from '../../lib/constants'

export default function Report() {
  const { state, dispatch } = useStore()
  const toast = useToast()

  if (state.pipelineState !== 'done') return (
    <EmptyState icon="📄" title="No report yet"
      description="Run the pipeline to generate a full hiring summary report"
      action={<Button variant="primary" onClick={() => dispatch({ type: 'SET_NAV', payload: 'pipeline' })}>Run pipeline →</Button>} />
  )

  const handleDownload = () => toast('Report downloaded as PDF', 'success')

  return (
    <div className="animate-fade-in max-w-2xl space-y-4">
      {/* Header card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-base font-bold text-ink-primary">Hiring summary report</div>
            <div className="text-xs text-ink-tertiary mt-1">Senior Frontend Engineer · Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <Button variant="primary" size="sm" onClick={handleDownload}>📥 Download PDF</Button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Total applicants" value="42" />
          <MetricCard label="Shortlisted" value="5" delta="Top 12%" deltaType="good" />
          <MetricCard label="Avg match score" value="83%" />
          <MetricCard label="Bias flags" value="2" delta="Needs review" deltaType="warn" />
        </div>

        {/* Ranked candidates */}
        <div>
          <div className="text-sm font-bold text-ink-primary mb-3">Shortlisted candidates</div>
          <div className="space-y-2">
            {CANDIDATES.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                ${i === 0 ? 'bg-brand-50 border-brand-100' : 'bg-surface-secondary border-[#EEECEA]'}`}>
                <div className={`text-xs font-bold w-6 flex-shrink-0 ${i === 0 ? 'text-brand-600' : 'text-ink-tertiary'}`}>#{i+1}</div>
                <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink-primary">{c.name}</div>
                  <div className="text-[11px] text-ink-tertiary truncate">{c.role} · {c.company}</div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[160px]">
                  {c.skills.slice(0, 2).map(s => (
                    <span key={s} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-success-bg text-success-text">{s}</span>
                  ))}
                </div>
                <div className="text-sm font-bold flex-shrink-0" style={{ color: c.score >= 85 ? '#534AB7' : '#1D9E75' }}>{c.score}/100</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Recommendation */}
      <Card className="p-5 bg-success-bg border-success-border">
        <div className="text-sm font-bold text-success-text mb-2">✅ Recommendation</div>
        <div className="text-[13px] text-success-text leading-relaxed">
          Proceed to interviews with top 3 candidates. <strong>Aryan Sharma (92)</strong> and <strong>Sneha Verma (88)</strong> are strong fits across all criteria. <strong>Priya Kapoor (85)</strong> is a high-growth pick worth pursuing. Address 2 bias flags before the next round.
        </div>
      </Card>

      {/* Next steps */}
      <Card className="p-5">
        <div className="text-sm font-bold text-ink-primary mb-3">Suggested next steps</div>
        <div className="space-y-2.5">
          {[
            { step: 'Send approved outreach emails', status: Object.keys(state.sentEmails).length > 0 ? 'done' : 'pending', action: () => dispatch({ type: 'SET_NAV', payload: 'outreach' }) },
            { step: 'Review bias flags and update JD', status: 'pending', action: () => dispatch({ type: 'SET_NAV', payload: 'bias' }) },
            { step: 'Prepare interview question sheets', status: 'pending', action: () => dispatch({ type: 'SET_NAV', payload: 'interviews' }) },
          ].map(({ step, status, action }) => (
            <div key={step} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg border border-[#EEECEA]">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0
                ${status === 'done' ? 'bg-success-strong text-white' : 'bg-surface-tertiary text-ink-tertiary'}`}>
                {status === 'done' ? '✓' : '○'}
              </div>
              <div className="flex-1 text-[13px] font-medium text-ink-primary">{step}</div>
              <button onClick={action} className="text-[11px] text-brand-600 font-semibold bg-transparent border-none cursor-pointer hover:underline">Go →</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
