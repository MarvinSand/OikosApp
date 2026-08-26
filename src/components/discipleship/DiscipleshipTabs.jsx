import { useNavigate } from 'react-router-dom'

const SEGMENTS = [
  { path: '/juengerschaft',              label: 'Weg' },
  { path: '/juengerschaft/werkzeuge',    label: 'Werkzeuge' },
  { path: '/juengerschaft/bibliothek',   label: 'Bibliothek' },
  { path: '/juengerschaft/bekenntnis',   label: 'Bekenntnis' },
  { path: '/juengerschaft/challenges',   label: 'Challenges' },
]

// Segment-Navigation oben auf jedem der 5 Jüngerschafts-Hauptbereiche.
// Jede View rendert diese Leiste selbst (kein verschachteltes Routing
// nötig), analog dazu wie Prayers.jsx/FriendsView.jsx ihre Tab-Leisten
// heute schon selbst rendern.
export default function DiscipleshipTabs({ active }) {
  const navigate = useNavigate()

  return (
    <div
      className="flex gap-1 px-3 py-2 overflow-x-auto hide-scrollbar sticky top-0 z-20"
      style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}
    >
      {SEGMENTS.map(s => {
        const isActive = s.path === active
        return (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
