import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, Globe, BookMarked, User } from 'lucide-react'

const tabs = [
  { path: '/',                   icon: Home,       label: 'Home',         match: ['/']                          },
  { path: '/friends?tab=feed',   icon: BookOpen,   label: 'For You',      match: ['/friends', '/prayer', '/prayers'] },
  { path: '/worldmap',           icon: Globe,      label: 'Weltkarte',    match: ['/worldmap'], featured: true  },
  { path: '/discipleship',       icon: BookMarked, label: 'Jüngerschaft', match: ['/discipleship']              },
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
  const navRef = useRef(null)

  // Echte Nav-Höhe (inkl. Safe-Area) als CSS-Variable bereitstellen, damit
  // Seiten exakt den Bottom-Nav-Platz reservieren können (keine Lücke/Overlap).
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const setVar = () => document.documentElement.style.setProperty('--bottom-nav-h', el.offsetHeight + 'px')
    setVar()
    const ro = new ResizeObserver(setVar)
    ro.observe(el)
    window.addEventListener('resize', setVar)
    return () => { ro.disconnect(); window.removeEventListener('resize', setVar) }
  }, [])

  return (
    <nav
      ref={navRef}
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-stretch px-1 z-40"
      style={{
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 8,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {tabs.map(({ path, icon: Icon, label, featured, match }) => {
        const isActive = isPathActive(location.pathname, match)
        const tourKey = match[0] === '/' ? 'map' : match[0].replace('/', '')

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`tour-nav-${tourKey} flex flex-col items-center justify-center gap-1 flex-1 py-1.5`}
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
