import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Bell, QrCode } from 'lucide-react'
import { useHasUnreadConversations } from '../../hooks/useHasUnreadConversations'
import { useNotifications } from '../../hooks/useNotifications'

const QrHubSheet = lazy(() => import('../common/QrHubSheet'))

// Obere Leiste der Haupt-Tabs: App-Name, Chats, Benachrichtigungen.
export default function AppHeader() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const hasUnread = useHasUnreadConversations()
  const { unreadCount } = useNotifications()

  const iconBtn = {
    position: 'relative', width: 36, height: 36, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--color-text)',
  }

  return (
    <header
      className="flex items-center justify-between px-4"
      style={{
        height: 52,
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 30,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
        Oikos Connect
      </h1>

      <div className="flex items-center gap-1">
        <button onClick={() => setScanning(true)} aria-label="QR-Code" style={iconBtn}>
          <QrCode size={22} strokeWidth={2} />
        </button>

        <button onClick={() => navigate('/chats')} aria-label="Chats" style={iconBtn}>
          <MessageCircle size={22} strokeWidth={2} />
          {hasUnread && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: 'var(--color-error)',
              border: '1.5px solid var(--color-bg)',
            }} />
          )}
        </button>

        <button onClick={() => navigate('/notifications')} aria-label="Benachrichtigungen" style={iconBtn}>
          <Bell size={22} strokeWidth={2} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
              backgroundColor: 'var(--color-error)', color: 'white',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--color-bg)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
      {scanning && (
        <Suspense fallback={null}>
          <QrHubSheet onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </header>
  )
}
