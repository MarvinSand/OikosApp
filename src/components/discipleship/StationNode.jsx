import { Check, Lock, Flag, BookOpen, NotebookPen, Droplet, Users } from 'lucide-react'

const TYPE_ICONS = {
  challenge: Flag,
  bible_plan: BookOpen,
  journal: NotebookPen,
  milestone: Droplet,
  mentor_match: Users,
}

const STATE_STYLES = {
  done: { bg: '#E8B33C', border: '#E8B33C', color: '#3A2B05' },
  current: { bg: '#FFFFFF', border: 'var(--color-accent-dark)', color: 'var(--color-accent-dark)' },
  available: { bg: 'var(--color-accent)', border: 'var(--color-accent)', color: '#FFFFFF' },
  locked: { bg: '#D8D8DC', border: '#D8D8DC', color: '#8E8E93' },
}

export default function StationNode({ station, onClick }) {
  const Icon = TYPE_ICONS[station.type] || Flag
  const state = STATE_STYLES[station.status] || STATE_STYLES.locked
  const tappable = station.status === 'available' || station.status === 'current'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
      <button
        onClick={tappable ? onClick : undefined}
        disabled={!tappable}
        aria-label={station.title}
        className={tappable ? 'press-scale' : ''}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: state.bg,
          border: `3px solid ${state.border}`,
          boxShadow: station.status === 'current'
            ? '0 0 0 5px rgba(10,132,255,0.16), 0 4px 10px rgba(0,0,0,0.12)'
            : '0 3px 8px rgba(0,0,0,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: tappable ? 'pointer' : 'default',
          color: state.color,
          flexShrink: 0,
        }}
      >
        {station.status === 'done' ? (
          <Check size={24} strokeWidth={3} />
        ) : station.status === 'locked' ? (
          <Lock size={20} />
        ) : (
          <Icon size={22} />
        )}
      </button>

      <div
        style={{
          padding: '4px 10px', borderRadius: 999, textAlign: 'center', maxWidth: 128,
          backgroundColor: 'rgba(255,255,255,0.82)', color: '#1C1C1E',
          fontSize: 11.5, fontWeight: 600, lineHeight: 1.25,
        }}
      >
        {station.title}
        {station.status === 'current' && (
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent-dark)', marginTop: 2 }}>
            du bist hier
          </div>
        )}
      </div>
    </div>
  )
}
