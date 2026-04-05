import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, SendHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useToast } from '../context/ToastContext'

// ─── Helpers ─────────────────────────────────────────────────
function formatDaySeparator(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDate.getTime() === today.getTime()) return 'Heute'
  if (msgDate.getTime() === yesterday.getTime()) return 'Gestern'
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function sameDay(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, size = 36, isChristian }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.33, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

// ─── Prayer Request Card ──────────────────────────────────────
function PrayerCard({ msg, isOwn, user, showToast }) {
  const [logging, setLogging] = useState(false)

  async function handlePray() {
    setLogging(true)
    try {
      if (msg.personal_prayer_request_id) {
        await supabase.from('personal_prayer_logs').insert({
          request_id: msg.personal_prayer_request_id,
          user_id: user.id,
        })
      } else if (msg.prayer_request_id) {
        await supabase.from('prayer_logs').insert({
          prayer_request_id: msg.prayer_request_id,
          user_id: user.id,
        })
      }
      showToast('Gebet protokolliert 🙏')
    } catch (e) {
      showToast('Fehler beim Protokollieren', 'error')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div style={{ minWidth: 0 }}>
      <p style={{
        fontFamily: 'Lora, serif',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--color-text-light)',
        margin: '0 0 4px 0',
      }}>
        🙏 Gebetsanliegen
      </p>
      <p style={{
        fontFamily: 'Lora, serif',
        fontSize: 14,
        fontWeight: 700,
        color: isOwn ? 'white' : 'var(--color-text)',
        margin: '0 0 4px 0',
      }}>
        {msg.text}
      </p>
      {msg.bible_verse_text && (
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 12,
          fontStyle: 'italic',
          color: isOwn ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)',
          margin: '0 0 8px 0',
        }}>
          {msg.bible_verse_text}
        </p>
      )}
      <button
        onClick={handlePray}
        disabled={logging}
        style={{
          padding: '5px 12px',
          borderRadius: 8,
          border: isOwn ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid var(--color-warm-1)',
          backgroundColor: 'transparent',
          color: isOwn ? 'white' : 'var(--color-warm-1)',
          fontFamily: 'Lora, serif',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {logging ? '…' : 'Beten 🙏'}
      </button>
    </div>
  )
}

// ─── Bible Verse Card ─────────────────────────────────────────
function BibleVerseCard({ msg, isOwn }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{
        fontFamily: 'Lora, serif',
        fontSize: 13,
        fontWeight: 700,
        color: isOwn ? 'white' : 'var(--color-text)',
        margin: '0 0 4px 0',
      }}>
        📖 {msg.bible_verse_reference}
      </p>
      <p style={{
        fontFamily: 'Lora, serif',
        fontSize: 13,
        fontStyle: 'italic',
        color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--color-text-muted)',
        margin: 0,
        lineHeight: 1.5,
      }}>
        {msg.bible_verse_text}
      </p>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────
function MessageBubble({ msg, isOwn, isCommunity, onDelete, user, showToast }) {
  const [showMenu, setShowMenu] = useState(false)

  function handleContextMenu(e) {
    if (!isOwn) return
    e.preventDefault()
    setShowMenu(true)
  }

  function handleDelete() {
    setShowMenu(false)
    onDelete(msg.id)
  }

  const senderName = msg.profiles?.full_name || msg.profiles?.username || '…'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 6,
        position: 'relative',
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Sender name for community chats (non-own) */}
      {isCommunity && !isOwn && (
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          margin: '0 0 2px 4px',
          fontStyle: 'italic',
        }}>
          {senderName}
        </p>
      )}

      <div
        style={{
          maxWidth: '75%',
          padding: msg.is_deleted ? '8px 12px' : '10px 14px',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          backgroundColor: msg.is_deleted
            ? 'transparent'
            : isOwn
              ? 'var(--color-warm-1)'
              : 'var(--color-white)',
          border: msg.is_deleted
            ? 'none'
            : isOwn
              ? 'none'
              : '1.5px solid var(--color-warm-3)',
          boxShadow: msg.is_deleted ? 'none' : '0 1px 4px rgba(58,46,36,0.07)',
          cursor: isOwn && !msg.is_deleted ? 'context-menu' : 'default',
        }}
      >
        {msg.is_deleted ? (
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 13,
            fontStyle: 'italic',
            color: 'var(--color-text-light)',
            margin: 0,
          }}>
            Nachricht gelöscht
          </p>
        ) : msg.type === 'prayer_request' ? (
          <PrayerCard msg={msg} isOwn={isOwn} user={user} showToast={showToast} />
        ) : msg.type === 'bible_verse' ? (
          <BibleVerseCard msg={msg} isOwn={isOwn} />
        ) : (
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 14,
            color: isOwn ? 'white' : 'var(--color-text)',
            margin: 0,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Timestamp */}
      {!msg.is_deleted && (
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 10,
          color: 'var(--color-text-light)',
          margin: '2px 4px 0',
        }}>
          {formatTime(msg.created_at)}
          {msg._optimistic && ' ·'}
        </p>
      )}

      {/* Context menu */}
      {showMenu && (
        <>
          <div
            onClick={() => setShowMenu(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
          />
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            backgroundColor: 'var(--color-white)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(58,46,36,0.15)',
            border: '1px solid var(--color-warm-3)',
            zIndex: 99,
            minWidth: 160,
            marginTop: 4,
          }}>
            <button
              onClick={handleDelete}
              style={{
                display: 'block',
                width: '100%',
                padding: '11px 16px',
                border: 'none',
                background: 'none',
                fontFamily: 'Lora, serif',
                fontSize: 14,
                color: '#C0392B',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Nachricht löschen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Day Separator ────────────────────────────────────────────
function DaySeparator({ label }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '16px 0 10px',
    }}>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
      <span style={{
        fontFamily: 'Lora, serif',
        fontSize: 11,
        color: 'var(--color-text-light)',
        fontStyle: 'italic',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
    </div>
  )
}

// ─── Prayer Attachment Sheet ──────────────────────────────────
function PrayerAttachSheet({ onClose, onSelect }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('personal_prayer_requests')
        .select('id, title, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [user?.id])

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 80 }}
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
        zIndex: 90,
        padding: '16px 20px 48px',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '65vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>
          Gebetsanliegen teilen
        </h3>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }}>Lädt…</p>
          )}
          {!loading && items.length === 0 && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              Keine Gebetsanliegen vorhanden.
            </p>
          )}
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 0',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid var(--color-warm-3)',
              }}
            >
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🙏 {item.title}
              </p>
              {item.description && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                  {item.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Bible Verse Modal ────────────────────────────────────────
function BibleVerseModal({ onClose, onSend }) {
  const [reference, setReference] = useState('')
  const [verseText, setVerseText] = useState('')

  function handleSend() {
    if (!reference.trim() || !verseText.trim()) return
    onSend(reference.trim(), verseText.trim())
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 20,
        padding: '24px 20px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 8px 32px rgba(58,46,36,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            Bibelvers teilen
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Stelle (z.B. Johannes 3,16)
        </label>
        <input
          autoFocus
          type="text"
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="z.B. Römer 8,28"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1.5px solid var(--color-warm-3)',
            backgroundColor: 'var(--color-bg)',
            fontFamily: 'Lora, serif',
            fontSize: 14,
            color: 'var(--color-text)',
            display: 'block',
            marginBottom: 14,
          }}
        />

        <label style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Vers
        </label>
        <textarea
          value={verseText}
          onChange={e => setVerseText(e.target.value)}
          placeholder="Vers eingeben…"
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1.5px solid var(--color-warm-3)',
            backgroundColor: 'var(--color-bg)',
            fontFamily: 'Lora, serif',
            fontSize: 14,
            color: 'var(--color-text)',
            display: 'block',
            resize: 'none',
            marginBottom: 18,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: '1.5px solid var(--color-warm-3)',
              background: 'none',
              fontFamily: 'Lora, serif',
              fontSize: 14,
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            disabled={!reference.trim() || !verseText.trim()}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              backgroundColor: reference.trim() && verseText.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
              color: 'white',
              fontFamily: 'Lora, serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: reference.trim() && verseText.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Teilen
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Input Bar ────────────────────────────────────────────────
function InputBar({ onSend, onOpenPrayer, onOpenVerse }) {
  const [text, setText] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const textareaRef = useRef(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxH = 5 * 22 + 16 // 5 lines + padding
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    if (!text.trim()) return
    onSend(text)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <div style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-warm-3)', zIndex: 20 }}>
      {/* Attachment menu */}
      {showAttach && (
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-warm-3)',
          display: 'flex',
          gap: 10,
        }}>
          <button
            onClick={() => { setShowAttach(false); onOpenPrayer() }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1.5px solid var(--color-warm-3)',
              backgroundColor: 'var(--color-bg)',
              fontFamily: 'Lora, serif',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            🙏 Gebetsanliegen teilen
          </button>
          <button
            onClick={() => { setShowAttach(false); onOpenVerse() }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1.5px solid var(--color-warm-3)',
              backgroundColor: 'var(--color-bg)',
              fontFamily: 'Lora, serif',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            📖 Bibelvers teilen
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        {/* Plus button */}
        <button
          onClick={() => setShowAttach(v => !v)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: showAttach ? 'var(--color-warm-1)' : 'var(--color-warm-4)',
            color: showAttach ? 'white' : 'var(--color-warm-1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Plus size={18} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben..."
          rows={1}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 18,
            border: '1.5px solid var(--color-warm-3)',
            backgroundColor: 'var(--color-bg)',
            fontFamily: 'Lora, serif',
            fontSize: 14,
            color: 'var(--color-text)',
            resize: 'none',
            outline: 'none',
            lineHeight: '22px',
            overflowY: 'hidden',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: text.trim() ? 'var(--color-warm-1)' : 'var(--color-text-light)',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SendHorizontal size={22} />
        </button>
      </div>
    </div>
  )
}

// ─── Message Skeleton ─────────────────────────────────────────
function MessageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 0' }}>
      {[false, true, false, true, false].map((isRight, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start' }}>
          <div style={{
            height: 40,
            width: `${45 + Math.random() * 30}%`,
            borderRadius: 18,
            backgroundColor: 'var(--color-warm-4)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        </div>
      ))}
    </div>
  )
}

// ─── ConversationView (Main) ──────────────────────────────────
export default function ConversationView() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { messages, loading, hasMore, loadMore, sendMessage, sendPrayerRequest, sendBibleVerse, deleteMessage } = useChat(conversationId)

  const [convInfo, setConvInfo] = useState(null) // { type, name, otherUserId }
  const [infoLoading, setInfoLoading] = useState(true)
  const [showPrayer, setShowPrayer] = useState(false)
  const [showVerse, setShowVerse] = useState(false)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const prevScrollHeightRef = useRef(0)
  const isAtBottomRef = useRef(true)

  // Load conversation info
  useEffect(() => {
    if (!conversationId || !user) return
    async function loadInfo() {
      setInfoLoading(true)
      // Fetch conversation type
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, type, community_id')
        .eq('id', conversationId)
        .maybeSingle()

      if (!conv) { setInfoLoading(false); return }

      if (conv.type === 'community') {
        // Get community name
        const { data: community } = await supabase
          .from('communities')
          .select('id, name')
          .eq('id', conv.community_id)
          .maybeSingle()
        setConvInfo({ type: 'community', name: community?.name || 'Community', communityId: conv.community_id })
      } else {
        // Get other user
        const { data: members } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
        const otherUserId = members?.[0]?.user_id
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, is_christian, gender')
            .eq('id', otherUserId)
            .maybeSingle()
          setConvInfo({
            type: 'direct',
            name: profile?.full_name || profile?.username || 'Unbekannt',
            otherUserId,
            otherUser: profile,
          })
        }
      }
      setInfoLoading(false)
    }
    loadInfo()
  }, [conversationId, user?.id])

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (loading) return
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, loading])

  // Scroll to bottom on mount
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [loading])

  function handleScroll() {
    const container = messagesContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60

    // Load more when near top
    if (scrollTop < 80 && hasMore) {
      prevScrollHeightRef.current = scrollHeight
      loadMore().then(() => {
        // Maintain scroll position after loading older messages
        const newScrollHeight = container.scrollHeight
        container.scrollTop = newScrollHeight - prevScrollHeightRef.current
      })
    }
  }

  async function handleSend(text) {
    isAtBottomRef.current = true
    await sendMessage(text)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  async function handleSendPrayer(item) {
    setShowPrayer(false)
    isAtBottomRef.current = true
    await sendPrayerRequest(item.id, item.title, item.description, true)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  async function handleSendVerse(reference, verseText) {
    isAtBottomRef.current = true
    await sendBibleVerse(reference, verseText)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  const isCommunity = convInfo?.type === 'community'

  // Build messages with day separators
  const renderedMessages = []
  messages.forEach((msg, i) => {
    const prev = messages[i - 1]
    if (!prev || !sameDay(prev.created_at, msg.created_at)) {
      renderedMessages.push({ type: 'separator', date: msg.created_at, key: `sep-${msg.created_at}` })
    }
    renderedMessages.push({ type: 'message', msg, key: msg.id })
  })

  return (
    <div className="h-full flex flex-col bg-bg md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#F7F3EC] to-[var(--color-bg)] px-3 pt-3 pb-3 shrink-0 relative overflow-hidden border-b border-warm-3">
        {/* Deko circles */}
        <div className="absolute -top-6 -right-4 w-24 h-24 rounded-full bg-warm-3/35 pointer-events-none blur-xl" />

        <div className="flex items-center gap-2 relative z-10">
          <button 
            onClick={() => navigate('/chat')} 
            className="p-1.5 text-dark hover:bg-black/5 rounded-full transition-colors flex shrink-0"
          >
            <ArrowLeft size={22} />
          </button>

          {infoLoading ? (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-warm-3/50 animate-pulse" />
              <div className="w-24 h-4 rounded bg-warm-3/50 animate-pulse" />
            </div>
          ) : (
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer transition-opacity hover:opacity-80 p-1 -ml-1 pr-4 rounded-xl"
              onClick={() => {
                if (convInfo?.type === 'direct' && convInfo?.otherUserId) {
                  navigate(`/user/${convInfo.otherUserId}`)
                } else if (convInfo?.type === 'community' && convInfo?.communityId) {
                  navigate(`/community/${convInfo.communityId}`)
                }
              }}
            >
              <Avatar 
                name={convInfo?.name} 
                size={40} 
                isChristian={convInfo?.type === 'direct' ? convInfo?.otherUser?.is_christian : false} 
              />
              <div className="min-w-0">
                <h2 className="font-serif text-[17px] font-bold text-dark m-0 leading-tight truncate">
                  {convInfo?.name}
                </h2>
                <p className="font-serif text-[12px] text-dark-muted m-0 mt-0.5 opacity-90 truncate">
                  {convInfo?.type === 'community' ? 'Community Chat' : 'Direktnachricht'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          paddingBottom: 8,
        }}
      >
        {/* Load more indicator */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              Ältere Nachrichten laden…
            </span>
          </div>
        )}

        {loading && <MessageSkeleton />}

        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
            <p style={{
              fontFamily: 'Lora, serif',
              fontSize: 15,
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}>
              Schreib die erste Nachricht 👋
            </p>
          </div>
        )}

        {!loading && renderedMessages.map(item => {
          if (item.type === 'separator') {
            return <DaySeparator key={item.key} label={formatDaySeparator(item.date)} />
          }
          const { msg } = item
          const isOwn = msg.sender_id === user?.id
          return (
            <MessageBubble
              key={item.key}
              msg={msg}
              isOwn={isOwn}
              isCommunity={isCommunity}
              onDelete={deleteMessage}
              user={user}
              showToast={showToast}
            />
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <InputBar
        onSend={handleSend}
        onOpenPrayer={() => setShowPrayer(true)}
        onOpenVerse={() => setShowVerse(true)}
      />

      {/* Prayer attachment sheet */}
      {showPrayer && (
        <PrayerAttachSheet
          onClose={() => setShowPrayer(false)}
          onSelect={handleSendPrayer}
        />
      )}

      {/* Bible verse modal */}
      {showVerse && (
        <BibleVerseModal
          onClose={() => setShowVerse(false)}
          onSend={handleSendVerse}
        />
      )}
    </div>
  )
}
