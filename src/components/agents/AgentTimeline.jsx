import { useStore } from '../../lib/store'
import { AGENTS } from '../../lib/constants'

function AgentStep({ agent, status, log }) {
  const bg = status === 'done' ? '#E1F5EE' : status === 'active' ? '#EEEDFE' : '#FAFAF8'
  const border = status === 'done' ? '#9FE1CB' : status === 'active' ? '#CECBF6' : '#EEECEA'
  const iconBg = status === 'done' ? '#1D9E75' : status === 'active' ? '#534AB7' : '#E8E6DF'
  const nameColor = status === 'done' ? '#085041' : status === 'active' ? '#3C3489' : '#888780'
  const statusText = status === 'done' ? 'Done' : status === 'active' ? 'Running…' : 'Queued'
  const statusColor = status === 'done' ? '#0F6E56' : status === 'active' ? '#534AB7' : '#B4B2A9'

  return (
    <div className="flex items-start gap-3 rounded-xl p-3 transition-all duration-300"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
        style={{ background: iconBg, color: 'white', transition: 'background 0.3s' }}>
        {status === 'done' ? '✓' : status === 'active' ? <PulseDot /> : agent.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: nameColor }}>{agent.name}</div>
        <div className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">
          {log || agent.desc}
        </div>
      </div>
      <div className="text-[11px] font-semibold flex-shrink-0 mt-0.5" style={{ color: statusColor }}>
        {statusText}
      </div>
    </div>
  )
}

function PulseDot() {
  return (
    <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ animation: 'pulse 1.2s ease-in-out infinite' }} />
  )
}

export function AgentTimeline({ compact = false }) {
  const { state } = useStore()
  const { agentStatuses, agentLogs, pipelineState } = state

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-ink-primary">Agent execution timeline</div>
            <div className="text-xs text-ink-tertiary mt-0.5">
              {pipelineState === 'idle' ? 'No pipeline run yet' :
               pipelineState === 'running' ? 'Pipeline in progress…' : 'Last run complete'}
            </div>
          </div>
          {pipelineState === 'running' && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-600">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-600" style={{ animation: 'pulse 1s infinite' }} />
              Live
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {AGENTS.map(agent => (
          <AgentStep key={agent.id} agent={agent}
            status={agentStatuses[agent.id] || 'idle'}
            log={agentLogs[agent.id]} />
        ))}
      </div>
    </div>
  )
}
