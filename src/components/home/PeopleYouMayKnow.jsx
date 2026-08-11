import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, UserPlus, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useFriendships } from '../../hooks/useFriendships'
import { supabase } from '../../lib/supabase'

function Avatar({ name, size, avatarUrl, isChristian }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      color: '#fff', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{initials}</div>
  )
}

// „Neue Geschwister, die du vielleicht kennst" – ähnlich einer klassischen
// „People you may know"-Leiste, aber im Oikos-Design. Bevorzugt Vorschläge
// mit gemeinsamen Verbindungen, füllt sonst mit weiteren Nicht-Verbundenen auf.
export default function PeopleYouMayKnow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { friends, loading: friendsLoading, getFriendshipStatus, sendRequest } = useFriendships()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(new Set())
  const [sentIds, setSentIds] = useState(new Set())
  const [sendingId, setSendingId] = useState(null)

  const load = useCallback(async () => {
    if (!user || friendsLoading) return
    setLoading(true)

    const myFriendIds = friends.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    const connectedIds = new Set([user.id, ...myFriendIds])

    // Gemeinsame Verbindungen: Freunde meiner Freunde zählen
    const mutualCount = {}
    if (myFriendIds.length > 0) {
      const { data: fof } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.in.(${myFriendIds.join(',')}),addressee_id.in.(${myFriendIds.join(',')})`)

      for (const row of fof || []) {
        const candidate = myFriendIds.includes(row.requester_id) ? row.addressee_id : row.requester_id
        if (connectedIds.has(candidate)) continue
        mutualCount[candidate] = (mutualCount[candidate] || 0) + 1
      }
    }

    const candidateIds = Object.keys(mutualCount)
    let profiles = []
    if (candidateIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_christian, avatar_url, city')
        .in('id', candidateIds)
      profiles = data || []
    }

    // Auffüllen mit weiteren, noch nicht verbundenen Profilen ohne bekannte Verbindung
    if (profiles.length < 8) {
      const { data: more } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_christian, avatar_url, city')
        .neq('id', user.id)
        .limit(24)
      for (const p of more || []) {
        if (connectedIds.has(p.id) || profiles.some(x => x.id === p.id)) continue
        profiles.push(p)
        if (profiles.length >= 12) break
      }
    }

    profiles.sort((a, b) => (mutualCount[b.id] || 0) - (mutualCount[a.id] || 0))
    setSuggestions(profiles.slice(0, 10).map(p => ({ ...p, mutual: mutualCount[p.id] || 0 })))
    setLoading(false)
  }, [user, friendsLoading, friends])

  useEffect(() => { load() }, [load])

  async function handleAdd(id) {
    setSendingId(id)
    try {
      await sendRequest(id)
      setSentIds(prev => new Set(prev).add(id))
    } catch {
      // stiller Fehlschlag – Nutzer kann es erneut versuchen
    } finally {
      setSendingId(null)
    }
  }

  const visible = suggestions.filter(p => !dismissed.has(p.id) && getFriendshipStatus(p.id) === 'none')

  if (!loading && visible.length === 0) return null

  return (
    <div>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 12px' }}>
        Neue Geschwister, die du kennen könntest
      </p>

      {loading && (
        <div style={{ display: 'flex', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: 128, height: 168, borderRadius: 18, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
          ))}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
          {visible.map(p => {
            const name = p.full_name || p.username || 'Unbekannt'
            const sent = sentIds.has(p.id)
            return (
              <div
                key={p.id}
                style={{
                  position: 'relative', flexShrink: 0, width: 132,
                  borderRadius: 18, padding: '14px 12px 12px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 4px 14px rgba(58,46,36,0.05)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                }}
              >
                <button
                  onClick={() => setDismissed(prev => new Set(prev).add(p.id))}
                  aria-label="Vorschlag entfernen"
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%',
                    border: 'none', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <X size={12} />
                </button>

                <button
                  onClick={() => navigate(`/user/${p.id}`)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}
                >
                  <Avatar name={name} size={56} avatarUrl={p.avatar_url} isChristian={p.is_christian} />
                  <div style={{ width: '100%' }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </p>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                      {p.mutual > 0
                        ? `${p.mutual} gemeinsame${p.mutual === 1 ? 'r' : ''} Kontakt${p.mutual === 1 ? '' : 'e'}`
                        : (p.city || 'Neu hier')}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleAdd(p.id)}
                  disabled={sent || sendingId === p.id}
                  style={{
                    marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 10, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    backgroundColor: sent ? 'var(--color-bg)' : 'var(--color-accent)',
                    color: sent ? 'var(--color-text-muted)' : '#fff',
                    fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600,
                    cursor: sent ? 'default' : 'pointer',
                    border: sent ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  {sent ? <><Check size={13} /> Angefragt</> : sendingId === p.id ? '…' : <><UserPlus size={13} /> Hinzufügen</>}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
