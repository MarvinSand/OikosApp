import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, SendHorizontal, X, Smile, CornerUpLeft, Forward, Copy, Pin, Trash2, PinOff, ChevronUp, Camera, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useConversations } from '../hooks/useConversations'
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

function previewText(msg) {
  if (!msg) return ''
  if (msg.is_deleted) return '(Nachricht gelöscht)'
  if (msg.type === 'prayer_request') return `🙏 ${msg.text || 'Gebetsanliegen'}`
  if (msg.type === 'bible_verse') return `📖 ${msg.bible_verse_reference || 'Bibelvers'}`
  if (msg.type === 'photo') return msg.is_view_once ? '📷 Foto (einmal ansehen)' : '📷 Foto'
  return msg.text || ''
}

// ─── Foto-Nachricht (inkl. „einmal ansehen") ──────────────────
function PhotoMessage({ msg, isOwn, photoUrl, onView }) {
  const viewed = !!msg.viewed_at || (msg.is_view_once && !msg.image_path)
  const labelColor = isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-bubble-other-text)'

  // View-once: bereits angesehen (oder Foto entfernt)
  if (msg.is_view_once && viewed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
        <Eye size={16} color={labelColor} style={{ opacity: 0.7 }} />
        <span style={{ fontFamily: 'Lora, serif', fontSize: 13.5, fontStyle: 'italic', color: labelColor, opacity: 0.8 }}>
          Foto angesehen
        </span>
      </div>
    )
  }

  // View-once: eigener Versand (nicht erneut ansehbar)
  if (msg.is_view_once && isOwn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
        <Camera size={16} color={labelColor} />
        <span style={{ fontFamily: 'Lora, serif', fontSize: 13.5, color: labelColor }}>
          Foto · einmal ansehen
        </span>
      </div>
    )
  }

  // View-once: Empfänger, noch nicht angesehen → antippen zum Ansehen
  if (msg.is_view_once && !isOwn) {
    return (
      <button
        onClick={() => onView(msg, photoUrl(msg.image_path))}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          border: 'none', borderRadius: 12, cursor: 'pointer',
          backgroundColor: 'rgba(127,127,127,0.14)', color: labelColor,
          fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600,
        }}
      >
        <Camera size={16} /> Foto · Tippen zum Ansehen
      </button>
    )
  }

  // Normales Foto: inline anzeigen
  const url = photoUrl(msg.image_path)
  if (!url) {
    return <span style={{ fontFamily: 'Lora, serif', fontSize: 13.5, color: labelColor, fontStyle: 'italic' }}>📷 Foto nicht verfügbar</span>
  }
  return (
    <img
      src={url}
      alt="Foto"
      onClick={() => onView(msg, url)}
      style={{ maxWidth: 220, width: '100%', borderRadius: 12, display: 'block', cursor: 'pointer' }}
    />
  )
}

const QUICK_REACTIONS = ['🙏', '❤️', '🙌', '👍', '🔥', '😂', '🥺', '😮']

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, size = 36, isChristian, avatarUrl }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || ''}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: size * 0.33, fontWeight: 700,
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
        color: isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-text-light)',
        margin: '0 0 4px 0',
      }}>
        🙏 Gebetsanliegen
      </p>
      <p style={{
        fontFamily: 'Lora, serif',
        fontSize: 14,
        fontWeight: 700,
        color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-text)',
        margin: '0 0 4px 0',
      }}>
        {msg.text}
      </p>
      {msg.bible_verse_text && (
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 12,
          fontStyle: 'italic',
          color: isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-text-muted)',
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
          border: isOwn ? '1.5px solid var(--color-bubble-own-text-muted)' : '1.5px solid var(--color-warm-1)',
          backgroundColor: 'transparent',
          color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-warm-1)',
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
        color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-text)',
        margin: '0 0 4px 0',
      }}>
        📖 {msg.bible_verse_reference}
      </p>
      <p style={{
        fontFamily: 'Lora, serif',
        fontSize: 13,
        fontStyle: 'italic',
        color: isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-text-muted)',
        margin: 0,
        lineHeight: 1.5,
      }}>
        {msg.bible_verse_text}
      </p>
    </div>
  )
}

// ─── Reply Preview (inline in bubble) ─────────────────────────
function ReplyQuote({ repliedMsg, isOwn, onJump }) {
  if (!repliedMsg) return null
  const senderName = repliedMsg.profiles?.full_name || repliedMsg.profiles?.username || 'Geschwister'
  return (
    <button
      onClick={e => { e.stopPropagation(); onJump?.(repliedMsg.id) }}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '6px 8px',
        borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.85)' : 'var(--color-accent)'}`,
        backgroundColor: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--color-bg-secondary)',
        borderRadius: 6,
        marginBottom: 6,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <p style={{
        fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, margin: 0,
        color: isOwn ? 'rgba(255,255,255,0.95)' : 'var(--color-accent)',
      }}>
        {senderName}
      </p>
      <p style={{
        fontFamily: 'Lora, serif', fontSize: 12, margin: '2px 0 0',
        color: isOwn ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {previewText(repliedMsg)}
      </p>
    </button>
  )
}

// ─── Reactions strip below bubble ─────────────────────────────
function ReactionsBar({ reactions, currentUserId, onToggle }) {
  if (!reactions || reactions.length === 0) return null
  // Group by emoji
  const groups = {}
  for (const r of reactions) {
    if (!groups[r.emoji]) groups[r.emoji] = []
    groups[r.emoji].push(r)
  }
  const entries = Object.entries(groups)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {entries.map(([emoji, rs]) => {
        const mine = rs.some(r => r.user_id === currentUserId)
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999,
              fontSize: 12,
              border: `1px solid ${mine ? 'var(--color-accent)' : 'var(--color-warm-3)'}`,
              backgroundColor: mine ? 'rgba(74,103,65,0.12)' : 'var(--color-white)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontFamily: 'Lora, serif',
            }}
          >
            <span>{emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{rs.length}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Long-press hook ──────────────────────────────────────────
function useLongPress(callback, ms = 500) {
  const timerRef = useRef(null)
  const triggered = useRef(false)

  const start = useCallback((e) => {
    triggered.current = false
    timerRef.current = setTimeout(() => {
      triggered.current = true
      callback(e)
    }, ms)
  }, [callback, ms])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onTouchCancel: cancel,
    wasTriggered: () => triggered.current,
  }
}

// ─── Message Bubble ───────────────────────────────────────────
function MessageBubble({ msg, isOwn, isCommunity, repliedMsg, onOpenMenu, onJumpTo, onToggleReaction, user, showToast, registerRef, photoUrl, onViewPhoto }) {
  const bubbleRef = useRef(null)

  useEffect(() => {
    registerRef?.(msg.id, bubbleRef.current)
    return () => registerRef?.(msg.id, null)
  }, [msg.id])

  const longPress = useLongPress((e) => {
    onOpenMenu(msg, bubbleRef.current)
  }, 450)

  function handleContextMenu(e) {
    e.preventDefault()
    onOpenMenu(msg, bubbleRef.current)
  }

  function handleClick(e) {
    // If long-press fired, swallow click
    if (longPress.wasTriggered()) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const senderName = msg.profiles?.full_name || msg.profiles?.username || '…'

  return (
    <div
      ref={bubbleRef}
      data-message-id={msg.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 6,
        position: 'relative',
        scrollMarginTop: 120,
      }}
      onContextMenu={msg.is_deleted ? undefined : handleContextMenu}
      onTouchStart={msg.is_deleted ? undefined : longPress.onTouchStart}
      onTouchEnd={msg.is_deleted ? undefined : longPress.onTouchEnd}
      onTouchMove={msg.is_deleted ? undefined : longPress.onTouchMove}
      onTouchCancel={msg.is_deleted ? undefined : longPress.onTouchCancel}
      onClick={handleClick}
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
          borderRadius: isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
          backgroundColor: msg.is_deleted
            ? 'transparent'
            : isOwn
              ? 'var(--color-bubble-own)'
              : 'var(--color-bubble-other)',
          border: msg.is_deleted
            ? 'none'
            : isOwn
              ? '1px solid var(--color-bubble-own-border)'
              : '1px solid var(--color-bubble-other-border)',
          boxShadow: msg.is_deleted ? 'none' : 'var(--shadow-bubble)',
          cursor: msg.is_deleted ? 'default' : 'context-menu',
          userSelect: msg.is_deleted ? 'auto' : 'none',
          WebkitUserSelect: msg.is_deleted ? 'auto' : 'none',
        }}
      >
        {/* Reply quote */}
        {!msg.is_deleted && msg.reply_to_id && (
          <ReplyQuote repliedMsg={repliedMsg} isOwn={isOwn} onJump={onJumpTo} />
        )}

        {/* Forwarded indicator */}
        {!msg.is_deleted && msg.forwarded_from_id && (
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 11, fontStyle: 'italic',
            margin: '0 0 4px',
            color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Forward size={11} /> Weitergeleitet
          </p>
        )}

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
        ) : msg.type === 'photo' ? (
          <PhotoMessage msg={msg} isOwn={isOwn} photoUrl={photoUrl} onView={onViewPhoto} />
        ) : (
          <p style={{
            fontFamily: 'Lora, serif',
            fontSize: 14.5,
            color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-bubble-other-text)',
            margin: 0,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Reactions */}
      {!msg.is_deleted && (
        <div style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
          <ReactionsBar
            reactions={msg.reactions}
            currentUserId={user?.id}
            onToggle={(emoji) => onToggleReaction(msg.id, emoji)}
          />
        </div>
      )}

      {/* Timestamp + pin badge */}
      {!msg.is_deleted && (
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: 10,
          color: 'var(--color-text-light)',
          margin: '2px 4px 0',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {msg.is_pinned && <Pin size={10} />}
          {formatTime(msg.created_at)}
          {msg._optimistic && ' ·'}
        </p>
      )}
    </div>
  )
}

// ─── Message Context Menu (long-press / right-click) ──────────
function MessageContextMenu({ msg, isOwn, anchorRect, onClose, onAction }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, place: 'below' })

  useEffect(() => {
    if (!anchorRect || !menuRef.current) return
    const menuH = menuRef.current.offsetHeight
    const menuW = menuRef.current.offsetWidth
    const vh = window.innerHeight
    const vw = window.innerWidth

    let top = anchorRect.bottom + 8
    let place = 'below'
    if (top + menuH > vh - 20) {
      top = anchorRect.top - menuH - 8
      place = 'above'
    }
    if (top < 12) top = 12

    let left = isOwn ? anchorRect.right - menuW : anchorRect.left
    if (left + menuW > vw - 12) left = vw - menuW - 12
    if (left < 12) left = 12
    setPos({ top, left, place })
  }, [anchorRect, showEmojiPicker, isOwn])

  const actions = [
    { key: 'reply',   icon: CornerUpLeft, label: 'Antworten', show: true },
    { key: 'forward', icon: Forward,      label: 'Weiterleiten', show: !msg.is_deleted },
    { key: 'copy',    icon: Copy,         label: 'Kopieren', show: !!(msg.text || msg.bible_verse_text) },
    { key: msg.is_pinned ? 'unpin' : 'pin', icon: msg.is_pinned ? PinOff : Pin, label: msg.is_pinned ? 'Lösen' : 'Pinnen', show: true },
    { key: 'delete',  icon: Trash2,       label: 'Löschen', show: isOwn, danger: true },
  ].filter(a => a.show)

  return (
    <>
      <div
        onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onClose() }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.04)' }}
      />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: 201,
          backgroundColor: 'var(--color-white)',
          borderRadius: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          border: '1px solid var(--color-warm-3)',
          minWidth: 220,
          overflow: 'hidden',
          animation: 'menuFadeIn 0.12s ease-out',
        }}
      >
        {/* Quick reactions row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '8px 8px',
          borderBottom: '1px solid var(--color-warm-3)',
        }}>
          {QUICK_REACTIONS.slice(0, 6).map(em => (
            <button
              key={em}
              onClick={() => { onAction('react', em); onClose() }}
              style={{
                width: 34, height: 34, borderRadius: 999, border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: 18,
              }}
            >
              {em}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker(v => !v)}
            style={{
              width: 34, height: 34, borderRadius: 999, border: 'none',
              background: 'var(--color-bg-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Smile size={16} />
          </button>
        </div>

        {showEmojiPicker && (
          <div style={{
            padding: 8, display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)', gap: 2,
            borderBottom: '1px solid var(--color-warm-3)',
            maxHeight: 180, overflowY: 'auto',
          }}>
            {['😀','😁','😂','🤣','😊','😍','😘','😎',
              '🤩','🥳','🤔','😐','😢','😭','😡','🤯',
              '🙏','❤️','🧡','💛','💚','💙','💜','🤍',
              '🙌','👍','👎','👏','💪','🔥','✨','💯',
              '✝️','🕊️','📖','⛪','🌿','☀️','🌙','⭐'].map(em => (
              <button key={em}
                onClick={() => { onAction('react', em); onClose() }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6 }}
              >{em}</button>
            ))}
          </div>
        )}

        {actions.map(a => {
          const Icon = a.icon
          return (
            <button
              key={a.key}
              onClick={() => { onAction(a.key); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 16px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'Lora, serif', fontSize: 14,
                color: a.danger ? '#C0392B' : 'var(--color-text)',
                textAlign: 'left',
              }}
            >
              <Icon size={16} />
              {a.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Pinned messages bar (top, like Telegram) ─────────────────
function PinnedBar({ pinned, onJump, onUnpin, canUnpin }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (idx >= pinned.length) setIdx(0)
  }, [pinned.length, idx])

  if (!pinned || pinned.length === 0) return null
  const current = pinned[Math.min(idx, pinned.length - 1)]
  const senderName = current.profiles?.full_name || current.profiles?.username || 'Geschwister'

  function handleClick() {
    onJump(current.id)
    if (pinned.length > 1) {
      setIdx(i => (i + 1) % pinned.length)
    }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-warm-3)',
        cursor: 'pointer',
        position: 'sticky', top: 0, zIndex: 15,
      }}
      onClick={handleClick}
    >
      {/* Indicator (Telegram-style left bar with multiple segments) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, height: 32, justifyContent: 'center' }}>
        {pinned.slice(0, Math.min(pinned.length, 4)).map((_, i) => (
          <div
            key={i}
            style={{
              width: 2,
              flex: 1,
              borderRadius: 2,
              backgroundColor: i === Math.min(idx, pinned.length - 1) ? 'var(--color-accent)' : 'var(--color-warm-3)',
            }}
          />
        ))}
      </div>

      <Pin size={14} color="var(--color-accent)" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontFamily: 'Lora, serif',
          fontSize: 11, fontWeight: 700, color: 'var(--color-accent)',
        }}>
          Angeheftete Nachricht{pinned.length > 1 ? ` ${Math.min(idx, pinned.length - 1) + 1}/${pinned.length}` : ''}
        </p>
        <p style={{
          margin: '1px 0 0', fontFamily: 'Lora, serif',
          fontSize: 12.5, color: 'var(--color-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <span style={{ fontWeight: 600 }}>{senderName}: </span>
          {previewText(current)}
        </p>
      </div>

      {canUnpin && (
        <button
          onClick={e => { e.stopPropagation(); onUnpin(current.id) }}
          title="Lösen"
          style={{
            width: 30, height: 30, borderRadius: '50%',
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          <PinOff size={14} />
        </button>
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
              color: 'var(--color-bg)',
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

// ─── Forward Sheet (pick a conversation) ──────────────────────
function ForwardSheet({ onClose, onSubmit, currentConversationId }) {
  const { directChats, communityChats, activityChats } = useConversations()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])

  const all = [
    ...directChats.map(c => ({ ...c, _kind: 'direct' })),
    ...communityChats.map(c => ({ ...c, _kind: 'community' })),
    ...activityChats.map(c => ({ ...c, _kind: 'activity' })),
  ].filter(c => c.id !== currentConversationId)

  const filtered = all.filter(conv => {
    const name = conv.type === 'direct'
      ? (conv.otherUser?.full_name || conv.otherUser?.username || '')
      : conv.type === 'community'
        ? (conv.community?.name || '')
        : (conv.activity?.title || '')
    return name.toLowerCase().includes(query.toLowerCase())
  })

  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0',
        zIndex: 110, padding: '16px 16px 0',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 14px' }} />
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 12px' }}>
          Weiterleiten an…
        </h3>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Suchen…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)',
            fontFamily: 'Lora, serif', fontSize: 14, marginBottom: 10, boxSizing: 'border-box',
          }}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', padding: '20px 0', fontStyle: 'italic' }}>
              Keine Chats gefunden.
            </p>
          )}
          {filtered.map(conv => {
            const name = conv.type === 'direct'
              ? (conv.otherUser?.full_name || conv.otherUser?.username || 'Unbekannt')
              : conv.type === 'community'
                ? (conv.community?.name || 'Community')
                : (conv.activity?.title || 'Aktivität')
            const checked = selected.includes(conv.id)
            return (
              <button
                key={conv.id}
                onClick={() => toggle(conv.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '10px 4px', textAlign: 'left',
                  border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--color-warm-3)',
                }}
              >
                <Avatar name={name} size={36} isChristian={conv.type === 'direct' ? conv.otherUser?.is_christian : false} />
                <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  {name}
                </span>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-warm-3)'}`,
                  backgroundColor: checked ? 'var(--color-accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {checked && <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>✓</span>}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{
          display: 'flex', gap: 10, padding: '12px 0',
          borderTop: '1px solid var(--color-warm-3)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1.5px solid var(--color-warm-3)', background: 'none',
              fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={() => { onSubmit(selected); onClose() }}
            disabled={selected.length === 0}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 10, border: 'none',
              backgroundColor: selected.length > 0 ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
              color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Senden{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Reply preview above input ────────────────────────────────
function ReplyComposerPreview({ msg, onCancel }) {
  if (!msg) return null
  const senderName = msg.profiles?.full_name || msg.profiles?.username || 'Geschwister'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid var(--color-warm-3)',
      backgroundColor: 'var(--color-bg-secondary)',
    }}>
      <CornerUpLeft size={16} color="var(--color-accent)" />
      <div style={{ flex: 1, minWidth: 0, borderLeft: '2px solid var(--color-accent)', paddingLeft: 8 }}>
        <p style={{ margin: 0, fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>
          Antwort an {senderName}
        </p>
        <p style={{ margin: '1px 0 0', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {previewText(msg)}
        </p>
      </div>
      <button onClick={onCancel} style={{
        width: 26, height: 26, borderRadius: '50%', border: 'none',
        background: 'var(--color-warm-3)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Input Bar ────────────────────────────────────────────────
function InputBar({ onSend, onOpenPrayer, onOpenVerse, onSendPhoto, replyTo, onCancelReply }) {
  const [text, setText] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [photoDraft, setPhotoDraft] = useState(null) // { file, url }
  const [photoViewOnce, setPhotoViewOnce] = useState(true) // standardmäßig: einmal ansehen
  const [photoSending, setPhotoSending] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  function handlePhotoPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoViewOnce(true)
    setPhotoDraft({ file, url: URL.createObjectURL(file) })
  }

  async function confirmSendPhoto() {
    if (!photoDraft || photoSending) return
    setPhotoSending(true)
    await onSendPhoto(photoDraft.file, { viewOnce: photoViewOnce })
    URL.revokeObjectURL(photoDraft.url)
    setPhotoDraft(null)
    setPhotoSending(false)
  }

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
      {/* Reply preview */}
      {replyTo && <ReplyComposerPreview msg={replyTo} onCancel={onCancelReply} />}

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
          <button
            onClick={() => { setShowAttach(false); fileInputRef.current?.click() }}
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
            📷 Foto senden
          </button>
        </div>
      )}

      {/* Verstecktes Datei-Feld für Fotos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoPick}
        style={{ display: 'none' }}
      />

      {/* Foto-Compose-Sheet */}
      {photoDraft && (
        <div
          onClick={() => { if (!photoSending) { URL.revokeObjectURL(photoDraft.url); setPhotoDraft(null) } }}
          style={{ position: 'fixed', inset: 0, zIndex: 210, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, backgroundColor: 'var(--color-bg)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 14px' }} />
            <img src={photoDraft.url} alt="Vorschau" style={{ width: '100%', maxHeight: '46vh', objectFit: 'contain', borderRadius: 14, backgroundColor: 'var(--color-bg-secondary)' }} />

            {/* Einmal ansehen Toggle */}
            <button
              onClick={() => setPhotoViewOnce(v => !v)}
              style={{
                width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 14,
                border: `1.5px solid ${photoViewOnce ? 'var(--color-accent)' : 'var(--color-border)'}`,
                backgroundColor: photoViewOnce ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}
            >
              <Eye size={20} color={photoViewOnce ? 'var(--color-accent-dark)' : 'var(--color-text-muted)'} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Einmal ansehen</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)' }}>Foto wird nach dem Ansehen gelöscht</span>
              </span>
              <span style={{
                width: 44, height: 26, borderRadius: 13, flexShrink: 0, position: 'relative',
                backgroundColor: photoViewOnce ? 'var(--color-accent)' : 'var(--color-warm-3)', transition: 'background-color 0.15s',
              }}>
                <span style={{ position: 'absolute', top: 3, left: photoViewOnce ? 21 : 3, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.15s' }} />
              </span>
            </button>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => { URL.revokeObjectURL(photoDraft.url); setPhotoDraft(null) }}
                disabled={photoSending}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                onClick={confirmSendPhoto}
                disabled={photoSending}
                style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                {photoSending ? 'Wird gesendet…' : 'Senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
        {/* Plus button */}
        <button
          onClick={() => setShowAttach(v => !v)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: showAttach ? 'var(--color-warm-1)' : 'var(--color-warm-4)',
            color: showAttach ? 'var(--color-bg)' : 'var(--color-warm-1)',
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
  const {
    messages, loading, hasMore, loadMore,
    sendMessage, sendPrayerRequest, sendBibleVerse, deleteMessage,
    sendPhoto, photoUrl, markPhotoViewed,
    toggleReaction, pinMessage, unpinMessage, forwardMessage,
  } = useChat(conversationId)

  const [convInfo, setConvInfo] = useState(null) // { type, name, otherUserId }
  const [infoLoading, setInfoLoading] = useState(true)
  const [showPrayer, setShowPrayer] = useState(false)
  const [showVerse, setShowVerse] = useState(false)
  const [viewerPhoto, setViewerPhoto] = useState(null) // { msg, url }

  // Long-press / right-click menu state
  const [menuMsg, setMenuMsg] = useState(null)
  const [menuRect, setMenuRect] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [forwardMsg, setForwardMsg] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const messageRefs = useRef(new Map())
  const prevScrollHeightRef = useRef(0)
  const isAtBottomRef = useRef(true)

  const registerRef = useCallback((id, el) => {
    if (!id) return
    if (el) messageRefs.current.set(id, el)
    else messageRefs.current.delete(id)
  }, [])

  // Load conversation info
  useEffect(() => {
    if (!conversationId || !user) return
    async function loadInfo() {
      setInfoLoading(true)
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, type, community_id, activity_id, activity:world_map_activities!activity_id(id, title, activity_emoji, activity_type)')
        .eq('id', conversationId)
        .maybeSingle()

      if (!conv) { setInfoLoading(false); return }

      if (conv.type === 'community') {
        const { data: community } = await supabase
          .from('communities')
          .select('id, name')
          .eq('id', conv.community_id)
          .maybeSingle()
        setConvInfo({ type: 'community', name: community?.name || 'Community', communityId: conv.community_id })
      } else if (conv.type === 'activity') {
        setConvInfo({
          type: 'activity',
          name: conv.activity?.title || 'Aktivität',
          activityEmoji: conv.activity?.activity_emoji || '📍',
          activityId: conv.activity_id,
          activityType: conv.activity?.activity_type || '',
        })
      } else {
        const { data: members } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
        const otherUserId = members?.[0]?.user_id
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, is_christian, gender, avatar_url')
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

  // Fallback: Falls die Mitglieder-Abfrage den anderen User nicht liefert
  // (z. B. RLS), den Gesprächspartner aus den geladenen Nachrichten ableiten.
  useEffect(() => {
    if (infoLoading) return
    if (convInfo && (convInfo.type !== 'direct' || convInfo.otherUserId)) return
    const m = messages.find(x => x.sender_id && x.sender_id !== user?.id && x.profiles)
    if (!m) return
    const p = m.profiles
    setConvInfo({
      type: 'direct',
      name: p.full_name || p.username || 'Unbekannt',
      otherUserId: m.sender_id,
      otherUser: p,
    })
  }, [infoLoading, convInfo, messages, user?.id])

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

    if (scrollTop < 80 && hasMore) {
      prevScrollHeightRef.current = scrollHeight
      loadMore().then(() => {
        const newScrollHeight = container.scrollHeight
        container.scrollTop = newScrollHeight - prevScrollHeightRef.current
      })
    }
  }

  async function handleSend(text) {
    isAtBottomRef.current = true
    const opts = replyTo ? { replyToId: replyTo.id } : {}
    setReplyTo(null)
    await sendMessage(text, opts)
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

  function openMenu(msg, anchorEl) {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    setMenuMsg(msg)
    setMenuRect(rect)
  }

  function closeMenu() {
    setMenuMsg(null)
    setMenuRect(null)
  }

  function jumpToMessage(id) {
    const el = messageRefs.current.get(id)
    if (!el) {
      showToast('Nachricht nicht geladen', 'info')
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(id)
    setTimeout(() => setHighlightedId(curr => curr === id ? null : curr), 1800)
  }

  async function handleMenuAction(action, payload) {
    if (!menuMsg) return
    const m = menuMsg
    if (action === 'react') {
      await toggleReaction(m.id, payload)
      return
    }
    if (action === 'reply') {
      setReplyTo(m)
      return
    }
    if (action === 'forward') {
      setForwardMsg(m)
      return
    }
    if (action === 'copy') {
      const txt = m.type === 'bible_verse'
        ? `${m.bible_verse_reference || ''}\n${m.bible_verse_text || ''}`.trim()
        : (m.text || m.bible_verse_text || '')
      try {
        await navigator.clipboard.writeText(txt)
        showToast('Kopiert ✓')
      } catch {
        showToast('Konnte nicht kopieren', 'error')
      }
      return
    }
    if (action === 'pin') {
      await pinMessage(m.id)
      showToast('Angeheftet 📌')
      return
    }
    if (action === 'unpin') {
      await unpinMessage(m.id)
      showToast('Gelöst', 'info')
      return
    }
    if (action === 'delete') {
      deleteMessage(m.id)
      return
    }
  }

  async function handleForwardSubmit(targetConvIds) {
    if (!forwardMsg || !targetConvIds?.length) return
    await forwardMessage(forwardMsg, targetConvIds)
    setForwardMsg(null)
    showToast(`Weitergeleitet an ${targetConvIds.length}`)
  }

  const isCommunity = convInfo?.type === 'community'
  const pinnedMessages = messages.filter(m => m.is_pinned && !m.is_deleted)
  const messageById = new Map(messages.map(m => [m.id, m]))

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
    <div className="flex flex-col bg-bg md:max-w-2xl md:mx-auto md:w-full chat-nav-clearance" style={{ height: '100dvh' }}>
      <style>{`
        @keyframes menuFadeIn { from { opacity: 0; transform: translateY(-4px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes msgHighlight { 0% { background-color: rgba(196,151,74,0); } 25% { background-color: rgba(196,151,74,0.25); } 100% { background-color: rgba(196,151,74,0); } }
        .msg-highlight { animation: msgHighlight 1.8s ease-out; border-radius: 14px; }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--color-header-wash)] to-[var(--color-bg)] px-3 pt-3 pb-3 shrink-0 relative overflow-hidden border-b border-warm-3">
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
              {convInfo?.type === 'activity' ? (
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {convInfo?.activityEmoji || '📍'}
                </div>
              ) : (
                <Avatar
                  name={convInfo?.name}
                  size={40}
                  isChristian={convInfo?.type === 'direct' ? convInfo?.otherUser?.is_christian : false}
                  avatarUrl={convInfo?.type === 'direct' ? convInfo?.otherUser?.avatar_url : undefined}
                />
              )}
              <div className="min-w-0">
                <h2 className="font-serif text-[17px] font-bold text-dark m-0 leading-tight truncate">
                  {convInfo?.name}
                </h2>
                <p className="font-serif text-[12px] text-dark-muted m-0 mt-0.5 opacity-90 truncate">
                  {convInfo?.type === 'community'
                    ? 'Community Chat'
                    : convInfo?.type === 'activity'
                      ? `Aktivitäts-Chat${convInfo?.activityType ? ' · ' + convInfo.activityType : ''}`
                      : 'Direktnachricht'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinned messages bar */}
      <PinnedBar
        pinned={pinnedMessages}
        onJump={jumpToMessage}
        onUnpin={unpinMessage}
        canUnpin={true}
      />

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
          const replied = msg.reply_to_id ? messageById.get(msg.reply_to_id) : null
          return (
            <div key={item.key} className={highlightedId === msg.id ? 'msg-highlight' : ''}>
              <MessageBubble
                msg={msg}
                isOwn={isOwn}
                isCommunity={isCommunity}
                repliedMsg={replied}
                onOpenMenu={openMenu}
                onJumpTo={jumpToMessage}
                onToggleReaction={toggleReaction}
                user={user}
                showToast={showToast}
                registerRef={registerRef}
                photoUrl={photoUrl}
                onViewPhoto={(m, url) => setViewerPhoto({ msg: m, url })}
              />
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <InputBar
        onSend={handleSend}
        onOpenPrayer={() => setShowPrayer(true)}
        onOpenVerse={() => setShowVerse(true)}
        onSendPhoto={async (file, opts) => {
          const res = await sendPhoto(file, opts)
          if (res?.error) showToast('Foto konnte nicht gesendet werden', 'error')
        }}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

      {/* Foto-Viewer (Vollbild) */}
      {viewerPhoto && (
        <div
          onClick={() => {
            const { msg } = viewerPhoto
            setViewerPhoto(null)
            if (msg?.is_view_once && msg.sender_id !== user?.id) markPhotoViewed(msg)
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              const { msg } = viewerPhoto
              setViewerPhoto(null)
              if (msg?.is_view_once && msg.sender_id !== user?.id) markPhotoViewed(msg)
            }}
            aria-label="Schließen"
            style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 16, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={22} />
          </button>
          {viewerPhoto.url
            ? <img src={viewerPhoto.url} alt="Foto" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            : <span style={{ color: '#fff', fontFamily: 'Lora, serif' }}>Foto nicht verfügbar</span>}
          {viewerPhoto.msg?.is_view_once && (
            <div style={{ position: 'absolute', bottom: 'max(24px, env(safe-area-inset-bottom))', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontFamily: 'Lora, serif', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Eye size={14} /> Einmal ansehen – wird nach dem Schließen gelöscht
            </div>
          )}
        </div>
      )}

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

      {/* Long-press / context menu */}
      {menuMsg && menuRect && (
        <MessageContextMenu
          msg={menuMsg}
          isOwn={menuMsg.sender_id === user?.id}
          anchorRect={menuRect}
          onClose={closeMenu}
          onAction={handleMenuAction}
        />
      )}

      {/* Forward sheet */}
      {forwardMsg && (
        <ForwardSheet
          currentConversationId={conversationId}
          onClose={() => setForwardMsg(null)}
          onSubmit={handleForwardSubmit}
        />
      )}
    </div>
  )
}
