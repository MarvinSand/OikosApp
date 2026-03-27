import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageCircle, Plus } from 'lucide-react'
import { useConversations } from '../hooks/useConversations'
import { useFriendships } from '../hooks/useFriendships'

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(isoString) {
  if (!isoString) return ''
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (diffMin < 1) return 'gerade'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  if (diffHrs < 24 && msgDate.getTime() === today.getTime()) return `vor ${diffHrs} Std.`
  if (msgDate.getTime() === yesterday.getTime()) return 'gestern'
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function lastMessagePreview(msg) {
  if (!msg) return ''
  if (msg.is_deleted) return '(Nachricht gelöscht)'
  if (msg.type === 'prayer_request') return '🙏 Gebetsanliegen'
  if (msg.type === 'bible_verse') return '📖 Bibelvers'
  return msg.text || ''
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, size = 40, isChristian }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

// ─── ChatRow ─────────────────────────────────────────────────
function ChatRow({ conv, onClick }) {
  const isDirect = conv.type === 'direct'
  const name = isDirect
    ? (conv.otherUser?.full_name || conv.otherUser?.username || 'Unbekannt')
    : (conv.community?.name || 'Community')
  const preview = lastMessagePreview(conv.lastMessage)
  const time = timeAgo(conv.lastMessage?.created_at)

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 0',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-warm-3)',
        textAlign: 'left',
        position: 'relative',
      }}
    >
      {/* Unread dot */}
      {conv.unread && (
        <div style={{
          position: 'absolute',
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: '#2563EB',
          flexShrink: 0,
        }} />
      )}

      <Avatar
        name={name}
        size={40}
        isChristian={isDirect ? conv.otherUser?.is_christian : false}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 14,
            fontWeight: conv.unread ? 700 : 600,
            color: 'var(--color-text)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            marginRight: 8,
          }}>
            {name}
          </p>
          <span style={{
            fontFamily: 'Lora, serif',
            fontSize: 11,
            color: 'var(--color-text-light)',
            flexShrink: 0,
          }}>
            {time}
          </span>
        </div>
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 13,
          color: conv.unread ? 'var(--color-text-muted)' : 'var(--color-text-light)',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: conv.unread ? 500 : 400,
        }}>
          {preview || 'Noch keine Nachrichten'}
        </p>
      </div>
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, borderRadius: 7, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 6, width: '60%' }} />
        <div style={{ height: 12, borderRadius: 6, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', width: '80%' }} />
      </div>
    </div>
  )
}

// ─── NewDirectChatSheet ───────────────────────────────────────
function NewDirectChatSheet({ onClose, onSelect }) {
  const { friends, loading } = useFriendships()
  const [query, setQuery] = useState('')

  const filtered = friends.filter(f => {
    const name = f.otherUser?.full_name || f.otherUser?.username || ''
    return name.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }}
      />
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0',
        zIndex: 50,
        padding: '16px 20px 48px',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 14 }}>
          Neue Nachricht
        </h3>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={14} color="var(--color-text-light)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Geschwister suchen…"
            style={{
              width: '100%',
              padding: '10px 12px 10px 32px',
              borderRadius: 10,
              border: '1.5px solid var(--color-warm-3)',
              backgroundColor: 'var(--color-bg)',
              fontFamily: 'Lora, serif',
              fontSize: 14,
              color: 'var(--color-text)',
              display: 'block',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
          {!loading && filtered.length === 0 && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              Keine Geschwister gefunden.
            </p>
          )}
          {filtered.map(f => {
            const other = f.otherUser
            return (
              <button
                key={f.id}
                onClick={() => onSelect(other?.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-warm-3)',
                  textAlign: 'left',
                }}
              >
                <Avatar name={other?.full_name || other?.username} size={38} isChristian={other?.is_christian} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {other?.full_name || other?.username || '…'}
                  </p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    @{other?.username}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── ChatView (Main) ─────────────────────────────────────────
export default function ChatView() {
  const navigate = useNavigate()
  const { directChats, communityChats, loading, startDirectChat } = useConversations()
  const [query, setQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [starting, setStarting] = useState(false)

  const filterConvs = (list) =>
    list.filter(conv => {
      const name = conv.type === 'direct'
        ? (conv.otherUser?.full_name || conv.otherUser?.username || '')
        : (conv.community?.name || '')
      return name.toLowerCase().includes(query.toLowerCase())
    })

  const filteredDirect = filterConvs(directChats)
  const filteredCommunity = filterConvs(communityChats)
  const hasAny = directChats.length > 0 || communityChats.length > 0

  async function handleSelectFriend(friendId) {
    setShowNewChat(false)
    if (!friendId) return
    setStarting(true)
    try {
      const convId = await startDirectChat(friendId)
      if (convId) navigate(`/chat/${convId}`)
    } catch (e) {
      console.error('Fehler beim Starten des Chats:', e)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 100 }}>
      {/* Sticky Header */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-warm-3)',
        padding: '16px 16px 12px',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}>
        <h2 style={{
          fontFamily: 'Lora, serif',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--color-text)',
          margin: '0 0 12px 0',
        }}>
          Nachrichten
        </h2>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} color="var(--color-text-light)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Geschwister oder Community suchen..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 12,
              border: '1.5px solid var(--color-warm-3)',
              backgroundColor: 'var(--color-bg)',
              fontFamily: 'Lora, serif',
              fontSize: 14,
              color: 'var(--color-text)',
              display: 'block',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Loading skeletons */}
        {loading && (
          <div style={{ paddingTop: 4 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasAny && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <MessageCircle size={48} color="var(--color-warm-3)" style={{ marginBottom: 16 }} />
            <p style={{
              fontFamily: 'Lora, serif',
              fontSize: 15,
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}>
              Noch keine Nachrichten. Starte ein Gespräch mit einem Geschwister! 💬
            </p>
          </div>
        )}

        {/* Direct chats section */}
        {!loading && filteredDirect.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{
              fontFamily: 'Lora, serif',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 4,
              marginTop: 4,
            }}>
              Direktnachrichten
            </p>
            {filteredDirect.map(conv => (
              <ChatRow
                key={conv.id}
                conv={conv}
                onClick={() => navigate(`/chat/${conv.id}`)}
              />
            ))}
          </div>
        )}

        {/* Community chats section */}
        {!loading && filteredCommunity.length > 0 && (
          <div style={{ marginTop: filteredDirect.length > 0 ? 24 : 16 }}>
            <p style={{
              fontFamily: 'Lora, serif',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 4,
              marginTop: 4,
            }}>
              Community Chats
            </p>
            {filteredCommunity.map(conv => (
              <ChatRow
                key={conv.id}
                conv={conv}
                onClick={() => navigate(`/chat/${conv.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewChat(true)}
        disabled={starting}
        style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'var(--color-warm-1)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(58,46,36,0.25)',
          zIndex: 10,
          color: 'white',
        }}
      >
        <Plus size={24} />
      </button>

      {/* New Direct Chat Sheet */}
      {showNewChat && (
        <NewDirectChatSheet
          onClose={() => setShowNewChat(false)}
          onSelect={handleSelectFriend}
        />
      )}
    </div>
  )
}
