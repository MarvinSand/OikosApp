import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserCheck, UserPlus, Clock, X, ChevronRight, MessageCircle, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useToast } from '../context/ToastContext'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs'
import { countryToFlag, COUNTRIES } from '../lib/countries'

// ─── Helpers ─────────────────────────────────────────────────

function formatLastActive(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const minutes = diff / 60000
  const hours = minutes / 60
  const days = hours / 24
  if (minutes < 60) return 'Gerade aktiv 🟢'
  if (hours < 24) return 'Heute aktiv'
  if (days < 2) return 'Gestern aktiv'
  if (days < 7) return `Vor ${Math.floor(days)} Tagen aktiv`
  return null
}

function isBirthdayToday(birthdayStr) {
  if (!birthdayStr) return false
  const today = new Date()
  const [, m, d] = birthdayStr.split('-')
  return parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate()
}

function formatBirthdayDisplay(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const d = new Date(2000, parseInt(month) - 1, parseInt(day))
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

// ─── Avatar ─────────────────────────────────────────────────
function Avatar({ profile, size = 64 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-white)', boxShadow: '0 4px 14px rgba(58,46,36,0.18)', flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: profile?.is_christian
        ? 'linear-gradient(135deg, var(--color-accent), #2ECC71)'
        : 'linear-gradient(135deg, var(--color-warm-1), var(--color-gold))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.3, fontWeight: 700,
      boxShadow: '0 4px 14px rgba(58,46,36,0.18)',
    }}>{initials}</div>
  )
}

function SmallAvatar({ profile, size = 28 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid white', flexShrink: 0, marginLeft: -8 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
      border: '1.5px solid white', marginLeft: -8,
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

// ─── Prayer Section (Fremdprofil) ────────────────────────────
function PrayerSection({ targetId, currentUserId }) {
  const { showToast } = useToast()
  const [activeRequests, setActiveRequests] = useState([])
  const [answeredRequests, setAnsweredRequests] = useState([])
  const [prayerCounts, setPrayerCounts] = useState({})
  const [recentLogs, setRecentLogs] = useState({})
  const [prayedIds, setPrayedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    load()
  }, [targetId])

  async function load() {
    setLoading(true)
    const [
      { data: personal },
      { data: forPeople },
    ] = await Promise.all([
      supabase
        .from('personal_prayer_requests')
        .select('id, title, description, is_answered, created_at')
        .eq('owner_id', targetId)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('prayer_requests')
        .select('id, content, is_answered, created_at')
        .eq('owner_id', targetId)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
    ])

    // Normalise both sources into {id, title, description, is_answered, source}
    const all = [
      ...(personal || []).map(r => ({ id: r.id, title: r.title, description: r.description, is_answered: r.is_answered, source: 'personal' })),
      ...(forPeople || []).map(r => ({ id: r.id, title: r.content, description: null, is_answered: r.is_answered, source: 'person' })),
    ]

    if (all.length === 0) { setLoading(false); return }

    // Load prayer counts and current user's last log
    const personalIds = (personal || []).map(r => r.id)
    const personIds = (forPeople || []).map(r => r.id)

    const [{ data: pLogs }, { data: ppLogs }] = await Promise.all([
      personalIds.length > 0
        ? supabase.from('personal_prayer_logs').select('request_id, user_id, prayed_at').in('request_id', personalIds)
        : Promise.resolve({ data: [] }),
      personIds.length > 0
        ? supabase.from('prayer_logs').select('prayer_request_id, user_id, prayed_at').in('prayer_request_id', personIds)
        : Promise.resolve({ data: [] }),
    ])

    // Build count maps and last-log-by-current-user maps
    const counts = {}
    const recents = {}

    for (const l of (pLogs || [])) {
      counts[l.request_id] = (counts[l.request_id] || 0) + 1
      if (l.user_id === currentUserId) {
        if (!recents[l.request_id] || new Date(l.prayed_at) > new Date(recents[l.request_id])) {
          recents[l.request_id] = l.prayed_at
        }
      }
    }
    for (const l of (ppLogs || [])) {
      counts[l.prayer_request_id] = (counts[l.prayer_request_id] || 0) + 1
      if (l.user_id === currentUserId) {
        if (!recents[l.prayer_request_id] || new Date(l.prayed_at) > new Date(recents[l.prayer_request_id])) {
          recents[l.prayer_request_id] = l.prayed_at
        }
      }
    }

    setPrayerCounts(counts)
    setRecentLogs(recents)

    // Sort active: least recently prayed by current user first
    const active = all.filter(r => !r.is_answered).sort((a, b) => {
      const la = recents[a.id] ? new Date(recents[a.id]).getTime() : 0
      const lb = recents[b.id] ? new Date(recents[b.id]).getTime() : 0
      return la - lb
    })
    setActiveRequests(active)
    setAnsweredRequests(all.filter(r => r.is_answered))
    setLoading(false)
  }

  async function handlePray(req) {
    setPrayedIds(prev => new Set([...prev, req.id]))
    const now = new Date().toISOString()
    setRecentLogs(prev => ({ ...prev, [req.id]: now }))
    setPrayerCounts(prev => ({ ...prev, [req.id]: (prev[req.id] || 0) + 1 }))

    if (req.source === 'personal') {
      await supabase.from('personal_prayer_logs').insert({ request_id: req.id, user_id: currentUserId, prayed_at: now })
    } else {
      await supabase.from('prayer_logs').insert({ prayer_request_id: req.id, user_id: currentUserId, prayed_at: now })
    }
    showToast('Gebet protokolliert ✓')

    // Move to end of active list (optimistic)
    setActiveRequests(prev => {
      const item = prev.find(r => r.id === req.id)
      if (!item) return prev
      return [...prev.filter(r => r.id !== req.id), item]
    })
  }

  function formatLastPrayed(ts) {
    if (!ts) return '🙏 Noch nie gebetet'
    const diff = Date.now() - new Date(ts).getTime()
    const days = diff / 86400000
    const hours = diff / 3600000
    if (hours < 1) return '🙏 Gerade eben gebetet'
    if (hours < 24) return `🙏 Vor ${Math.floor(hours)} Std. gebetet`
    if (days < 2) return '🙏 Gestern gebetet'
    return `🙏 Vor ${Math.floor(days)} Tagen gebetet`
  }

  const visibleActive = showAll ? activeRequests : activeRequests.slice(0, 5)
  const hasMore = activeRequests.length > 5 && !showAll

  if (loading) {
    return (
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{ height: 100, borderRadius: 14, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    )
  }

  if (activeRequests.length === 0 && answeredRequests.length === 0) return null

  return (
    <div style={{ margin: '0 16px 16px' }}>
      {activeRequests.length > 0 && (
        <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 14px' }}>🙏 Gebetsanliegen</p>

          {visibleActive.map((req, idx) => {
            const prayed = prayedIds.has(req.id)
            const count = prayerCounts[req.id] || 0
            const lastPrayed = recentLogs[req.id] || null
            return (
              <div key={req.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: idx < visibleActive.length - 1 ? '1px solid var(--color-warm-3)' : 'none' }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {req.title}
                </p>
                {req.description && (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 6px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {req.description}
                  </p>
                )}
                <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: '0 0 10px' }}>
                  {formatLastPrayed(lastPrayed)} {count > 0 && `· ${count}× gebetet`}
                </p>
                <button
                  onClick={() => handlePray(req)}
                  disabled={prayed}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: prayed ? 'default' : 'pointer', backgroundColor: prayed ? 'var(--color-warm-4)' : 'var(--color-warm-1)', color: prayed ? 'var(--color-text-muted)' : 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500 }}
                >
                  {prayed ? '🙏 Gebetet ✓' : '🙏 Ich habe gebetet'}
                </button>
              </div>
            )
          })}

          {hasMore && (
            <button onClick={() => setShowAll(true)} style={{ width: '100%', padding: '8px 0', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 600 }}>
              Alle {activeRequests.length} Anliegen anzeigen →
            </button>
          )}
        </div>
      )}

      {answeredRequests.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)', margin: '0 0 12px' }} />
          <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 12px' }}>🎉 Erhörte Gebete</p>
            {answeredRequests.map((req, idx) => (
              <div
                key={req.id}
                style={{ padding: '12px', borderRadius: 12, border: '1.5px solid #DFF5E8', backgroundColor: 'rgba(46,204,113,0.04)', marginBottom: idx < answeredRequests.length - 1 ? 10 : 0, position: 'relative' }}
              >
                <div style={{ position: 'absolute', top: 10, right: 10, fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, backgroundColor: '#DFF5E8', color: '#1E8449' }}>
                  Erhört ✓
                </div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text-light)', margin: 0, paddingRight: 60, textDecoration: 'line-through', textDecorationColor: '#2ECC71' }}>
                  {req.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MapSection ──────────────────────────────────────────────
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
            <button key={map.id} onClick={() => navigate(`/user/${targetId}/map/${map.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)', cursor: 'pointer', boxShadow: '0 1px 4px rgba(58,46,36,0.06)', width: '100%', textAlign: 'left' }}>
              <div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>{map.name}</p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{count} {count === 1 ? 'Person' : 'Personen'}</p>
              </div>
              <ChevronRight size={18} color="var(--color-text-muted)" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── UserProfile (Main) ──────────────────────────────────────
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
  const birthdayBannerKey = `birthday_banner_${targetId}_${new Date().toDateString()}`
  const [bannerDismissed, setBannerDismissed] = useState(() => !!localStorage.getItem(birthdayBannerKey))

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
      supabase.from('profiles').select('*').eq('id', targetId).single(),
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
    } catch {
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
  const countryObj = COUNTRIES.find(c => c.code === profile.country)
  const flag = countryObj ? countryToFlag(countryObj.code) : ''
  const lastActiveText = profile.show_last_active ? formatLastActive(profile.last_active_at) : null
  const showBirthdayBanner = profile.show_birthday && isBirthdayToday(profile.birthday)

  function dismissBanner() {
    localStorage.setItem(birthdayBannerKey, '1')
    setBannerDismissed(true)
  }

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
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%' }} className="pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
        <span style={headerTitle}>@{profile.username}</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Notification Preferences Sheet */}
      {showNotifPrefs && (
        <>
          <div onClick={() => setShowNotifPrefs(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))' }}>
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
              { field: 'notify_prayers_for_oikos', label: 'Gebetsanliegen für OIKOS', desc: 'Wenn ein neues Gebetsanliegen für eine Person im OIKOS gepostet wird' },
              { field: 'notify_storyline_entries', label: 'Neue Story-Line Einträge', desc: 'Wenn ein neuer Story-Line Eintrag für eine OIKOS-Person hinzugefügt wird' },
            ].map(({ field, label, desc }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{desc}</p>
                </div>
                <button onClick={() => updatePref(field, !prefs[field])} style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: prefs[field] ? 'var(--color-accent)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}>
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

      {/* Geburtstags-Banner */}
      {showBirthdayBanner && !bannerDismissed && (
        <div style={{ margin: '12px 16px 0', padding: '16px', borderRadius: 16, background: 'linear-gradient(135deg, #FFF8E1, #FFECB3)', border: '1.5px solid #F9A825', position: 'relative' }}>
          <button onClick={dismissBanner} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', cursor: 'pointer', color: '#795548', padding: 4 }}>
            <X size={16} />
          </button>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: '#795548', margin: '0 0 4px' }}>
            🎂 Heute hat {displayName} Geburtstag!
          </p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#8D6E63', margin: '0 0 12px' }}>
            Schreib ihm/ihr eine Nachricht
          </p>
          {isSibling && (
            <button onClick={handleStartChat} disabled={chatLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', backgroundColor: '#F9A825', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <MessageCircle size={14} /> Gratulieren
            </button>
          )}
        </div>
      )}

      {/* Profil-Karte */}
      <div style={{ backgroundColor: 'var(--color-white)', margin: 16, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(58,46,36,0.08)' }}>
        <div style={{ height: 70, background: 'linear-gradient(135deg, var(--color-warm-4), var(--color-warm-3))' }} />
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36, marginBottom: 12 }}>
            <Avatar profile={profile} size={72} />
            <FriendButton />
          </div>

          {/* Name + actions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {displayName}
            </p>
            {status === 'friends' && (
              <button onClick={handleStartChat} disabled={chatLoading} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-warm-1)', display: 'flex', alignItems: 'center' }}>
                <MessageCircle size={18} />
              </button>
            )}
            <button onClick={() => setShowNotifPrefs(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', position: 'relative', color: (prefs.notify_prayer_requests || prefs.notify_oikos_entries || prefs.notify_prayers_for_oikos || prefs.notify_storyline_entries) ? 'var(--color-warm-1)' : 'var(--color-text-light)' }} title="Benachrichtigungen">
              <Bell size={18} />
              {(prefs.notify_prayer_requests || prefs.notify_oikos_entries || prefs.notify_prayers_for_oikos || prefs.notify_storyline_entries) && (
                <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)' }} />
              )}
            </button>
          </div>

          {profile.username && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>
              @{profile.username}
            </p>
          )}

          {/* Location + Church + Last active */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
            {(profile.city || profile.country) && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {flag && <span>{flag} </span>}
                {profile.city || ''}
                {profile.city && countryObj ? ` · ${countryObj.name}` : countryObj?.name || ''}
              </p>
            )}
            {profile.church_name && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                ⛪ {profile.church_name}
              </p>
            )}
            {profile.show_birthday && profile.birthday && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                🎂 {formatBirthdayDisplay(profile.birthday)}
              </p>
            )}
            {lastActiveText && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', margin: 0 }}>
                {lastActiveText}
              </p>
            )}
          </div>

          {/* Badges */}
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

      {/* Gebetsanliegen */}
      <PrayerSection targetId={targetId} currentUserId={user?.id} />

      {/* Sichtbare Maps */}
      {visibleMaps.length > 0 && (
        <MapSection visibleMaps={visibleMaps} peopleByMap={peopleByMap} targetId={targetId} />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes sheetSlideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}

// Styles
const headerStyle = { backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }
const backBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }
const headerTitle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center', margin: '0 8px' }
