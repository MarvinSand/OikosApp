import { useLocation, useNavigate } from 'react-router-dom'
import { Map, BookOpen, Users, User, MessageCircle } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'

const tabs = [
  { path: '/',        icon: Map,           label: 'Map'         },
  { path: '/prayer',  icon: BookOpen,      label: 'Beten'       },
  { path: '/chat',    icon: MessageCircle, label: 'Chat'        },
  { path: '/friends', icon: Users,         label: 'Geschwister' },
  { path: '/profile', icon: User,          label: 'Profil'      },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasUnread } = useConversations()

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
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: isActive ? 'var(--color-warm-1)' : 'var(--color-text-light)',
              transition: 'color 0.15s ease',
              position: 'relative',
            }}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            {/* Unread dot for Chat tab */}
            {isChatTab && hasUnread && (
              <div style={{
                position: 'absolute',
                top: 4,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                border: '1.5px solid var(--color-white)',
              }} />
            )}
            <span style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: 11,
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
