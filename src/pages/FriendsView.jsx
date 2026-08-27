import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Search, Users, Plus, Hash, Check, X, MoreVertical, Copy, ChevronRight, MessageCircle, Bell, Globe, BookOpen, HandHeart, HelpCircle, Image, MessageSquare, MoreHorizontal, Send, Trash2, UserCheck, Loader2, SlidersHorizontal, Bookmark, ArrowLeft } from 'lucide-react'
import ShareSheet from '../components/feed/ShareSheet'
import SavePostSheet from '../components/feed/SavePostSheet'
import PostEngagementBar from '../components/feed/PostEngagementBar'
import FeedCardFrame, { CONTENT_INSET } from '../components/feed/FeedCardFrame'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useCommunities } from '../hooks/useCommunities'
import { useCommunityMembersPreview } from '../hooks/useCommunityMembersPreview'
import CommunityCard from '../components/community/CommunityCard'
import MutualAvatars from '../components/common/MutualAvatars'
import { fetchMutualFriendsMap } from '../lib/mutualFriends'
import { Compass } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useConversations } from '../hooks/useConversations'
import { useToast } from '../context/ToastContext'
import { useFeed } from '../hooks/useFeed'
import { supabase } from '../lib/supabase'
import PrayerFeedSwitcher from '../components/layout/PrayerFeedSwitcher'
import DateFilterControl from '../components/ui/DateFilterControl'
import ExpandableSearch from '../components/common/ExpandableSearch'
import { EMPTY_DATE_FILTER, matchesDateFilter, isDateFilterActive } from '../lib/dateFilter'
import BibleReferenceChip from '../components/bible/BibleReferenceChip'
import { verseAttachmentFromRow } from '../lib/bibleLink'
import FeedPostSheet, { FEED_CATEGORIES } from '../components/feed/FeedPostSheet'

// ─── Avatar ────────────────────────────────────────────────
function Avatar({ name, size = 40, isChristian, avatarUrl }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--color-warm-3)' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{initials}</div>
  )
}

// ─── Notifications Sheet ─────────────────────────────────────
function NotificationsSheet({ onClose }) {
  const { notifications, loading, unreadCount, markAllRead, markRead } = useNotifications()

  useEffect(() => {
    if (unreadCount > 0) markAllRead()
  }, [])

  function formatDate(iso) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Gerade eben'
    if (diffMin < 60) return `vor ${diffMin} Min.`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `vor ${diffH} Std.`
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  const icons = {
    friend_request: '👤',
    friend_accepted: '🤝',
    community_invite: '👥',
    community_event: '📅',
    prayer_shared: '🙏',
    birthday: '🎂',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', maxHeight: '75vh', overflowY: 'auto', animation: 'sheetSlideUp 0.3s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Benachrichtigungen</h3>

        {loading && <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />}

        {!loading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ fontSize: 32, margin: '0 0 10px' }}>🔔</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Benachrichtigungen.</p>
          </div>
        )}

        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => !n.is_read && markRead(n.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
              borderBottom: '1px solid var(--color-warm-3)',
              backgroundColor: n.is_read ? 'transparent' : 'rgba(175,138,100,0.05)',
              borderRadius: 4,
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {icons[n.type] || '🔔'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--color-text)', margin: '0 0 3px' }}>{n.title}</p>
              {n.body && <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 3px', lineHeight: 1.4 }}>{n.body}</p>}
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: 0 }}>{formatDate(n.created_at)}</p>
            </div>
            {!n.is_read && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', flexShrink: 0, marginTop: 6 }} />
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── helpers ────────────────────────────────────────────────
function birthdayDaysUntil(birthdayStr) {
  if (!birthdayStr) return null
  const today = new Date()
  const [, m, d] = birthdayStr.split('-')
  let next = new Date(today.getFullYear(), parseInt(m) - 1, parseInt(d))
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next = new Date(today.getFullYear() + 1, parseInt(m) - 1, parseInt(d))
  }
  const diff = Math.round((next - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
  return diff
}

// ─── FriendsTab ─────────────────────────────────────────────
function FriendsTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { friends, pendingReceived, pendingSent, loading, getFriendshipStatus, searchUsers, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriendships()

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const timerRef = useRef(null)

  // Filter state
  const [cityFilter, setCityFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [churchFilter, setChurchFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState(null) // 'city'|'country'|'church'|null
  const [myCity, setMyCity] = useState('')

  // Discover data
  const [nearbyUsers, setNearbyUsers] = useState([])
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([])
  const [notConnected, setNotConnected] = useState([])
  const [mutuals, setMutuals] = useState({}) // userId -> { count, people }

  useEffect(() => {
    if (!user || loading) return
    loadMyCity()
    loadNotConnected()
  }, [user?.id, loading, friends.length])

  // Gemeinsame Freunde für die "noch nicht connected"-Liste laden
  useEffect(() => {
    if (!user || notConnected.length === 0) { setMutuals({}); return }
    const myFriendIds = friends.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    if (myFriendIds.length === 0) { setMutuals({}); return }
    fetchMutualFriendsMap({
      myFriendIds,
      excludeIds: [user.id],
      candidateIds: notConnected.map(u => u.id),
    }).then(setMutuals)
  }, [user?.id, notConnected, friends])

  async function loadMyCity() {
    const { data } = await supabase.from('profiles').select('city').eq('id', user.id).single()
    if (data?.city) {
      setMyCity(data.city)
      loadNearby(data.city)
    }
    loadBirthdays()
  }

  async function loadNearby(city) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_christian, avatar_url, city')
      .neq('id', user.id)
      .ilike('city', city)
      .limit(10)
    setNearbyUsers(data || [])
  }

  async function loadBirthdays() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_christian, avatar_url, birthday')
      .neq('id', user.id)
      .eq('show_birthday', true)
      .not('birthday', 'is', null)
    if (!data) return
    const upcoming = data
      .map(p => ({ ...p, daysUntil: birthdayDaysUntil(p.birthday) }))
      .filter(p => p.daysUntil !== null && p.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
    setUpcomingBirthdays(upcoming)
  }

  async function loadNotConnected() {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_christian, avatar_url, city, country, church_name')
      .neq('id', user.id)
    if (!allProfiles) return
    const connectedIds = new Set(friends.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    ))
    setNotConnected(allProfiles.filter(p => !connectedIds.has(p.id)))
  }

  function handleQuery(val) {
    setQuery(val)
    clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      const results = await searchUsers(val.trim())
      setSearchResults(results)
      setSearching(false)
    }, 300)
  }

  async function handleSend(userId) {
    setSending(userId)
    try {
      await sendRequest(userId)
      showToast('Anfrage gesendet ✓')
    } catch (e) {
      showToast(e.message || 'Fehler', 'error')
    } finally {
      setSending(null)
    }
  }

  async function handleAccept(fId) {
    await acceptRequest(fId)
    showToast('Verbunden ✓')
  }

  async function handleDecline(fId) {
    await declineRequest(fId)
  }

  async function handleRemove(fId) {
    setOpenMenu(null)
    if (!window.confirm('Verbindung wirklich entfernen?')) return
    await removeFriend(fId)
    showToast('Verbindung entfernt', 'info')
  }

  const showSearch = query.trim().length >= 2

  // Filter notConnected by active filter
  const filteredNotConnected = notConnected.filter(u => {
    if (cityFilter) return u.city?.toLowerCase().includes(cityFilter.toLowerCase())
    if (countryFilter) return u.country === countryFilter
    if (churchFilter) return u.church_name?.toLowerCase().includes(churchFilter.toLowerCase())
    return true
  })

  const hasAnyFilter = cityFilter || countryFilter || churchFilter

  return (
    <div>
      {/* Auf der Weltkarte nach Geschwistern suchen */}
      <button
        onClick={() => navigate('/worldmap?layer=siblings')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px', marginBottom: 14, borderRadius: 12,
          border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
          fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <Globe size={17} /> Auf der Map suchen
      </button>

      {/* Suchfeld */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={15} color="var(--color-text-light)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={query}
          onChange={e => handleQuery(e.target.value)}
          placeholder="Name oder Username suchen…"
          style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }}
        />
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
        {[
          { key: null, label: '🌍 Alle' },
          { key: 'city', label: cityFilter ? `📍 ${cityFilter}` : '📍 Stadt' },
          { key: 'country', label: countryFilter ? `🏳 Land` : '🏳 Land' },
          { key: 'church', label: churchFilter ? `⛪ ${churchFilter}` : '⛪ Gemeinde' },
        ].map(f => (
          <button
            key={String(f.key)}
            onClick={() => {
              if (f.key === null) {
                setCityFilter(''); setCountryFilter(''); setChurchFilter(''); setActiveFilter(null)
              } else {
                setActiveFilter(activeFilter === f.key ? null : f.key)
              }
            }}
            style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${(f.key === null && !hasAnyFilter) || activeFilter === f.key || (f.key === 'city' && cityFilter) || (f.key === 'country' && countryFilter) || (f.key === 'church' && churchFilter) ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, backgroundColor: (f.key === null && !hasAnyFilter) || (f.key === 'city' && cityFilter) || (f.key === 'country' && countryFilter) || (f.key === 'church' && churchFilter) ? 'rgba(74,103,65,0.1)' : 'transparent', color: (f.key === null && !hasAnyFilter) || activeFilter === f.key || (f.key === 'city' && cityFilter) || (f.key === 'country' && countryFilter) || (f.key === 'church' && churchFilter) ? 'var(--color-warm-1)' : 'var(--color-text-muted)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filter Inputs */}
      {activeFilter === 'city' && (
        <div style={{ marginBottom: 16 }}>
          <input
            autoFocus
            type="text"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            placeholder="Stadt eingeben…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--color-warm-1)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }}
          />
        </div>
      )}
      {activeFilter === 'country' && (
        <div style={{ marginBottom: 16 }}>
          <select
            autoFocus
            value={countryFilter}
            onChange={e => { setCountryFilter(e.target.value); setActiveFilter(null) }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--color-warm-1)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }}
          >
            <option value="">— Land wählen —</option>
            <option value="DE">🇩🇪 Deutschland</option>
            <option value="AT">🇦🇹 Österreich</option>
            <option value="CH">🇨🇭 Schweiz</option>
          </select>
        </div>
      )}
      {activeFilter === 'church' && (
        <div style={{ marginBottom: 16 }}>
          <input
            autoFocus
            type="text"
            value={churchFilter}
            onChange={e => setChurchFilter(e.target.value)}
            placeholder="Gemeinde suchen…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--color-warm-1)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }}
          />
        </div>
      )}

      {/* Suchergebnisse */}
      {showSearch && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionLabel}>Suchergebnisse</p>
          {searching && <p style={mutedText}>Suche…</p>}
          {!searching && searchResults.length === 0 && <p style={mutedText}>Keine Nutzer gefunden.</p>}
          {searchResults.map(u => {
            const status = getFriendshipStatus(u.id)
            return (
              <div key={u.id} style={personRow}>
                <Avatar name={u.full_name || u.username} isChristian={u.is_christian} avatarUrl={u.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={nameText}>{u.full_name || u.username}</p>
                  <p style={usernameText}>@{u.username}</p>
                </div>
                {status === 'none' && (
                  <button onClick={() => handleSend(u.id)} disabled={sending === u.id} style={connectBtn}>
                    {sending === u.id ? '…' : 'Verbinden'}
                  </button>
                )}
                {status === 'sent' && <span style={pendingBadge}>Ausstehend</span>}
                {status === 'friends' && <span style={friendsBadge}>Verbunden ✓</span>}
                {status === 'received' && <span style={pendingBadge}>Anfrage erhalten</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Geburtstage in den nächsten 7 Tagen */}
      {!showSearch && upcomingBirthdays.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionLabel}>🎂 Bald Geburtstag</p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
            {upcomingBirthdays.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/user/${p.id}`)}
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 10px', borderRadius: 14, backgroundColor: p.daysUntil === 0 ? '#FFF8E1' : 'var(--color-white)', border: `1.5px solid ${p.daysUntil === 0 ? '#F9A825' : 'var(--color-warm-3)'}`, cursor: 'pointer', minWidth: 80, textAlign: 'center' }}
              >
                <Avatar name={p.full_name || p.username} isChristian={p.is_christian} avatarUrl={p.avatar_url} size={44} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', margin: 0, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(p.full_name || p.username || '').split(' ')[0]}
                </p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: p.daysUntil === 0 ? '#F9A825' : 'var(--color-text-muted)', margin: 0, fontWeight: p.daysUntil === 0 ? 700 : 400 }}>
                  {p.daysUntil === 0 ? 'Heute! 🎂' : `in ${p.daysUntil} Tag${p.daysUntil === 1 ? '' : 'en'}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Geschwister in deiner Nähe */}
      {!showSearch && myCity && nearbyUsers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionLabel}>📍 Geschwister in {myCity}</p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
            {nearbyUsers.slice(0, 5).map(u => (
              <button
                key={u.id}
                onClick={() => navigate(`/user/${u.id}`)}
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 10px', borderRadius: 14, backgroundColor: 'var(--color-white)', border: '1.5px solid var(--color-warm-3)', cursor: 'pointer', minWidth: 80, textAlign: 'center' }}
              >
                <Avatar name={u.full_name || u.username} isChristian={u.is_christian} avatarUrl={u.avatar_url} size={44} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', margin: 0, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(u.full_name || u.username || '').split(' ')[0]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offene Anfragen */}
      {pendingReceived.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionLabel}>Anfragen erhalten ({pendingReceived.length})</p>
          {pendingReceived.map(f => (
            <div key={f.id} style={personRow}>
              <Avatar name={f.otherUser?.full_name || f.otherUser?.username} isChristian={f.otherUser?.is_christian} avatarUrl={f.otherUser?.avatar_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={nameText}>{f.otherUser?.full_name || f.otherUser?.username || '…'}</p>
                <p style={usernameText}>@{f.otherUser?.username}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleAccept(f.id)} style={{ ...actionBtn, backgroundColor: 'var(--color-accent)', color: 'white', border: 'none' }}>
                  <Check size={14} />
                </button>
                <button onClick={() => handleDecline(f.id)} style={{ ...actionBtn, backgroundColor: 'transparent', color: '#C0392B', border: '1px solid #E8C0B8' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Freundesliste */}
      <div>
        <p style={sectionLabel}>Verbunden ({friends.length})</p>
        {loading && <div style={skeleton} />}
        {!loading && friends.length === 0 && (
          <p style={{ ...mutedText, textAlign: 'center', padding: '16px 0' }}>
            Noch keine Verbindungen. Suche nach Nutzern. ↑
          </p>
        )}
        {friends.map(f => {
          const other = f.otherUser
          const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
          return (
            <div key={f.id} style={{ ...personRow, position: 'relative' }}>
              <button onClick={() => navigate(`/user/${otherId}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <Avatar name={other?.full_name || other?.username} isChristian={other?.is_christian} avatarUrl={other?.avatar_url} />
                <div style={{ minWidth: 0 }}>
                  <p style={nameText}>{other?.full_name || other?.username || '…'}</p>
                  <p style={usernameText}>@{other?.username}</p>
                </div>
              </button>
              <button
                onClick={async () => {
                  const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: otherId })
                  if (!error) navigate(`/chat/${convId}`)
                }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-warm-1)', display: 'flex', alignItems: 'center' }}
                title="Nachricht schreiben"
              >
                <MessageCircle size={18} />
              </button>
              <button onClick={() => setOpenMenu(openMenu === f.id ? null : f.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-text-light)' }}>
                <MoreVertical size={16} />
              </button>
              {openMenu === f.id && (
                <>
                  <div onClick={() => setOpenMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.12)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 180 }}>
                    <button onClick={() => handleRemove(f.id)} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer', textAlign: 'left' }}>
                      Verbindung entfernen
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Noch nicht connected */}
      {filteredNotConnected.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={sectionLabel}>
            {hasAnyFilter ? `Gefilterte Ergebnisse (${filteredNotConnected.length})` : `Noch nicht connected (${filteredNotConnected.length})`}
          </p>
          {filteredNotConnected.map(u => (
            <div key={u.id} style={personRow}>
              <button onClick={() => navigate(`/user/${u.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <Avatar name={u.full_name || u.username} isChristian={u.is_christian} avatarUrl={u.avatar_url} />
                <div style={{ minWidth: 0 }}>
                  <p style={nameText}>{u.full_name || u.username}</p>
                  {mutuals[u.id]?.count > 0 ? (
                    <MutualAvatars people={mutuals[u.id].people} count={mutuals[u.id].count} size={16} />
                  ) : (
                    <p style={usernameText}>@{u.username}{u.city ? ` · ${u.city}` : ''}</p>
                  )}
                </div>
              </button>
              {getFriendshipStatus(u.id) === 'sent' ? (
                <span style={pendingBadge}>Anfrage gesendet</span>
              ) : getFriendshipStatus(u.id) === 'received' ? (
                <span style={pendingBadge}>Anfrage erhalten</span>
              ) : (
                <button onClick={() => handleSend(u.id)} disabled={sending === u.id} style={connectBtn}>
                  {sending === u.id ? '…' : 'Verbinden'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CommunitiesTab ──────────────────────────────────────────
function CommunitiesTab({ onCreateOpen, onJoinOpen }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { myCommunities, loading, joinByCode } = useCommunities()
  const { showToast } = useToast()
  const [publicCommunities, setPublicCommunities] = useState([])
  const [loadingPublic, setLoadingPublic] = useState(false)
  const [requestedIds, setRequestedIds] = useState(new Set())
  const [joiningId, setJoiningId] = useState(null)
  const previews = useCommunityMembersPreview([...myCommunities.map(c => c.id), ...publicCommunities.map(c => c.id)])

  useEffect(() => {
    loadPublic()
  }, [myCommunities])

  async function loadPublic() {
    setLoadingPublic(true)
    const myIds = myCommunities.map(c => c.id)
    const { data } = await supabase
      .from('communities')
      .select('id, name, description, is_public, join_mode, avatar_url')
      .eq('is_public', true)
      .limit(20)
    const filtered = (data || []).filter(c => !myIds.includes(c.id))
    setPublicCommunities(filtered)
    setLoadingPublic(false)

    // Eigene offene Anfragen laden, damit "Angefragt" statt "Anfrage senden"
    // angezeigt wird – auch nach einem Reload der Seite.
    const requestIds = filtered.filter(c => c.join_mode === 'request').map(c => c.id)
    if (requestIds.length > 0) {
      const { data: myRequests } = await supabase
        .from('community_join_requests')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .in('community_id', requestIds)
      setRequestedIds(new Set((myRequests || []).map(r => r.community_id)))
    }
  }

  async function handleJoinPublic(community) {
    setJoiningId(community.id)
    try {
      if (community.join_mode === 'request') {
        const { error } = await supabase
          .from('community_join_requests')
          .insert({ community_id: community.id, user_id: user.id })
        if (error) throw error
        setRequestedIds(prev => new Set(prev).add(community.id))
        showToast('Beitrittsanfrage gesendet ✓')
        return
      }
      const { error } = await supabase
        .from('community_members')
        .insert({ community_id: community.id, user_id: user.id, role: 'member' })
      if (error) throw error
      showToast(`Willkommen in ${community.name}!`)
      navigate(`/community/${community.id}`)
    } catch {
      showToast('Fehler beim Beitreten', 'error')
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button onClick={onCreateOpen} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Plus size={15} /> Erstellen
        </button>
        <button onClick={onJoinOpen} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'transparent', color: 'var(--color-warm-1)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Hash size={15} /> Per Code
        </button>
      </div>

      {/* Meine Communities */}
      <p style={sectionLabel}>Meine Communities ({myCommunities.length})</p>
      {loading && <div style={skeleton} />}
      {!loading && myCommunities.length === 0 && (
        <p style={{ ...mutedText, textAlign: 'center', padding: '16px 0 24px', lineHeight: 1.6 }}>
          Du bist noch in keiner Community.
        </p>
      )}
      {!loading && myCommunities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {myCommunities.map(c => (
            <CommunityCard
              key={c.id}
              community={c}
              members={previews[c.id] || []}
              variant="member"
              onOpen={() => navigate(`/community/${c.id}`)}
            />
          ))}
        </div>
      )}

      {/* Öffentliche Communities entdecken */}
      <div style={{ marginTop: 28 }}>
        <p style={sectionLabel}>
          <Compass size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Entdecken
        </p>
        {loadingPublic && <div style={skeleton} />}
        {!loadingPublic && publicCommunities.length === 0 && (
          <p style={{ ...mutedText, textAlign: 'center', padding: '12px 0' }}>
            Keine öffentlichen Communities verfügbar.
          </p>
        )}
        {publicCommunities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {publicCommunities.map(c => (
              <CommunityCard
                key={c.id}
                community={c}
                members={previews[c.id] || []}
                variant="discover"
                onJoin={handleJoinPublic}
                joining={joiningId === c.id}
                requested={requestedIds.has(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CreateCommunitySheet ────────────────────────────────────
export function CreateCommunitySheet({ onClose }) {
  const navigate = useNavigate()
  const { createCommunity } = useCommunities()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const community = await createCommunity({ name: name.trim(), description: description.trim() || null, is_public: isPublic })
      showToast('Community erstellt ✓')
      onClose()
      navigate(`/community/${community.id}`)
    } catch (e) {
      showToast(e?.message || 'Fehler beim Erstellen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-dark/40 backdrop-blur-[2px] z-40 transition-opacity" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface rounded-t-[32px] z-50 pt-4 px-6 max-h-[90vh] overflow-y-auto shadow-glass animate-[sheetSlideUp_0.3s_ease-out]" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={sheetHandle} />
        <h3 style={sheetTitleStyle}>Community erstellen</h3>

        <label style={lbl}>Name *</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Hausgemeinde Mitte" style={inp} />

        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} placeholder="Worum geht es in eurer Community?" rows={3} style={{ ...inp, resize: 'none' }} />
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', marginTop: 2 }}>{description.length}/200</p>

        {/* Public toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>Öffentlich</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Für alle sichtbar und beitrittsfähig</p>
          </div>
          <button
            onClick={() => setIsPublic(v => !v)}
            style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: isPublic ? 'var(--color-accent)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: isPublic ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20, backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Erstelle…' : 'Community erstellen'}
        </button>
      </div>
    </>
  )
}

// ─── JoinCommunityModal ──────────────────────────────────────
export function JoinCommunityModal({ onClose }) {
  const { joinByCode } = useCommunities()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const community = await joinByCode(code.trim())
      showToast(`Willkommen in ${community.name}!`)
      onClose()
      navigate(`/community/${community.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={sheetTitleStyle}>Community beitreten</h3>
        <label style={lbl}>Einladungscode</label>
        <input autoFocus type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} placeholder="z.B. 550E8400" onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ ...inp, letterSpacing: 2, textTransform: 'uppercase' }} />
        {error && <p style={{ color: '#C0392B', fontFamily: 'Lora, serif', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Abbrechen</button>
          <button onClick={handleJoin} disabled={!code.trim() || loading} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: code.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Beitrete…' : 'Beitreten'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ChatsTab ────────────────────────────────────────────────
function ChatsAvatar({ name, size = 40, isChristian, avatarUrl }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--color-warm-3)' }} onError={e => { e.target.style.display = 'none' }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{initials}</div>
  )
}

function ChatsTab() {
  const navigate = useNavigate()
  const { directChats, communityChats, activityChats, loading, startDirectChat } = useConversations()
  const { friends } = useFriendships()
  const [query, setQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [starting, setStarting] = useState(false)
  const [friendQuery, setFriendQuery] = useState('')

  function timeAgo(isoString) {
    if (!isoString) return ''
    const now = new Date()
    const date = new Date(isoString)
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (diffMin < 1) return 'gerade'
    if (diffMin < 60) return `vor ${diffMin} Min.`
    if (diffHrs < 24 && msgDate.getTime() === today.getTime()) return `vor ${diffHrs} Std.`
    if (msgDate.getTime() === yesterday.getTime()) return 'gestern'
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  function lastMessagePreview(msg) {
    if (!msg) return ''
    if (msg.is_deleted) return '(Nachricht gelöscht)'
    if (msg.type === 'prayer_request') return '🙏 Gebetsanliegen'
    if (msg.type === 'bible_verse') return '📖 Bibelvers'
    return msg.text || ''
  }

  const filterConvs = (list) =>
    list.filter(conv => {
      const name = conv.type === 'direct'
        ? (conv.otherUser?.full_name || conv.otherUser?.username || '')
        : conv.type === 'community'
          ? (conv.community?.name || '')
          : (conv.activity?.title || '')
      return name.toLowerCase().includes(query.toLowerCase())
    })

  const filteredDirect = filterConvs(directChats)
  const filteredCommunity = filterConvs(communityChats)
  const filteredActivity = filterConvs(activityChats)
  const hasAny = directChats.length > 0 || communityChats.length > 0 || activityChats.length > 0

  async function handleSelectFriend(friendId) {
    setShowNewChat(false)
    if (!friendId) return
    setStarting(true)
    try {
      const convId = await startDirectChat(friendId)
      if (convId) navigate(`/chat/${convId}`)
    } catch (e) {
      console.error('Fehler beim Starten des Chats:', e)
    } finally {
      setStarting(false)
    }
  }

  const filteredFriends = friends.filter(f => {
    const name = f.otherUser?.full_name || f.otherUser?.username || ''
    return name.toLowerCase().includes(friendQuery.toLowerCase())
  })

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} color="var(--color-text-light)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Geschwister oder Community suchen..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }}
        />
      </div>

      {loading && (
        <div>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, borderRadius: 7, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 6, width: '60%' }} />
                <div style={{ height: 12, borderRadius: 6, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite', width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !hasAny && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <MessageCircle size={40} color="var(--color-warm-3)" style={{ marginBottom: 12 }} />
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
            Noch keine Nachrichten. Starte ein Gespräch! 💬
          </p>
        </div>
      )}

      {!loading && filteredDirect.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={sectionLabel}>Direktnachrichten</p>
          {filteredDirect.map(conv => {
            const isDirect = conv.type === 'direct'
            const name = isDirect ? (conv.otherUser?.full_name || conv.otherUser?.username || 'Unbekannt') : (conv.community?.name || 'Community')
            const preview = lastMessagePreview(conv.lastMessage)
            const time = timeAgo(conv.lastMessage?.created_at)
            return (
              <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)', textAlign: 'left', position: 'relative' }}>
                {conv.unread && <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB' }} />}
                <ChatsAvatar name={name} size={40} isChristian={isDirect ? conv.otherUser?.is_christian : false} avatarUrl={isDirect ? conv.otherUser?.avatar_url : null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: conv.unread ? 700 : 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{name}</p>
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', flexShrink: 0 }}>{time}</span>
                  </div>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: conv.unread ? 'var(--color-text-muted)' : 'var(--color-text-light)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unread ? 500 : 400 }}>
                    {preview || 'Noch keine Nachrichten'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {!loading && filteredCommunity.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={sectionLabel}>Community Chats</p>
          {filteredCommunity.map(conv => {
            const name = conv.community?.name || 'Community'
            const preview = lastMessagePreview(conv.lastMessage)
            const time = timeAgo(conv.lastMessage?.created_at)
            return (
              <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)', textAlign: 'left', position: 'relative' }}>
                {conv.unread && <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB' }} />}
                <ChatsAvatar name={name} size={40} isChristian={false} avatarUrl={null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: conv.unread ? 700 : 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{name}</p>
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', flexShrink: 0 }}>{time}</span>
                  </div>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: conv.unread ? 'var(--color-text-muted)' : 'var(--color-text-light)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unread ? 500 : 400 }}>
                    {preview || 'Noch keine Nachrichten'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {!loading && filteredActivity.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={sectionLabel}>Aktivitäten</p>
          {filteredActivity.map(conv => {
            const name = conv.activity?.title || 'Aktivität'
            const emoji = conv.activity?.activity_emoji || '📍'
            const subLabel = conv.activity?.activity_type || ''
            const preview = lastMessagePreview(conv.lastMessage)
            const time = timeAgo(conv.lastMessage?.created_at)
            return (
              <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)', textAlign: 'left', position: 'relative' }}>
                {conv.unread && <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB' }} />}
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: conv.unread ? 700 : 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{name}</p>
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', flexShrink: 0 }}>{time}</span>
                  </div>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: conv.unread ? 'var(--color-text-muted)' : 'var(--color-text-light)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unread ? 500 : 400 }}>
                    {preview || (subLabel ? `Aktivität · ${subLabel}` : 'Noch keine Nachrichten')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* FAB neue Nachricht */}
      <button
        onClick={() => setShowNewChat(true)}
        disabled={starting}
        style={{ position: 'fixed', bottom: 90, right: 20, width: 52, height: 52, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(58,46,36,0.25)', zIndex: 10, color: 'var(--color-bg)' }}
      >
        <Plus size={24} />
      </button>

      {showNewChat && (
        <>
          <div onClick={() => setShowNewChat(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 0', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 14 }}>Neue Nachricht</h3>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={14} color="var(--color-text-light)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" value={friendQuery} onChange={e => setFriendQuery(e.target.value)} placeholder="Geschwister suchen…" style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
              {filteredFriends.length === 0 && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  Keine Geschwister gefunden.
                </p>
              )}
              {filteredFriends.map(f => {
                const other = f.otherUser
                return (
                  <button key={f.id} onClick={() => handleSelectFriend(other?.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)', textAlign: 'left' }}>
                    <ChatsAvatar name={other?.full_name || other?.username} size={38} isChristian={other?.is_christian} avatarUrl={other?.avatar_url} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {other?.full_name || other?.username || '…'}
                      </p>
                      <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                        @{other?.username}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Feed helpers ───────────────────────────────────────────
const TYPE_CONFIG = {
  text:      { icon: MessageSquare, label: 'Gedanke',    bg: 'var(--color-warm-4)',   border: 'var(--color-warm-3)' },
  bible:     { icon: BookOpen,      label: 'Bibelstelle', bg: 'rgba(196,151,74,0.08)', border: 'rgba(196,151,74,0.3)' },
  testimony: { icon: HandHeart,     label: 'Zeugnis',    bg: 'rgba(74,103,65,0.07)',  border: 'rgba(74,103,65,0.25)' },
  question:  { icon: HelpCircle,    label: 'Frage',      bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.25)' },
  photo:     { icon: Image,         label: 'Foto',       bg: 'var(--color-warm-4)',   border: 'var(--color-warm-3)' },
}

const FILTER_OPTIONS = [
  { key: 'all',       label: '🌐 Alle' },
  { key: 'bible',     label: '📖 Bibelstellen' },
  { key: 'testimony', label: '🙌 Zeugnisse' },
  { key: 'question',  label: '❓ Fragen' },
]

function timeAgoFeed(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 60000)
  if (diff < 1) return 'Gerade eben'
  if (diff < 60) return `vor ${diff} Min.`
  const h = Math.floor(diff / 60)
  if (h < 24) return `vor ${h} Std.`
  const days = Math.floor(h / 24)
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function FeedAvatar({ profile, size = 36 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
      overflow: 'hidden',
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

// ─── Post Card ───────────────────────────────────────────────
export function PostCard({ post, currentUserId, onReact, onDelete, onClick, onRepost, onBookmark, onBookmarkSaved, onShare, threadLineAfter }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.text
  const TypeIcon = cfg.icon
  // Klares Kategorie-Badge aus dem echten category-Feld (Frage, Bibelstelle, …)
  const catCfg = FEED_CATEGORIES.find(c => c.key === post.category)
  const isOwn = post.author_id === currentUserId
  const author = post.profiles

  const liked = (post.reactions || []).some(r => r.type === 'heart' && r.user_id === currentUserId)
  const likeCount = (post.reactions || []).filter(r => r.type === 'heart').length
  const reposted = (post.reposts || []).some(r => r.user_id === currentUserId)
  const repostCount = (post.reposts || []).length

  const [expanded, setExpanded] = useState(false)
  const bodyLong = post.body && post.body.length > 240
  const displayBody = bodyLong && !expanded ? post.body.slice(0, 240) + '…' : post.body

  return (
    <FeedCardFrame threadLineAfter={threadLineAfter}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <button onClick={() => navigate(`/user/${post.author_id}`)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <FeedAvatar profile={author} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {author?.full_name || author?.username || 'Geschwister'}
            </span>
            {author?.is_christian && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, backgroundColor: 'rgba(196,151,74,0.15)', color: 'var(--color-accent)', fontFamily: 'Lora, serif', letterSpacing: 0.3 }}>
                Geschwister
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>
            {timeAgoFeed(post.created_at)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {catCfg ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'Lora, serif', fontWeight: 700, color: 'var(--color-accent-dark)', padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-accent)', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 13 }}>{catCfg.emoji}</span> {catCfg.label}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'Lora, serif', fontWeight: 700, color: 'var(--color-text-secondary)', padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)', whiteSpace: 'nowrap' }}>
              <TypeIcon size={11} /> {cfg.label}
            </span>
          )}
          {isOwn && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', display: 'flex' }}>
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.12)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 130 }}>
                    <button
                      onClick={() => { setShowMenu(false); onDelete?.(post.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: '#C0392B', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} /> Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content – links auf Höhe des Namens eingerückt (Avatar-Spalte bleibt für die Linie frei) */}
      <div onClick={() => onClick(post)} style={{ padding: `0 16px 10px ${CONTENT_INSET}px`, cursor: 'pointer' }}>
        {post.title && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>{post.title}</p>
        )}

        {post.bible_reference && (
          <BibleReferenceChip attachment={verseAttachmentFromRow(post)} variant="block" />
        )}

        {post.type === 'photo' && post.photo_url && (
          <img src={post.photo_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 8, display: 'block' }} />
        )}

        <p style={{ fontFamily: 'Lora, serif', color: 'var(--color-text)', margin: 0, lineHeight: 1.6, fontSize: post.type === 'question' ? 15 : 14, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
          {displayBody}
        </p>
        {bodyLong && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', padding: '4px 0 0', fontWeight: 600 }}
          >
            {expanded ? 'Weniger lesen' : 'Mehr lesen'}
          </button>
        )}
      </div>

      {/* Engagement */}
      <PostEngagementBar
        commentCount={post.commentCount}
        onComment={() => onClick(post)}
        reposted={reposted}
        repostCount={repostCount}
        onRepost={() => onRepost?.(post.id)}
        liked={liked}
        likeCount={likeCount}
        onLike={() => onReact(post.id, 'heart')}
        bookmarked={post.bookmarked}
        bookmarkCount={post.bookmark_count}
        onBookmark={() => {
          if (post.bookmarked) onBookmark?.(post.id)
          else setShowSaveSheet(true)
        }}
        onShare={() => onShare?.(post)}
      />

      {showSaveSheet && (
        <SavePostSheet
          postId={post.id}
          onClose={() => setShowSaveSheet(false)}
          onSaved={() => onBookmarkSaved?.(post.id)}
        />
      )}
    </FeedCardFrame>
  )
}

// ─── FeedTab ─────────────────────────────────────────────────
function FeedTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { posts, loading, loadMore, hasMore, createPost, deletePost, reactToPost, toggleRepost, removeBookmark, markBookmarked } = useFeed('all')
  const loaderRef = useRef(null)
  const [showComposer, setShowComposer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeCategories, setActiveCategories] = useState([])
  const [dateFilter, setDateFilter] = useState(EMPTY_DATE_FILTER)
  const [searchParams, setSearchParams] = useSearchParams()
  const [sharePost, setSharePost] = useState(null)

  // Kollabierender Header beim Scrollen (rAF + Sperre gegen Flackern)
  const rootRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const [searchRevealed, setSearchRevealed] = useState(false)  // Suche/Filter nur per Overscroll oben
  const collapsedRef = useRef(false)
  const lockUntilRef = useRef(0)
  const tickingRef = useRef(false)

  function setCollapsedSafe(v) {
    if (collapsedRef.current === v) return
    collapsedRef.current = v
    setCollapsed(v)
    lockUntilRef.current = Date.now() + 360   // kurz sperren, damit das Layout-Springen keine Rückkopplung auslöst
  }

  useEffect(() => {
    const scroller = rootRef.current?.closest('.overflow-y-auto')
    if (!scroller) return
    let lastY = scroller.scrollTop
    function update() {
      tickingRef.current = false
      const st = scroller.scrollTop
      const dy = st - lastY
      lastY = st
      if (st > 8) setSearchRevealed(false)                   // beim Wegscrollen Suche wieder verstecken
      if (Date.now() < lockUntilRef.current) return
      if (st <= 8) { setCollapsedSafe(false); return }       // ganz oben → Bar offen
      if (dy > 8 && st > 90) setCollapsedSafe(true)           // deutlich runter → einklappen
      else if (dy < -8) setCollapsedSafe(false)              // hoch → ausklappen
    }
    function onScroll() {
      if (!tickingRef.current) { tickingRef.current = true; requestAnimationFrame(update) }
    }
    // Suche/Filter erscheint nur, wenn man am oberen Rand weiter nach oben zieht
    function onWheel(e) {
      if (scroller.scrollTop <= 2 && e.deltaY < -6) setSearchRevealed(true)
      else if (e.deltaY > 6) setSearchRevealed(false)
    }
    let touchStartX = 0
    let touchStartY = 0
    let swipeBlocked = false
    function onTouchStart(e) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      // Geste über einem horizontal scrollbaren Bereich (Karussells, Chips)
      // soll dort scrollen dürfen statt zu den Gebeten zu navigieren.
      let node = e.target
      swipeBlocked = false
      while (node && node !== scroller && node !== document.body) {
        if (node.scrollWidth > node.clientWidth + 2) {
          const overflowX = window.getComputedStyle(node).overflowX
          if (overflowX === 'auto' || overflowX === 'scroll') { swipeBlocked = true; break }
        }
        node = node.parentElement
      }
    }
    function onTouchMove(e) {
      const dy = e.touches[0].clientY - touchStartY
      if (scroller.scrollTop <= 2 && dy > 40) setSearchRevealed(true)
      else if (dy < -40) setSearchRevealed(false)
    }
    function onTouchEnd(e) {
      if (swipeBlocked) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStartX
      const dy = t.clientY - touchStartY
      if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate('/prayers')
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('wheel', onWheel, { passive: true })
    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchmove', onTouchMove, { passive: true })
    scroller.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('wheel', onWheel)
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchmove', onTouchMove)
      scroller.removeEventListener('touchend', onTouchEnd)
    }
  }, [navigate])

  // Direkt den Composer öffnen, wenn man vom Profil "+ Beitrag" kommt
  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      setShowComposer(true)
      searchParams.delete('compose')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  async function handleCreate(data) {
    const res = await createPost(data)
    if (res) showToast('Post geteilt 🙌')
    else showToast('Fehler beim Posten', 'error')
  }

  async function handleDelete(postId) {
    if (!window.confirm('Post wirklich löschen?')) return
    await deletePost(postId)
    showToast('Post gelöscht', 'info')
  }

  function toggleCategory(key) {
    setActiveCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
  }

  const dateActive = isDateFilterActive(dateFilter)
  const q = searchQuery.trim().toLowerCase()
  const filteredPosts = posts.filter(p => {
    if (activeCategories.length > 0 && !activeCategories.includes(p.category)) return false
    if (!matchesDateFilter(p.created_at, dateFilter)) return false
    if (!q) return true
    const haystack = [
      p.title || '',
      p.body || '',
      p.bible_reference || '',
      p.bible_verse || '',
      p.profiles?.full_name || '',
      p.profiles?.username || '',
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })

  const filterFacetCount = activeCategories.length + (dateActive ? 1 : 0)
  const hasActiveFilter = filterFacetCount > 0 || q.length > 0

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      {/* Sticky-Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'var(--color-bg)' }}>
        {/* Suche + Filter – ÜBER der Bar, nur beim Hochziehen am oberen Rand sichtbar */}
        <div style={{
          maxHeight: searchRevealed ? (showFilters ? 600 : 64) : 0,
          opacity: searchRevealed ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
        }}>
      {/* Search + filter */}
      <div style={{
        backgroundColor: 'var(--color-bg)',
        padding: '12px 16px 8px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Post suchen…" />
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-label="Filter"
            style={{
              position: 'relative',
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              border: `1.5px solid ${showFilters || filterFacetCount ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: showFilters || filterFacetCount ? 'rgba(90,200,250,0.12)' : 'var(--color-bg-secondary)',
              color: showFilters || filterFacetCount ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={17} />
            {filterFacetCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
                backgroundColor: 'var(--color-accent)', color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--color-bg)',
              }}>
                {filterFacetCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/feed/saved')}
            aria-label="Gespeicherte Beiträge"
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              border: '1.5px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Bookmark size={17} />
          </button>
        </div>

        {showFilters && (
          <div style={{ paddingTop: 10 }}>
            {/* Zeitraum */}
            <div style={{ marginBottom: 14 }}>
              <DateFilterControl value={dateFilter} onChange={setDateFilter} />
            </div>

            {/* Kategorien */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
              Kategorien
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FEED_CATEGORIES.map(c => {
                const active = activeCategories.includes(c.key)
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCategory(c.key)}
                    style={{
                      padding: '6px 11px', borderRadius: 999,
                      border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: active ? 'rgba(74,103,65,0.12)' : 'var(--color-bg-secondary)',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                )
              })}
              {activeCategories.length > 0 && (
                <button
                  onClick={() => setActiveCategories([])}
                  style={{
                    padding: '6px 11px', borderRadius: 999,
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {filterFacetCount > 0 && (
              <button
                onClick={() => { setActiveCategories([]); setDateFilter(EMPTY_DATE_FILTER) }}
                style={{
                  marginTop: 14, padding: '7px 14px', borderRadius: 999,
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Alle Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>
        </div>{/* /Suche+Filter Reveal-Wrapper */}

        {/* Feed/Gebete-Switcher – darunter; kollabiert beim Runterscrollen */}
        {collapsed && (
          <div
            onClick={() => setCollapsedSafe(false)}
            style={{
              height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backgroundColor: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)' }} />
          </div>
        )}
        <div style={{
          maxHeight: collapsed ? 0 : 64,
          opacity: collapsed ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
        }}>
          <PrayerFeedSwitcher active="feed" />
        </div>
      </div>{/* /Sticky-Header */}

      <div style={{ padding: '14px 0 0' }}>
      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Posts */}
      {!loading && filteredPosts.length === 0 && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: 32, margin: '0 0 10px' }}>🌱</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
            Noch keine Posts. Sei die Erste, die etwas teilt!
          </p>
        </div>
      )}

      {!loading && filteredPosts.length === 0 && posts.length > 0 && hasActiveFilter && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: 28, margin: '0 0 10px' }}>🔍</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
            Keine Posts gefunden. Versuche andere Filter.
          </p>
        </div>
      )}

      {!loading && filteredPosts.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-warm-3)' }}>
          {filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onReact={reactToPost}
              onDelete={handleDelete}
              onClick={p => navigate(`/feed/post/${p.id}`)}
              onRepost={toggleRepost}
              onBookmark={removeBookmark}
              onBookmarkSaved={markBookmarked}
              onShare={setSharePost}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {!loading && hasMore && <div ref={loaderRef} style={{ height: 40 }} />}
      {!loading && !hasMore && posts.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
          Keine weiteren Posts.
        </p>
      )}
      </div>

      {/* FAB – neuen Beitrag erstellen */}
      <button
        onClick={() => setShowComposer(true)}
        aria-label="Neuen Beitrag erstellen"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          lineHeight: 1,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          zIndex: 40,
        }}
      >
        +
      </button>

      {showComposer && (
        <FeedPostSheet
          onClose={() => setShowComposer(false)}
          onSubmit={async (data) => {
            setShowComposer(false)
            await handleCreate(data)
          }}
        />
      )}

      {sharePost && (
        <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />
      )}
    </div>
  )
}

// ─── FriendsView (Main) ──────────────────────────────────────
export default function FriendsView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  // Eigene Route /chats → Chats als eigenständige Seite (nicht unter „For You").
  const tabParam = location.pathname === '/chats' ? 'chats' : searchParams.get('tab')
  const activeTab = ['chats', 'friends', 'communities'].includes(tabParam) ? tabParam : 'feed'
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const headerTitle = activeTab === 'chats' ? 'Chats' : activeTab === 'communities' ? 'Communities' : 'Geschwister'

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      {activeTab !== 'feed' && (
        <div className="bg-bg border-b border-warm-3 px-4 sticky top-0 z-10 flex items-center gap-2" style={{ paddingTop: 16, paddingBottom: 14 }}>
          {activeTab === 'friends' && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Zurück"
              style={{ width: 32, height: 32, marginLeft: -6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <h2 className="text-[22px] font-bold text-dark m-0">
            {headerTitle}
          </h2>
        </div>
      )}

      <div style={activeTab === 'feed' ? { padding: 0 } : { padding: '20px 16px' }}>
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'friends' && <FriendsTab />}
        {activeTab === 'communities' && <CommunitiesTab onCreateOpen={() => setShowCreate(true)} onJoinOpen={() => setShowJoin(true)} />}
        {activeTab === 'chats' && <ChatsTab />}
      </div>

      {showCreate && <CreateCommunitySheet onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinCommunityModal onClose={() => setShowJoin(false)} />}
      {showNotifications && <NotificationsSheet onClose={() => setShowNotifications(false)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes sheetSlideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const personRow = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-warm-3)' }
const nameText = { fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const usernameText = { fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }
const sectionLabel = { fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }
const mutedText = { fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }
const connectBtn = { padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }
const pendingBadge = { fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', flexShrink: 0 }
const friendsBadge = { fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-accent-dark)', fontWeight: 600, flexShrink: 0 }
const actionBtn = { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const skeleton = { height: 56, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }
const backdrop = { position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }
const bottomSheet = { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.3s ease-out' }
const overlay = { position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }
const modal = { backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(58,46,36,0.15)' }
const sheetHandle = { width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }
const sheetTitleStyle = { fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
