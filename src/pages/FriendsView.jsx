import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Users, Plus, Hash, Check, X, MoreVertical, Copy, ChevronRight, MessageCircle, Bell, Globe, BookOpen, HandHeart, HelpCircle, Image, MessageSquare, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useCommunities } from '../hooks/useCommunities'
import { useNotifications } from '../hooks/useNotifications'
import { useConversations } from '../hooks/useConversations'
import { useToast } from '../context/ToastContext'
import { useFeed } from '../hooks/useFeed'
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

  // Load all users who are not yet connected
  const [notConnected, setNotConnected] = useState([])
  useEffect(() => {
    if (!user || loading) return
    loadNotConnected()
  }, [user?.id, loading, friends.length, pendingSent.length])

  async function loadNotConnected() {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_christian')
      .neq('id', user.id)
    if (!allProfiles) return
    const connectedIds = new Set(friends.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    ))
    setNotConnected(allProfiles.filter(p => !connectedIds.has(p.id)))
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

      {/* Noch nicht connected – alle Nutzer */}
      {notConnected.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={sectionLabel}>Noch nicht connected ({notConnected.length})</p>
          {notConnected.map(u => (
            <div key={u.id} style={personRow}>
              <button onClick={() => navigate(`/user/${u.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <Avatar name={u.full_name || u.username} isChristian={u.is_christian} />
                <div style={{ minWidth: 0 }}>
                  <p style={nameText}>{u.full_name || u.username}</p>
                  <p style={usernameText}>@{u.username}</p>
                </div>
              </button>
              {getFriendshipStatus(u.id) === 'sent' ? (
                <span style={pendingBadge}>Anfrage gesendet</span>
              ) : getFriendshipStatus(u.id) === 'received' ? (
                <span style={pendingBadge}>Anfrage erhalten</span>
              ) : (
                <button
                  onClick={() => handleSend(u.id)}
                  disabled={sending === u.id}
                  style={connectBtn}
                >
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

const REACTION_CONFIG = [
  { type: 'prayer', emoji: '🙏', label: 'Gebet' },
  { type: 'heart',  emoji: '❤️', label: 'Herz' },
  { type: 'amen',   emoji: '🙌', label: 'Amen' },
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
      color: 'white', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
      overflow: 'hidden',
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

// ─── Post Card ───────────────────────────────────────────────
function PostCard({ post, currentUserId, onReact, onDelete, onClick }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.text
  const TypeIcon = cfg.icon
  const isOwn = post.author_id === currentUserId
  const author = post.profiles

  const reactionCounts = REACTION_CONFIG.map(r => ({
    ...r,
    count: (post.reactions || []).filter(x => x.type === r.type).length,
    mine:  (post.reactions || []).some(x => x.type === r.type && x.user_id === currentUserId),
  }))

  const [expanded, setExpanded] = useState(false)
  const bodyLong = post.body && post.body.length > 240
  const displayBody = bodyLong && !expanded ? post.body.slice(0, 240) + '…' : post.body

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 16,
        border: `1.5px solid ${cfg.border}`,
        marginBottom: 12,
        overflow: 'hidden',
        background: cfg.bg,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'Lora, serif', color: 'var(--color-text-muted)', padding: '2px 7px', borderRadius: 20, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
            <TypeIcon size={10} /> {cfg.label}
          </span>
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
                      onClick={() => { setShowMenu(false); onDelete(post.id) }}
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

      {/* Content */}
      <div onClick={() => onClick(post)} style={{ padding: '0 14px 10px', cursor: 'pointer' }}>
        {post.title && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>{post.title}</p>
        )}

        {post.type === 'bible' && (
          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 10, marginBottom: 8 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', margin: '0 0 4px' }}>📖 {post.bible_reference}</p>
            {post.bible_verse && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontStyle: 'italic', color: 'var(--color-text)', margin: '0 0 6px', lineHeight: 1.5 }}>„{post.bible_verse}"</p>
            )}
          </div>
        )}

        {post.type === 'photo' && post.photo_url && (
          <img src={post.photo_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 8, display: 'block' }} />
        )}

        <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: 0, lineHeight: 1.6, fontSize: post.type === 'question' ? 15 : 14 }}>
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

      {/* Reactions + comments */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 12px', borderTop: '1px solid var(--color-warm-3)', flexWrap: 'wrap' }}>
        {reactionCounts.map(r => (
          <button
            key={r.type}
            onClick={() => onReact(post.id, r.type)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              border: r.mine ? '1.5px solid var(--color-warm-1)' : '1.5px solid var(--color-warm-3)',
              backgroundColor: r.mine ? 'rgba(74,103,65,0.1)' : 'transparent',
              fontFamily: 'Lora, serif', fontSize: 12,
              color: r.mine ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
              cursor: 'pointer', fontWeight: r.mine ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{r.emoji}</span>
            {r.count > 0 && <span>{r.count}</span>}
          </button>
        ))}
        <button
          onClick={() => onClick(post)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', padding: 4 }}
        >
          <MessageSquare size={13} />
          {post.commentCount > 0 ? `${post.commentCount} Antworten` : 'Antworten'}
        </button>
      </div>
    </div>
  )
}

// ─── Create Post Sheet ───────────────────────────────────────
function CreatePostSheet({ onClose, onSubmit }) {
  const { myCommunities } = useCommunities()
  const [step, setStep] = useState(1) // 1=type, 2=content, 3=visibility
  const [type, setType] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', bibleReference: '', bibleVerse: '', photoUrl: '' })
  const [isPublic, setIsPublic] = useState(true)
  const [selectedCommunities, setSelectedCommunities] = useState([])
  const [saving, setSaving] = useState(false)

  const TYPE_TILES = [
    { type: 'text',      emoji: '💬', label: 'Gedanke' },
    { type: 'bible',     emoji: '📖', label: 'Bibelstelle' },
    { type: 'testimony', emoji: '🙌', label: 'Zeugnis' },
    { type: 'question',  emoji: '❓', label: 'Frage' },
  ]

  function valid() {
    if (!form.body.trim()) return false
    if (type === 'bible' && !form.bibleReference.trim()) return false
    return true
  }

  async function handleSubmit() {
    if (!valid()) return
    setSaving(true)
    await onSubmit({
      type,
      body: form.body.trim(),
      title: form.title.trim() || null,
      bibleReference: form.bibleReference.trim() || null,
      bibleVerse: form.bibleVerse.trim() || null,
      photoUrl: form.photoUrl.trim() || null,
      isPublic,
      communityIds: selectedCommunities,
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '24px 24px 0 0', zIndex: 50, padding: '16px 20px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={sheetHandle} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {step === 1 ? 'Was möchtest du teilen?' : step === 2 ? 'Inhalt' : 'Sichtbarkeit'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--color-text-muted)" />
          </button>
        </div>

        {/* Step 1: type */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {TYPE_TILES.map(t => (
              <button
                key={t.type}
                onClick={() => { setType(t.type); setStep(2) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 12px', borderRadius: 16, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)', cursor: 'pointer', fontFamily: 'Lora, serif' }}
              >
                <span style={{ fontSize: 28 }}>{t.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: content */}
        {step === 2 && type && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(type === 'testimony' || type === 'question') && (
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={type === 'testimony' ? 'Titel: Womit hat Gott dich überrascht?' : 'Deine Frage an die Gemeinschaft *'}
                style={inp}
              />
            )}
            {type === 'bible' && (
              <>
                <input autoFocus type="text" value={form.bibleReference} onChange={e => setForm(f => ({ ...f, bibleReference: e.target.value }))} placeholder="Bibelstelle *  z.B. Johannes 3,16" style={inp} />
                <textarea value={form.bibleVerse} onChange={e => setForm(f => ({ ...f, bibleVerse: e.target.value }))} placeholder="Vers-Text" rows={3} style={{ ...inp, resize: 'none' }} />
              </>
            )}
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value.slice(0, 500) }))}
              placeholder={type === 'bible' ? 'Deine Reflexion dazu…' : type === 'testimony' ? 'Was hat Gott in dir und durch dich gewirkt? *' : type === 'question' ? 'Kontext (optional)' : 'Dein Gedanke… *'}
              rows={5}
              style={{ ...inp, resize: 'none' }}
              autoFocus={type === 'text' || type === 'bible'}
            />
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', margin: 0 }}>{form.body.length}/500</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Zurück</button>
              <button onClick={() => setStep(3)} disabled={!valid()} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: valid() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: valid() ? 'pointer' : 'not-allowed' }}>Weiter</button>
            </div>
          </div>
        )}

        {/* Step 3: visibility */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[{ v: true, label: '🌐 Für alle Geschwister', sub: 'Alle eingeloggten Nutzer können es sehen' }, { v: false, label: '🏘 Nur für bestimmte Communities', sub: 'Wähle die Communities unten aus' }].map(o => (
              <button
                key={String(o.v)}
                onClick={() => setIsPublic(o.v)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 14, border: `2px solid ${isPublic === o.v ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, backgroundColor: isPublic === o.v ? 'rgba(74,103,65,0.06)' : 'var(--color-warm-4)', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isPublic === o.v ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isPublic === o.v && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)' }} />}
                </div>
                <div>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>{o.label}</p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{o.sub}</p>
                </div>
              </button>
            ))}
            {!isPublic && myCommunities.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>Communities auswählen:</p>
                {myCommunities.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)' }}>
                    <input
                      type="checkbox"
                      checked={selectedCommunities.includes(c.id)}
                      onChange={() => setSelectedCommunities(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                      style={{ accentColor: 'var(--color-warm-1)', width: 16, height: 16 }}
                    />
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)' }}>{c.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Zurück</button>
              <button onClick={handleSubmit} disabled={saving || (!isPublic && selectedCommunities.length === 0)} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Teile…' : 'Teilen 🙌'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── FeedTab ─────────────────────────────────────────────────
function FeedTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeFilter, setActiveFilter] = useState('all')
  const { posts, loading, loadMore, hasMore, createPost, deletePost, reactToPost } = useFeed(activeFilter)
  const [showCreate, setShowCreate] = useState(false)
  const loaderRef = useRef(null)

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  async function handleCreate(data) {
    await createPost(data)
    showToast('Post geteilt 🙌')
  }

  async function handleDelete(postId) {
    if (!window.confirm('Post wirklich löschen?')) return
    await deletePost(postId)
    showToast('Post gelöscht', 'info')
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Feed</h3>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> Post erstellen
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }} className="hide-scrollbar">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              border: `1.5px solid ${activeFilter === f.key ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
              backgroundColor: activeFilter === f.key ? 'rgba(74,103,65,0.1)' : 'transparent',
              color: activeFilter === f.key ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
              fontFamily: 'Lora, serif', fontSize: 12, fontWeight: activeFilter === f.key ? 700 : 400, cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Posts */}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: 32, margin: '0 0 10px' }}>🌱</p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
            Noch keine Posts. Sei die Erste, die etwas teilt!
          </p>
        </div>
      )}

      {!loading && posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={user?.id}
          onReact={reactToPost}
          onDelete={handleDelete}
          onClick={p => navigate(`/feed/post/${p.id}`)}
        />
      ))}

      {/* Infinite scroll sentinel */}
      {!loading && hasMore && <div ref={loaderRef} style={{ height: 40 }} />}
      {!loading && !hasMore && posts.length > 0 && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
          Keine weiteren Posts.
        </p>
      )}

      {showCreate && (
        <CreatePostSheet onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
    </div>
  )
}

// ─── FriendsView (Main) ──────────────────────────────────────
export default function FriendsView() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'chats' ? 'chats' : searchParams.get('tab') === 'friends' ? 'friends' : 'feed'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { unreadCount } = useNotifications()
  const { hasUnread } = useConversations()

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      <div className="bg-white/80 backdrop-blur-md border-b border-warm-3 pt-4 px-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-[22px] font-bold text-dark m-0">
            Geschwister
          </h2>
        </div>
        <div className="flex gap-2">
          {[{ key: 'feed', label: 'Feed' }, { key: 'friends', label: 'Geschwister' }, { key: 'communities', label: 'Communities' }, { key: 'chats', label: 'Chats' }].map(t => (
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
