import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings, Copy, LogOut, SendHorizontal,
  MoreVertical, Shield, Plus, Trash2, MapPin, Clock, Pin, Globe, Lock, Users,
  ShieldOff, UserMinus, User, MessageSquare, RefreshCw
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCommunityDetail } from '../hooks/useCommunityDetail'
import { useCommunities } from '../hooks/useCommunities'
import { useChat } from '../hooks/useChat'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

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
function Avatar({ name, size = 38, isChristian }) {
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
        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        backgroundColor: isOwn ? 'var(--color-warm-1)' : 'var(--color-white)',
        border: isOwn ? 'none' : '1.5px solid var(--color-warm-3)',
        boxShadow: '0 1px 3px rgba(58,46,36,0.06)',
      }}>
        {msg.type === 'prayer_request' ? (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--color-warm-1)', margin: '0 0 4px' }}>🙏 Gebetsanliegen</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: isOwn ? 'white' : 'var(--color-text)', margin: 0 }}>{msg.text}</p>
            {msg.bible_verse_text && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontStyle: 'italic', color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>{msg.bible_verse_text}</p>
            )}
          </div>
        ) : msg.type === 'bible_verse' ? (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: isOwn ? 'white' : 'var(--color-text)', margin: '0 0 3px' }}>📖 {msg.bible_verse_reference}</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontStyle: 'italic', color: isOwn ? 'rgba(255,255,255,0.88)' : 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>{msg.bible_verse_text}</p>
          </div>
        ) : (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: isOwn ? 'white' : 'var(--color-text)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
        style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0, backgroundColor: text.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-4)', color: text.trim() ? 'white' : 'var(--color-text-light)', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
      border: `1px solid ${isPinned ? '#C9A84C' : 'var(--color-warm-3)'}`,
      borderLeft: `4px solid ${isPinned ? '#C9A84C' : 'var(--color-warm-1)'}`,
      boxShadow: '0 1px 4px rgba(58,46,36,0.06)',
      position: 'relative',
    }}>
      {isPinned && (
        <div style={{ position: 'absolute', top: 10, right: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, color: '#8A6020', backgroundColor: 'rgba(201,168,76,0.15)', padding: '2px 7px', borderRadius: 20 }}>
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
            style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: isPinned ? '#C9A84C' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: isPinned ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: content.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: content.trim() ? 'pointer' : 'not-allowed' }}
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
    { status: 'maybe', label: '? Vielleicht', activeColor: '#C9A84C' },
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
        <button onClick={handleSubmit} disabled={!canSubmit || saving} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: canSubmit ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Erstelle…' : 'Termin erstellen'}
        </button>
      </div>
    </>
  )
}

// ─── Prayer Card (Redesigned) ─────────────────────────────────
function PrayerCard({ msg, currentUserId }) {
  const name = msg.profiles?.full_name || msg.profiles?.username || 'Unbekannt'
  const isOwn = msg.sender_id === currentUserId
  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, borderLeft: '4px solid var(--color-warm-1)', border: '1px solid var(--color-warm-3)', borderLeftWidth: 4, boxShadow: '0 1px 4px rgba(58,46,36,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={name} size={32} isChristian={msg.profiles?.is_christian} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name} {isOwn && <span style={{ fontWeight: 400, color: 'var(--color-text-light)', fontSize: 11 }}>(Du)</span>}
          </p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: 0 }}>{timeAgo(msg.created_at)}</p>
        </div>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--color-warm-1)', flexShrink: 0 }}>🙏</span>
      </div>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', lineHeight: 1.4 }}>{msg.text}</p>
      {msg.bible_verse_text && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>{msg.bible_verse_text}</p>
      )}
    </div>
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
        <button onClick={handleSubmit} disabled={!title.trim() || saving} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Teile…' : 'Gebet teilen 🙏'}
        </button>
      </div>
    </>
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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white rounded-t-[28px] z-50 p-6 pb-12 shadow-[0_-8px_30px_rgba(44,36,22,0.15)] animate-[sheetSlideUp_0.25s_ease-out]">
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

function SettingsSheet({ community, isAdmin, currentUserId, onClose, onLeave, onUpdate }) {
  const { showToast } = useToast()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [name, setName] = useState(community.name || '')
  const [description, setDescription] = useState(community.description || '')
  const [isPublic, setIsPublic] = useState(community.is_public || false)
  const [saving, setSaving] = useState(false)
  const isChanged = name !== community.name || description !== (community.description || '') || isPublic !== community.is_public

  async function handleSave() {
    setSaving(true)
    await onUpdate({ name, description, is_public: isPublic })
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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-xl rounded-t-[32px] z-50 pt-4 px-6 pb-12 max-h-[90vh] overflow-y-auto shadow-glass animate-[sheetSlideUp_0.3s_ease-out]">
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

            <div className="flex items-center justify-between bg-warm-4 border border-warm-3 rounded-xl p-4">
              <div>
                <p className="font-serif text-[14px] font-bold text-dark m-0">Öffentliche Community</p>
                <p className="font-serif text-[12px] text-dark-muted m-0 leading-tight mt-0.5">Jeder kann beitreten und mitlesen.</p>
              </div>
              <button onClick={() => setIsPublic(v => !v)} className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-warm-1' : 'bg-warm-3'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${isPublic ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {!isPublic && community.invite_code && (
              <div className="bg-white border-1.5 border-warm-3 rounded-xl p-4 mt-2">
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
                <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 rounded-xl bg-white border border-red-200 text-dark-muted font-bold font-serif">Abbrechen</button>
                <button onClick={onLeave} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold font-serif shadow-sm">Verlassen</button>
              </div>
            </div>
          )}
        </div>
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
  const { leaveCommunity } = useCommunities()

  const {
    community, members, myMembership, isAdmin, adminCount,
    loading, conversationId, changeRole, removeMember,
    posts, createPost, deletePost, togglePinPost,
    events, myRsvps, createEvent, deleteEvent, rsvpEvent,
    updateCommunity,
  } = useCommunityDetail(id)
  const { messages, loading: chatLoading, sendMessage } = useChat(conversationId)

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

  const prayerMessages = messages.filter(m => m.type === 'prayer_request' && !m.is_deleted)
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
    if (!conversationId) return
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'prayer_request',
      text: title,
      bible_verse_text: description || null,
    })
    showToast('Gebetsanliegen geteilt 🙏')
  }

  const tabs = [
    { key: 'chat', label: '💬 Chat' },
    { key: 'board', label: '📌 Pinnwand' },
    { key: 'events', label: '📅 Events' },
    { key: 'prayers', label: '🙏 Gebete' },
  ]

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

  const initials = (community.name || 'Unbekannt').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="h-full flex flex-col bg-bg relative">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#F0E6D8] to-[#FBF6EF] px-4 pt-3 pb-3.5 shrink-0 relative overflow-hidden border-b border-warm-3">
        {/* Deko circles */}
        <div className="absolute -top-6 -right-4 w-24 h-24 rounded-full bg-warm-3/35 pointer-events-none blur-xl" />
        <div className="absolute -bottom-5 -left-3 w-16 h-16 rounded-full bg-warm-3/25 pointer-events-none blur-lg" />

        {/* Back + Settings row */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <button onClick={() => navigate(-1)} className="p-1.5 text-dark hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-white/60 text-dark-muted hover:bg-white/80 transition-colors shadow-sm backdrop-blur-sm">
            <Settings size={20} />
          </button>
        </div>

        {/* Community info */}
        <div className="flex gap-4 items-start relative z-10">
          <div className="w-14 h-14 rounded-2xl shrink-0 bg-warm-1 flex items-center justify-center font-serif text-xl font-bold text-white shadow-lg shadow-warm-1/30 border border-warm-2/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-[22px] font-bold text-dark mb-1 leading-tight tracking-tight">
              {community.name}
            </h2>
            {community.description && (
              <p className="font-serif text-sm text-dark-muted mb-2 italic leading-snug truncate">
                {community.description}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <span className="font-serif text-[11px] font-medium text-dark-muted bg-white/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-warm-3/80 shadow-sm flex items-center gap-1.5">
                <Users size={12}/> {members.length} Mitglieder
              </span>
              <span className="font-serif text-[11px] font-medium text-dark-muted bg-white/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-warm-3/80 shadow-sm flex items-center gap-1.5">
                {community.is_public ? <><Globe size={11} /> Öffentlich</> : <><Lock size={11} /> Privat</>}
              </span>
              {myMembership?.role === 'admin' && (
                <span className="font-serif text-[11px] font-bold px-2.5 py-1 rounded-full bg-gold-light/40 text-[#8A6020] border border-[#C9A84C]/40 shadow-sm flex items-center gap-1.5">
                  <Shield size={11}/> Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ─────────────────────────────────────── */}
      <div className="flex bg-white/60 backdrop-blur-md border border-warm-3/60 mx-4 mt-[-4px] mb-2 rounded-xl shadow-glass-sm relative z-20">
        {[
          { value: members.length, label: 'Mitglieder' },
          { value: prayerMessages.length, label: 'Gebete' },
          { value: posts.filter(p => !p.is_pinned).length, label: 'Beiträge' },
        ].map((stat, i) => (
          <div key={i} className={`flex-1 py-1.5 text-center ${i < 2 ? 'border-r border-warm-3/40' : ''}`}>
            <p className="font-serif text-[16px] font-bold text-warm-1 m-0">{stat.value}</p>
            <p className="font-serif text-[9px] text-dark-muted m-0 tracking-wide uppercase">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', flexShrink: 0, paddingRight: 8 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none',
              fontFamily: 'Lora, serif', fontSize: 12,
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: activeTab === t.key ? '2px solid var(--color-warm-1)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="border-l border-warm-3 my-2 mx-1" />
        <button
          onClick={() => setShowMembers(v => !v)}
          className={`px-3 flex items-center gap-1.5 font-sans text-[11px] font-bold tracking-wide transition-colors rounded-lg my-1.5 ${showMembers ? 'bg-warm-1 text-white' : 'bg-warm-4 text-dark-muted hover:bg-warm-3'}`}
        >
          <Users size={14} /> 
          <span className="hidden sm:inline">Mitglieder</span>
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* CHAT tab */}
          {activeTab === 'chat' && (
            <>
              <div ref={messagesContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px' }}>
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
                  style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 16, boxShadow: '0 2px 8px rgba(175,138,100,0.3)' }}
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
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                >
                  <Plus size={12} /> Gebet hinzufügen
                </button>
              </div>

              {prayerMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ fontSize: 36, margin: '0 0 10px' }}>🙏</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>Noch keine Gebetsanliegen</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                    Teile ein Anliegen mit der Community.
                  </p>
                </div>
              ) : (
                prayerMessages.map(m => <PrayerCard key={m.id} msg={m} currentUserId={user?.id} />)
              )}
            </div>
          )}
        </div>

        {/* ── Discord-like Member Sidebar ──────────────────────────────── */}
        {showMembers && (
          <div className="w-[140px] border-l border-warm-3 bg-white overflow-y-auto shrink-0 pt-2 pb-6 px-2 scrollbar-none animate-[slideInRight_0.2s_ease-out]">
            <p className="font-sans text-[10px] font-bold text-dark-muted uppercase tracking-widest px-2 mb-2 mt-2">
              Mitglieder &mdash; {members.length}
          </p>
          <div className="flex flex-col gap-1">
            {members.map(m => {
              const name = m.profile?.full_name || m.profile?.username || 'Unbekannt'
              const shortName = name.length > 14 ? name.substring(0, 12) + '...' : name
              const isSelf = m.user_id === user?.id
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className={`flex items-center gap-2.5 px-2 py-1.5 w-full border-none bg-transparent rounded-lg cursor-pointer transition-colors hover:bg-warm-4 ${isSelf ? 'bg-warm-4/50' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Avatar name={name} size={30} isChristian={m.profile?.is_christian} />
                    <div className="absolute bottom-[-2px] right-[-2px] w-[11px] h-[11px] rounded-full bg-green-500 border-2 border-white shadow-sm" />
                  </div>
                  <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 w-full">
                      <p className={`font-serif text-[13px] m-0 truncate ${isSelf ? 'font-bold text-warm-1' : 'font-medium text-dark'}`}>
                        {shortName}
                      </p>
                    </div>
                    {m.role === 'admin' ? (
                      <span className="font-sans text-[9px] font-bold text-gold tracking-wide">ADMIN</span>
                    ) : (
                      <span className="font-sans text-[9px] text-dark-muted truncate">@{m.profile?.username || 'user'}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        )}
      </div>

      {showSettings && (
        <SettingsSheet 
          community={community} isAdmin={isAdmin} currentUserId={user?.id} 
          onClose={() => setShowSettings(false)} onLeave={handleLeave} onUpdate={updateCommunity} 
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
