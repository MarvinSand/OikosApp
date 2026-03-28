import { useLocation, useNavigate } from 'react-router-dom'
import { Map, BookOpen, Users, User, MessageCircle, Bell } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'
import { useNotifications } from '../../hooks/useNotifications'

const tabs = [
  { path: '/',               icon: Map,           label: 'Map'         },
  { path: '/prayer',         icon: BookOpen,      label: 'Beten'       },
  { path: '/chat',           icon: MessageCircle, label: 'Chat'        },
  { path: '/friends',        icon: Users,         label: 'Geschwister' },
  { path: '/notifications',  icon: Bell,          label: 'Aktivität'   },
  { path: '/profile',        icon: User,          label: 'Profil'      },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasUnread } = useConversations()
  const { unreadCount } = useNotifications()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      backgroundColor: 'var(--color-white)',
      borderTop: '1px solid var(--color-warm-3)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      zIndex: 100,
    }}>
      {tabs.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
        const isChatTab = path === '/chat'
        const isBellTab = path === '/notifications'
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 6px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: isActive ? 'var(--color-warm-1)' : 'var(--color-text-light)',
              transition: 'color 0.15s ease',
              position: 'relative',
              flex: 1,
            }}
          >
            <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
            {isChatTab && hasUnread && (
              <div style={{
                position: 'absolute', top: 4, right: 'calc(50% - 14px)',
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor: '#EF4444', border: '1.5px solid var(--color-white)',
              }} />
            )}
            {isBellTab && unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 4, right: 'calc(50% - 14px)',
                minWidth: 16, height: 16, borderRadius: 8,
                backgroundColor: '#C0392B', border: '1.5px solid var(--color-white)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Lora, serif', fontSize: 9, fontWeight: 700, color: 'white',
                padding: '0 3px',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            <span style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
