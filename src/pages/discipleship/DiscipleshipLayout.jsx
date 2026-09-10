import { Outlet, useLocation } from 'react-router-dom'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

// Gemeinsames Layout für die 5 Jüngerschafts-Hauptbereiche (Weg/Werkzeuge/
// Bibliothek/Bekenntnis/Challenges), als verschachtelte Route in App.jsx.
//
// Aufbau bewusst als eigene Scroll-Fläche (statt sticky/fixed):
//   Root = 100dvh, flex-column, kein Scrollen
//   ├─ Segment-Leiste  -> steht außerhalb des Scroll-Bereichs, kann sich
//   │                     dadurch NIE verschieben oder wegscrollen
//   └─ <Outlet/>        -> in einem eigenen overflow-y-auto-Container
//
// Warum nicht sticky: Der Weg scrollt beim Öffnen automatisch zur aktiven
// Station (die ganz unten im Pfad liegt), und sticky/fixed-Leisten haben in
// dieser App auf iOS Safari schon Compositing-Geisterflächen verursacht
// (siehe CLAUDE.md). Als Flex-Kind außerhalb des Scroll-Containers ist die
// Leiste strukturell fixiert, ohne beides zu riskieren.
//
// Damit das funktioniert, sind diese Routen in App.jsx als
// isFullScreenRoute markiert (sonst würde der äußere Container zusätzlich
// scrollen und .mobile-nav-padding eine doppelte Lücke erzeugen).
// paddingBottom hält den Platz für die Bottom-Nav frei (--bottom-nav-h
// wird von BottomNav.jsx per ResizeObserver gesetzt).
export default function DiscipleshipLayout() {
  const location = useLocation()

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        paddingBottom: 'var(--bottom-nav-h, 64px)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <DiscipleshipTabs active={location.pathname} />

      {/* data-discipleship-scroll: WegView scrollt beim Öffnen gezielt
          DIESEN Container zur aktiven Station (siehe dort) - bewusst nicht
          über scrollIntoView, das würde auch übergeordnete Container
          mitscrollen und die Leiste aus dem Bild schieben. */}
      <div data-discipleship-scroll className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        <Outlet />
      </div>
    </div>
  )
}
