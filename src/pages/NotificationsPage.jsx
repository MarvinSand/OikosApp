import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Check, X, User, Settings } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { NOTIFICATION_TYPE_META } from '../lib/notificationTypeMeta'

// Derive the best navigation target for a notification
function resolveDestination(n, currentUserId) {
  // oikos_entry / prayer_shared / prayer_log carry map_id + person_id in `data`
  // so we can deep-link straight into the map and open that person's sheet
  const { map_id, person_id, map_owner_id, request_id, requester_id, post_id } = n.data || {}

  if (n.type === 'feed_post' && post_id) return `/feed/post/${post_id}`
  if (map_id && (n.type === 'oikos_entry' || n.type === 'prayer_shared' || n.type === 'prayer_log' || n.type === 'prayer_reminder')) {
    const base = map_owner_id && map_owner_id !== currentUserId
      ? `/user/${map_owner_id}/map/${map_id}`
      : `/map/${map_id}`
    return person_id ? `${base}?openPerson=${person_id}` : base
  }

  // Personal (non-oikos) prayer request shared with friends
  if (n.type === 'prayer_shared' && request_id) return `/prayer/${request_id}`
  if (n.type === 'prayer_shared' && requester_id) return `/user/${requester_id}`

  // Friend request → the requester's profile (also reachable via the
  // dedicated "Profil ansehen" button rendered for this type)
  if (n.type === 'friend_request' && requester_id) return `/user/${requester_id}`

  // Birthday reminder → the person's profile
  if (n.type === 'birthday' && person_id) return `/user/${person_id}`

  // If there's an explicit related_url, use it
  if (n.related_url) return n.related_url

  // Fallback by type (older notifications without `data`)
  switch (n.type) {
    case 'friend_request':
    case 'friend_accepted':
      return '/friends'
    case 'community_invite':
    case 'community_event':
      return '/friends'
    case 'prayer_shared':
    case 'prayer_log':
    case 'sibling_requests_reminder':
      return '/prayers'
    case 'weekly_digest':
      return '/prayer/stats'
    case 'oikos_entry':
      return '/'
    default:
      return null
  }
}

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

// ─── NotificationItem ─────────────────────────────────────────

function NotificationItem({ n, onClick, onDelete, onViewProfile, onAccept, onDecline }) {
  const isFriendRequest = n.type === 'friend_request' && n.data?.friendship_id && n.data?.requester_id

  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-3.5 p-4 border-b border-warm-3 transition-all duration-200 cursor-pointer active:scale-[0.99] ${
        n.is_read ? 'bg-transparent hover:bg-surface' : 'bg-warm-1/10 hover:bg-warm-1/15'
      }`}
    >
      {/* Icon bubble */}
      <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-warm-4 to-warm-3 shadow-sm border border-warm-2/20 flex items-center justify-center text-xl relative">
        {NOTIFICATION_TYPE_META[n.type]?.icon || '🔔'}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`font-serif text-[15px] leading-snug mb-1 ${n.is_read ? 'font-medium text-dark' : 'font-bold text-dark'}`}>
          {n.title}
        </p>
        {n.body && (
          <p className="font-serif text-[13.5px] text-dark-muted leading-relaxed mb-1.5 opacity-90 line-clamp-2">
            {n.body}
          </p>
        )}
        <p className="font-sans text-[11px] font-medium text-warm-2/80 uppercase tracking-widest mt-0.5">
          {formatTime(n.created_at)}
        </p>

        {/* Freundschaftsanfrage: Profil ansehen / Annehmen / Ablehnen */}
        {isFriendRequest && (
          <div className="flex items-center gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onViewProfile}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-warm-3 text-[12px] font-semibold text-dark hover:bg-surface active:scale-95 transition-all duration-150"
            >
              <User size={12} /> Profil
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-white text-[12px] font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <Check size={12} /> Annehmen
            </button>
            <button
              onClick={onDecline}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-warm-3 text-[12px] font-semibold text-warm-2/80 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 transition-all duration-150"
            >
              <X size={12} /> Ablehnen
            </button>
          </div>
        )}
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-accent shadow-sm mt-2 ring-4 ring-bg" />
      )}

      {/* Delete box */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label="Benachrichtigung löschen"
        className="w-8 h-8 shrink-0 rounded-lg border border-warm-3 flex items-center justify-center text-warm-2/70 hover:text-red-600 hover:border-red-200 hover:bg-red-50 active:scale-95 transition-all duration-150 mt-1"
      >
        <Trash2 size={15} />
      </button>
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
  const { user } = useAuth()
  const { notifications, loading, markAllRead, markRead, deleteNotification } = useNotifications()
  const { acceptRequest, declineRequest } = useFriendships()
  const markedRef = useRef(false)

  // Erst als gelesen markieren, wenn die Liste geladen ist. Beim Mount ist
  // die Supabase-Session u. U. noch nicht da (markAllRead lief dann auf
  // `user.id` von `null`), und ein optimistisches Update vor dem Laden
  // wurde vom eintreffenden Ergebnis sofort wieder überschrieben.
  useEffect(() => {
    if (loading || markedRef.current) return
    markedRef.current = true
    markAllRead()
  }, [loading, markAllRead])

  function handleNotificationClick(n) {
    if (!n.is_read) markRead(n.id)
    const dest = resolveDestination(n, user?.id)
    if (dest) navigate(dest)
  }

  async function handleAcceptFriendRequest(n) {
    if (!n.is_read) markRead(n.id)
    await acceptRequest(n.data.friendship_id)
    deleteNotification(n.id)
  }

  async function handleDeclineFriendRequest(n) {
    if (!n.is_read) markRead(n.id)
    await declineRequest(n.data.friendship_id)
    deleteNotification(n.id)
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
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%' }} className="pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtn}>
          <ArrowLeft size={20} />
        </button>
        <span style={headerTitle}>Benachrichtigungen</span>
        <button
          onClick={() => navigate('/notifications/settings')}
          style={backBtn}
          aria-label="Benachrichtigungs-Einstellungen"
        >
          <Settings size={20} />
        </button>
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
            {NOTIFICATION_TYPE_META[key]?.label || 'Sonstiges'}
          </p>

          {/* Items */}
          <div style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-warm-3)', borderBottom: '1px solid var(--color-warm-3)' }}>
            {groups[key].map(n => (
              <NotificationItem
                key={n.id}
                n={n}
                onClick={() => handleNotificationClick(n)}
                onDelete={() => deleteNotification(n.id)}
                onViewProfile={() => { if (!n.is_read) markRead(n.id); navigate(`/user/${n.data?.requester_id}`) }}
                onAccept={() => handleAcceptFriendRequest(n)}
                onDecline={() => handleDeclineFriendRequest(n)}
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
