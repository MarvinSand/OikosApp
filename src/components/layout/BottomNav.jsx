import { useLocation, useNavigate } from 'react-router-dom'
import { Map, BookOpen, BookMarked, Users, User } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'

const tabs = [
  { path: '/',               icon: Map,        label: 'Map'          },
  { path: '/prayer',         icon: BookOpen,   label: 'Beten'        },
  { path: '/discipleship',   icon: BookMarked, label: 'Jüngerschaft' },
  { path: '/friends',        icon: Users,      label: 'Geschwister'  },
  { path: '/profile',        icon: User,       label: 'Profil'       },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasUnread } = useConversations()

  return (
    <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-panel rounded-t-3xl rounded-b-none flex justify-around items-center px-3 pt-3.5 z-40 shadow-2xl border-white/60 bg-white/85" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}>
      {tabs.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
        const isGeschwisterTab = path === '/friends'

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`tour-nav-${path.replace('/', '') || 'map'} flex flex-col items-center gap-1.5 p-2 flex-1 relative transition-all duration-300 rounded-xl ${
              isActive ? 'text-warm-1 bg-warm-1/10 shadow-sm' : 'text-dark-muted hover:text-warm-2 hover:bg-black/5'
            }`}
          >
            <div className="relative">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-transform duration-200 ${isActive ? '-translate-y-1' : ''}`}
              />

              {/* Unread dot indicator for messages */}
              {isGeschwisterTab && hasUnread && (
                <div className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white ring-2 ring-white/50" />
              )}
            </div>
            
            <span className={`text-[10px] sm:text-[11px] font-medium leading-none transition-all duration-200 ${
              isActive ? 'opacity-100 font-semibold text-warm-1' : 'opacity-80'
            }`}>
              {label}
            </span>
            
            {/* Active Bottom Indicator */}
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-warm-1 shadow-sm" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
