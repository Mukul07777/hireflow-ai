import { useState } from 'react'
import { useStore } from '../../lib/store'
import { EmptyState, Button, Avatar, ScoreRing, Card } from '../../components/ui/index'
import { ApprovalModal } from '../../components/outreach/ApprovalModal'
import { CANDIDATES } from '../../lib/constants'

export default function Outreach() {
  const { state, dispatch } = useStore()
  const [modalCandidate, setModalCandidate] = useState(null)

  if (state.pipelineState !== 'done') return (
    <EmptyState icon="✉️" title="No outreach drafts yet"
      description="Run the pipeline to generate personalized emails for each candidate"
      action={<Button variant="primary" onClick={() => dispatch({ type: 'SET_NAV', payload: 'pipeline' })}>Run pipeline →</Button>} />
  )

  const sentCount = Object.keys(state.sentEmails).length

  return (
    <div className="animate-fade-in space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-tertiary">{CANDIDATES.length} emails drafted · {sentCount} sent · {CANDIDATES.length - sentCount} pending approval</div>
        <div className="px-3 py-1.5 bg-warn-bg border border-warn-border rounded-lg text-xs font-semibold text-warn-text">
          ⚠ All emails require human approval before sending
        </div>
      </div>

      {CANDIDATES.map(c => {
        const sent = state.sentEmails[c.id]
        return (
          <Card key={c.id} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Avatar initials={c.avatar} bg={c.avatarBg} textColor={c.avatarText} size={38} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink-primary">{c.name}</div>
                <div className="text-xs text-ink-tertiary">{c.email} · {c.role} at {c.company}</div>
              </div>
              <ScoreRing score={c.score} size={36} stroke={3} />
              {sent ? (
                <div className="px-3 py-1.5 bg-success-bg border border-success-border rounded-lg text-xs font-bold text-success-text">✓ Sent</div>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setModalCandidate(c)}>Review & send</Button>
              )}
            </div>
            <div className="bg-surface-secondary border border-[#EEECEA] rounded-lg p-3.5 text-[12px] leading-relaxed text-ink-secondary whitespace-pre-wrap"
              style={{ maxHeight: 80, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
              {state.emailDrafts[c.id] || 'Generating personalized email…'}
            </div>
          </Card>
        )
      })}

      {modalCandidate && <ApprovalModal candidate={modalCandidate} onClose={() => setModalCandidate(null)} />}
    </div>
  )
}
