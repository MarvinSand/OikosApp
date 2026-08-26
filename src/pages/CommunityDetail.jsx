import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings, Copy, LogOut, SendHorizontal,
  MoreVertical, Shield, Plus, Trash2, MapPin, Clock, Pin, Globe, Lock, Users,
  ShieldOff, UserMinus, User, MessageSquare, RefreshCw, Pencil, X, Check, ChevronRight,
  MessageCircle, CalendarDays, HandHeart, HelpCircle
} from 'lucide-react'
import SegmentedTabs from '../components/layout/SegmentedTabs'
import MemberAvatarStack from '../components/community/MemberAvatarStack'
import MembersSheet from '../components/community/MembersSheet'
import { communityCover, getInitials as getCommunityInitials } from '../lib/communityTheme'
import { useAuth } from '../hooks/useAuth'
import { useCommunityDetail } from '../hooks/useCommunityDetail'
import { useCommunities } from '../hooks/useCommunities'
import { useChat } from '../hooks/useChat'
import { useCommunityPrayers } from '../hooks/useCommunityPrayers'
import PrayerCardList from '../components/prayer/PrayerCardList'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/image'
import AddressAutocomplete from '../components/common/AddressAutocomplete'

// ─── Shared header styles ─────────────────────────────────────
const glassBtn = {
  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', cursor: 'pointer',
  backgroundColor: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(6px)',
}
const plainHeaderBtn = {
  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', cursor: 'pointer', backgroundColor: 'transparent',
}
const metaChip = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontFamily: 'Lora, serif', fontSize: 11.5, fontWeight: 600,
  color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)', padding: '4px 10px', borderRadius: 999,
}

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'gerade'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} Std.`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function formatDaySeparator(iso) {
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (d.getTime() === today.getTime()) return 'Heute'
  if (d.getTime() === yesterday.getTime()) return 'Gestern'
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, size = 38, isChristian, avatarUrl }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
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

// ─── Day Separator ────────────────────────────────────────────
function DaySeparator({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 8px' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
      <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-light)', fontStyle: 'italic', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────
function MessageBubble({ msg, isOwn }) {
  const navigate = useNavigate()
  if (msg.is_deleted) {
    return (
      <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-light)', margin: 0 }}>
          Nachricht gelöscht
        </p>
      </div>
    )
  }
  const senderName = msg.profiles?.full_name || msg.profiles?.username
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      {!isOwn && senderName && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)', margin: '0 0 2px 4px', fontStyle: 'italic' }}>
          {senderName}
        </p>
      )}
      <div style={{
        maxWidth: '80%', padding: '9px 13px',
        borderRadius: isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
        backgroundColor: isOwn ? 'var(--color-bubble-own)' : 'var(--color-bubble-other)',
        border: isOwn ? '1px solid var(--color-bubble-own-border)' : '1px solid var(--color-bubble-other-border)',
        boxShadow: 'var(--shadow-bubble)',
      }}>
        {msg.type === 'prayer_request' ? (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-warm-1)', margin: '0 0 4px' }}>🙏 Gebetsanliegen</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-text)', margin: 0 }}>{msg.text}</p>
            {msg.bible_verse_text && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontStyle: 'italic', color: isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>{msg.bible_verse_text}</p>
            )}
            {/* Zur vollen Gebets-Karte (Beten, Kommentare, Liste, Weiterleiten) */}
            {(msg.personal_prayer_request_id || msg.prayer_request_id) && (
              <button
                onClick={() => navigate(`/prayer/${msg.personal_prayer_request_id || msg.prayer_request_id}`)}
                style={{
                  marginTop: 8, padding: '4px 11px', borderRadius: 8,
                  border: `1.5px solid ${isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-border)'}`,
                  background: 'transparent',
                  color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-text-secondary)',
                  fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Öffnen
              </button>
            )}
          </div>
        ) : msg.type === 'bible_verse' ? (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-text)', margin: '0 0 3px' }}>📖 {msg.bible_verse_reference}</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontStyle: 'italic', color: isOwn ? 'var(--color-bubble-own-text-muted)' : 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>{msg.bible_verse_text}</p>
          </div>
        ) : (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-text)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.text}
          </p>
        )}
      </div>
      <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-light)', margin: isOwn ? '2px 4px 0 0' : '2px 0 0 4px' }}>
        {formatTime(msg.created_at)}
      </span>
    </div>
  )
}

// ─── Input Bar ────────────────────────────────────────────────
function InputBar({ onSend }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  function handleSend() {
    if (!text.trim()) return
    onSend(text)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 110) + 'px'
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-white)',
      borderTop: '1px solid var(--color-warm-3)',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      flexShrink: 0,
      width: '100%',
    }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => { setText(e.target.value); autoResize() }}
        onKeyDown={handleKeyDown}
        placeholder="Nachricht schreiben…"
        rows={1}
        style={{ flex: 1, resize: 'none', border: '1.5px solid var(--color-warm-3)', borderRadius: 20, padding: '8px 14px', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', backgroundColor: 'var(--color-bg)', outline: 'none', lineHeight: 1.5, overflow: 'hidden' }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0, backgroundColor: text.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-4)', color: text.trim() ? 'var(--color-bg)' : 'var(--color-text-light)', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <SendHorizontal size={18} />
      </button>
    </div>
  )
}

// ─── Post Card (Redesigned) ───────────────────────────────────
function PostCard({ post, currentUserId, isAdmin, onDelete, onTogglePin }) {
  const [showFull, setShowFull] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const name = post.profiles?.full_name || post.profiles?.username || 'Unbekannt'
  const isPinned = post.is_pinned
  const isOwn = post.author_id === currentUserId
  const longContent = post.content && post.content.length > 200

  return (
    <div style={{
      backgroundColor: isPinned ? 'rgba(201,168,76,0.05)' : 'var(--color-white)',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
      border: `1px solid ${isPinned ? 'var(--color-accent)' : 'var(--color-warm-3)'}`,
      borderLeft: `4px solid ${isPinned ? 'var(--color-accent)' : 'var(--color-warm-1)'}`,
      boxShadow: '0 1px 4px rgba(58,46,36,0.06)',
      position: 'relative',
    }}>
      {isPinned && (
        <div style={{ position: 'absolute', top: 10, right: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, color: 'var(--color-gold-text)', backgroundColor: 'rgba(201,168,76,0.15)', padding: '2px 7px', borderRadius: 20 }}>
            📌 Angepinnt
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <Avatar name={name} size={36} isChristian={post.profiles?.is_christian} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: 0 }}>{timeAgo(post.created_at)}</p>
        </div>

        {(isAdmin || isOwn) && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setOpenMenu(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)' }}>
              <MoreVertical size={15} />
            </button>
            {openMenu && (
              <>
                <div onClick={() => setOpenMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.14)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 160 }}>
                  {isAdmin && (
                    <button
                      onClick={() => { setOpenMenu(false); onTogglePin(post.id, !isPinned) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '11px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)' }}
                    >
                      <Pin size={13} /> {isPinned ? 'Loslösen' : 'Anpinnen'}
                    </button>
                  )}
                  {(isAdmin || isOwn) && (
                    <button
                      onClick={() => { setOpenMenu(false); onDelete(post.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '11px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: '#C0392B', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <Trash2 size={13} /> Löschen
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {post.title && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px', lineHeight: 1.4 }}>
          {post.title}
        </p>
      )}

      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: showFull ? 'unset' : 6, WebkitBoxOrient: 'vertical' }}>
        {post.content}
      </p>
      {longContent && !showFull && (
        <button onClick={() => setShowFull(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', padding: '4px 0 0', fontStyle: 'italic' }}>
          Mehr anzeigen…
        </button>
      )}
    </div>
  )
}

// ─── Create Announcement Sheet (Admin) ───────────────────────
function CreateAnnouncementSheet({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!content.trim()) return
    setSaving(true)
    await onSubmit({ title: title.trim() || null, content: content.trim(), is_pinned: isPinned })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 70, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.25s ease-out', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }} />
        <h3 style={sheetTitle}>Ankündigung schreiben</h3>

        <label style={lbl}>Titel (optional)</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Wichtige Info" style={inp} />

        <label style={{ ...lbl, marginTop: 12 }}>Inhalt *</label>
        <textarea
          autoFocus
          value={content}
          onChange={e => setContent(e.target.value.slice(0, 1000))}
          placeholder="Was möchtest du mitteilen?"
          rows={5}
          style={{ ...inp, resize: 'vertical' }}
        />
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', marginTop: 2 }}>{content.length}/1000</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px' }}>📌 Anpinnen</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Immer oben anzeigen</p>
          </div>
          <button
            onClick={() => setIsPinned(v => !v)}
            style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: isPinned ? 'var(--color-accent)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: isPinned ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: content.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: content.trim() ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Veröffentliche…' : 'Veröffentlichen'}
        </button>
      </div>
    </>
  )
}

// ─── Event Card (Redesigned) ──────────────────────────────────
function EventCard({ event, myStatus, onRsvp, currentUserId, isAdmin, onDelete }) {
  const date = new Date(event.starts_at)
  const dayNum = date.getDate()
  const monthStr = date.toLocaleDateString('de-DE', { month: 'short' })
  const weekdayStr = date.toLocaleDateString('de-DE', { weekday: 'long' })
  const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const isPast = date < new Date()

  const rsvpOptions = [
    { status: 'going', label: '✓ Dabei', activeColor: 'var(--color-accent)' },
    { status: 'maybe', label: '? Vielleicht', activeColor: 'var(--color-accent)' },
    { status: 'not_going', label: '✗ Absagen', activeColor: '#C0392B' },
  ]

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, marginBottom: 12, border: '1px solid var(--color-warm-3)', overflow: 'hidden', opacity: isPast ? 0.65 : 1, boxShadow: '0 2px 8px rgba(58,46,36,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', padding: '14px 14px 10px' }}>
        {/* Date block */}
        <div style={{ width: 54, backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: '8px 4px', textAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: 'var(--color-warm-1)', margin: 0, lineHeight: 1 }}>{dayNum}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{monthStr}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 9, color: 'var(--color-text-light)', margin: '2px 0 0' }}>{weekdayStr.slice(0, 2)}.</p>
        </div>

        {/* Event info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} /> {weekdayStr}, {timeStr} Uhr
          </p>
          {event.location && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={11} /> {event.location}
            </p>
          )}
          {event.description && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', margin: '4px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>{event.description}</p>
          )}
        </div>

        {(event.created_by === currentUserId || isAdmin) && (
          <button onClick={() => onDelete(event.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', flexShrink: 0, alignSelf: 'flex-start' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {!isPast && (
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--color-warm-3)' }}>
          {rsvpOptions.map(({ status, label, activeColor }, i) => (
            <button
              key={status}
              onClick={() => onRsvp(event.id, myStatus === status ? null : status)}
              style={{
                flex: 1, padding: '9px 0', cursor: 'pointer',
                border: 'none',
                borderRight: i < 2 ? '1px solid var(--color-warm-3)' : 'none',
                backgroundColor: myStatus === status ? activeColor : 'transparent',
                color: myStatus === status ? 'white' : 'var(--color-text-muted)',
                fontFamily: 'Lora, serif', fontSize: 12,
                fontWeight: myStatus === status ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Create Event Form ────────────────────────────────────────
function CreateEventForm({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit() {
    if (!title.trim() || !date || !time) return
    setSaving(true)
    const starts_at = new Date(`${date}T${time}`).toISOString()
    const { error } = await onSubmit({ title: title.trim(), starts_at, location: location.trim() || null, description: description.trim() || null })
    if (!error) { showToast('Termin erstellt ✓'); onClose() }
    else showToast('Fehler beim Erstellen', 'error')
    setSaving(false)
  }

  const canSubmit = title.trim() && date && time
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 70, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.25s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }} />
        <h3 style={sheetTitle}>Termin erstellen</h3>
        <label style={lbl}>Titel *</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Hauskreis" style={inp} />
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Datum *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Uhrzeit *</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
        </div>
        <label style={{ ...lbl, marginTop: 12 }}>Ort</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Gemeindehaus" style={inp} />
        <label style={{ ...lbl, marginTop: 12 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Was erwartet euch?" rows={2} style={{ ...inp, resize: 'none' }} />
        <button onClick={handleSubmit} disabled={!canSubmit || saving} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: canSubmit ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Erstelle…' : 'Termin erstellen'}
        </button>
      </div>
    </>
  )
}


// ─── Add Prayer Sheet ─────────────────────────────────────────
function AddPrayerSheet({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    await onSubmit(title.trim(), description.trim() || null)
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 70, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.25s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }} />
        <h3 style={sheetTitle}>🙏 Gebet teilen</h3>
        <label style={lbl}>Worum geht es? *</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Heilung für meine Mutter" style={inp} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()} />
        <label style={{ ...lbl, marginTop: 12 }}>Beschreibung (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} placeholder="Mehr Details…" rows={3} style={{ ...inp, resize: 'none' }} />
        <button onClick={handleSubmit} disabled={!title.trim() || saving} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Teile…' : 'Gebet teilen 🙏'}
        </button>
      </div>
    </>
  )
}

// ─── Fragen an die Gemeinde ────────────────────────────────────
function QuestionCard({ q, currentUserId, onAnswer }) {
  const [answering, setAnswering] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const askerName = q.asker?.full_name || q.asker?.username || (q.asked_by === currentUserId ? 'Du' : 'Jemand')

  async function handleSubmit() {
    if (!text.trim()) return
    setSaving(true)
    await onAnswer(q.id, text.trim())
    setSaving(false)
    setAnswering(false)
    setText('')
  }

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--color-warm-3)', boxShadow: '0 1px 4px rgba(58,46,36,0.06)' }}>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: '0 0 4px' }}>{askerName} · {timeAgo(q.created_at)}</p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.5 }}>{q.question}</p>

      {q.status === 'answered' ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-accent)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Antwort</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.answer}</p>
        </div>
      ) : answering ? (
        <div>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value.slice(0, 500))} placeholder="Antwort schreiben…" rows={3} style={{ ...inp, resize: 'none' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setAnswering(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={handleSubmit} disabled={!text.trim() || saving} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', backgroundColor: text.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Sende…' : 'Antworten'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAnswering(true)} style={{ padding: '7px 14px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12.5, fontWeight: 600, color: 'var(--color-warm-1)', cursor: 'pointer' }}>
          Antworten
        </button>
      )}
    </div>
  )
}

// ─── Member Profile Sheet (Discord Style) ──────────────────────
function MemberProfileSheet({ member, isSelf, isAdmin, adminCount, onClose, onRoleChange, onRemove }) {
  const navigate = useNavigate()
  const profile = member.profile || {}
  const name = profile.full_name || profile.username || 'Unbekannt'
  const isLastAdmin = adminCount <= 1 && member.role === 'admin'

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-dark/20 backdrop-blur-[1px] z-50 transition-opacity" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface rounded-t-[28px] z-50 p-6 pb-12 shadow-[0_-8px_30px_rgba(44,36,22,0.15)] animate-[sheetSlideUp_0.25s_ease-out]">
        <div className="w-10 h-1.5 bg-warm-3 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={name} size={64} isChristian={profile.is_christian} />
          <div>
            <h3 className="font-serif text-[20px] font-bold text-dark m-0 leading-tight flex items-center gap-2">
              {name} {isSelf && <span className="text-xs text-dark-light font-normal">(Du)</span>}
              {member.role === 'admin' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-light text-yellow-900 border border-gold">ADMIN</span>}
            </h3>
            <p className="font-serif text-[14px] text-dark-muted m-0">@{profile.username || '—'}</p>
          </div>
        </div>

        {profile.bio && (
          <div className="bg-bg border border-warm-3 rounded-xl p-4 mb-5">
            <p className="font-sans text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1">Über mich</p>
            <p className="font-serif text-[14px] text-dark leading-relaxed m-0 italic">"{profile.bio}"</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!isSelf && (
            <button
              onClick={() => { onClose(); navigate(`/user/${member.user_id}`) }}
              className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl bg-warm-1 text-white font-serif font-bold text-[15px] shadow-sm hover:bg-warm-2 transition-colors"
            >
              <MessageSquare size={18} /> Nachricht senden
            </button>
          )}

          {isAdmin && !isSelf && (
            <div className="mt-4 pt-4 border-t border-warm-3 flex flex-col gap-2">
              <p className="font-sans text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1">Admin-Aktionen</p>
              
              {!isLastAdmin && (
                <button
                  onClick={() => { onClose(); onRoleChange(member.user_id, member.role === 'admin' ? 'member' : 'admin') }}
                  className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-1.5 border-warm-3 text-dark font-serif font-bold text-[14px] hover:bg-warm-4 transition-colors"
                >
                  {member.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                  {member.role === 'admin' ? 'Admin-Rechte entziehen' : 'Zum Admin machen'}
                </button>
              )}
              
              <button
                onClick={() => { onClose(); onRemove(member.user_id) }}
                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-600 font-serif font-bold text-[14px] hover:bg-red-100 transition-colors"
              >
                <UserMinus size={16} /> Mitglied entfernen
              </button>
            </div>
          )}
          
          {isSelf && (
            <button
              onClick={() => { onClose(); navigate(`/profile`) }}
              className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-warm-3 text-dark font-serif font-bold text-[14px]"
            >
              <User size={16} /> Mein Profil bearbeiten
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function SettingsSheet({
  community, isAdmin, isOwner, currentUserId, onClose, onLeave, onUpdate, onDelete,
  joinRequests, onRespondJoinRequest,
}) {
  const { showToast } = useToast()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(community.name || '')
  const [description, setDescription] = useState(community.description || '')
  const [isPublic, setIsPublic] = useState(community.is_public || false)
  const [joinMode, setJoinMode] = useState(community.join_mode || 'open')
  const isGemeinde = community.community_type === 'gemeinde'
  const [location, setLocation] = useState(community.address ? { address: community.address, lat: community.latitude, lng: community.longitude, shortName: community.address } : null)
  const [meetingInfo, setMeetingInfo] = useState(community.meeting_info || '')
  const [saving, setSaving] = useState(false)
  const [bannerBusy, setBannerBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const bannerInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const isChanged =
    name !== community.name || description !== (community.description || '') ||
    isPublic !== community.is_public || joinMode !== (community.join_mode || 'open') ||
    meetingInfo !== (community.meeting_info || '') ||
    (isGemeinde && location?.address && location.address !== community.address)

  // Avatar-Upload: <community_id>/avatar.jpg im Bucket community-avatars.
  // Nur Admins dürfen schreiben (RLS, siehe phase58_community_admin.sql).
  async function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    try {
      const compressed = await compressImage(file, 600, 0.85)
      const path = `${community.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('community-avatars')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('community-avatars').getPublicUrl(path)
      await onUpdate({ avatar_url: `${data.publicUrl}?t=${Date.now()}` })
      showToast('Profilbild aktualisiert ✓')
    } catch (err) {
      console.error('[CommunityDetail] Avatar-Upload fehlgeschlagen:', err)
      showToast('Fehler beim Hochladen', 'error')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true)
    try {
      await supabase.storage.from('community-avatars').remove([`${community.id}/avatar.jpg`])
      await onUpdate({ avatar_url: null })
      showToast('Profilbild entfernt')
    } catch {
      showToast('Fehler beim Entfernen', 'error')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleDeleteCommunity() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  // Banner-Upload: <community_id>/banner.jpg im Bucket community-banners.
  // Nur Admins dürfen schreiben (RLS, siehe phase57_community_prayers.sql).
  async function handleBannerPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBannerBusy(true)
    try {
      const compressed = await compressImage(file, 1600, 0.85)
      const path = `${community.id}/banner.jpg`
      const { error: upErr } = await supabase.storage
        .from('community-banners')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('community-banners').getPublicUrl(path)
      // Cache-Buster, damit das neue Bild sofort erscheint
      await onUpdate({ banner_url: `${data.publicUrl}?t=${Date.now()}` })
      showToast('Banner aktualisiert ✓')
    } catch (err) {
      console.error('[CommunityDetail] Banner-Upload fehlgeschlagen:', err)
      showToast('Fehler beim Hochladen', 'error')
    } finally {
      setBannerBusy(false)
    }
  }

  async function handleBannerRemove() {
    setBannerBusy(true)
    try {
      await supabase.storage.from('community-banners').remove([`${community.id}/banner.jpg`])
      await onUpdate({ banner_url: null })
      showToast('Banner entfernt')
    } catch {
      showToast('Fehler beim Entfernen', 'error')
    } finally {
      setBannerBusy(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    // Beitritt-nur-mit-Anfrage ergibt nur bei öffentlichen Communities Sinn –
    // wird die Community privat gemacht, fällt der Modus automatisch zurück.
    const updates = { name, description, is_public: isPublic, join_mode: isPublic ? joinMode : 'open' }
    if (isGemeinde) {
      updates.meeting_info = meetingInfo.trim() || null
      if (location?.address) {
        updates.address = location.address
        updates.latitude = location.lat
        updates.longitude = location.lng
      }
    }
    await onUpdate(updates)
    setSaving(false)
    showToast('Community gespeichert ✓')
    onClose()
  }

  async function generateNewCode() {
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    await onUpdate({ invite_code })
    showToast('Code erneuert ✓')
  }

  function copyCode() {
    navigator.clipboard.writeText(community.invite_code || '')
    showToast('Code kopiert ✓')
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-dark/40 backdrop-blur-[2px] z-50 transition-opacity" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface/95 backdrop-blur-xl rounded-t-[32px] z-50 pt-4 px-6 pb-12 max-h-[90vh] overflow-y-auto shadow-glass animate-[sheetSlideUp_0.3s_ease-out]">
        <div className="w-9 h-1 bg-warm-3 rounded-full mx-auto mb-5" />
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-[22px] font-bold text-dark m-0">Community Einstellungen</h3>
        </div>

        {isAdmin ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-bg border-1.5 border-warm-3 rounded-xl px-4 py-2.5 font-serif text-[15px] focus:outline-none focus:border-warm-1" />
            </div>
            
            <div>
              <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">Beschreibung</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-bg border-1.5 border-warm-3 rounded-xl px-4 py-2.5 font-serif text-[15px] resize-none focus:outline-none focus:border-warm-1" />
            </div>

            {isGemeinde && (
              <>
                <div>
                  <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">Standort</label>
                  <AddressAutocomplete value={location} onChange={setLocation} placeholder="Adresse der Gemeinde…" showMapPreview />
                </div>
                <div>
                  <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">Treffzeit</label>
                  <input type="text" value={meetingInfo} onChange={e => setMeetingInfo(e.target.value.slice(0, 120))} placeholder="z.B. Wöchentlich, Mittwoch 19 Uhr" className="w-full bg-bg border-1.5 border-warm-3 rounded-xl px-4 py-2.5 font-serif text-[15px] focus:outline-none focus:border-warm-1" />
                </div>
              </>
            )}

            {/* Profilbild */}
            <div>
              <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">Profilbild</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-2xl border border-warm-3 bg-warm-4 overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={community.avatar_url ? { backgroundImage: `url(${community.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {!community.avatar_url && <span className="text-[10px] text-dark-light italic px-1 text-center">Kein Bild</span>}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
                <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="flex-1 py-2.5 rounded-xl border border-warm-3 font-serif text-[14px] text-dark disabled:opacity-50"
                  >
                    {avatarBusy ? 'Lädt…' : community.avatar_url ? 'Ändern' : 'Hochladen'}
                  </button>
                  {community.avatar_url && (
                    <button
                      onClick={handleAvatarRemove}
                      disabled={avatarBusy}
                      className="px-4 py-2.5 rounded-xl border border-warm-3 font-serif text-[14px] text-dark-muted disabled:opacity-50"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Banner */}
            <div>
              <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">Banner</label>
              <div
                className="w-full h-[104px] rounded-xl border border-warm-3 bg-warm-4 overflow-hidden flex items-center justify-center"
                style={community.banner_url ? { backgroundImage: `url(${community.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!community.banner_url && (
                  <p className="font-serif text-[13px] text-dark-light italic m-0">Kein Banner – der Kopf bleibt schlicht.</p>
                )}
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerPick} className="hidden" />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerBusy}
                  className="flex-1 py-2.5 rounded-xl border border-warm-3 font-serif text-[14px] text-dark disabled:opacity-50"
                >
                  {bannerBusy ? 'Lädt…' : community.banner_url ? 'Banner ändern' : 'Banner hochladen'}
                </button>
                {community.banner_url && (
                  <button
                    onClick={handleBannerRemove}
                    disabled={bannerBusy}
                    className="px-4 py-2.5 rounded-xl border border-warm-3 font-serif text-[14px] text-dark-muted disabled:opacity-50"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-warm-4 border border-warm-3 rounded-xl p-4">
              <div>
                <p className="font-serif text-[14px] font-bold text-dark m-0">Öffentliche Community</p>
                <p className="font-serif text-[12px] text-dark-muted m-0 leading-tight mt-0.5">
                  {isGemeinde ? 'Gemeinden sind immer öffentlich, damit sie auf der Karte gefunden werden.' : 'Jeder kann beitreten und mitlesen.'}
                </p>
              </div>
              <button
                onClick={() => !isGemeinde && setIsPublic(v => !v)}
                disabled={isGemeinde}
                className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-warm-1' : 'bg-warm-3'} ${isGemeinde ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${isPublic ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {isPublic && (
              <div className="flex items-center justify-between bg-warm-4 border border-warm-3 rounded-xl p-4">
                <div>
                  <p className="font-serif text-[14px] font-bold text-dark m-0">Beitritt nur mit Anfrage</p>
                  <p className="font-serif text-[12px] text-dark-muted m-0 leading-tight mt-0.5">
                    Community wird bei „Entdecken" angezeigt, ein Beitritt braucht aber deine Freigabe.
                  </p>
                </div>
                <button
                  onClick={() => setJoinMode(m => m === 'request' ? 'open' : 'request')}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${joinMode === 'request' ? 'bg-warm-1' : 'bg-warm-3'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${joinMode === 'request' ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            )}

            {/* Offene Beitrittsanfragen */}
            {joinRequests.length > 0 && (
              <div className="bg-surface border-1.5 border-warm-3 rounded-xl p-4">
                <p className="font-sans text-[11px] font-bold text-dark-muted uppercase tracking-widest mb-3">
                  Beitrittsanfragen ({joinRequests.length})
                </p>
                <div className="flex flex-col gap-3">
                  {joinRequests.map(r => {
                    const reqName = r.profile?.full_name || r.profile?.username || 'Unbekannt'
                    return (
                      <div key={r.id} className="flex items-center gap-3">
                        <Avatar name={reqName} size={36} isChristian={r.profile?.is_christian} avatarUrl={r.profile?.avatar_url} />
                        <p className="flex-1 min-w-0 font-serif text-[14px] font-semibold text-dark m-0 truncate">{reqName}</p>
                        <button
                          onClick={() => onRespondJoinRequest(r.id, false)}
                          className="px-3 py-2 rounded-lg border border-warm-3 text-dark-muted font-serif text-[13px] font-semibold"
                        >
                          Ablehnen
                        </button>
                        <button
                          onClick={() => onRespondJoinRequest(r.id, true)}
                          className="px-3 py-2 rounded-lg bg-warm-1 text-white font-serif text-[13px] font-semibold"
                        >
                          Annehmen
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!isPublic && community.invite_code && (
              <div className="bg-surface border-1.5 border-warm-3 rounded-xl p-4 mt-2">
                <p className="font-sans text-[11px] font-bold text-dark-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Shield size={12} /> Einladungscode
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-[24px] font-bold text-dark tracking-[0.2em]">{community.invite_code}</span>
                  <div className="flex gap-2">
                    <button onClick={generateNewCode} className="p-2 border border-warm-3 rounded-lg text-dark-muted hover:bg-black/5" title="Code erneuern">
                      <RefreshCw size={16} />
                    </button>
                    <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-2 border-1.5 border-warm-1 rounded-lg text-warm-1 font-semibold text-sm hover:bg-warm-1 hover:text-white transition-colors">
                      <Copy size={14} /> Kopieren
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={!isChanged || saving} className={`w-full py-3.5 rounded-xl font-serif text-[15px] font-bold mt-2 transition-all ${isChanged ? 'bg-warm-1 text-white shadow-md' : 'bg-warm-3/50 text-dark-muted'}`}>
              {saving ? 'Speichere...' : 'Änderungen speichern'}
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <p className="font-serif text-[15px] text-dark-muted italic">Nur Administratoren können die Einstellungen dieser Community bearbeiten.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-warm-3">
          {!showLeaveConfirm ? (
            <button onClick={() => setShowLeaveConfirm(true)} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-1.5 border-red-200 text-red-600 font-serif text-[15px] font-bold hover:bg-red-50 transition-colors">
              <LogOut size={18} /> Community verlassen
            </button>
          ) : (
            <div className="bg-red-50 rounded-xl p-5 border border-red-200">
              <p className="font-serif text-[15px] text-red-900 text-center mb-4">Wirklich <strong>{community.name}</strong> verlassen?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 rounded-xl bg-surface border border-red-200 text-dark-muted font-bold font-serif">Abbrechen</button>
                <button onClick={onLeave} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold font-serif shadow-sm">Verlassen</button>
              </div>
            </div>
          )}
        </div>

        {/* Nur der Ersteller darf die Community löschen. */}
        {isOwner && (
          <div className="mt-4 pt-4 border-t border-warm-3">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-1.5 border-red-300 bg-red-50 text-red-700 font-serif text-[15px] font-bold hover:bg-red-100 transition-colors"
              >
                <Trash2 size={18} /> Community löschen
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-5 border border-red-300">
                <p className="font-serif text-[15px] text-red-900 mb-2">
                  Löscht <strong>{community.name}</strong> endgültig – Chat, Beiträge, Events und Gebete aller Mitglieder gehen unwiderruflich verloren.
                </p>
                <p className="font-serif text-[13px] text-red-800 mb-3">
                  Gib zum Bestätigen den Namen <strong>{community.name}</strong> ein:
                </p>
                <input
                  type="text" value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)}
                  placeholder={community.name}
                  className="w-full bg-surface border-1.5 border-red-300 rounded-xl px-4 py-2.5 font-serif text-[15px] mb-3 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteTyped('') }}
                    className="flex-1 py-3 rounded-xl bg-surface border border-red-300 text-dark-muted font-bold font-serif"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDeleteCommunity}
                    disabled={deleteTyped !== community.name || deleting}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold font-serif shadow-sm disabled:opacity-40"
                  >
                    {deleting ? 'Löscht…' : 'Endgültig löschen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Shared styles ────────────────────────────────────────────
const sheetTitle = { fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }

// ─── CommunityDetail (Main) ───────────────────────────────────
export default function CommunityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { leaveCommunity, deleteCommunity } = useCommunities()

  const {
    community, members, myMembership, isAdmin, isOwner, adminCount,
    loading, conversationId, changeRole, removeMember,
    posts, createPost, deletePost, togglePinPost,
    events, myRsvps, createEvent, deleteEvent, rsvpEvent,
    updateCommunity, joinRequests, respondToJoinRequest,
    questions, answerQuestion,
  } = useCommunityDetail(id)
  const { messages, loading: chatLoading, sendMessage, deleteMessage, updateMessage } = useChat(conversationId)
  const { prayers, loading: prayersLoading, createPrayer, reload: reloadPrayers } = useCommunityPrayers(id, conversationId)

  const [activeTab, setActiveTab] = useState('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showAddPrayer, setShowAddPrayer] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const isAtBottomRef = useRef(true)

  const upcomingEvents = events.filter(e => new Date(e.starts_at) >= new Date())
  const pastEvents = events.filter(e => new Date(e.starts_at) < new Date())

  useEffect(() => {
    if (activeTab !== 'chat') return
    if (!chatLoading && isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, chatLoading, activeTab])

  useEffect(() => {
    if (activeTab !== 'chat' || chatLoading) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [chatLoading, activeTab])

  function handleScroll() {
    const c = messagesContainerRef.current
    if (!c) return
    isAtBottomRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 60
  }

  async function handleSend(text) {
    isAtBottomRef.current = true
    await sendMessage(text)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function handleRoleChange(userId, role) {
    await changeRole(userId, role)
    showToast(role === 'admin' ? 'Admin-Rechte vergeben ✓' : 'Admin-Rechte entzogen')
  }

  async function handleRemove(userId) {
    if (!window.confirm('Mitglied wirklich entfernen?')) return
    await removeMember(userId)
    showToast('Mitglied entfernt')
  }

  async function handleLeave() {
    if (isAdmin && adminCount <= 1) {
      showToast('Als einziger Admin kannst du nicht austreten.', 'error')
      return
    }
    try {
      await leaveCommunity(id)
      showToast('Community verlassen')
      navigate('/friends', { replace: true })
    } catch {
      showToast('Fehler beim Austreten', 'error')
    }
  }

  // Nur der Ersteller sieht diese Aktion (SettingsSheet blendet sie sonst aus).
  async function handleDeleteCommunity() {
    try {
      // Storage-Objekte vorab entfernen (best effort – die Community-Zeile
      // fällt gleich per DELETE weg, verwaiste Dateien blieben sonst liegen).
      await Promise.allSettled([
        supabase.storage.from('community-banners').remove([`${id}/banner.jpg`]),
        supabase.storage.from('community-avatars').remove([`${id}/avatar.jpg`]),
      ])
      await deleteCommunity(id)
      showToast('Community gelöscht')
      navigate('/friends', { replace: true })
    } catch {
      showToast('Fehler beim Löschen', 'error')
    }
  }

  async function handleRespondJoinRequest(requestId, approve) {
    try {
      await respondToJoinRequest(requestId, approve)
      showToast(approve ? 'Beigetreten ✓' : 'Anfrage abgelehnt')
    } catch {
      showToast('Fehler beim Bearbeiten', 'error')
    }
  }

  async function handleDeletePost(postId) {
    await deletePost(postId)
    showToast('Beitrag gelöscht')
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm('Termin wirklich löschen?')) return
    await deleteEvent(eventId)
    showToast('Termin gelöscht')
  }

  async function handleAddPrayer(title, description) {
    try {
      await createPrayer(title, description)
      showToast('Gebetsanliegen geteilt 🙏')
    } catch (err) {
      console.error('[CommunityDetail] Gebet anlegen fehlgeschlagen:', err)
      showToast('Fehler beim Teilen', 'error')
    }
  }

  const isGemeinde = community?.community_type === 'gemeinde'
  const openQuestions = questions.filter(q => q.status === 'open').length

  const tabs = [
    { key: 'chat', label: 'Chat', icon: MessageCircle },
    { key: 'board', label: 'Pinnwand', icon: Pin },
    { key: 'events', label: 'Events', icon: CalendarDays },
    { key: 'prayers', label: 'Gebete', icon: HandHeart },
    ...(isGemeinde ? [{ key: 'questions', label: 'Fragen', icon: HelpCircle }] : []),
  ]

  async function handleAnswerQuestion(questionId, answer) {
    await answerQuestion(questionId, answer)
    showToast('Antwort gesendet ✓')
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)' }}><ArrowLeft size={20} /></button>
          <div style={{ height: 18, width: 160, borderRadius: 8, backgroundColor: 'var(--color-warm-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-warm-3)', borderTopColor: 'var(--color-warm-1)', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </div>
    )
  }

  if (!community) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', height: '100%' }}>
        <div style={{ backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><ArrowLeft size={20} /></button>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Nicht gefunden</span>
        </div>
      </div>
    )
  }

  const initials = getCommunityInitials(community.name)
  const cover = communityCover(community.id || community.name)
  const memberPreview = members.map(m => ({ avatar_url: m.profile?.avatar_url || null, full_name: m.profile?.full_name || m.profile?.username })).slice(0, 6)
  const isAdminRole = myMembership?.role === 'admin'
  const hasBanner = !!community.banner_url

  return (
    <div className="flex flex-col bg-bg relative md:max-w-2xl md:mx-auto md:w-full" style={{ height: '100dvh', paddingBottom: 'var(--bottom-nav-h, 64px)' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      {/* Ohne eigenes Bannerbild bleibt der Kopf ruhig und theme-abhängig –
          kein bunter Verlaufsbalken. Admins können in den Einstellungen ein
          Banner hochladen; dann trägt es den Kopf. */}
      <div style={{ flexShrink: 0, backgroundColor: 'var(--color-bg)' }}>
        <div style={{
          position: 'relative',
          height: hasBanner ? 132 : 56,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: hasBanner ? 'transparent' : 'var(--color-header-wash)',
          backgroundImage: hasBanner ? `url(${community.banner_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: hasBanner ? 'none' : '1px solid var(--color-border)',
        }}>
          {hasBanner && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.30), transparent 55%, rgba(0,0,0,0.22))', pointerEvents: 'none' }} />
          )}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: hasBanner ? '12px 12px' : '9px 10px' }}>
            <button onClick={() => navigate(-1)} aria-label="Zurück" style={hasBanner ? glassBtn : plainHeaderBtn}>
              <ArrowLeft size={20} color={hasBanner ? '#fff' : 'var(--color-text)'} />
            </button>
            <button onClick={() => setShowSettings(true)} aria-label="Einstellungen" style={{ ...(hasBanner ? glassBtn : plainHeaderBtn), position: 'relative' }}>
              <Settings size={19} color={hasBanner ? '#fff' : 'var(--color-text)'} />
              {isAdmin && joinRequests.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, padding: '0 3px',
                  borderRadius: 999, backgroundColor: 'var(--color-accent)', color: '#fff',
                  fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid var(--color-bg)',
                }}>
                  {joinRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '0 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: hasBanner ? -32 : 12 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, flexShrink: 0,
              background: community.avatar_url ? `url(${community.avatar_url})` : cover.gradient,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: '4px solid var(--color-bg)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'Lora, serif', fontSize: 27, fontWeight: 800,
            }}>
              {!community.avatar_url && initials}
            </div>
          </div>

          <h2 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: '12px 0 2px', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            {community.name}
          </h2>
          {community.description && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
              {community.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: community.description ? 0 : 10 }}>
            {/* Mitglieder-Pille: Label + Avatare + Anzahl, öffnet das Sheet */}
            <button
              onClick={() => setShowMembers(true)}
              aria-label="Mitglieder anzeigen"
              style={{ ...metaChip, gap: 7, cursor: 'pointer', borderColor: showMembers ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              Mitglieder
              <MemberAvatarStack members={memberPreview} count={members.length} size={20} max={3} />
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{members.length}</span>
            </button>
            <span style={metaChip}>
              {community.is_public ? <><Globe size={12} /> Öffentlich</> : <><Lock size={12} /> Privat</>}
            </span>
            {isAdminRole && (
              <span style={{ ...metaChip, color: 'var(--color-gold-text)', backgroundColor: 'var(--color-gold-light)', borderColor: 'var(--color-accent)' }}>
                <Shield size={12} /> Admin
              </span>
            )}
          </div>
        </div>

        {/* Tab-Navigation (Premium-Segmented) */}
        <div style={{ padding: '14px 16px 12px' }}>
          <SegmentedTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* CHAT tab */}
          {activeTab === 'chat' && (
            <>
              <div ref={messagesContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>
                {chatLoading && messages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[false, true, false, true, false].map((right, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start' }}>
                        <div style={{ height: 36, width: '45%', borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      </div>
                    ))}
                  </div>
                )}
                {!chatLoading && messages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 36, margin: '0 0 10px' }}>💬</p>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 5px' }}>Noch keine Nachrichten</p>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Schreib die erste Nachricht!</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const prev = messages[i - 1]
                  const showDay = !prev || !sameDay(msg.created_at, prev.created_at)
                  const isOwn = msg.sender_id === user?.id
                  return (
                    <div key={msg.id || `opt-${i}`}>
                      {showDay && <DaySeparator label={formatDaySeparator(msg.created_at)} />}
                      <MessageBubble msg={msg} isOwn={isOwn} />
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <InputBar onSend={handleSend} />
            </>
          )}

          {/* PINNWAND tab */}
          {activeTab === 'board' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              {isAdmin && (
                <button
                  onClick={() => setShowCreatePost(true)}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 16, boxShadow: '0 2px 8px rgba(175,138,100,0.3)' }}
                >
                  <Plus size={15} /> Ankündigung schreiben
                </button>
              )}

              {/* Pinned posts */}
              {posts.filter(p => p.is_pinned).map(p => (
                <PostCard key={p.id} post={p} currentUserId={user.id} isAdmin={isAdmin} onDelete={handleDeletePost} onTogglePin={togglePinPost} />
              ))}

              {/* Normal posts */}
              {posts.filter(p => !p.is_pinned).length === 0 && posts.filter(p => p.is_pinned).length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>📌</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Beiträge.</p>
                </div>
              )}
              {posts.filter(p => !p.is_pinned).map(p => (
                <PostCard key={p.id} post={p} currentUserId={user.id} isAdmin={isAdmin} onDelete={handleDeletePost} onTogglePin={togglePinPost} />
              ))}
            </div>
          )}

          {/* EVENTS tab */}
          {activeTab === 'events' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateEvent(true)}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '1.5px dashed var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}
                >
                  <Plus size={14} /> Termin erstellen
                </button>
              )}

              {upcomingEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>📅</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Keine anstehenden Termine.</p>
                </div>
              )}
              {upcomingEvents.map(ev => (
                <EventCard key={ev.id} event={ev} myStatus={myRsvps[ev.id]} onRsvp={rsvpEvent} currentUserId={user.id} isAdmin={isAdmin} onDelete={handleDeleteEvent} />
              ))}

              {pastEvents.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={() => setShowPastEvents(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 0', marginBottom: 8 }}
                  >
                    {showPastEvents ? '▲' : '▼'} Vergangene Termine ({pastEvents.length})
                  </button>
                  {showPastEvents && pastEvents.map(ev => (
                    <EventCard key={ev.id} event={ev} myStatus={myRsvps[ev.id]} onRsvp={rsvpEvent} currentUserId={user.id} isAdmin={isAdmin} onDelete={handleDeleteEvent} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GEBETE tab */}
          {activeTab === 'prayers' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  Gebetsanliegen
                </h4>
                <button
                  onClick={() => setShowAddPrayer(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <Plus size={12} /> Gebet hinzufügen
                </button>
              </div>

              {prayersLoading ? (
                <div style={{ height: 120, borderRadius: 16, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : prayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ fontSize: 36, margin: '0 0 10px' }}>🙏</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>Noch keine Gebetsanliegen</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
                    Teile ein Anliegen mit der Community.
                  </p>
                </div>
              ) : (
                <PrayerCardList prayers={prayers} onChanged={reloadPrayers} showContext={false} />
              )}
            </div>
          )}

          {/* FRAGEN tab */}
          {activeTab === 'questions' && isGemeinde && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              {questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ fontSize: 36, margin: '0 0 10px' }}>❓</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>Noch keine Fragen</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
                    Fragen von Besuchern der Karte erscheinen hier.
                  </p>
                </div>
              ) : (
                questions.map(q => (
                  <QuestionCard key={q.id} q={q} currentUserId={user.id} onAnswer={handleAnswerQuestion} />
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {showMembers && (
        <MembersSheet
          members={members}
          currentUserId={user?.id}
          onClose={() => setShowMembers(false)}
          onSelectMember={(m) => setSelectedMember(m)}
        />
      )}

      {showSettings && (
        <SettingsSheet
          community={community} isAdmin={isAdmin} isOwner={isOwner} currentUserId={user?.id}
          onClose={() => setShowSettings(false)} onLeave={handleLeave} onUpdate={updateCommunity}
          onDelete={handleDeleteCommunity}
          joinRequests={joinRequests} onRespondJoinRequest={handleRespondJoinRequest}
        />
      )}
      {selectedMember && (
        <MemberProfileSheet
          member={selectedMember}
          isSelf={selectedMember.user_id === user?.id}
          isAdmin={isAdmin}
          adminCount={adminCount}
          onClose={() => setSelectedMember(null)}
          onRoleChange={changeRole}
          onRemove={removeMember}
        />
      )}
      {showCreateEvent && (
        <CreateEventForm onClose={() => setShowCreateEvent(false)} onSubmit={createEvent} />
      )}
      {showCreatePost && (
        <CreateAnnouncementSheet onClose={() => setShowCreatePost(false)} onSubmit={createPost} />
      )}
      {showAddPrayer && (
        <AddPrayerSheet onClose={() => setShowAddPrayer(false)} onSubmit={handleAddPrayer} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes sheetSlideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}
