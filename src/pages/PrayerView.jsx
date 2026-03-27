import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, MoreVertical, Check, Pencil, ChevronRight, UserPlus, UserCheck, Clock, MessageCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePrayerFeed } from '../hooks/usePrayerFeed'
import { usePersonalPrayer } from '../hooks/usePersonalPrayer'
import { useFriendships } from '../hooks/useFriendships'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  if (hours < 48) return 'gestern'
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tagen`
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, size = 40, isChristian }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{getInitials(name)}</div>
  )
}

// ─── OverlappingAvatars ───────────────────────────────────────
function OverlappingAvatars({ logs, currentUserId }) {
  const shown = logs.slice(0, 3)
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((log, i) => {
        const name = log.user_id === currentUserId ? 'Du' : (log.profiles?.full_name || log.profiles?.username || '?')
        return (
          <div key={log.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: shown.length - i, position: 'relative', border: '2px solid var(--color-white)', borderRadius: '50%' }}>
            <Avatar name={name} size={24} isChristian={false} />
          </div>
        )
      })}
    </div>
  )
}

// ─── WhoPrayedSheet ───────────────────────────────────────────
function WhoPrayedSheet({ requestId, requestOwnerId, currentUserId, onClose, onAddNote }) {
  const [logs, setLogs] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [requestId])

  async function loadData() {
    const [{ data: logsData }, { data: notesData }] = await Promise.all([
      supabase.from('personal_prayer_logs')
        .select('id, user_id, created_at, profiles!user_id(id, username, full_name, is_christian)')
        .eq('request_id', requestId).order('created_at', { ascending: false }),
      supabase.from('prayer_notes')
        .select('id, author_id, text, is_public, created_at')
        .eq('request_id', requestId),
    ])
    setLogs(logsData || [])
    setNotes(notesData || [])
    setLoading(false)
  }

  const myLog = logs.find(l => l.user_id === currentUserId)
  const myNote = notes.find(n => n.author_id === currentUserId)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {logs.length} {logs.length === 1 ? 'Person hat' : 'Personen haben'} gebetet
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {loading && <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />}

        {!loading && logs.map(log => {
          const isMe = log.user_id === currentUserId
          const name = isMe ? 'Du' : (log.profiles?.full_name || log.profiles?.username || 'Unbekannt')
          const noteForUser = notes.find(n => n.author_id === log.user_id && (n.is_public || isMe || currentUserId === requestOwnerId))

          return (
            <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={name} size={36} isChristian={log.profiles?.is_christian} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: isMe ? 700 : 600, color: 'var(--color-text)', margin: 0 }}>{name}</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{timeAgo(log.created_at)}</p>
                </div>
                {isMe && !myNote && (
                  <button
                    onClick={() => { onClose(); onAddNote() }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-2)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--color-warm-3)' }}
                  >
                    + Notiz
                  </button>
                )}
              </div>
              {noteForUser && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5, margin: '8px 0 0 46px' }}>
                  „{noteForUser.text}"
                </p>
              )}
            </div>
          )
        })}

        {!loading && logs.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Noch keine Gebete.
          </p>
        )}
      </div>
    </>
  )
}

// ─── NoteModal ────────────────────────────────────────────────
function NoteModal({ requestId, ownerName, onSave, onClose }) {
  const [text, setText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    try {
      await onSave(requestId, text.trim(), isPublic)
      onClose()
    } catch {
      // error handled in parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(58,46,36,0.15)' }}>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
          Was hat Gott dir gezeigt?
        </h3>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>
          Du kannst teilen, was du beim Beten empfangen hast.
        </p>

        <div style={{ position: 'relative' }}>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value.slice(0, 500))}
            placeholder="Schreib deine Notiz..."
            rows={4}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', resize: 'none', display: 'block' }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>{text.length}/500</span>
        </div>

        {/* Sichtbarkeit */}
        <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
          {[
            [true, '🌐', 'Für alle sichtbar'],
            [false, '🔒', `Nur für ${ownerName}`],
          ].map(([val, icon, label]) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setIsPublic(val)}
              style={{
                flex: 1, padding: '9px 6px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${isPublic === val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: isPublic === val ? 'var(--color-warm-4)' : 'var(--color-bg)',
                fontFamily: 'Lora, serif', fontSize: 12,
                color: isPublic === val ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                fontWeight: isPublic === val ? 600 : 400,
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Überspringen
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: text.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'not-allowed' }}
          >
            {saving ? 'Speichere…' : 'Notiz speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PrayerCard ───────────────────────────────────────────────
function PrayerCard({ request, logs, notes, currentUserId, onPray, onNote, onDelete, onMarkAnswered, onAuthorClick }) {
  const [expanded, setExpanded] = useState(false)
  const [showWhoPrayed, setShowWhoPrayed] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [justPrayed, setJustPrayed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const noteTimerRef = useRef(null)

  const isOwn = request.owner_id === currentUserId
  const hasPrayed = (logs || []).some(l => l.user_id === currentUserId)
  const prayCount = (logs || []).length
  const previewNotes = (notes || []).slice(0, 2)

  const author = request.profiles
  const authorName = author?.full_name || author?.username || 'Unbekannt'

  function handlePray() {
    if (hasPrayed) return
    onPray(request.id)
    setJustPrayed(true)
    noteTimerRef.current = setTimeout(() => setJustPrayed(false), 6000)
  }

  function handleNoteOpen() {
    setJustPrayed(false)
    setShowNoteModal(true)
  }

  const desc = request.description || ''
  const shortDesc = desc.length > 120 ? desc.slice(0, 120) + '…' : desc

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div
          onClick={() => !isOwn && onAuthorClick?.()}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0, cursor: isOwn ? 'default' : 'pointer' }}
        >
          <Avatar name={authorName} size={40} isChristian={author?.is_christian} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {isOwn ? 'Du' : authorName}
              </p>
              {author?.gender === 'brother' && !isOwn && (
                <span style={{ fontFamily: 'Lora, serif', fontSize: 10, padding: '1px 6px', borderRadius: 20, backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>Bruder</span>
              )}
              {author?.gender === 'sister' && !isOwn && (
                <span style={{ fontFamily: 'Lora, serif', fontSize: 10, padding: '1px 6px', borderRadius: 20, backgroundColor: '#FCE7F3', color: '#9D174D', fontWeight: 600 }}>Schwester</span>
              )}
            </div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              {!isOwn && `@${author?.username} · `}{timeAgo(request.created_at)}
            </p>
          </div>
        </div>
        {isOwn && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)' }}>
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.12)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 180 }}>
                  <button onClick={() => { setShowMenu(false); onMarkAnswered(request.id) }} style={menuItem}>
                    ✓ Als erhört markieren
                  </button>
                  <button onClick={() => { setShowMenu(false); onDelete(request.id) }} style={{ ...menuItem, color: '#C0392B', borderTop: '1px solid var(--color-warm-3)' }}>
                    Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inhalt */}
      <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: desc ? 6 : 0 }}>
        {request.title}
      </p>
      {desc && (
        <div>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
            {expanded ? desc : shortDesc}
          </p>
          {desc.length > 120 && (
            <button onClick={() => setExpanded(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', padding: '2px 0', fontWeight: 500 }}>
              {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
            </button>
          )}
        </div>
      )}

      {/* Gebets-Zeile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-warm-3)' }}>
        {/* Linke Seite: Wer hat gebetet */}
        <button
          onClick={() => prayCount > 0 && setShowWhoPrayed(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: prayCount > 0 ? 'pointer' : 'default', padding: 0 }}
        >
          {prayCount > 0 ? (
            <>
              <OverlappingAvatars logs={logs || []} currentUserId={currentUserId} />
              <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {prayCount} {prayCount === 1 ? 'Gebet' : 'Gebete'}
              </span>
            </>
          ) : (
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              Noch keine Gebete
            </span>
          )}
        </button>

        {/* Rechte Seite: Beten-Button */}
        {!isOwn && (
          <button
            onClick={handlePray}
            disabled={hasPrayed}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20,
              border: hasPrayed ? 'none' : '1.5px solid var(--color-warm-1)',
              backgroundColor: hasPrayed ? 'var(--color-gold-light)' : 'transparent',
              color: hasPrayed ? '#8A6020' : 'var(--color-warm-1)',
              fontFamily: 'Lora, serif', fontSize: 13, fontWeight: hasPrayed ? 700 : 500,
              cursor: hasPrayed ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🙏 {hasPrayed ? 'Gebetet ✓' : 'Beten'}
          </button>
        )}
      </div>

      {/* Follow-up Prompt nach Beten */}
      {justPrayed && !isOwn && (
        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', margin: 0 }}>
            Möchtest du eine Notiz hinterlassen?
          </p>
          <button onClick={handleNoteOpen} style={{ border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', borderRadius: 8, padding: '6px 12px', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Ja
          </button>
        </div>
      )}

      {/* Notizen-Vorschau */}
      {previewNotes.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--color-warm-3)', paddingTop: 10 }}>
          {previewNotes.map(n => (
            <div key={n.id} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <Avatar name={n.profiles?.full_name || n.profiles?.username} size={22} isChristian={false} />
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                <span style={{ fontWeight: 600, fontStyle: 'normal' }}>{n.profiles?.full_name || n.profiles?.username}</span>{' '}
                „{n.text}"
              </p>
            </div>
          ))}
          {(notes || []).length > 2 && (
            <button onClick={() => setShowWhoPrayed(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', padding: 0, fontWeight: 500 }}>
              Alle {(notes || []).length} Notizen anzeigen
            </button>
          )}
        </div>
      )}

      {/* Sheets & Modals */}
      {showWhoPrayed && (
        <WhoPrayedSheet
          requestId={request.id}
          requestOwnerId={request.owner_id}
          currentUserId={currentUserId}
          onClose={() => setShowWhoPrayed(false)}
          onAddNote={() => setShowNoteModal(true)}
        />
      )}
      {showNoteModal && (
        <NoteModal
          requestId={request.id}
          ownerName={authorName}
          onSave={onNote}
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </div>
  )
}

// ─── ProfilePreviewSheet ──────────────────────────────────────
function ProfilePreviewSheet({ profile, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { getFriendshipStatus, getFriendship, sendRequest, acceptRequest, declineRequest } = useFriendships()

  const [stats, setStats] = useState(null)
  const [maps, setMaps] = useState([])
  const [myCommunityIds, setMyCommunityIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const isOwn = user?.id === profile.id

  useEffect(() => {
    loadData()
  }, [profile.id])

  async function loadData() {
    const [
      { count: peopleCount },
      { count: prayerCount },
      { data: stagesData },
      { data: communityData },
      { data: mapsRaw },
    ] = await Promise.all([
      supabase.from('oikos_people').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('owner_id', profile.id),
      supabase.from('oikos_people').select('impact_stage').eq('user_id', profile.id).order('impact_stage', { ascending: false }).limit(1),
      supabase.from('community_members').select('community_id').eq('user_id', user.id),
      supabase.from('oikos_maps').select('id, name, visibility, visibility_user_ids, visibility_community_id').eq('user_id', profile.id).neq('visibility', 'private'),
    ])
    setStats({ peopleCount: peopleCount || 0, prayerCount: prayerCount || 0, maxStage: stagesData?.[0]?.impact_stage || 0 })
    setMyCommunityIds((communityData || []).map(c => c.community_id))
    setMaps(mapsRaw || [])
    setLoading(false)
  }

  const friendStatus = getFriendshipStatus(profile.id)
  const isSibling = friendStatus === 'friends'

  const visibleMaps = maps.filter(map => {
    if (map.visibility === 'all_siblings') return isSibling
    if (map.visibility === 'specific_include') return (map.visibility_user_ids || []).includes(user?.id)
    if (map.visibility === 'specific_exclude') return isSibling && !(map.visibility_user_ids || []).includes(user?.id)
    if (map.visibility === 'community') return myCommunityIds.includes(map.visibility_community_id)
    return false
  })
  const firstMap = visibleMaps[0] || null

  async function handleFriendAction() {
    setActionLoading(true)
    try {
      if (friendStatus === 'none') {
        await sendRequest(profile.id)
        showToast('Anfrage gesendet ✓')
      } else if (friendStatus === 'received') {
        const f = getFriendship(profile.id)
        if (f) { await acceptRequest(f.id); showToast('Verbunden ✓') }
      } else if (friendStatus === 'sent') {
        const f = getFriendship(profile.id)
        if (f) { await declineRequest(f.id); showToast('Anfrage zurückgezogen') }
      }
    } catch (e) {
      showToast(e.message || 'Fehler', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const displayName = profile.full_name || profile.username || 'Unbekannt'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px 40px',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '65vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 20px' }} />

        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: profile.is_christian
                ? 'linear-gradient(135deg, var(--color-accent), #2ECC71)'
                : 'linear-gradient(135deg, var(--color-warm-1), var(--color-gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(58,46,36,0.18)',
            }}>
              {getInitials(displayName)}
            </div>
            <div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>{displayName}</p>
              {profile.username && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>@{profile.username}</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {profile.is_christian && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: '#DFF5E8', color: '#1E8449' }}>Christ ✓</span>
                )}
                {profile.gender === 'brother' && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: '#DBEAFE', color: '#1E40AF' }}>🙋‍♂️ Bruder</span>
                )}
                {profile.gender === 'sister' && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: '#FCE7F3', color: '#9D174D' }}>🙋‍♀️ Schwester</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Stats */}
        {loading && (
          <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 16 }} />
        )}
        {!loading && stats && (
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-warm-4)', borderRadius: 14, padding: '12px 0', marginBottom: 16 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{stats.peopleCount}</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Personen</p>
            </div>
            <div style={{ width: 1, height: 32, backgroundColor: 'var(--color-warm-3)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{stats.prayerCount}</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Gebete</p>
            </div>
            <div style={{ width: 1, height: 32, backgroundColor: 'var(--color-warm-3)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{stats.maxStage > 0 ? `Stufe ${stats.maxStage}` : '—'}</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Max. Stufe</p>
            </div>
          </div>
        )}

        {/* Verbindungs-Button */}
        {!isOwn && (
          <div style={{ marginBottom: 16 }}>
            {friendStatus === 'friends' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: profile.id })
                    if (!error) { onClose(); navigate(`/chat/${convId}`) }
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  <MessageCircle size={15} /> Nachricht
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-accent-dark)', fontWeight: 600 }}>
                  <UserCheck size={15} /> Verbunden
                </div>
              </div>
            ) : friendStatus === 'sent' ? (
              <button onClick={handleFriendAction} disabled={actionLoading} style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'transparent', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Clock size={14} /> Ausstehend
              </button>
            ) : (
              <button onClick={handleFriendAction} disabled={actionLoading} style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <UserPlus size={15} /> {actionLoading ? '…' : 'Geschwister werden'}
              </button>
            )}
          </div>
        )}

        {/* Map-Vorschau */}
        {!loading && firstMap && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Oikos Maps
            </p>
            <button
              onClick={() => { navigate(`/user/${profile.id}/map/${firstMap.id}`); onClose() }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: 12, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)', cursor: 'pointer', boxShadow: '0 1px 4px rgba(58,46,36,0.06)' }}
            >
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                {firstMap.name}
              </p>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </button>
          </div>
        )}

        {/* Vollständiges Profil */}
        <button
          onClick={() => { navigate(`/user/${profile.id}`); onClose() }}
          style={{ width: '100%', padding: '12px 0', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 500 }}
        >
          Vollständiges Profil anzeigen →
        </button>
      </div>
    </>
  )
}

// ─── PostRequestSheet ─────────────────────────────────────────
const VIS_OPTIONS = [
  { value: 'public',       icon: '🌐', label: 'Alle OIKOS Nutzer' },
  { value: 'siblings',     icon: '👥', label: 'Nur meine Geschwister' },
  { value: 'communities',  icon: '🏘', label: 'Nur meine Communities' },
  { value: 'private',      icon: '🔒', label: 'Nur ich (privat)' },
]

function PostRequestSheet({ onClose, onPost }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function handlePost() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onPost({ title: title.trim(), description: description.trim() || null, visibility })
      showToast('Anliegen geteilt 🙏')
      onClose()
    } catch {
      showToast('Fehler beim Speichern', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Anliegen teilen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <label style={lbl}>Worum geht es? *</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Gebetsanliegen..." style={inp} />

        <label style={{ ...lbl, marginTop: 14 }}>Mehr teilen (optional)</label>
        <div style={{ position: 'relative' }}>
          <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} placeholder="Erzähl mehr dazu..." rows={3} style={{ ...inp, resize: 'none' }} />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>{description.length}/500</span>
        </div>

        <label style={{ ...lbl, marginTop: 14 }}>Sichtbarkeit</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {VIS_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, backgroundColor: visibility === opt.value ? 'var(--color-warm-4)' : 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, textAlign: 'left', color: visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-text)', fontWeight: visibility === opt.value ? 600 : 400 }}>
              <span>{opt.icon}</span><span>{opt.label}</span>
            </button>
          ))}
        </div>

        <button onClick={handlePost} disabled={!title.trim() || saving} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20, cursor: title.trim() ? 'pointer' : 'not-allowed', backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600 }}>
          {saving ? 'Teile…' : 'Anliegen teilen 🙏'}
        </button>
      </div>
    </>
  )
}

// ─── OwnRequestDetailSheet ────────────────────────────────────
function OwnRequestDetailSheet({ request, onClose, onMarkAnswered, onDelete }) {
  const [prayCount, setPrayCount] = useState(0)
  const { showToast } = useToast()

  useEffect(() => {
    supabase.from('personal_prayer_logs').select('*', { count: 'exact', head: true }).eq('request_id', request.id)
      .then(({ count }) => setPrayCount(count || 0))
  }, [request.id])

  async function handleDelete() {
    if (!window.confirm('Anliegen wirklich löschen?')) return
    onDelete(request.id)
    onClose()
  }

  async function handleAnswered() {
    onMarkAnswered(request.id)
    showToast('Als erhört markiert ✓')
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.3s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>{request.title}</p>
            {request.description && <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{request.description}</p>}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          {request.is_answered && <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>Erhört ✓</span>}
          <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>🙏 {prayCount} Gebete · {timeAgo(request.created_at)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!request.is_answered && (
            <button onClick={handleAnswered} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={15} /> Als erhört markieren
            </button>
          )}
          <button onClick={handleDelete} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: '1.5px solid #E8C0B8', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer' }}>
            Löschen
          </button>
        </div>
      </div>
    </>
  )
}

// ─── MyPrayerSection ──────────────────────────────────────────
const VIS_LABEL = { public: '🌐', siblings: '👥', communities: '🏘', private: '🔒' }

function MyPrayerSection({ myRequests, markAnswered, deleteRequest, onNew }) {
  const [selected, setSelected] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const unanswered = myRequests.filter(r => !r.is_answered)
  const answered   = myRequests.filter(r => r.is_answered)
  const sorted     = [...unanswered, ...answered]
  const visible    = expanded ? sorted : sorted.slice(0, 3)
  const hasMore    = sorted.length > 3

  return (
    <div style={{ margin: '12px 16px 4px', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(58,46,36,0.08)', backgroundColor: 'var(--color-white)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', background: 'linear-gradient(135deg, var(--color-warm-4) 0%, #FFF8F0 100%)', borderBottom: '1px solid var(--color-warm-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>📖</span>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Meine Anliegen
          </p>
          {sorted.length > 0 && (
            <span style={{ backgroundColor: 'var(--color-warm-1)', color: 'white', borderRadius: 20, padding: '1px 7px', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700 }}>
              {sorted.length}
            </span>
          )}
        </div>
        <button
          onClick={onNew}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={12} /> Neu
        </button>
      </div>

      {/* Leer-Zustand */}
      {sorted.length === 0 && (
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.6 }}>
            Teile dein erstes Gebetsanliegen mit der Gemeinschaft.
          </p>
        </div>
      )}

      {/* Request-Rows */}
      {visible.map((r, i) => (
        <button
          key={r.id}
          onClick={() => setSelected(r)}
          style={{ width: '100%', display: 'flex', alignItems: 'stretch', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', borderBottom: i < visible.length - 1 || hasMore ? '1px solid var(--color-warm-3)' : 'none', padding: 0 }}
        >
          {/* Status-Linie */}
          <div style={{ width: 4, flexShrink: 0, backgroundColor: r.is_answered ? 'var(--color-accent)' : 'var(--color-gold)', borderRadius: '0 0 0 0' }} />
          <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: r.is_answered ? 'var(--color-text-muted)' : 'var(--color-text)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: r.is_answered ? 'line-through' : 'none' }}>
                {r.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {VIS_LABEL[r.visibility] || '🌐'}
                </span>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  🙏 {r.prayerCount || 0}
                </span>
                {r.is_answered && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-accent-dark)', backgroundColor: '#DFF5E8', padding: '1px 6px', borderRadius: 8 }}>
                    Erhört ✓
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={15} color="var(--color-text-light)" style={{ flexShrink: 0 }} />
          </div>
        </button>
      ))}

      {/* Mehr/Weniger */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ width: '100%', padding: '11px 0', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 500, borderTop: '1px solid var(--color-warm-3)' }}
        >
          {expanded ? 'Weniger anzeigen ↑' : `Alle ${sorted.length} Anliegen anzeigen ↓`}
        </button>
      )}

      {selected && (
        <OwnRequestDetailSheet
          request={selected}
          onClose={() => setSelected(null)}
          onMarkAnswered={markAnswered}
          onDelete={deleteRequest}
        />
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, borderRadius: 6, backgroundColor: 'var(--color-warm-4)', marginBottom: 6, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 11, borderRadius: 6, backgroundColor: 'var(--color-warm-4)', width: '25%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
      <div style={{ height: 16, borderRadius: 6, backgroundColor: 'var(--color-warm-4)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 13, borderRadius: 6, backgroundColor: 'var(--color-warm-4)', width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

// ─── PrayerView (Main) ────────────────────────────────────────
const TABS = [
  { key: 'siblings',    label: 'Geschwister' },
  { key: 'communities', label: 'Communities' },
  { key: 'all',         label: 'Alle' },
]

export default function PrayerView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('siblings')
  const [showPost, setShowPost] = useState(false)
  const [previewProfile, setPreviewProfile] = useState(null)

  const { requests, logsMap, notesMap, loading, hasMore, loadMore, reload, logPrayer, addNote } = usePrayerFeed(activeTab)
  const { myRequests, createRequest, markAnswered, deleteRequest } = usePersonalPrayer()

  async function handleNote(requestId, text, isPublic) {
    try {
      await addNote(requestId, text, isPublic)
      showToast('Notiz gespeichert ✓')
    } catch {
      showToast('Fehler beim Speichern', 'error')
      throw new Error()
    }
  }

  function getEmptyMessage() {
    if (activeTab === 'siblings') return 'Deine Geschwister haben noch keine Anliegen geteilt.\nBete für sie! 🙏'
    if (activeTab === 'communities') return 'Deine Communities haben noch keine Anliegen geteilt.'
    return 'Sei der Erste der ein Anliegen teilt 🙏'
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '14px 16px 0', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Gebete</h2>
          <button
            onClick={() => setShowPost(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={14} /> Anliegen
          </button>
        </div>

        {/* Tab-Leiste */}
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'Lora, serif', fontSize: 14,
                fontWeight: activeTab === t.key ? 600 : 400,
                color: activeTab === t.key ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                borderBottom: activeTab === t.key ? '2px solid var(--color-warm-1)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Eigene Anliegen */}
      <MyPrayerSection myRequests={myRequests} markAnswered={markAnswered} deleteRequest={deleteRequest} onNew={() => setShowPost(true)} />

      {/* Feed */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading && requests.length === 0 && (
          <>{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</>
        )}

        {!loading && requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {getEmptyMessage()}
            </p>
            {activeTab === 'all' && (
              <button onClick={() => setShowPost(true)} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                + Anliegen teilen
              </button>
            )}
          </div>
        )}

        {requests.map(r => (
          <PrayerCard
            key={r.id}
            request={r}
            logs={logsMap[r.id] || []}
            notes={notesMap[r.id] || []}
            currentUserId={user?.id}
            onPray={logPrayer}
            onNote={handleNote}
            onDelete={deleteRequest}
            onMarkAnswered={markAnswered}
            onAuthorClick={() => r.profiles && setPreviewProfile(r.profiles)}
          />
        ))}

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loading}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-warm-1)', cursor: 'pointer', marginBottom: 16 }}
          >
            {loading ? 'Lade…' : 'Mehr laden'}
          </button>
        )}
      </div>

      {showPost && (
        <PostRequestSheet
          onClose={() => setShowPost(false)}
          onPost={createRequest}
        />
      )}

      {previewProfile && (
        <ProfilePreviewSheet
          profile={previewProfile}
          onClose={() => setPreviewProfile(null)}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
const menuItem = { display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }
