import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Users, Plus, Hash, Check, X, MoreVertical, Copy, ChevronRight, MessageCircle, Bell, Globe } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useCommunities } from '../hooks/useCommunities'
import { useNotifications } from '../hooks/useNotifications'
import { useConversations } from '../hooks/useConversations'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

// ─── Avatar ────────────────────────────────────────────────
function Avatar({ name, size = 40, isChristian }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
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

  // Load users from shared communities who are not yet connected
  const [notConnected, setNotConnected] = useState([])
  useEffect(() => {
    if (!user || loading) return
    loadNotConnected()
  }, [user?.id, loading, friends.length])

  async function loadNotConnected() {
    const { data: myComms } = await supabase
      .from('community_members').select('community_id').eq('user_id', user.id)
    if (!myComms?.length) return
    const comIds = myComms.map(c => c.community_id)
    const { data: members } = await supabase
      .from('community_members')
      .select('user_id, profiles(id, username, full_name, is_christian)')
      .in('community_id', comIds)
      .neq('user_id', user.id)
    if (!members) return
    const connectedIds = new Set(friends.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    ))
    const pendingIds = new Set([...pendingSent, ...pendingReceived].map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    ))
    const seen = new Set()
    const unique = []
    for (const m of members) {
      if (!connectedIds.has(m.user_id) && !pendingIds.has(m.user_id) && !seen.has(m.user_id)) {
        seen.add(m.user_id)
        unique.push({ id: m.user_id, ...m.profiles })
      }
    }
    setNotConnected(unique)
  }

  return (
    <div>
      {/* Suchfeld */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} color="var(--color-text-light)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={query}
          onChange={e => handleQuery(e.target.value)}
          placeholder="Username suchen…"
          style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }}
        />
      </div>

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
                <Avatar name={u.full_name || u.username} isChristian={u.is_christian} />
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

      {/* Offene Anfragen */}
      {pendingReceived.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionLabel}>Anfragen erhalten ({pendingReceived.length})</p>
          {pendingReceived.map(f => (
            <div key={f.id} style={personRow}>
              <Avatar name={f.otherUser?.full_name || f.otherUser?.username} isChristian={f.otherUser?.is_christian} />
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
        <p style={sectionLabel}>Connected ({friends.length})</p>
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
                <Avatar name={other?.full_name || other?.username} isChristian={other?.is_christian} />
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

      {/* Not Connected – aus gemeinsamen Communities */}
      {notConnected.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={sectionLabel}>Not Connected ({notConnected.length})</p>
          {notConnected.map(u => (
            <div key={u.id} style={personRow}>
              <button onClick={() => navigate(`/user/${u.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <Avatar name={u.full_name || u.username} isChristian={u.is_christian} />
                <div style={{ minWidth: 0 }}>
                  <p style={nameText}>{u.full_name || u.username}</p>
                  <p style={usernameText}>@{u.username}</p>
                </div>
              </button>
              <button
                onClick={() => handleSend(u.id)}
                disabled={sending === u.id}
                style={connectBtn}
              >
                {sending === u.id ? '…' : 'Verbinden'}
              </button>
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

  useEffect(() => {
    loadPublic()
  }, [myCommunities])

  async function loadPublic() {
    setLoadingPublic(true)
    const myIds = myCommunities.map(c => c.id)
    const { data } = await supabase
      .from('communities')
      .select('id, name, description')
      .eq('is_public', true)
      .limit(20)
    const filtered = (data || []).filter(c => !myIds.includes(c.id))
    setPublicCommunities(filtered)
    setLoadingPublic(false)
  }

  async function handleJoinPublic(communityId, communityName) {
    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: user.id, role: 'member' })
    if (!error) {
      showToast(`Willkommen in ${communityName}!`)
      navigate(`/community/${communityId}`)
    } else {
      showToast('Fehler beim Beitreten', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button onClick={onCreateOpen} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
      {myCommunities.map(c => {
        const initials = (c.name || 'Unbekannt').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        return (
          <button key={c.id} onClick={() => navigate(`/community/${c.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)' }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-warm-1)', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <p style={{ ...nameText, marginBottom: 2 }}>{c.name}</p>
              <p style={usernameText}>👥 {c.memberCount} Mitglieder</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {c.role === 'admin' && <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>Admin</span>}
              <ChevronRight size={16} color="var(--color-text-light)" />
            </div>
          </button>
        )
      })}

      {/* Öffentliche Communities entdecken */}
      <div style={{ marginTop: 24 }}>
        <p style={sectionLabel}>
          <Globe size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Öffentliche Communities
        </p>
        {loadingPublic && <div style={skeleton} />}
        {!loadingPublic && publicCommunities.length === 0 && (
          <p style={{ ...mutedText, textAlign: 'center', padding: '12px 0' }}>
            Keine öffentlichen Communities verfügbar.
          </p>
        )}
        {publicCommunities.map(c => {
            const initials = (c.name || 'Unbekannt').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-warm-1)', flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <p style={{ ...nameText, marginBottom: 2 }}>{c.name}</p>
                  {c.description && <p style={{ ...usernameText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</p>}
                </div>
                <button
                  onClick={() => handleJoinPublic(c.id, c.name)}
                  style={{ padding: '7px 14px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer', flexShrink: 0, fontWeight: 500 }}
                >
                  Beitreten
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ─── CreateCommunitySheet ────────────────────────────────────
function CreateCommunitySheet({ onClose }) {
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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white rounded-t-[32px] z-50 pt-4 px-6 max-h-[90vh] overflow-y-auto shadow-glass animate-[sheetSlideUp_0.3s_ease-out]" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
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
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20, backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Erstelle…' : 'Community erstellen'}
        </button>
      </div>
    </>
  )
}

// ─── JoinCommunityModal ──────────────────────────────────────
function JoinCommunityModal({ onClose }) {
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
          <button onClick={handleJoin} disabled={!code.trim() || loading} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: code.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Beitrete…' : 'Beitreten'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ChatsTab ────────────────────────────────────────────────
function ChatsAvatar({ name, size = 40, isChristian }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{initials}</div>
  )
}

function ChatsTab() {
  const navigate = useNavigate()
  const { directChats, communityChats, loading, startDirectChat } = useConversations()
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
        : (conv.community?.name || '')
      return name.toLowerCase().includes(query.toLowerCase())
    })

  const filteredDirect = filterConvs(directChats)
  const filteredCommunity = filterConvs(communityChats)
  const hasAny = directChats.length > 0 || communityChats.length > 0

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
                <ChatsAvatar name={name} size={40} isChristian={isDirect ? conv.otherUser?.is_christian : false} />
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
                <ChatsAvatar name={name} size={40} isChristian={false} />
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

      {/* FAB neue Nachricht */}
      <button
        onClick={() => setShowNewChat(true)}
        disabled={starting}
        style={{ position: 'fixed', bottom: 90, right: 20, width: 52, height: 52, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(58,46,36,0.25)', zIndex: 10, color: 'white' }}
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
                    <ChatsAvatar name={other?.full_name || other?.username} size={38} isChristian={other?.is_christian} />
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

// ─── FriendsView (Main) ──────────────────────────────────────
export default function FriendsView() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'chats' ? 'chats' : 'friends'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { unreadCount } = useNotifications()
  const { hasUnread } = useConversations()

  return (
    <div className="bg-bg min-h-full pb-24">
      <div className="bg-white/80 backdrop-blur-md border-b border-warm-3 pt-4 px-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-[22px] font-bold text-dark m-0">
            Geschwister
          </h2>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-1.5 text-dark-muted hover:bg-black/5 rounded-full transition-colors flex items-center"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white ring-1 ring-red-500/20" />
            )}
          </button>
        </div>
        <div className="flex gap-2">
          {[{ key: 'friends', label: 'Geschwister' }, { key: 'communities', label: 'Communities' }, { key: 'chats', label: 'Chats' }].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 pb-2.5 border-b-2 transition-all duration-200 font-serif text-[14.5px] relative
                ${activeTab === t.key 
                  ? 'border-warm-1 text-warm-1 font-bold' 
                  : 'border-transparent text-dark-muted hover:text-dark font-medium'}`}
            >
              {t.label}
              {t.key === 'chats' && hasUnread && (
                <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
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
const connectBtn = { padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }
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
