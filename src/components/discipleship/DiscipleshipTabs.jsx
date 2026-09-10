import { useNavigate } from 'react-router-dom'

const SEGMENTS = [
  { path: '/juengerschaft',              label: 'Bible Study' },
  { path: '/juengerschaft/werkzeuge',    label: 'Werkzeuge' },
  { path: '/juengerschaft/bibliothek',   label: 'Bibliothek' },
  { path: '/juengerschaft/bekenntnis',   label: 'Bekenntnis' },
  { path: '/juengerschaft/challenges',   label: 'Challenges' },
]

// Segment-Navigation der 5 Jüngerschafts-Hauptbereiche. Wird NUR von
// DiscipleshipLayout.jsx gerendert, dort als Flex-Kind OBERHALB des
// scrollenden Inhalts - deshalb braucht sie kein sticky/fixed: sie liegt
// außerhalb des Scroll-Containers und kann sich dadurch nicht verschieben.
// (Sticky/fixed hatte hier zweimal Probleme gemacht: erst
// Compositing-Geisterflächen auf iOS Safari, dann war die Leiste durch das
// Auto-Scrollen des Wegs zur aktiven Station aus dem Bild - siehe CLAUDE.md.)
export default function DiscipleshipTabs({ active }) {
  const navigate = useNavigate()

  return (
    <div
      className="flex gap-1 px-3 py-2 overflow-x-auto hide-scrollbar flex-shrink-0"
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
