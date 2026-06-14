import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, Globe, BookMarked, User } from 'lucide-react'

const tabs = [
  { path: '/',             icon: Home,       label: 'Home'         },
  { path: '/prayer',       icon: BookOpen,   label: 'Gebet'        },
  { path: '/worldmap',     icon: Globe,      label: 'Weltkarte',   featured: true },
  { path: '/discipleship', icon: BookMarked, label: 'Jüngerschaft' },
  { path: '/profile',      icon: User,       label: 'Profil'       },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-stretch px-1 z-40"
      style={{
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 8,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {tabs.map(({ path, icon: Icon, label, featured }) => {
        const isActive = path === '/'
          ? location.pathname === '/'
          : location.pathname === path || location.pathname.startsWith(path + '/')

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`tour-nav-${path === '/' ? 'map' : path.replace('/', '')} flex flex-col items-center justify-center gap-1 flex-1 py-1.5`}
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
