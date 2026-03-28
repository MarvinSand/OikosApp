import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings, Copy, LogOut, SendHorizontal,
  MoreVertical, Shield, Plus, Trash2, MapPin, Clock,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCommunityDetail } from '../hooks/useCommunityDetail'
import { useCommunities } from '../hooks/useCommunities'
import { useChat } from '../hooks/useChat'
import { useToast } from '../context/ToastContext'

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
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
            <p style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--color-text-light)', margin: '0 0 4px' }}>🙏 Gebetsanliegen</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: isOwn ? 'white' : 'var(--color-text)', margin: 0 }}>{msg.text}</p>
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
    <div style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-warm-3)', padding: '8px 10px', display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
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

// ─── Post Card ────────────────────────────────────────────────
function PostCard({ post, currentUserId, onDelete }) {
  const name = post.profiles?.full_name || post.profiles?.username || 'Unbekannt'
  const date = new Date(post.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--color-warm-3)', boxShadow: '0 1px 4px rgba(58,46,36,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <Avatar name={name} size={36} isChristian={post.profiles?.is_christian} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: 0 }}>{date}</p>
        </div>
        {post.author_id === currentUserId && (
          <button onClick={() => onDelete(post.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', flexShrink: 0 }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.content}
      </p>
    </div>
  )
}

// ─── Create Post ──────────────────────────────────────────────
function CreatePost({ onSubmit }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!text.trim()) return
    setSaving(true)
    await onSubmit(text.trim())
    setText('')
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--color-warm-3)' }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, 500))}
        placeholder="Was möchtest du teilen?"
        rows={3}
        style={{ width: '100%', resize: 'none', border: 'none', backgroundColor: 'transparent', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', outline: 'none', lineHeight: 1.6 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-warm-3)' }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>{text.length}/500</span>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || saving}
          style={{ padding: '7px 16px', borderRadius: 10, border: 'none', backgroundColor: text.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'not-allowed' }}
        >
          {saving ? '…' : 'Posten'}
        </button>
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────
function EventCard({ event, myStatus, onRsvp, currentUserId, isAdmin, onDelete }) {
  const date = new Date(event.starts_at)
  const dateStr = date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const isPast = date < new Date()

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--color-warm-3)', opacity: isPast ? 0.65 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 48, borderRadius: 10, backgroundColor: 'var(--color-warm-4)', padding: '6px 0', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-warm-1)', margin: 0, lineHeight: 1 }}>{date.getDate()}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase' }}>
            {date.toLocaleDateString('de-DE', { month: 'short' })}
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {dateStr}, {timeStr} Uhr
          </p>
          {event.location && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} /> {event.location}
            </p>
          )}
          {event.description && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', margin: '5px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>{event.description}</p>
          )}
        </div>
        {(event.created_by === currentUserId || isAdmin) && (
          <button onClick={() => onDelete(event.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', flexShrink: 0 }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {!isPast && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[
            ['going', '✓ Zusagen', 'var(--color-accent)'],
            ['maybe', '? Vielleicht', 'var(--color-gold)'],
            ['not_going', '✗ Absagen', '#C0392B'],
          ].map(([status, label, activeColor]) => (
            <button
              key={status}
              onClick={() => onRsvp(event.id, myStatus === status ? null : status)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer',
                border: `1.5px solid ${myStatus === status ? activeColor : 'var(--color-warm-3)'}`,
                backgroundColor: myStatus === status ? activeColor : 'transparent',
                color: myStatus === status ? 'white' : 'var(--color-text-muted)',
                fontFamily: 'Lora, serif', fontSize: 11,
                fontWeight: myStatus === status ? 600 : 400,
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
    const { error } = await onSubmit({
      title: title.trim(),
      starts_at,
      location: location.trim() || null,
      description: description.trim() || null,
    })
    if (!error) {
      showToast('Termin erstellt ✓')
      onClose()
    } else {
      showToast('Fehler beim Erstellen', 'error')
    }
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
          <div style={{ flex: 1 }}>
            <label style={lbl}>Datum *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Uhrzeit *</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} />
          </div>
        </div>

        <label style={{ ...lbl, marginTop: 12 }}>Ort</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Gemeindehaus" style={inp} />

        <label style={{ ...lbl, marginTop: 12 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Was erwartet euch?" rows={2} style={{ ...inp, resize: 'none' }} />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 18, backgroundColor: canSubmit ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Erstelle…' : 'Termin erstellen'}
        </button>
      </div>
    </>
  )
}

// ─── Prayer Card ──────────────────────────────────────────────
function PrayerCard({ msg }) {
  const name = msg.profiles?.full_name || msg.profiles?.username || 'Unbekannt'
  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--color-warm-3)', boxShadow: '0 1px 4px rgba(58,46,36,0.06)' }}>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--color-warm-1)', margin: '0 0 6px' }}>🙏 Gebetsanliegen</p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>{msg.text}</p>
      {msg.bible_verse_text && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 8px', lineHeight: 1.5, fontStyle: 'italic' }}>{msg.bible_verse_text}</p>
      )}
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: 0 }}>
        {name} · {formatTime(msg.created_at)}
      </p>
    </div>
  )
}

// ─── Member Menu Button ───────────────────────────────────────
function MemberMenuBtn({ member, adminCount, onRoleChange, onRemove }) {
  const [open, setOpen] = useState(false)
  const isLastAdmin = adminCount <= 1 && member.role === 'admin'
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)' }}>
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.14)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 190 }}>
            {!isLastAdmin && (
              <button onClick={() => { setOpen(false); onRoleChange(member.user_id, member.role === 'admin' ? 'member' : 'admin') }} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}>
                {member.role === 'admin' ? 'Admin-Rechte entziehen' : 'Zum Admin machen'}
              </button>
            )}
            <button onClick={() => { setOpen(false); onRemove(member.user_id) }} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: '#C0392B', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--color-warm-3)' }}>
              Entfernen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Settings Sheet ───────────────────────────────────────────
function SettingsSheet({ community, isAdmin, members, adminCount, currentUserId, onClose, onLeave, onRoleChange, onRemove }) {
  const { showToast } = useToast()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(community.invite_code)
    showToast('Code kopiert ✓')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 70, padding: '16px 20px 48px', maxHeight: '85vh', overflowY: 'auto', animation: 'sheetSlideUp 0.25s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-warm-1)', border: '1.5px solid var(--color-warm-3)', flexShrink: 0 }}>
            {community.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 3px' }}>{community.name}</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>👥 {members.length} Mitglieder</p>
          </div>
        </div>

        {isAdmin && community.invite_code && (
          <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 14, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={11} /> Einladungscode
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: 'var(--color-text)', letterSpacing: 4, flex: 1 }}>
                {community.invite_code}
              </span>
              <button onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 500 }}>
                <Copy size={13} /> Kopieren
              </button>
            </div>
          </div>
        )}

        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Mitglieder ({members.length})
        </p>
        {members.map(m => {
          const name = m.profile?.full_name || m.profile?.username || 'Unbekannt'
          const isSelf = m.user_id === currentUserId
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
              <Avatar name={name} size={36} isChristian={m.profile?.is_christian} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name} {isSelf && <span style={{ fontSize: 11, color: 'var(--color-text-light)', fontWeight: 400 }}>(Du)</span>}
                </p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>@{m.profile?.username || '—'}</p>
              </div>
              {m.role === 'admin' && (
                <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020', flexShrink: 0 }}>Admin</span>
              )}
              {isAdmin && !isSelf && (
                <MemberMenuBtn member={m} adminCount={adminCount} onRoleChange={onRoleChange} onRemove={onRemove} />
              )}
            </div>
          )
        })}

        <div style={{ marginTop: 20 }}>
          {!showLeaveConfirm ? (
            <button onClick={() => setShowLeaveConfirm(true)} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: '1.5px solid #E8C0B8', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <LogOut size={15} /> Community verlassen
            </button>
          ) : (
            <div style={{ borderRadius: 14, padding: 16, border: '1.5px solid #E8C0B8' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', marginBottom: 14, textAlign: 'center' }}>
                Wirklich <strong>{community.name}</strong> verlassen?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Abbrechen</button>
                <button onClick={onLeave} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Verlassen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Shared styles for forms ──────────────────────────────────
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
    posts, createPost, deletePost,
    events, myRsvps, createEvent, deleteEvent, rsvpEvent,
  } = useCommunityDetail(id)
  const { messages, loading: chatLoading, sendMessage } = useChat(conversationId)

  const [activeTab, setActiveTab] = useState('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const isAtBottomRef = useRef(true)

  const prayerMessages = messages.filter(m => m.type === 'prayer_request' && !m.is_deleted)

  useEffect(() => {
    if (activeTab !== 'chat') return
    if (!chatLoading && isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, chatLoading, activeTab])

  useEffect(() => {
    if (activeTab !== 'chat') return
    if (!chatLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
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
      showToast('Als einziger Admin kannst du nicht austreten. Mache zuerst jemand anderen zum Admin.', 'error')
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
          <div style={{ height: 18, width: 160, borderRadius: 8, backgroundColor: 'var(--color-warm-3)', flex: 1 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-warm-3)', borderTopColor: 'var(--color-warm-1)', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  const initials = community.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '10px 12px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </button>

          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-warm-1)', border: '1.5px solid var(--color-warm-3)' }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {community.name}
            </p>
            {myMembership?.role === 'admin' && (
              <span style={{ fontFamily: 'Lora, serif', fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 8, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>Admin</span>
            )}
          </div>

          <button onClick={() => setShowSettings(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Settings size={19} />
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>👥 {members.length}</span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>📅 {events.length}</span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>📌 {posts.length}</span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>🙏 {prayerMessages.length}</span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', flexShrink: 0, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '9px 0', border: 'none', background: 'none',
              fontFamily: 'Lora, serif', fontSize: 12,
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: activeTab === t.key ? '2px solid var(--color-warm-1)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main: Tab Content + Member Sidebar ──────────────── */}
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
              <CreatePost onSubmit={createPost} />
              {posts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>📌</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Beiträge. Sei der Erste!</p>
                </div>
              )}
              {posts.map(p => (
                <PostCard key={p.id} post={p} currentUserId={user.id} onDelete={handleDeletePost} />
              ))}
            </div>
          )}

          {/* EVENTS tab */}
          {activeTab === 'events' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              <button
                onClick={() => setShowCreateEvent(true)}
                style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '1.5px dashed var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}
              >
                <Plus size={14} /> Termin erstellen
              </button>
              {events.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>📅</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Termine.</p>
                </div>
              )}
              {events.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  myStatus={myRsvps[ev.id]}
                  onRsvp={rsvpEvent}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}

          {/* GEBETE tab */}
          {activeTab === 'prayers' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              {prayerMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ fontSize: 36, margin: '0 0 10px' }}>🙏</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>Noch keine Gebetsanliegen</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                    Teile ein Anliegen im Chat — es erscheint hier automatisch.
                  </p>
                </div>
              ) : (
                prayerMessages.map(m => <PrayerCard key={m.id} msg={m} />)
              )}
            </div>
          )}
        </div>

        {/* ── Member Sidebar ──────────────────────────────── */}
        <div style={{ width: 68, borderLeft: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', overflowY: 'auto', flexShrink: 0, paddingTop: 8, paddingBottom: 16 }}>
          {members.map(m => {
            const name = m.profile?.full_name || m.profile?.username || '?'
            const shortName = name.split(' ')[0].slice(0, 7)
            const isSelf = m.user_id === user?.id
            return (
              <button
                key={m.id}
                onClick={() => !isSelf && navigate(`/user/${m.user_id}`)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', width: '100%', border: 'none', background: 'none', cursor: isSelf ? 'default' : 'pointer' }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar name={name} size={38} isChristian={m.profile?.is_christian} />
                  {m.role === 'admin' && (
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 13, height: 13, borderRadius: '50%', backgroundColor: 'var(--color-gold)', border: '1.5px solid var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'white' }}>
                      ⚡
                    </div>
                  )}
                </div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 9, margin: 0, color: isSelf ? 'var(--color-warm-1)' : 'var(--color-text-muted)', fontWeight: isSelf ? 700 : 400, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isSelf ? 'Du' : shortName}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Settings Sheet ──────────────────────────────────── */}
      {showSettings && (
        <SettingsSheet
          community={community}
          isAdmin={isAdmin}
          members={members}
          adminCount={adminCount}
          currentUserId={user?.id}
          onClose={() => setShowSettings(false)}
          onLeave={handleLeave}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />
      )}

      {/* ── Create Event Form ────────────────────────────────── */}
      {showCreateEvent && (
        <CreateEventForm
          onClose={() => setShowCreateEvent(false)}
          onSubmit={createEvent}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes sheetSlideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}
