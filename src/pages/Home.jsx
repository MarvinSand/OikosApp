import { useNavigate } from 'react-router-dom'
import { MessageCircle, Bell } from 'lucide-react'
import { useConversations } from '../hooks/useConversations'
import { useNotifications } from '../hooks/useNotifications'
import MapView from './MapView'

export default function Home() {
  const navigate = useNavigate()
  const { hasUnread } = useConversations()
  const { unreadCount } = useNotifications()

  return (
    <div className="h-full w-full flex flex-col bg-bg">
      {/* Sticky Header */}
      <header
        className="flex items-center justify-between px-4"
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
          }}
        >
          OIKOS
        </h1>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/friends?tab=chats')}
            aria-label="Chats"
            style={{
              position: 'relative',
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            <MessageCircle size={22} strokeWidth={2} />
            {hasUnread && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-error)',
                  border: '1.5px solid var(--color-bg)',
                }}
              />
            )}
          </button>

          <button
            onClick={() => navigate('/notifications')}
            aria-label="Benachrichtigungen"
            style={{
              position: 'relative',
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            <Bell size={22} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  padding: '0 4px',
                  backgroundColor: 'var(--color-error)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--color-bg)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* OIKOS Map (existing component) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MapView hideWorldMapToggle />
      </div>
    </div>
  )
}
