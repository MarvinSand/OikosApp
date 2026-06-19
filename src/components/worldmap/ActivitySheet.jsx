import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, Clock, MapPin, Users, Trash2, MessageCircle, ChevronRight, Check } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const C = {
  accent: '#5AC8FA', accentDark: '#0A84FF', accentLight: '#E5F6FE',
  text: '#000000', textSec: '#6E6E73', textTer: '#AEAEB2',
  border: '#E5E5EA', bg: '#FFFFFF', bgSec: '#F5F5F7', error: '#FF3B30',
}

const VIS_LABEL = {
  public: '🌐 Öffentlich',
  siblings: '👥 Meine Geschwister',
  communities: '⛪ Gemeinde',
}

function formatDateTime(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// Zeitraum "von – bis" hübsch darstellen
function formatRange(start, end) {
  if (!start) return null
  const startStr = formatDateTime(start)
  if (!end) return startStr
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString()
  return sameDay ? `${startStr} – ${formatTime(end)}` : `${startStr} – ${formatDateTime(end)}`
}

function ParticipantAvatar({ profile, size = 32 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: C.accent, border: '2px solid #fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.35), fontWeight: 700, color: '#fff',
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
        background: C.bg, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 60px', maxHeight: '70%', overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>
            Beigetreten ({participants.length})
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        {participants.length === 0 && (
          <p style={{ fontSize: 13, color: C.textTer, textAlign: 'center', padding: '20px 0' }}>
            Noch keine Geschwister beigetreten
          </p>
        )}
        {participants.map((p, i) => {
          const profile = p.profile || {}
          const name = profile.full_name || profile.username || 'Unbekannt'
          return (
            <div key={p.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < participants.length - 1 ? `1px solid ${C.bgSec}` : 'none' }}>
              <ParticipantAvatar profile={profile} size={40} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{name}</p>
                {profile.username && (
                  <p style={{ fontSize: 12, color: C.textTer, margin: '2px 0 0' }}>@{profile.username}</p>
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

export default function ActivitySheet({ activity, currentUserId, onClose, onJoin, onJoinChat, onLeave, onDelete }) {
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

  const previewParticipants = participants.slice(0, 3)
  const timeRange = formatRange(activity.starts_at, activity.ends_at)

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
          background: C.bg,
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 52px',
          maxHeight: '82%',
          overflowY: 'auto',
          animation: 'worldSheetUp 0.25s ease-out',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: C.accentLight, border: `2px solid ${C.accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>
              {activity.activity_emoji || '📍'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
                {activity.title}
              </p>
              <p style={{ fontSize: 12, color: C.accentDark, margin: '3px 0 0', fontWeight: 600 }}>
                {VIS_LABEL[activity.visibility_mode] || '🌐 Öffentlich'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {isOwner && (
                <button onClick={handleDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.error, padding: 6, display: 'flex', borderRadius: 8 }}>
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 6, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {timeRange && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Calendar size={15} color={C.accentDark} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: C.text, margin: 0, fontWeight: 600 }}>
                  {timeRange}
                </p>
              </div>
            )}
            {!timeRange && activity.starts_at && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Clock size={15} color={C.accentDark} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{formatDateTime(activity.starts_at)}</p>
              </div>
            )}
            {activity.location_name && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <MapPin size={15} color={C.textSec} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: C.textSec, margin: 0 }}>
                  {activity.location_name}
                </p>
              </div>
            )}
            {activity.author && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>👤</span>
                <p style={{ fontSize: 13, color: C.textSec, margin: 0 }}>
                  Erstellt von {activity.author.full_name || activity.author.username}
                </p>
              </div>
            )}
          </div>

          {/* Participants clickable row – "wie viele Geschwister beigetreten sind" */}
          <button
            onClick={() => setShowParticipants(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '12px', borderRadius: 12,
              border: `1px solid ${C.border}`, background: C.bgSec,
              cursor: 'pointer', marginBottom: 14, textAlign: 'left',
            }}
          >
            <Users size={15} color={C.accentDark} style={{ flexShrink: 0 }} />
            {previewParticipants.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {previewParticipants.map((p, i) => (
                  <div key={p.user_id || i} style={{ marginLeft: i === 0 ? 2 : -8, zIndex: previewParticipants.length - i }}>
                    <ParticipantAvatar profile={p.profile} size={26} />
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 13, color: C.text, margin: 0, flex: 1, fontWeight: 600 }}>
              {participants.length}{activity.max_participants ? ` / ${activity.max_participants}` : ''} beigetreten
              {isFull && !isJoined && <span style={{ color: C.error, fontWeight: 600 }}> · Voll</span>}
            </p>
            <ChevronRight size={15} color={C.textTer} />
          </button>

          {activity.description && (
            <>
              <div style={{ height: 1, background: C.border, margin: '0 0 14px' }} />
              <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.65, marginBottom: 14 }}>
                {activity.description}
              </p>
            </>
          )}

          {/* Join / Leave – Auswahlfeld zum Beitreten (nur für Nicht-Ersteller) */}
          {!isOwner && (
            <button
              onClick={handleToggleJoin}
              disabled={joining || (isFull && !isJoined)}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, marginBottom: 10,
                background: isJoined ? C.accentLight : (isFull ? C.bgSec : C.accent),
                color: isJoined ? C.accentDark : (isFull ? C.textTer : '#fff'),
                border: 'none',
                fontSize: 15, fontWeight: 700,
                cursor: (joining || (isFull && !isJoined)) ? 'not-allowed' : 'pointer',
                opacity: joining ? 0.7 : 1, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {!joining && isJoined && <Check size={17} />}
              {joining ? '…' : isFull && !isJoined ? 'Event ist voll' : isJoined ? 'Beigetreten – Austreten' : 'Beitreten'}
            </button>
          )}

          {/* Chat button */}
          <button
            onClick={handleOpenChat}
            disabled={chatLoading}
            style={{
              width: '100%', padding: '12px 0',
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              background: '#fff',
              color: C.text,
              fontSize: 14, fontWeight: 600,
              cursor: chatLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, opacity: chatLoading ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >
            <MessageCircle size={16} />
            {chatLoading ? 'Öffne Chat…' : 'Chat öffnen'}
          </button>
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
