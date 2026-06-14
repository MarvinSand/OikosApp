import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, Globe, BookMarked, User } from 'lucide-react'

const tabs = [
  { path: '/',             icon: Home,       label: 'Home'         },
  { path: '/prayer',       icon: BookOpen,   label: 'Gebet'        },
  { path: '/worldmap',     icon: Globe,      label: 'Weltkarte'    },
  { path: '/discipleship', icon: BookMarked, label: 'Jüngerschaft' },
  { path: '/profile',      icon: User,       label: 'Profil'       },
]

export default function SideNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] h-full flex-shrink-0 z-40"
      style={{ backgroundColor: 'var(--color-bg)', borderRight: '1px solid var(--color-border)' }}
    >
      {/* Brand */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold leading-none mb-1" style={{ color: 'var(--color-text)' }}>OIKOS</h1>
        <p className="text-[11px] tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Dein Umfeld. Dein Gebet.</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive =
            path === '/'
              ? location.pathname === '/'
              : location.pathname === path || location.pathname.startsWith(path + '/')

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'var(--color-accent-light)' : 'transparent',
                background: isActive ? 'var(--color-accent-light)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>© 2025 Oikos App</p>
      </div>
    </aside>
  )
}
