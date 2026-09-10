import { Outlet, useLocation } from 'react-router-dom'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

// Gemeinsames Layout für die 5 Jüngerschafts-Hauptbereiche (Weg/Werkzeuge/
// Bibliothek/Bekenntnis/Challenges), als verschachtelte Route in App.jsx.
// Die Segment-Leiste wird hier EINMAL gemountet und bleibt beim Wechsel
// zwischen den Kind-Routen bestehen - React Router tauscht nur den Inhalt
// im <Outlet/> aus, die Leiste selbst unmountet nicht. Vorher rendersierte
// jede der 5 Seiten ihre eigene <DiscipleshipTabs>-Instanz, wodurch die
// Leiste bei jeder Navigation neu gemountet wurde; als "sticky" führte das
// auf iOS Safari zu Compositing-Geisterflächen (siehe CLAUDE.md). Mit
// diesem Layout ist sticky jetzt sicher.
export default function DiscipleshipLayout() {
  const location = useLocation()
  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active={location.pathname} />
      <Outlet />
    </div>
  )
}
