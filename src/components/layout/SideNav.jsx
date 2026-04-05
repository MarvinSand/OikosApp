import { useLocation, useNavigate } from 'react-router-dom'
import { Map, BookOpen, Users, Bell, User } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'
import { useNotifications } from '../../hooks/useNotifications'

const tabs = [
  { path: '/',              icon: Map,      label: 'Map'         },
  { path: '/prayer',        icon: BookOpen, label: 'Beten'       },
  { path: '/friends',       icon: Users,    label: 'Geschwister' },
  { path: '/notifications', icon: Bell,     label: 'Aktivität'   },
  { path: '/profile',       icon: User,     label: 'Profil'      },
]

export default function SideNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasUnread } = useConversations()
  const { unreadCount } = useNotifications()

  return (
    <aside className="hidden md:flex flex-col w-[220px] h-full flex-shrink-0 bg-white/85 backdrop-blur-md border-r border-white/60 shadow-glass-sm z-40">
      {/* Brand */}
      <div className="px-6 pt-6 pb-5 border-b border-warm-3/40">
        <h1 className="font-serif text-2xl font-bold text-warm-1 leading-none mb-1">OIKOS</h1>
        <p className="text-[11px] text-dark-light font-sans tracking-wide">Dein Umfeld. Dein Gebet.</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive =
            path === '/'
              ? location.pathname === '/'
              : location.pathname === path || location.pathname.startsWith(path + '/')
          const isGeschwisterTab = path === '/friends'
          const isBellTab = path === '/notifications'

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-200 relative group ${
                isActive
                  ? 'bg-warm-1/10 text-warm-1'
                  : 'text-dark-muted hover:bg-black/5 hover:text-dark'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-warm-1" />
              )}

              <div className="relative flex-shrink-0">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />

                {isGeschwisterTab && hasUnread && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
                )}

                {isBellTab && unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-red-600 border border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>

              <span className={`text-[13.5px] font-sans transition-all duration-200 ${
                isActive ? 'font-semibold text-warm-1' : 'font-medium'
              }`}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-warm-3/40">
        <p className="text-[10px] text-dark-light/50 font-sans">© 2025 Oikos App</p>
      </div>
    </aside>
  )
}
