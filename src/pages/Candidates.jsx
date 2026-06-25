import { useStore } from '../../lib/store'
import { EmptyState, Button } from '../../components/ui/index'
import { CandidateCard, CandidateDetail } from '../../components/candidates/CandidateCard'
import { CANDIDATES } from '../../lib/constants'

export default function Candidates() {
  const { state, dispatch } = useStore()
  const { selectedCandidate, pipelineState } = state

  if (pipelineState !== 'done') return (
    <EmptyState icon="👥" title="No candidates yet"
      description="Run the pipeline to get AI-ranked candidates with explanations"
      action={<Button variant="primary" onClick={() => dispatch({ type: 'SET_NAV', payload: 'pipeline' })}>Run pipeline →</Button>} />
  )

  return (
    <div className={`animate-fade-in grid gap-4 ${selectedCandidate ? 'grid-cols-[360px_1fr]' : 'grid-cols-1 max-w-xl'}`}>
      <div>
        <div className="text-xs font-semibold text-ink-tertiary mb-3">{CANDIDATES.length} candidates · sorted by match score</div>
        <div className="space-y-2.5">
          {CANDIDATES.map(c => (
            <CandidateCard key={c.id} candidate={c}
              selected={selectedCandidate?.id === c.id}
              onClick={() => dispatch({ type: 'SET_CANDIDATE', payload: c })} />
          ))}
        </div>
      </div>
      {selectedCandidate && <CandidateDetail candidate={selectedCandidate} />}
    </div>
  )
}
