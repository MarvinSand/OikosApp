import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, UserPlus, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useFriendships } from '../../hooks/useFriendships'
import { supabase } from '../../lib/supabase'
import { readCache, writeCache } from '../../lib/swrCache'
import ProfileListOverlay from '../feed/ProfileListOverlay'

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

// „Neue Geschwister, die du vielleicht kennst" – bevorzugt Freunde von
// Freunden (mit Anzeige der gemeinsamen Kontakte), füllt sonst mit weiteren
// Nicht-Verbundenen auf.
export default function PeopleYouMayKnow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getFriendshipStatus, sendRequest } = useFriendships()
  const [cached] = useState(() => readCache(user?.id, 'peopleYouMayKnow'))
  const [suggestions, setSuggestions] = useState(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [dismissed, setDismissed] = useState(new Set())
  const [sentIds, setSentIds] = useState(new Set())
  const [sendingId, setSendingId] = useState(null)
  const [mutualSheetFor, setMutualSheetFor] = useState(null)

  // Früher ein Wasserfall aus bis zu 6 Requests (erst Freundschaften, dann
  // Freunde von Freunden, dann Profile ...). Die RPC (phase76) liefert die
  // fertige Liste in einem Request; Startwert kommt sofort aus dem Cache.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.rpc('get_people_you_may_know', { p_limit: 10 }).then(({ data, error }) => {
      if (cancelled) return
      if (!error) {
        const next = (data || []).map(p => ({
          ...p,
          mutualCount: p.mutual_count || 0,
          mutualPeople: p.mutual_people || [],
        }))
        setSuggestions(next)
        writeCache(user.id, 'peopleYouMayKnow', next)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user?.id])

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
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </p>
                </button>

                {p.mutualCount > 0 ? (
                  <button
                    onClick={() => setMutualSheetFor(p)}
                    style={{ background: 'none', border: 'none', padding: 0, margin: '2px 0 0', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    {p.mutualCount} gemeinsame{p.mutualCount === 1 ? 'r' : ''} Freund{p.mutualCount === 1 ? '' : 'e'}
                  </button>
                ) : (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    {p.city || 'Neu hier'}
                  </p>
                )}

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

      {mutualSheetFor && (
        <ProfileListOverlay
          title={`Gemeinsame Freunde mit ${mutualSheetFor.full_name || mutualSheetFor.username}`}
          items={mutualSheetFor.mutualPeople.map(p => ({
            id: p.id,
            title: p.full_name || p.username,
            subtitle: p.username ? `@${p.username}` : undefined,
            avatarUrl: p.avatar_url,
          }))}
          onClose={() => setMutualSheetFor(null)}
          onSelect={item => { setMutualSheetFor(null); navigate(`/user/${item.id}`) }}
        />
      )}
    </div>
  )
}
