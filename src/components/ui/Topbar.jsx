import { useStore } from '../../lib/store'
import { Button } from './index'
import { usePipeline } from '../../hooks/usePipeline'

const PAGE_TITLES = {
  dashboard:  { title: 'Dashboard',       sub: 'Your hiring command center' },
  pipeline:   { title: 'Run pipeline',    sub: 'Paste a JD and let the agents work' },
  candidates: { title: 'Candidates',      sub: 'AI-ranked and explained' },
  outreach:   { title: 'Outreach',        sub: 'Personalized emails ready for approval' },
  interviews: { title: 'Interviews',      sub: 'Custom question sets per candidate' },
  bias:       { title: 'Bias audit',      sub: 'JD language and criteria analysis' },
  report:     { title: 'Hiring report',   sub: 'Full pipeline summary' },
}

export function Topbar() {
  const { state, dispatch } = useStore()
  const { runPipeline, pipelineState } = usePipeline()
  const { activeNav } = state
  const page = PAGE_TITLES[activeNav] || {}

  return (
    <header className="flex items-center justify-between bg-white border-b border-[#EEECEA] px-6 py-3.5 flex-shrink-0">
      <div>
        <div className="text-sm font-bold text-ink-primary">{page.title}</div>
        <div className="text-[11px] text-ink-tertiary mt-0.5">{page.sub}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'SET_NAV', payload: 'pipeline' })}>
          📤 Upload JD
        </Button>
        <Button variant="primary" size="sm"
          onClick={() => { dispatch({ type: 'SET_NAV', payload: 'pipeline' }); if (state.jdText) runPipeline() }}
          disabled={pipelineState === 'running'}>
          {pipelineState === 'running' ? '⏳ Running…' : '▶ Run pipeline'}
        </Button>
      </div>
    </header>
  )
}
