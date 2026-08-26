import { Flag } from 'lucide-react'

// Optionaler Seitenknoten an einer Station, blockiert den Hauptpfad nicht.
// state: 'locked' (Station noch nicht abgeschlossen) | 'open' (nachholbar,
// Station fertig aber Challenge nicht) | 'completed'
export default function ChallengeSideNode({ challenge, state, x, y, onOpen }) {
  const isOpen = state === 'open'
  const isCompleted = state === 'completed'

  return (
    <div
      style={{ position: 'absolute', left: `${x}%`, top: y, transform: 'translate(-50%, -50%)', width: 84, textAlign: 'center' }}
    >
      <button
        onClick={() => onOpen(challenge)}
        style={{
          width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: isCompleted ? 'var(--color-accent)' : isOpen ? 'var(--color-bg)' : 'var(--color-bg-secondary)',
          color: isCompleted ? '#fff' : isOpen ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          border: isOpen ? '1.5px dashed var(--color-accent)' : 'none',
          margin: '0 auto', cursor: 'pointer',
        }}
      >
        <Flag size={15} />
      </button>
      {isOpen && (
        <span
          className="inline-block mt-1"
          style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--color-accent)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 8, padding: '1px 6px' }}
        >
          OFFEN
        </span>
      )}
      <p className="mt-1" style={{ fontSize: 10, lineHeight: 1.2, color: 'var(--color-text-tertiary)' }}>
        {challenge.title}
      </p>
    </div>
  )
}
