import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Plus, Hash, Check, X, MoreVertical, Copy, ChevronRight, MessageCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useCommunities } from '../hooks/useCommunities'
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

// ─── FriendsTab ─────────────────────────────────────────────
function FriendsTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { friends, pendingReceived, loading, getFriendshipStatus, getFriendship, searchUsers, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriendships()

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(null) // userId being sent request
  const [openMenu, setOpenMenu] = useState(null) // friendshipId
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
                  <button onClick={() => handleSend(u.id)} disabled={sending === u.id} style={sendBtn}>
                    {sending === u.id ? '…' : 'Anfragen'}
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
        <p style={sectionLabel}>Meine Geschwister ({friends.length})</p>
        {loading && <div style={skeleton} />}
        {!loading && friends.length === 0 && (
          <p style={{ ...mutedText, textAlign: 'center', padding: '16px 0' }}>
            Noch keine Geschwister. Suche nach Nutzern um sie hinzuzufügen. ↑
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
    </div>
  )
}

// ─── CommunitiesTab ──────────────────────────────────────────
function CommunitiesTab({ onCreateOpen, onJoinOpen }) {
  const navigate = useNavigate()
  const { myCommunities, loading } = useCommunities()

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

      {loading && <div style={skeleton} />}
      {!loading && myCommunities.length === 0 && (
        <p style={{ ...mutedText, textAlign: 'center', padding: '20px 0', lineHeight: 1.6 }}>
          Du bist noch in keiner Community.{'\n'}Erstelle eine oder tritt einer per Code bei.
        </p>
      )}

      {myCommunities.map(c => {
        const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const community = await createCommunity({ name: name.trim(), description: description.trim() || null })
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
      <div onClick={onClose} style={backdrop} />
      <div style={bottomSheet}>
        <div style={sheetHandle} />
        <h3 style={sheetTitle}>Community erstellen</h3>

        <label style={lbl}>Name *</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Hausgemeinde Mitte" style={inp} />

        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} placeholder="Worum geht es in eurer Community?" rows={3} style={{ ...inp, resize: 'none' }} />
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', marginTop: 2 }}>{description.length}/200</p>

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
        <h3 style={sheetTitle}>Community beitreten</h3>
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

// ─── FriendsView (Main) ──────────────────────────────────────
export default function FriendsView() {
  const [activeTab, setActiveTab] = useState('friends')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '16px 16px 0', position: 'sticky', top: 0, zIndex: 5 }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
          Geschwister
        </h2>
        <div style={{ display: 'flex', gap: 0 }}>
          {[{ key: 'friends', label: 'Geschwister' }, { key: 'communities', label: 'Communities' }].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ flex: 1, padding: '10px 0', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: activeTab === t.key ? 600 : 400, color: activeTab === t.key ? 'var(--color-warm-1)' : 'var(--color-text-muted)', cursor: 'pointer', borderBottom: activeTab === t.key ? '2px solid var(--color-warm-1)' : '2px solid transparent', transition: 'all 0.15s' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {activeTab === 'friends'
          ? <FriendsTab />
          : <CommunitiesTab onCreateOpen={() => setShowCreate(true)} onJoinOpen={() => setShowJoin(true)} />
        }
      </div>

      {showCreate && <CreateCommunitySheet onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinCommunityModal onClose={() => setShowJoin(false)} />}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const personRow = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-warm-3)' }
const nameText = { fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const usernameText = { fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }
const sectionLabel = { fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }
const mutedText = { fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }
const sendBtn = { padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }
const pendingBadge = { fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', flexShrink: 0 }
const friendsBadge = { fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-accent-dark)', fontWeight: 600, flexShrink: 0 }
const actionBtn = { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const skeleton = { height: 56, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }
const backdrop = { position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }
const bottomSheet = { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px', animation: 'sheetSlideUp 0.3s ease-out' }
const overlay = { position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }
const modal = { backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(58,46,36,0.15)' }
const sheetHandle = { width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }
const sheetTitle = { fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
