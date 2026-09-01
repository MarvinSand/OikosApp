import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Church, MessageCircle, Map as MapIcon, HandHeart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useFriendships } from '../../hooks/useFriendships'
import { useToast } from '../../context/ToastContext'
import { countryToFlag, COUNTRIES } from '../../lib/countries'

function timeAgo(dateStr) {
  if (!dateStr) return ''
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

// ════════════════════════════════════════════════════════════════════════
// Mini-Profilvorschau für eine mit einem OIKOS-Account verknüpfte Person
// ════════════════════════════════════════════════════════════════════════
// Wird in AccountLinkingSection (PersonDetailSheet) direkt unter der
// Profil-Zeile eingehängt — egal ob eigene oder fremde (Geschwister-)Map.

export default function LinkedProfilePreview({ person, linkedProfile, isOwner, overlayData = [], onOverlayPreview }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { friends, getFriendshipStatus } = useFriendships()

  const linkedUserId = person.linked_user_id

  const [connections, setConnections] = useState([])
  const [maps, setMaps] = useState([])
  // Aus overlayData vorbelegen, damit die Häkchen nach dem Schließen/erneuten
  // Öffnen des Sheets weiterhin den tatsächlich aktiven Overlay-Status zeigen.
  const [overlaidMapIds, setOverlaidMapIds] = useState(() =>
    overlayData.filter(od => od.parentPersonId === person.id && od.overlayMapId).map(od => od.overlayMapId)
  )
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    if (!linkedUserId) return
    let cancelled = false
    setLoading(true)
    setOverlaidMapIds(
      overlayData.filter(od => od.parentPersonId === person.id && od.overlayMapId).map(od => od.overlayMapId)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps

    async function load() {
      const tasks = [
        supabase.rpc('get_user_connections', { target_id: linkedUserId }),
        supabase
          .from('personal_prayer_requests')
          .select('id, title, description, created_at')
          .eq('owner_id', linkedUserId)
          .eq('visibility', 'public')
          .eq('is_answered', false)
          .order('created_at', { ascending: false })
          .limit(5),
      ]
      if (!isOwner) {
        tasks.push(
          supabase
            .from('oikos_maps')
            .select('id, name, visibility')
            .eq('user_id', linkedUserId)
            .neq('visibility', 'private')
        )
      }
      const results = await Promise.all(tasks)
      if (cancelled) return
      setConnections(results[0]?.data || [])
      setPrayers(results[1]?.data || [])
      if (!isOwner) setMaps(results[2]?.data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [linkedUserId, isOwner])

  const mutualFriends = useMemo(() => {
    const myFriendIds = new Set(friends.map(f => f.otherUser?.id).filter(Boolean))
    return connections.filter(c => myFriendIds.has(c.id))
  }, [connections, friends])

  const friendshipStatus = linkedUserId ? getFriendshipStatus(linkedUserId) : 'none'
  const isFriend = friendshipStatus === 'friends'

  const countryObj = COUNTRIES.find(c => c.code === linkedProfile?.country)
  const flag = countryObj ? countryToFlag(countryObj.code) : ''
  const cityLabel = [linkedProfile?.city, countryObj?.name].filter(Boolean).join(' · ')
  const cityVisible = linkedProfile?.show_city !== false && (cityLabel || flag)
  const churchVisible = linkedProfile?.show_church !== false && linkedProfile?.church_name
  const bioText = linkedProfile?.bio_text || linkedProfile?.bio
  const bioVisible = linkedProfile?.show_bio !== false && bioText
  const hasCoords = linkedProfile?.latitude != null && linkedProfile?.longitude != null

  function handleShowOnWorldMap() {
    if (!hasCoords) { showToast('Kein Standort auf der Weltkarte hinterlegt'); return }
    navigate(`/worldmap?focus=${linkedUserId}`)
  }

  async function handleStartChat() {
    setChatLoading(true)
    try {
      const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: linkedUserId })
      if (error) throw error
      navigate(`/chat/${convId}`)
    } catch {
      showToast('Fehler beim Öffnen des Chats', 'error')
    } finally {
      setChatLoading(false)
    }
  }

  function handleToggleMapOverlay(mapId) {
    const next = overlaidMapIds.includes(mapId)
      ? overlaidMapIds.filter(id => id !== mapId)
      : [...overlaidMapIds, mapId]
    setOverlaidMapIds(next)
    onOverlayPreview?.(person.id, mapId, next.includes(mapId))
  }

  if (!linkedUserId) return null

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Bio */}
      {bioVisible && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
          {bioText}
        </p>
      )}

      {/* Wohnort / Kirche + Weltkarte-Button */}
      {(cityVisible || churchVisible || hasCoords) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
            {cityVisible && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {flag && `${flag} `}{cityLabel}
              </span>
            )}
            {churchVisible && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Church size={12} /> {linkedProfile.church_name}
              </span>
            )}
          </div>
          {hasCoords && (
            <button
              onClick={handleShowOnWorldMap}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-warm-1)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              🌍 Auf Weltkarte anzeigen
            </button>
          )}
        </div>
      )}

      {/* Freunde + Nachricht */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => navigate(`/user/${linkedUserId}/connections`)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
            {loading ? 'Lade Freunde…' : (
              <>
                <strong style={{ color: 'var(--color-text)' }}>{connections.length}</strong> Freunde
                {mutualFriends.length > 0 && ` · ${mutualFriends.length} gemeinsam`}
              </>
            )}
          </span>
        </button>
        {isFriend && (
          <button
            onClick={handleStartChat}
            disabled={chatLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <MessageCircle size={13} /> {chatLoading ? '…' : 'Nachricht'}
          </button>
        )}
      </div>

      {/* Gemeinsame Freunde Avatare */}
      {mutualFriends.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: -6, marginBottom: 12, marginTop: -6 }}>
          <div style={{ display: 'flex' }}>
            {mutualFriends.slice(0, 5).map((f, i) => (
              <div
                key={f.id}
                title={f.full_name || f.username}
                style={{
                  width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-warm-2)',
                  border: '2px solid var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 9, fontWeight: 700,
                  overflow: 'hidden', marginLeft: i === 0 ? 0 : -8, flexShrink: 0,
                }}
              >
                {f.avatar_url
                  ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(f.full_name || f.username || '?')
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Oikos-Maps der Person — nur beim Ansehen einer fremden Map */}
      {!isOwner && !loading && maps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapIcon size={12} /> Oikos-Maps von {linkedProfile.full_name || linkedProfile.username}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {maps.map(m => {
              const isShown = overlaidMapIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => handleToggleMapOverlay(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    border: `1.5px solid ${isShown ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                    backgroundColor: isShown ? 'var(--color-warm-1)' : 'var(--color-white)',
                    color: isShown ? 'var(--color-bg)' : 'var(--color-text)',
                    fontFamily: 'Lora, serif', fontSize: 13, fontWeight: isShown ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{isShown ? '✓' : '○'}</span>
                  <span style={{ fontSize: 14 }}>🗺</span>
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Offene Gebetsanliegen */}
      {!loading && prayers.length > 0 && (
        <div>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <HandHeart size={12} /> Gebetsanliegen
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {prayers.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/prayer/${p.id}`)}
                style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: p.description ? 2 : 0 }}>
                  {p.title}
                </div>
                {p.description && (
                  <div style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description}
                  </div>
                )}
                <div style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                  {timeAgo(p.created_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
