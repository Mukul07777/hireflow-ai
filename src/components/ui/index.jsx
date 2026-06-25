import { useEffect, useState } from 'react'

// ── Button ──────────────────────────────────────────────────────────
export function Button({ children, variant = 'secondary', size = 'md', onClick, disabled, className = '', icon, fullWidth }) {
  const base = `inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer border font-sans ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-sm px-5 py-3' }
  const variants = {
    primary:   'bg-brand-600 text-white border-brand-600 hover:bg-brand-800 hover:border-brand-800',
    secondary: 'bg-white text-ink-secondary border-[#EEECEA] hover:bg-surface-secondary',
    ghost:     'bg-transparent text-ink-secondary border-transparent hover:bg-surface-secondary',
    danger:    'bg-danger-bg text-danger-text border-danger-border hover:bg-[#F5C4B3]',
    success:   'bg-success-bg text-success-text border-success-border',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {icon && <span className="text-base">{icon}</span>}
      {children}
    </button>
  )
}

// ── Badge ──────────────────────────────────────────────────────────
export function Badge({ children, color = 'brand' }) {
  const styles = {
    brand:   'bg-brand-50 text-brand-800',
    success: 'bg-success-bg text-success-text',
    warn:    'bg-warn-bg text-warn-text',
    danger:  'bg-danger-bg text-danger-text',
    neutral: 'bg-surface-tertiary text-ink-secondary',
  }
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[color]}`}>{children}</span>
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick, hover }) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#EEECEA] shadow-card ${hover ? 'cursor-pointer transition-all duration-200 hover:border-brand-200 hover:shadow-elevated' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ── Score Ring ──────────────────────────────────────────────────────
export function ScoreRing({ score, size = 48, stroke = 4 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 85 ? '#534AB7' : score >= 70 ? '#1D9E75' : '#D85A30'
  const textSize = size > 44 ? 14 : size > 32 ? 11 : 9
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EEECe6" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-ink-primary" style={{ fontSize: textSize }}>{score}</div>
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 16, color = '#534AB7' }) {
  return (
    <div style={{ width: size, height: size, border: `2px solid ${color}22`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
  )
}

// ── Avatar ──────────────────────────────────────────────────────
export function Avatar({ initials, bg, textColor, size = 36 }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-center rounded-full font-bold" style={{ width: size, height: size, background: bg, color: textColor, fontSize: size > 40 ? 15 : 12 }}>
      {initials}
    </div>
  )
}

// ── Streaming Text ──────────────────────────────────────────────────
export function StreamingText({ text, speed = 10 }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) setDisplayed(text.slice(0, ++i))
      else clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text])
  return <span className="whitespace-pre-wrap">{displayed}{displayed.length < text.length && <span className="cursor-blink">|</span>}</span>
}

// ── Empty State ──────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <Card className="p-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm font-semibold text-ink-primary mb-1">{title}</div>
      <div className="text-sm text-ink-tertiary mb-4">{description}</div>
      {action}
    </Card>
  )
}

// ── Metric Card ──────────────────────────────────────────────────
export function MetricCard({ label, value, delta, deltaType = 'neutral' }) {
  const deltaColors = { good: 'text-success-text', warn: 'text-warn-text', danger: 'text-danger-text', neutral: 'text-ink-tertiary' }
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary mb-1.5">{label}</div>
      <div className="text-2xl font-bold text-ink-primary">{value}</div>
      {delta && <div className={`text-[11px] font-medium mt-1 ${deltaColors[deltaType]}`}>{delta}</div>}
    </Card>
  )
}

// ── Toast ──────────────────────────────────────────────────────
export function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  const styles = {
    success: { bg: '#E1F5EE', border: '#9FE1CB', text: '#085041', icon: '✅' },
    error:   { bg: '#FAECE7', border: '#F5C4B3', text: '#712B13', icon: '❌' },
    info:    { bg: '#EEEDFE', border: '#CECBF6', text: '#3C3489', icon: 'ℹ️' },
  }
  const s = styles[type] || styles.info
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-elevated animate-slide-up"
      style={{ background: s.bg, borderColor: s.border, minWidth: 260 }}>
      <span>{s.icon}</span>
      <span className="text-[13px] font-semibold flex-1" style={{ color: s.text }}>{msg}</span>
      <button onClick={onClose} className="text-lg font-light cursor-pointer bg-transparent border-none" style={{ color: s.text }}>×</button>
    </div>
  )
}
