import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, Clock, MapPin, Users, Trash2, MessageCircle, ChevronRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

// ─── Farbpalette: Schwarz/Weiß mit babyblauen Akzenten ───
const INK = '#1A1A1A'
const INK_MUTED = '#6B7280'
const LINE = '#E5E7EB'
const WHITE = '#FFFFFF'
const SOFT = '#F7F7F8'
const ACCENT = '#7FBEE8'
const ACCENT_DARK = '#3E92CC'
const ACCENT_SOFT = '#EAF4FB'

function formatDateTime(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function sameDay(a, b) {
  if (!a || !b) return false
  const da = new Date(a), db = new Date(b)
  return da.toDateString() === db.toDateString()
}

function ParticipantAvatar({ profile, size = 32 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${WHITE}`, flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: ACCENT, border: `2px solid ${WHITE}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Lora, serif', fontSize: Math.floor(size * 0.35), fontWeight: 700, color: WHITE,
    }}>
      {initials}
    </div>
  )
}

function ParticipantsListSheet({ participants, onClose }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: WHITE, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 60px', maxHeight: '70%', overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: LINE, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: INK, margin: 0 }}>
            Teilnehmer ({participants.length})
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: INK_MUTED, padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        {participants.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: INK_MUTED, textAlign: 'center', padding: '20px 0' }}>
            Noch keine Teilnehmer
          </p>
        )}
        {participants.map((p, i) => {
          const profile = p.profile || {}
          const name = profile.full_name || profile.username || 'Unbekannt'
          return (
            <div key={p.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < participants.length - 1 ? `1px solid ${LINE}` : 'none' }}>
              <ParticipantAvatar profile={profile} size={40} />
              <div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: INK, margin: 0 }}>{name}</p>
                {profile.username && (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: INK_MUTED, margin: '2px 0 0' }}>@{profile.username}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  )
}

export default function ActivitySheet({ activity, currentUserId, friendIds, onClose, onJoin, onJoinChat, onLeave, onDelete }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [joining, setJoining] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [convId, setConvId] = useState(activity.conversation_id || null)

  const participants = activity.participants || []
  const isJoined = participants.some(p => p.user_id === currentUserId)
  const isOwner = activity.author_id === currentUserId
  const isFull = activity.max_participants > 0 && participants.length >= activity.max_participants

  // Wie viele Geschwister (Freunde) sind beigetreten
  const geschwisterCount = friendIds
    ? participants.filter(p => friendIds.has(p.user_id)).length
    : 0

  const previewParticipants = participants.slice(0, 3)

  // Zeitanzeige "von wann bis wann"
  const startStr = formatDateTime(activity.starts_at)
  const endStr = activity.ends_at
    ? (sameDay(activity.starts_at, activity.ends_at) ? formatTime(activity.ends_at) : formatDateTime(activity.ends_at))
    : null

  async function handleToggleJoin() {
    setJoining(true)
    if (isJoined) {
      await onLeave(activity.id)
    } else {
      const result = await onJoin(activity.id)
      if (result?.convId) setConvId(result.convId)
    }
    setJoining(false)
  }

  async function handleOpenChat() {
    setChatLoading(true)
    try {
      const existingId = convId || activity.conversation_id
      if (existingId) {
        onClose()
        navigate(`/chat/${existingId}`)
        return
      }
      const result = await onJoinChat(activity.id)
      if (result?.error) {
        console.error('joinActivityChat error:', result.error)
        showToast('Chat konnte nicht geöffnet werden', 'error')
        return
      }
      if (result?.convId) {
        setConvId(result.convId)
        onClose()
        navigate(`/chat/${result.convId}`)
      } else {
        showToast('Chat konnte nicht erstellt werden', 'error')
      }
    } finally {
      setChatLoading(false)
    }
  }

  function handleDelete() {
    if (window.confirm('Event wirklich löschen?')) {
      onDelete(activity.id)
    }
  }

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: WHITE,
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 52px',
          maxHeight: '82%',
          overflowY: 'auto',
          animation: 'worldSheetUp 0.25s ease-out',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: LINE, margin: '0 auto 16px' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <div style={{ fontSize: 38, lineHeight: 1, flexShrink: 0 }}>{activity.activity_emoji || '📍'}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: INK, margin: 0 }}>
                {activity.title}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: ACCENT_DARK, margin: '3px 0 0', fontWeight: 600 }}>
                {activity.activity_type}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {isOwner && (
                <button onClick={handleDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#C0392B', padding: 6, display: 'flex', borderRadius: 8 }}>
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: INK_MUTED, padding: 6, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Geschwister beigetreten – Hervorhebung */}
          <button
            onClick={() => setShowParticipants(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '12px 14px', borderRadius: 14,
              border: `1px solid ${ACCENT}`, background: ACCENT_SOFT,
              cursor: 'pointer', marginBottom: 12, textAlign: 'left',
            }}
          >
            <Users size={16} color={ACCENT_DARK} style={{ flexShrink: 0 }} />
            {previewParticipants.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {previewParticipants.map((p, i) => (
                  <div key={p.user_id || i} style={{ marginLeft: i === 0 ? 2 : -8, zIndex: previewParticipants.length - i }}>
                    <ParticipantAvatar profile={p.profile} size={26} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>
                {geschwisterCount} {geschwisterCount === 1 ? 'Geschwister' : 'Geschwister'} beigetreten
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: INK_MUTED, margin: '1px 0 0' }}>
                {participants.length}{activity.max_participants ? ` / ${activity.max_participants}` : ''} Teilnehmer gesamt
                {isFull && !isJoined && <span style={{ color: '#C0392B', fontWeight: 600 }}> · Ausgebucht</span>}
              </p>
            </div>
            <ChevronRight size={16} color={INK_MUTED} />
          </button>

          {/* Von wann bis wann */}
          {startStr && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '12px 14px', borderRadius: 14,
              border: `1px solid ${LINE}`, background: SOFT, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Calendar size={15} color={ACCENT_DARK} style={{ flexShrink: 0 }} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: INK, margin: 0, fontWeight: 600 }}>
                  {startStr} Uhr
                </p>
              </div>
              {endStr && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Clock size={15} color={ACCENT_DARK} style={{ flexShrink: 0 }} />
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: INK_MUTED, margin: 0 }}>
                    bis {endStr} Uhr
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ort & Autor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {activity.location_name && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <MapPin size={14} color={INK_MUTED} style={{ flexShrink: 0 }} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: INK_MUTED, margin: 0 }}>
                  {activity.location_name}
                </p>
              </div>
            )}
            {activity.author && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>👤</span>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: INK_MUTED, margin: 0 }}>
                  Erstellt von {activity.author.full_name || activity.author.username}
                </p>
              </div>
            )}
          </div>

          {activity.description && (
            <>
              <div style={{ height: 1, background: LINE, margin: '0 0 14px' }} />
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: INK_MUTED, lineHeight: 1.65, fontStyle: 'italic', marginBottom: 14 }}>
                „{activity.description}"
              </p>
            </>
          )}

          {/* Chat button — always visible for everyone */}
          <button
            onClick={handleOpenChat}
            disabled={chatLoading}
            style={{
              width: '100%', padding: '12px 0', border: `1px solid ${LINE}`,
              borderRadius: 12, marginBottom: 10,
              background: WHITE,
              color: INK,
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
              cursor: chatLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, opacity: chatLoading ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >
            <MessageCircle size={16} />
            {chatLoading ? 'Öffne Chat…' : 'Chat öffnen'}
          </button>

          {/* Beitreten / Abmelden — only for non-owners */}
          {!isOwner && (
            <button
              onClick={handleToggleJoin}
              disabled={joining || (isFull && !isJoined)}
              style={{
                width: '100%', padding: '14px 0',
                borderRadius: 14, border: 'none',
                background: isJoined ? ACCENT_SOFT : (isFull ? LINE : ACCENT_DARK),
                color: isJoined ? ACCENT_DARK : (isFull ? INK_MUTED : WHITE),
                fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
                cursor: (joining || (isFull && !isJoined)) ? 'not-allowed' : 'pointer',
                opacity: joining ? 0.7 : 1, transition: 'all 0.15s',
              }}
            >
              {joining ? '…' : isFull && !isJoined ? 'Ausgebucht' : isJoined ? '✓ Dabei – Abmelden' : 'Beitreten'}
            </button>
          )}
        </div>
      </div>

      {showParticipants && (
        <ParticipantsListSheet
          participants={participants}
          onClose={() => setShowParticipants(false)}
        />
      )}
    </>,
    document.body
  )
}
