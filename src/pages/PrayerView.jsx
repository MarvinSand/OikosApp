import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, MoreVertical, Check, Pencil, ChevronRight, UserPlus, UserCheck, Clock, MessageCircle, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePrayerFeed } from '../hooks/usePrayerFeed'
import { usePersonalPrayer } from '../hooks/usePersonalPrayer'
import { useFriendships } from '../hooks/useFriendships'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import Confetti from '../components/ui/Confetti'

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
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '75vh', overflowY: 'auto' }}>
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
                    style={{ background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-2)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--color-warm-3)' }}
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
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 mb-4 shadow-glass-sm border border-white/60 hover:shadow-glass hover:bg-white/95 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          onClick={() => !isOwn && onAuthorClick?.()}
          className={`flex gap-3 items-center flex-1 min-w-0 ${isOwn ? 'cursor-default' : 'cursor-pointer group'}`}
        >
          <div className="relative">
            <Avatar name={authorName} size={42} isChristian={author?.is_christian} />
            {!isOwn && (
              <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-warm-2/30 transition-colors" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-serif text-[15px] font-bold text-dark m-0 leading-tight">
                {isOwn ? 'Du' : authorName}
              </p>
              {author?.gender === 'brother' && !isOwn && (
                <span className="font-serif text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100/50">Bruder</span>
              )}
              {author?.gender === 'sister' && !isOwn && (
                <span className="font-serif text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-semibold border border-pink-100/50">Schwester</span>
              )}
            </div>
            <p className="font-sans text-[11px] font-medium text-dark-muted/80 uppercase tracking-wide m-0">
              {!isOwn && `@${author?.username} · `}{timeAgo(request.created_at)}
              {request._sourceType === 'sibling_oikos' && request.oikos_people?.name && (
                <span style={{ marginLeft: 6, color: 'var(--color-accent)', fontWeight: 600 }}>· für {request.oikos_people.name}</span>
              )}
            </p>
          </div>
        </div>
        {isOwn && (
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)} className="border-none bg-transparent cursor-pointer p-1.5 text-dark-muted hover:bg-black/5 rounded-full transition-colors">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} className="fixed inset-0 z-10" />
                <div className="absolute right-0 top-full mt-1 bg-white/95 backdrop-blur-md rounded-xl shadow-glass border border-warm-3 z-20 min-w-[180px] overflow-hidden">
                  <button onClick={() => { setShowMenu(false); onMarkAnswered(request.id) }} className="w-full px-4 py-3 text-left border-none bg-transparent hover:bg-black/5 font-serif text-[14px] text-dark cursor-pointer flex items-center gap-2">
                    <Check size={16} className="text-warm-1" /> Als erhört markieren
                  </button>
                  <button onClick={() => { setShowMenu(false); onDelete(request.id) }} className="w-full px-4 py-3 text-left border-none bg-transparent hover:bg-red-50 font-serif text-[14px] text-red-600 cursor-pointer border-t border-warm-3">
                    Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inhalt */}
      <h3 className={`font-serif text-[17px] font-bold text-dark leading-tight ${desc ? 'mb-2' : 'mb-0'}`}>
        {request.title}
      </h3>
      {desc && (
        <div className="mb-2">
          <p className="font-serif text-[14.5px] text-dark-muted leading-relaxed m-0 whitespace-pre-wrap">
            {expanded ? desc : shortDesc}
          </p>
          {desc.length > 120 && (
            <button onClick={() => setExpanded(v => !v)} className="border-none bg-transparent cursor-pointer font-serif text-[13px] text-warm-1 font-semibold py-1 mt-1 hover:opacity-80 transition-opacity">
              {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
            </button>
          )}
        </div>
      )}

      {/* Gebets-Zeile */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-warm-3/60">
        {/* Linke Seite: Wer hat gebetet */}
        <button
          onClick={() => prayCount > 0 && setShowWhoPrayed(true)}
          className={`flex items-center gap-2.5 border-none bg-transparent p-0 ${prayCount > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        >
          {prayCount > 0 ? (
            <>
              <OverlappingAvatars logs={logs || []} currentUserId={currentUserId} />
              <span className="font-serif text-[13.5px] font-medium text-dark-muted pt-[1px]">
                {prayCount} {prayCount === 1 ? 'Gebet' : 'Gebete'}
              </span>
            </>
          ) : (
            <span className="font-serif text-[13.5px] text-dark-light italic bg-warm-5/50 px-3 py-1 rounded-full border border-warm-3/30">
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
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
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
                <UserPlus size={15} /> {actionLoading ? '…' : 'Verbinden'}
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
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
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
function OwnRequestDetailSheet({ request, onClose, onMarkAnswered, onDelete, onUpdate }) {
  const [prayCount, setPrayCount] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [title, setTitle] = useState(request.title || '')
  const [description, setDescription] = useState(request.description || '')
  const [saving, setSaving] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    supabase.from('personal_prayer_logs').select('*', { count: 'exact', head: true }).eq('request_id', request.id)
      .then(({ count }) => setPrayCount(count || 0))
  }, [request.id])

  async function handleDelete() {
    onDelete(request.id)
    onClose()
  }

  async function handleAnswered() {
    if (!request.is_answered) { setConfetti(true); setTimeout(() => setConfetti(false), 3200) }
    onMarkAnswered(request.id)
    showToast(request.is_answered ? 'Als offen markiert' : '🎉 Als erhört markiert!')
    onClose()
  }

  async function handleSaveEdit() {
    if (!title.trim()) return
    setSaving(true)
    await onUpdate(request.id, { title: title.trim(), description: description.trim() || null })
    setSaving(false)
    setEditMode(false)
    showToast('Anliegen aktualisiert ✓')
  }

  return (
    <>
      <Confetti show={confetti} />
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!editMode ? (
              <>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>{request.title}</p>
                {request.description && <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>{request.description}</p>}
              </>
            ) : (
              <>
                <input value={title} onChange={e => setTitle(e.target.value)} autoFocus style={{ ...inp, marginBottom: 8 }} />
                <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={3} style={{ ...inp, resize: 'none' }} />
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
            {!editMode && (
              <button onClick={() => setEditMode(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><Pencil size={16} /></button>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
          </div>
        </div>

        {!editMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            {request.is_answered && <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>🎉 Erhört</span>}
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>🙏 {prayCount} Gebete · {timeAgo(request.created_at)}</span>
          </div>
        )}

        {editMode ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={handleSaveEdit} disabled={!title.trim() || saving} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleAnswered} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', backgroundColor: request.is_answered ? 'var(--color-warm-3)' : 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={15} /> {request.is_answered ? 'Als offen markieren' : 'Als erhört markieren ✓'}
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: '1.5px solid #E8C0B8', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer' }}>
                Löschen
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={handleDelete} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ja, löschen</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── MyPrayerSection ──────────────────────────────────────────
const VIS_LABEL = { public: '🌐', siblings: '👥', communities: '🏘', private: '🔒' }

function MyPrayerSection({ myRequests, markAnswered, updateRequest, deleteRequest, onNew }) {
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
      <div style={{ padding: '14px 16px 12px', background: 'linear-gradient(135deg, var(--color-warm-4) 0%, var(--color-bg) 100%)', borderBottom: '1px solid var(--color-warm-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          className="tour-prayer-add"
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
          onUpdate={updateRequest}
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

// ─── FilterSheet ──────────────────────────────────────────────
const FILTER_DEFAULTS = { status: 'open', faith: ['christian', 'non_christian'], date: 'all', sources: ['sibling_personal', 'sibling_oikos'] }

function loadSavedFilter() {
  try {
    const saved = JSON.parse(localStorage.getItem('prayer_filter') || '{}')
    return { ...FILTER_DEFAULTS, ...saved, sources: saved.sources ?? FILTER_DEFAULTS.sources }
  } catch { return { ...FILTER_DEFAULTS } }
}

function FilterSheet({ filter, onApply, onClose }) {
  const [status, setStatus] = useState(filter.status)
  const [faith, setFaith] = useState(filter.faith)
  const [date, setDate] = useState(filter.date)
  const [sources, setSources] = useState(filter.sources ?? FILTER_DEFAULTS.sources)

  function toggleFaith(val) {
    setFaith(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  function toggleSource(val) {
    setSources(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  function handleApply() {
    const f = { status, faith, date, sources }
    localStorage.setItem('prayer_filter', JSON.stringify(f))
    onApply(f)
    onClose()
  }

  function handleReset() {
    const f = { ...FILTER_DEFAULTS }
    setSources(FILTER_DEFAULTS.sources)
    localStorage.setItem('prayer_filter', JSON.stringify(f))
    onApply(f)
    onClose()
  }

  const checkStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
    border: `1.5px solid ${active ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
    backgroundColor: active ? 'var(--color-warm-4)' : 'var(--color-bg)',
    cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14,
    color: active ? 'var(--color-warm-1)' : 'var(--color-text)',
    fontWeight: active ? 600 : 400,
    marginBottom: 6, width: '100%', textAlign: 'left',
  })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Filter</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Status */}
        <p style={filterLabel}>Nach Status</p>
        <button style={checkStyle(status === 'open')} onClick={() => setStatus('open')}>☑ Offene Anliegen</button>
        <button style={checkStyle(status === 'answered')} onClick={() => setStatus('answered')}>✅ Erhörte Anliegen</button>
        <button style={checkStyle(status === 'all')} onClick={() => setStatus('all')}>Alle Anliegen</button>

        {/* Glaubensstand */}
        <p style={{ ...filterLabel, marginTop: 16 }}>Nach Glaubensstand</p>
        <button style={checkStyle(faith.includes('christian'))} onClick={() => toggleFaith('christian')}>
          {faith.includes('christian') ? '☑' : '☐'} Christen 🌿
        </button>
        <button style={checkStyle(faith.includes('non_christian'))} onClick={() => toggleFaith('non_christian')}>
          {faith.includes('non_christian') ? '☑' : '☐'} Noch nicht Christen 🌱
        </button>

        {/* Datum */}
        <p style={{ ...filterLabel, marginTop: 16 }}>Nach Datum</p>
        {[['all', 'Alle'], ['today', 'Heute'], ['week', 'Diese Woche'], ['month', 'Dieser Monat']].map(([val, label]) => (
          <button key={val} style={checkStyle(date === val)} onClick={() => setDate(val)}>
            {date === val ? '●' : '○'} {label}
          </button>
        ))}

        {/* Quelle */}
        <p style={{ ...filterLabel, marginTop: 16 }}>Nach Quelle</p>
        {[
          ['sibling_personal', 'Persönliche Anliegen meiner Geschwister', 'Dinge, die ein Geschwister für sich selbst teilt'],
          ['sibling_oikos', 'OIKOS-Anliegen meiner Geschwister', 'Gebete für Menschen aus dem Umfeld (Familie, Freunde …)'],
          ['own_personal', 'Eigene persönliche Anliegen', null],
          ['own_oikos', 'Anliegen für meine OIKOS-Personen', null],
          ['community', 'Community-Anliegen', null],
          ['all_public', 'Alle öffentlichen Anliegen', null],
        ].map(([val, label, hint]) => (
          <div key={val}>
            <button style={checkStyle(sources.includes(val))} onClick={() => toggleSource(val)}>
              {sources.includes(val) ? '☑' : '☐'} {label}
            </button>
            {hint && <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '-2px 0 6px 24px', lineHeight: 1.4 }}>{hint}</p>}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleReset} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}>Zurücksetzen</button>
          <button onClick={handleApply} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Filter anwenden</button>
        </div>
      </div>
    </>
  )
}

const filterLabel = { fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }

function applyFilter(requests, filter) {
  let r = requests
  if (filter.status === 'open') r = r.filter(x => !x.is_answered)
  if (filter.status === 'answered') r = r.filter(x => x.is_answered)
  if (!filter.faith.includes('christian')) r = r.filter(x => !x.profiles?.is_christian)
  if (!filter.faith.includes('non_christian')) r = r.filter(x => x.profiles?.is_christian)
  if (filter.date !== 'all') {
    const now = new Date()
    const startOf = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 86400000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
    }[filter.date]
    if (startOf) r = r.filter(x => new Date(x.created_at) >= startOf)
  }
  const activeSources = filter.sources ?? FILTER_DEFAULTS.sources
  if (activeSources.length < 6) {
    r = r.filter(x => activeSources.includes(x._sourceType || 'sibling_personal'))
  }
  return r
}

function isDefaultFilter(f) {
  return f.status === FILTER_DEFAULTS.status &&
    JSON.stringify([...f.faith].sort()) === JSON.stringify([...FILTER_DEFAULTS.faith].sort()) &&
    f.date === FILTER_DEFAULTS.date &&
    JSON.stringify([...(f.sources ?? FILTER_DEFAULTS.sources)].sort()) === JSON.stringify([...FILTER_DEFAULTS.sources].sort())
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
  const [showFilter, setShowFilter] = useState(false)
  const [filter, setFilter] = useState(loadSavedFilter)

  const { requests, logsMap, notesMap, loading, hasMore, loadMore, reload, logPrayer, addNote } = usePrayerFeed(activeTab)
  const { myRequests, createRequest, markAnswered, updateRequest, deleteRequest } = usePersonalPrayer()

  const filteredRequests = applyFilter(requests, filter)
  const filterActive = !isDefaultFilter(filter)
  const sourcesDefault = JSON.stringify([...(filter.sources ?? FILTER_DEFAULTS.sources)].sort()) === JSON.stringify([...FILTER_DEFAULTS.sources].sort())
  const filterCount = (filter.status !== 'all' ? 1 : 0) + (filter.faith.length < 2 ? 1 : 0) + (filter.date !== 'all' ? 1 : 0) + (sourcesDefault ? 0 : 1)

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
    if (filterActive) return 'Keine Anliegen entsprechen deinen Filterkriterien.'
    if (activeTab === 'siblings') return 'Deine Geschwister haben noch keine Anliegen geteilt.\nBete für sie! 🙏'
    if (activeTab === 'communities') return 'Deine Communities haben noch keine Anliegen geteilt.'
    return 'Sei der Erste der ein Anliegen teilt 🙏'
  }

  return (
    <div className="bg-bg min-h-full pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-warm-3 pt-3.5 px-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-[22px] font-bold text-dark m-0">Gebete</h2>
          <button
            onClick={() => setShowPost(true)}
            className="flex items-center gap-1.5 bg-warm-1 hover:bg-warm-1/90 text-white border-none rounded-xl px-3.5 py-2 font-serif text-[13px] font-semibold cursor-pointer shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} /> Anliegen
          </button>
        </div>

        {/* Tab-Leiste + Filter */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 flex-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 pb-2.5 border-b-2 transition-all duration-200 font-serif text-[14.5px] cursor-pointer
                  ${activeTab === t.key
                    ? 'border-warm-1 text-warm-1 font-bold'
                    : 'border-transparent text-dark-muted hover:text-dark font-medium'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilter(true)}
            style={{ position: 'relative', border: 'none', background: filterActive ? 'var(--color-warm-1)' : 'none', cursor: 'pointer', padding: '5px 7px', borderRadius: 8, color: filterActive ? 'white' : 'var(--color-text-muted)', flexShrink: 0, marginBottom: 4 }}
          >
            <SlidersHorizontal size={18} />
            {filterActive && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {filterActive && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 8, paddingTop: 2 }}>
            {filter.status !== 'all' && (
              <span style={chip}>{filter.status === 'open' ? 'Offen' : 'Erhört'}</span>
            )}
            {!filter.faith.includes('christian') && <span style={chip}>Nur Nicht-Christen</span>}
            {!filter.faith.includes('non_christian') && <span style={chip}>Nur Christen</span>}
            {filter.date !== 'all' && <span style={chip}>{{ today: 'Heute', week: 'Diese Woche', month: 'Dieser Monat' }[filter.date]}</span>}
            {!sourcesDefault && <span style={chip}>{(filter.sources ?? []).length} Quellen</span>}
            <button onClick={() => { setFilter({ ...FILTER_DEFAULTS }); localStorage.removeItem('prayer_filter') }} style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-warm-1)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontWeight: 500 }}>
              Zurücksetzen ✕
            </button>
          </div>
        )}
        {filterActive && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', paddingBottom: 6, margin: 0 }}>
            {filteredRequests.length} Anliegen
          </p>
        )}
      </div>

      {/* Eigene Anliegen */}
      <MyPrayerSection myRequests={myRequests} markAnswered={markAnswered} updateRequest={updateRequest} deleteRequest={deleteRequest} onNew={() => setShowPost(true)} />

      {/* Feed */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading && requests.length === 0 && (
          <>{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</>
        )}

        {!loading && filteredRequests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {getEmptyMessage()}
            </p>
            {filterActive && (
              <button onClick={() => { setFilter({ ...FILTER_DEFAULTS }); localStorage.removeItem('prayer_filter') }} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer' }}>
                Filter zurücksetzen
              </button>
            )}
            {!filterActive && activeTab === 'all' && (
              <button onClick={() => setShowPost(true)} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                + Anliegen teilen
              </button>
            )}
          </div>
        )}

        {filteredRequests.map(r => (
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

        {hasMore && !filterActive && (
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
        <PostRequestSheet onClose={() => setShowPost(false)} onPost={createRequest} />
      )}
      {previewProfile && (
        <ProfilePreviewSheet profile={previewProfile} onClose={() => setPreviewProfile(null)} />
      )}
      {showFilter && (
        <FilterSheet filter={filter} onApply={setFilter} onClose={() => setShowFilter(false)} />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
const menuItem = { display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }
const chip = { fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: 'var(--color-warm-1)', color: 'white' }
