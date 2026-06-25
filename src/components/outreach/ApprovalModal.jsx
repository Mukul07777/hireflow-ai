import { useState } from 'react'
import { Button, Avatar, ScoreRing } from '../ui/index'
import { useStore, useToast } from '../../lib/store'

export function ApprovalModal({ candidate, onClose }) {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(state.emailDrafts[candidate.id] || '')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1200)) // simulate send
    dispatch({ type: 'SET_EMAIL_SENT', id: candidate.id })
    dispatch({ type: 'SET_EMAIL_DRAFT', id: candidate.id, text: draft })
    toast(`Email sent to ${candidate.name}`, 'success')
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(28,28,26,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EEECEA]">
          <Avatar initials={candidate.avatar} bg={candidate.avatarBg} textColor={candidate.avatarText} size={40} />
          <div className="flex-1">
            <div className="text-sm font-bold text-ink-primary">Outreach to {candidate.name}</div>
            <div className="text-[11px] text-ink-tertiary">{candidate.email}</div>
          </div>
          <ScoreRing score={candidate.score} size={36} stroke={3} />
          <button onClick={onClose} className="ml-2 text-xl text-ink-tertiary bg-transparent border-none cursor-pointer hover:text-ink-primary">×</button>
        </div>

        {/* Warning banner */}
        <div className="mx-6 mt-4 px-3.5 py-2.5 bg-warn-bg border border-warn-border rounded-lg flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <span className="text-xs font-semibold text-warn-text">Human-in-the-loop — review before sending</span>
        </div>

        {/* Email editor */}
        <div className="px-6 py-4">
          <div className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2">Email draft</div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)}
            className="w-full border border-[#EEECEA] rounded-lg p-3.5 text-[13px] leading-relaxed text-ink-primary bg-surface-secondary resize-none font-sans"
            style={{ height: 200 }} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="success" fullWidth onClick={handleSend} disabled={sending}>
            {sending ? '⏳ Sending…' : '✓ Approve & send email'}
          </Button>
        </div>
      </div>
    </div>
  )
}
