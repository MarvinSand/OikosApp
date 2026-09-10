import { useNavigate } from 'react-router-dom'

const SEGMENTS = [
  { path: '/juengerschaft',              label: 'Bible Study' },
  { path: '/juengerschaft/werkzeuge',    label: 'Werkzeuge' },
  { path: '/juengerschaft/bibliothek',   label: 'Bibliothek' },
  { path: '/juengerschaft/bekenntnis',   label: 'Bekenntnis' },
  { path: '/juengerschaft/challenges',   label: 'Challenges' },
]

// Segment-Navigation oben auf jedem der 5 Jüngerschafts-Hauptbereiche.
// Wird NUR von DiscipleshipLayout.jsx gerendert (verschachtelte Route in
// App.jsx) - dadurch mountet diese Komponente nur einmal beim Betreten des
// Jüngerschaftsbereichs und bleibt bestehen, während zwischen den 5
// Unterseiten gewechselt wird (React Router tauscht nur den <Outlet/>-
// Inhalt aus). Deshalb ist sticky hier sicher: der frühere iOS-Safari-
// Geisterflächen-Bug (siehe CLAUDE.md) trat auf, weil jede der 5 Seiten
// früher ihre eigene Instanz gerendert hat und die Leiste dadurch bei
// jeder Navigation neu gemountet/unmountet wurde.
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
