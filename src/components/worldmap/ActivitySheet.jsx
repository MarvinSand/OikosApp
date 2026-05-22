import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, MapPin, Users, Trash2, MessageCircle, ChevronRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
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
      background: profile?.is_christian !== false ? '#4A6741' : '#E8865A',
      border: '2px solid #fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Lora, serif', fontSize: Math.floor(size * 0.35), fontWeight: 700, color: '#fff',
    }}>
      {initials}
    </div>
  )
}

function ParticipantsListSheet({ participants, onClose }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#FBF8F3', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 60px', maxHeight: '70%', overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D8D2C5', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: '#2C2416', margin: 0 }}>
            Teilnehmer ({participants.length})
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A1927F', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        {participants.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#A1927F', textAlign: 'center', padding: '20px 0' }}>
            Noch keine Teilnehmer
          </p>
        )}
        {participants.map((p, i) => {
          const profile = p.profile || {}
          const name = profile.full_name || profile.username || 'Unbekannt'
          return (
            <div key={p.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < participants.length - 1 ? '1px solid #F0EBE3' : 'none' }}>
              <ParticipantAvatar profile={profile} size={40} />
              <div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: '#2C2416', margin: 0 }}>{name}</p>
                {profile.username && (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#A1927F', margin: '2px 0 0' }}>@{profile.username}</p>
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
    if (window.confirm('Aktivität wirklich löschen?')) {
      onDelete(activity.id)
    }
  }

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,0.4)' }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#FBF8F3',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 52px',
          maxHeight: '82%',
          overflowY: 'auto',
          animation: 'worldSheetUp 0.25s ease-out',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D8D2C5', margin: '0 auto 16px' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <div style={{ fontSize: 38, lineHeight: 1, flexShrink: 0 }}>{activity.activity_emoji || '📍'}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: '#2C2416', margin: 0 }}>
                {activity.title}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#4A6741', margin: '3px 0 0', fontWeight: 600 }}>
                {activity.activity_type}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {isOwner && (
                <button onClick={handleDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#C0392B', padding: 6, display: 'flex', borderRadius: 8 }}>
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A1927F', padding: 6, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {activity.starts_at && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Calendar size={14} color="#A1927F" style={{ flexShrink: 0 }} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#706351', margin: 0 }}>
                  {formatDate(activity.starts_at)}
                </p>
              </div>
            )}
            {activity.location_name && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <MapPin size={14} color="#A1927F" style={{ flexShrink: 0 }} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#706351', margin: 0 }}>
                  {activity.location_name}
                </p>
              </div>
            )}
            {activity.author && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>👤</span>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#706351', margin: 0 }}>
                  Erstellt von {activity.author.full_name || activity.author.username}
                </p>
              </div>
            )}
          </div>

          {/* Participants clickable row */}
          <button
            onClick={() => setShowParticipants(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px', borderRadius: 12,
              border: '1px solid #EBE5D9', background: '#F7F3EC',
              cursor: 'pointer', marginBottom: 14, textAlign: 'left',
            }}
          >
            <Users size={14} color="#A1927F" style={{ flexShrink: 0 }} />
            {/* Stacked avatars */}
            {previewParticipants.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {previewParticipants.map((p, i) => (
                  <div key={p.user_id || i} style={{ marginLeft: i === 0 ? 2 : -8, zIndex: previewParticipants.length - i }}>
                    <ParticipantAvatar profile={p.profile} size={26} />
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#706351', margin: 0, flex: 1 }}>
              {participants.length}{activity.max_participants ? ` / ${activity.max_participants}` : ''} Teilnehmer
              {isFull && !isJoined && <span style={{ color: '#C0392B', fontWeight: 600 }}> · Ausgebucht</span>}
            </p>
            <ChevronRight size={14} color="#A1927F" />
          </button>

          {activity.description && (
            <>
              <div style={{ height: 1, background: '#D8D2C5', margin: '0 0 14px' }} />
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#706351', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 14 }}>
                „{activity.description}"
              </p>
            </>
          )}

          {/* Chat button — always visible for everyone */}
          <button
            onClick={handleOpenChat}
            disabled={chatLoading}
            style={{
              width: '100%', padding: '12px 0', border: 'none',
              borderRadius: 12, marginBottom: 10,
              background: '#4A6741',
              color: '#fff',
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
              cursor: chatLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, opacity: chatLoading ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >
            <MessageCircle size={16} />
            {chatLoading ? 'Öffne Chat…' : 'Chat öffnen'}
          </button>

          {/* Join / Leave — only for non-owners */}
          {!isOwner && (
            <button
              onClick={handleToggleJoin}
              disabled={joining || (isFull && !isJoined)}
              style={{
                width: '100%', padding: '13px 0',
                borderRadius: 14,
                background: isJoined ? '#EBE5D9' : (isFull ? '#D8D2C5' : 'transparent'),
                color: isJoined ? '#4A6741' : (isFull ? '#A1927F' : '#4A6741'),
                border: isJoined || isFull ? 'none' : '1.5px solid #4A6741',
                fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
                cursor: (joining || (isFull && !isJoined)) ? 'not-allowed' : 'pointer',
                opacity: joining ? 0.7 : 1, transition: 'all 0.15s',
              }}
            >
              {joining ? '…' : isFull && !isJoined ? 'Ausgebucht' : isJoined ? '✓ Dabei – Abmelden' : '✓ Ich bin dabei'}
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
