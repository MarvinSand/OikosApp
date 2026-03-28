import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'

// ─── Helpers ──────────────────────────────────────────────────

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} Std.`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ICONS = {
  friend_request: '👤',
  friend_accepted: '🤝',
  community_invite: '👥',
  community_event: '📅',
  prayer_shared: '🙏',
  prayer_log: '🙏',
  oikos_entry: '🗺',
}

// ─── NotificationItem ─────────────────────────────────────────

function NotificationItem({ n, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-warm-3)',
        backgroundColor: n.is_read ? 'transparent' : 'rgba(175,138,100,0.08)',
        cursor: n.related_url ? 'pointer' : 'default',
        transition: 'background-color 0.15s',
      }}
    >
      {/* Icon bubble */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        backgroundColor: 'var(--color-warm-4)',
        border: '1.5px solid var(--color-warm-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {ICONS[n.type] || '🔔'}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 14,
          fontWeight: n.is_read ? 500 : 700,
          color: 'var(--color-text)',
          margin: '0 0 3px',
          lineHeight: 1.4,
        }}>
          {n.title}
        </p>
        {n.body && (
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            margin: '0 0 5px',
            lineHeight: 1.5,
          }}>
            {n.body}
          </p>
        )}
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 11,
          color: 'var(--color-text-light)',
          margin: 0,
        }}>
          {formatTime(n.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <div style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: 'var(--color-warm-1)',
          flexShrink: 0,
          marginTop: 8,
        }} />
      )}
    </div>
  )
}

// ─── LoadingSkeleton ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ padding: '8px 0' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-warm-3)',
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: 'var(--color-warm-4)',
            flexShrink: 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              height: 14,
              width: '65%',
              borderRadius: 6,
              backgroundColor: 'var(--color-warm-4)',
              marginBottom: 8,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
              height: 12,
              width: '85%',
              borderRadius: 6,
              backgroundColor: 'var(--color-warm-4)',
              marginBottom: 6,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
              height: 10,
              width: '30%',
              borderRadius: 6,
              backgroundColor: 'var(--color-warm-4)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── NotificationsPage ────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, loading, markAllRead } = useNotifications()

  // Mark all as read when the page mounts
  useEffect(() => {
    markAllRead()
  }, [])

  function handleNotificationClick(n) {
    if (n.related_url) {
      navigate(n.related_url)
    }
  }

  // Group notifications by type label
  const typeLabel = {
    friend_request: 'Freundschaftsanfragen',
    friend_accepted: 'Verbindungen',
    community_invite: 'Gemeinschaft',
    community_event: 'Veranstaltungen',
    prayer_shared: 'Gebete',
    prayer_log: 'Gebetsprotokolle',
    oikos_entry: 'Oikos-Karte',
  }

  // Build ordered groups: preserve insertion order of first occurrence
  const groupOrder = []
  const groups = {}
  for (const n of notifications) {
    const key = n.type || 'other'
    if (!groups[key]) {
      groups[key] = []
      groupOrder.push(key)
    }
    groups[key].push(n)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 100 }}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtn}>
          <ArrowLeft size={20} />
        </button>
        <span style={headerTitle}>Benachrichtigungen</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: 40, margin: '0 0 14px' }}>🔔</p>
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 15,
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            margin: 0,
          }}>
            Noch keine Benachrichtigungen.
          </p>
        </div>
      )}

      {/* Grouped notifications */}
      {!loading && groupOrder.map(key => (
        <div key={key} style={{ marginBottom: 4 }}>
          {/* Group header */}
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            margin: 0,
            padding: '14px 16px 6px',
          }}>
            {typeLabel[key] || 'Sonstiges'}
          </p>

          {/* Items */}
          <div style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-warm-3)', borderBottom: '1px solid var(--color-warm-3)' }}>
            {groups[key].map(n => (
              <NotificationItem
                key={n.id}
                n={n}
                onClick={() => handleNotificationClick(n)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const headerStyle = {
  backgroundColor: 'var(--color-white)',
  borderBottom: '1px solid var(--color-warm-3)',
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 5,
}

const backBtn = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: 4,
  color: 'var(--color-text)',
  display: 'flex',
  alignItems: 'center',
}

const headerTitle = {
  fontFamily: 'Lora, serif',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--color-text)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
  textAlign: 'center',
  margin: '0 8px',
}
