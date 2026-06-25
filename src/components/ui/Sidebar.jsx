import { useStore } from '../../lib/store'
import { NAV_ITEMS } from '../../lib/constants'

export function Sidebar() {
  const { state, dispatch } = useStore()
  const { activeNav, sidebarOpen, pipelineState } = state

  return (
    <aside className="flex flex-col bg-white border-r border-[#EEECEA] flex-shrink-0 transition-all duration-250"
      style={{ width: sidebarOpen ? 228 : 60, overflow: 'hidden' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#EEECEA]">
        <div className="flex-shrink-0 w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-base">🧠</div>
        {sidebarOpen && (
          <div className="animate-fade-in">
            <div className="text-sm font-bold text-ink-primary leading-none">HireFlow AI</div>
            <div className="text-[10px] text-ink-tertiary mt-0.5">Hiring intelligence</div>
          </div>
        )}
        <button className="ml-auto text-ink-tertiary hover:text-ink-primary bg-transparent border-none cursor-pointer text-sm flex-shrink-0 px-1"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}>
          {sidebarOpen ? '←' : '→'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {sidebarOpen && <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary px-2 mb-2">Workspace</div>}
        {NAV_ITEMS.map(item => {
          const active = activeNav === item.id
          const showBadge = item.id === 'outreach' && pipelineState === 'done'
          return (
            <button key={item.id}
              title={!sidebarOpen ? item.label : ''}
              onClick={() => dispatch({ type: 'SET_NAV', payload: item.id })}
              className={`w-full flex items-center rounded-lg mb-0.5 cursor-pointer border-none font-sans transition-all duration-150
                ${sidebarOpen ? 'gap-2.5 px-2.5 py-2' : 'justify-center p-2.5'}
                ${active ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-ink-secondary hover:bg-surface-secondary font-medium'}`}
              style={{ fontSize: 13 }}>
              <span className="text-base flex-shrink-0">{ICONS[item.icon]}</span>
              {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
              {sidebarOpen && showBadge && (
                <span className="text-[10px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">5</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      {sidebarOpen && (
        <div className="px-4 py-3.5 border-t border-[#EEECEA]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-[11px] font-bold text-brand-800 flex-shrink-0">RK</div>
            <div>
              <div className="text-xs font-semibold text-ink-primary leading-none">Rahul Kumar</div>
              <div className="text-[10px] text-ink-tertiary mt-0.5">Hiring manager</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

const ICONS = {
  LayoutDashboard: '⊞',
  Play:            '▶',
  Users:           '👥',
  Mail:            '✉️',
  MessageSquare:   '💬',
  Scale:           '⚖️',
  FileText:        '📄',
}
