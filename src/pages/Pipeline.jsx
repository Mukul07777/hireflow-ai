import { useStore } from '../../lib/store'
import { usePipeline } from '../../hooks/usePipeline'
import { Button, Spinner, Card } from '../../components/ui/index'
import { AgentTimeline } from '../../components/agents/AgentTimeline'
import { SAMPLE_JD } from '../../lib/constants'

export default function Pipeline() {
  const { state, dispatch } = useStore()
  const { runPipeline, pipelineState } = usePipeline()
  const running = pipelineState === 'running'

  return (
    <div className="animate-fade-in max-w-3xl space-y-4">
      <Card className="p-6">
        <div className="text-sm font-bold text-ink-primary mb-1">Job description</div>
        <div className="text-xs text-ink-tertiary mb-4">Paste your JD or use the sample to test the pipeline</div>

        <textarea
          value={state.jdText}
          onChange={e => dispatch({ type: 'SET_JD', payload: e.target.value })}
          className="w-full border border-[#EEECEA] rounded-xl p-4 text-[13px] leading-relaxed text-ink-primary bg-surface-secondary font-sans resize-vertical"
          style={{ height: 300 }}
          placeholder="Paste your job description here…" />

        <div className="flex gap-2.5 mt-4">
          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'SET_JD', payload: SAMPLE_JD })}>Use sample JD</Button>
          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'SET_JD', payload: '' })}>Clear</Button>
          <div className="flex-1" />
          <Button variant="primary" size="md"
            disabled={running || !state.jdText.trim()}
            onClick={runPipeline}>
            {running ? (
              <><Spinner size={14} color="white" /> Running pipeline…</>
            ) : '▶ Run full pipeline'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <AgentTimeline />
      </Card>

      {pipelineState === 'done' && (
        <div className="bg-success-bg border border-success-border rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <span className="text-xl">✅</span>
          <div>
            <div className="text-sm font-bold text-success-text">Pipeline complete</div>
            <div className="text-xs text-success-text mt-0.5">5 candidates shortlisted · outreach drafted · report ready</div>
          </div>
          <Button variant="secondary" size="sm" className="ml-auto"
            onClick={() => dispatch({ type: 'SET_NAV', payload: 'candidates' })}>
            View candidates →
          </Button>
        </div>
      )}
    </div>
  )
}
