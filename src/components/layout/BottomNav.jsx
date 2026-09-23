import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, Globe, Book, User } from 'lucide-react'

// Feste statt gemessene Höhe: eine per ResizeObserver gemessene Höhe kann
// minimal vom Wert abweichen, den andere Stellen (z.B. der Weltkarte-Drawer)
// über die CSS-Variable --bottom-nav-h annehmen - je nach Timing gewinnt mal
// der eine, mal der andere Wert, und schon 1-2px Differenz reichen, damit
// sich Nav und Drawer sichtbar überlappen. Beide benutzen deshalb exakt
// dieselbe fest verdrahtete Formel (in index.css für --bottom-nav-h
// gespiegelt) statt einer zur Laufzeit gemessenen.
const NAV_HEIGHT = 'calc(72px + env(safe-area-inset-bottom, 0px))'

const tabs = [
  { path: '/',                   icon: Home,       label: 'Home',         match: ['/']                          },
  { path: '/prayers',            icon: BookOpen,   label: 'For You',      match: ['/friends', '/prayer', '/prayers'] },
  { path: '/worldmap',           icon: Globe,      label: 'Weltkarte',    match: ['/worldmap'], featured: true  },
  { path: '/bible',              icon: Book,       label: 'Bibel',        match: ['/bible']                     },
  { path: '/profile',            icon: User,       label: 'Profil',       match: ['/profile']                   },
]

function isPathActive(currentPath, match) {
  return match.some(m =>
    m === '/'
      ? currentPath === '/'
      : currentPath === m || currentPath.startsWith(m + '/')
  )
}

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-stretch px-1 z-40"
      style={{
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        minHeight: NAV_HEIGHT,
        paddingTop: 8,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {tabs.map(({ path, icon: Icon, label, featured, match }) => {
        const isActive = isPathActive(location.pathname, match)

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5"
            style={{
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon
              size={featured ? 26 : 22}
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
