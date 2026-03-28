import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserCheck, UserPlus, Clock, X, ChevronRight, MessageCircle, Bell, BellOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useToast } from '../context/ToastContext'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs'

// ─── Helpers ─────────────────────────────────────────────────
function Avatar({ name, size = 64, isChristian }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: isChristian
        ? 'linear-gradient(135deg, var(--color-accent), #2ECC71)'
        : 'linear-gradient(135deg, var(--color-warm-1), var(--color-gold))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.3, fontWeight: 700,
      boxShadow: '0 4px 14px rgba(58,46,36,0.18)',
    }}>{initials}</div>
  )
}

function SmallAvatar({ name, isChristian, size = 40 }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{initials}</div>
  )
}

function StatBlock({ value, label }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{value ?? '—'}</p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
    </div>
  )
}

// ─── PersonPublicSheet ────────────────────────────────────────
function PersonPublicSheet({ person, currentUserId, onClose }) {
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [prayedIds, setPrayedIds] = useState(new Set())

  useEffect(() => {
    loadRequests()
  }, [person.id])

  async function loadRequests() {
    const { data } = await supabase
      .from('prayer_requests')
      .select('id, content, is_answered')
      .eq('person_id', person.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function handlePray(requestId) {
    setPrayedIds(prev => new Set([...prev, requestId]))
    await supabase.from('prayer_logs').insert({ prayer_request_id: requestId, user_id: currentUserId })
    showToast('Gebet protokolliert ✓')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px 48px',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '75vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {person.name}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {loading && <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />}

        {!loading && requests.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Keine öffentlichen Gebetsanliegen.
          </p>
        )}

        {requests.map(r => {
          const prayed = prayedIds.has(r.id)
          return (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: r.is_answered ? 'var(--color-text-light)' : 'var(--color-text)', lineHeight: 1.6, margin: '0 0 10px', textDecoration: r.is_answered ? 'line-through' : 'none' }}>
                {r.content}
              </p>
              {!r.is_answered && (
                <button
                  onClick={() => handlePray(r.id)}
                  disabled={prayed}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: prayed ? 'default' : 'pointer',
                    backgroundColor: prayed ? 'var(--color-warm-4)' : 'var(--color-warm-1)',
                    color: prayed ? 'var(--color-text-muted)' : 'white',
                    fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500,
                  }}
                >
                  {prayed ? '🙏 Gebetet' : '🙏 Ich habe gebetet'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── PersonTile ───────────────────────────────────────────────
function PersonTile({ person, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '12px 8px',
        border: '1.5px solid var(--color-warm-3)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        transition: 'border-color 0.15s',
      }}
    >
      <SmallAvatar name={person.name} isChristian={person.is_christian} size={44} />
      <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', margin: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {person.name.split(' ')[0]}
      </p>
      {person.impact_stage > 0 && (
        <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>
          Stufe {person.impact_stage}
        </span>
      )}
    </button>
  )
}

// ─── MapSection ───────────────────────────────────────────────
function MapSection({ visibleMaps, peopleByMap, targetId }) {
  const navigate = useNavigate()

  if (visibleMaps.length === 0) return null

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10, paddingLeft: 4 }}>
        Oikos Maps
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleMaps.map(map => {
          const count = (peopleByMap[map.id] || []).length
          return (
            <button
              key={map.id}
              onClick={() => navigate(`/user/${targetId}/map/${map.id}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 14,
                backgroundColor: 'var(--color-warm-4)',
                border: '1px solid var(--color-warm-3)',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(58,46,36,0.06)',
                width: '100%', textAlign: 'left',
              }}
            >
              <div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>
                  {map.name}
                </p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                  {count} {count === 1 ? 'Person' : 'Personen'}
                </p>
              </div>
              <ChevronRight size={18} color="var(--color-text-muted)" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── UserProfile (Main) ───────────────────────────────────────
export default function UserProfile() {
  const { id: targetId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { getFriendshipStatus, getFriendship, sendRequest, acceptRequest, declineRequest } = useFriendships()

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [mapsData, setMapsData] = useState([])
  const [peopleByMap, setPeopleByMap] = useState({})
  const [myCommunityIds, setMyCommunityIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const { prefs, updatePref } = useNotificationPrefs(targetId)

  useEffect(() => {
    if (user && targetId === user.id) navigate('/profile', { replace: true })
  }, [user, targetId])

  useEffect(() => {
    if (!targetId || !user) return
    loadProfile()
  }, [targetId, user])

  async function loadProfile() {
    setLoading(true)

    const [
      { data: profileData },
      { count: peopleCount },
      { count: prayerCount },
      { data: stagesData },
      { data: communityData },
      { data: mapsRaw },
    ] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, bio, is_christian, gender').eq('id', targetId).single(),
      supabase.from('oikos_people').select('*', { count: 'exact', head: true }).eq('user_id', targetId),
      supabase.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('owner_id', targetId),
      supabase.from('oikos_people').select('impact_stage').eq('user_id', targetId).order('impact_stage', { ascending: false }).limit(1),
      supabase.from('community_members').select('community_id').eq('user_id', user.id),
      supabase.from('oikos_maps').select('id, name, visibility, visibility_user_ids, visibility_community_id').eq('user_id', targetId).neq('visibility', 'private'),
    ])

    if (!profileData) { setLoading(false); return }
    setProfile(profileData)
    setStats({ peopleCount: peopleCount || 0, prayerCount: prayerCount || 0, maxStage: stagesData?.[0]?.impact_stage || 0 })
    setMyCommunityIds((communityData || []).map(c => c.community_id))
    setMapsData(mapsRaw || [])

    // Personen für alle nicht-privaten Maps laden
    if (mapsRaw && mapsRaw.length > 0) {
      const { data: peopleData } = await supabase
        .from('oikos_people')
        .select('id, name, impact_stage, is_christian, map_id')
        .in('map_id', mapsRaw.map(m => m.id))
      const grouped = {}
      for (const p of (peopleData || [])) {
        if (!grouped[p.map_id]) grouped[p.map_id] = []
        grouped[p.map_id].push(p)
      }
      setPeopleByMap(grouped)
    }

    setLoading(false)
  }

  async function handleStartChat() {
    setChatLoading(true)
    try {
      const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: targetId })
      if (error) throw error
      navigate(`/chat/${convId}`)
    } catch (e) {
      showToast('Fehler beim Öffnen des Chats', 'error')
    } finally {
      setChatLoading(false)
    }
  }

  async function handleFriendAction() {
    const status = getFriendshipStatus(targetId)
    setActionLoading(true)
    try {
      if (status === 'none') {
        await sendRequest(targetId)
        showToast('Anfrage gesendet ✓')
      } else if (status === 'received') {
        const f = getFriendship(targetId)
        if (f) { await acceptRequest(f.id); showToast('Verbunden ✓') }
      } else if (status === 'sent') {
        const f = getFriendship(targetId)
        if (f) { await declineRequest(f.id); showToast('Anfrage zurückgezogen') }
      }
    } catch (e) {
      showToast(e.message || 'Fehler', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Sichtbarkeits-Filter (client-seitig)
  const friendStatus = getFriendshipStatus(targetId)
  const isSibling = friendStatus === 'friends'

  const visibleMaps = mapsData.filter(map => {
    if (map.visibility === 'all_siblings') return isSibling
    if (map.visibility === 'specific_include') return (map.visibility_user_ids || []).includes(user?.id)
    if (map.visibility === 'specific_exclude') return isSibling && !(map.visibility_user_ids || []).includes(user?.id)
    if (map.visibility === 'community') return myCommunityIds.includes(map.visibility_community_id)
    return false
  })

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%' }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <div style={{ height: 20, width: 120, borderRadius: 8, backgroundColor: 'var(--color-warm-3)' }} />
          <div style={{ width: 36 }} />
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ height: 160, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 80, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%' }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <span style={headerTitle}>Nicht gefunden</span>
          <div style={{ width: 36 }} />
        </div>
        <p style={{ padding: 24, fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
          Dieser Nutzer existiert nicht.
        </p>
      </div>
    )
  }

  const displayName = profile.full_name || profile.username || 'Unbekannt'
  const status = getFriendshipStatus(targetId)

  function FriendButton() {
    if (status === 'friends') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-accent-dark)', fontWeight: 600 }}>
        <UserCheck size={15} /> Verbunden
      </div>
    )
    if (status === 'sent') return (
      <button onClick={handleFriendAction} disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'transparent', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer', fontStyle: 'italic' }}>
        <Clock size={14} /> Anfrage ausstehend
      </button>
    )
    if (status === 'received') return (
      <button onClick={handleFriendAction} disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <UserCheck size={15} /> Annehmen
      </button>
    )
    return (
      <button onClick={handleFriendAction} disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <UserPlus size={15} /> {actionLoading ? '…' : 'Anfragen'}
      </button>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 90 }}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
        <span style={headerTitle}>@{profile.username}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {status === 'friends' && (
            <button onClick={handleStartChat} disabled={chatLoading} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-warm-1)', display: 'flex', alignItems: 'center' }}>
              <MessageCircle size={20} />
            </button>
          )}
          <button
            onClick={() => setShowNotifPrefs(true)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', position: 'relative',
              color: (prefs.notify_prayer_requests || prefs.notify_oikos_entries || prefs.notify_prayers_for_oikos) ? 'var(--color-warm-1)' : 'var(--color-text-light)' }}
            title="Benachrichtigungen"
          >
            <Bell size={20} />
            {(prefs.notify_prayer_requests || prefs.notify_oikos_entries || prefs.notify_prayers_for_oikos) && (
              <div style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Notification Preferences Sheet */}
      {showNotifPrefs && (
        <>
          <div onClick={() => setShowNotifPrefs(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Bell size={18} color="var(--color-warm-1)" />
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Benachrichtigungen für {displayName}
              </h3>
            </div>
            {[
              { field: 'notify_prayer_requests', label: 'Neue Gebetsanliegen', desc: 'Wenn neue Anliegen hinzugefügt werden' },
              { field: 'notify_oikos_entries', label: 'Neue OIKOS-Einträge', desc: 'Wenn Personen zur OIKOS-Map hinzugefügt werden' },
              { field: 'notify_prayers_for_oikos', label: 'Gebete für OIKOS', desc: 'Wenn jemand für eine Person aus diesem OIKOS betet' },
            ].map(({ field, label, desc }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{desc}</p>
                </div>
                <button
                  onClick={() => updatePref(field, !prefs[field])}
                  style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: prefs[field] ? 'var(--color-accent)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: prefs[field] ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            ))}
            <button onClick={() => setShowNotifPrefs(false)} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 20, backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Fertig
            </button>
          </div>
        </>
      )}

      {/* Profil-Karte */}
      <div style={{ backgroundColor: 'var(--color-white)', margin: 16, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(58,46,36,0.08)' }}>
        <div style={{ height: 70, background: 'linear-gradient(135deg, var(--color-warm-4), var(--color-warm-3))' }} />
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36, marginBottom: 12 }}>
            <Avatar name={displayName} size={72} isChristian={profile.is_christian} />
            <FriendButton />
          </div>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>
            {displayName}
          </p>
          {profile.username && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
              @{profile.username}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: profile.bio ? 12 : 0 }}>
            {profile.is_christian && (
              <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: '#DFF5E8', color: '#1E8449' }}>
                Christ ✓
              </span>
            )}
            {profile.gender === 'brother' && (
              <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                🙋‍♂️ Bruder in Christus
              </span>
            )}
            {profile.gender === 'sister' && (
              <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: '#FCE7F3', color: '#9D174D' }}>
                🙋‍♀️ Schwester in Christus
              </span>
            )}
          </div>
          {profile.bio && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              "{profile.bio}"
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ backgroundColor: 'var(--color-white)', margin: '0 16px 16px', borderRadius: 16, padding: '16px 0', boxShadow: '0 2px 8px rgba(58,46,36,0.06)', display: 'flex', alignItems: 'center' }}>
          <StatBlock value={stats.peopleCount} label="Personen" />
          <div style={{ width: 1, height: 36, backgroundColor: 'var(--color-warm-3)' }} />
          <StatBlock value={stats.prayerCount} label="Gebete" />
          <div style={{ width: 1, height: 36, backgroundColor: 'var(--color-warm-3)' }} />
          <StatBlock value={stats.maxStage > 0 ? `Stufe ${stats.maxStage}` : '—'} label="Max. Stufe" />
        </div>
      )}

      {/* Sichtbare Maps */}
      {visibleMaps.length > 0 && (
        <MapSection
          visibleMaps={visibleMaps}
          peopleByMap={peopleByMap}
          targetId={targetId}
        />
      )}
    </div>
  )
}

// Styles
const headerStyle = { backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }
const backBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }
const headerTitle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center', margin: '0 8px' }
