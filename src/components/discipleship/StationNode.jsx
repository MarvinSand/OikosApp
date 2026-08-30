import { Check, Lock } from 'lucide-react'

const STATE_STYLES = {
  completed: { bg: 'var(--color-accent)', color: '#fff', border: 'none' },
  active: { bg: 'var(--color-white, #fff)', color: 'var(--color-accent)', border: '2.5px solid var(--color-accent)' },
  locked: { bg: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)', border: 'none' },
}

export default function StationNode({ station, state, x, y, onOpen, nodeRef }) {
  const style = STATE_STYLES[state]

  return (
    <div
      ref={nodeRef}
      style={{ position: 'absolute', left: `${x}%`, top: y, transform: 'translate(-50%, -50%)', width: 96, textAlign: 'center' }}
    >
      <button
        onClick={() => onOpen(station)}
        style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 18,
          backgroundColor: style.bg, color: style.color, border: style.border,
          boxShadow: state === 'active' ? '0 0 0 5px rgba(0,0,0,0.03)' : 'none',
          cursor: 'pointer', margin: '0 auto',
        }}
      >
        {state === 'completed' ? <Check size={22} /> : state === 'locked' ? <Lock size={16} /> : station.order_index}
      </button>
      <p
        className="mt-1.5"
        style={{
          fontSize: 11.5, fontWeight: state === 'active' ? 700 : 500, lineHeight: 1.25,
          color: state === 'locked' ? 'var(--color-text-tertiary)' : 'var(--color-text)',
        }}
      >
        {station.title}
      </p>
    </div>
  )
}
