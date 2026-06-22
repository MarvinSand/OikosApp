import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function Avatar({ profile, size = 30 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, border: '1px solid var(--color-border)',
    }}>{initials}</div>
  )
}

// Auswahl-Liste der verbundenen Geschwister (akzeptierte Freundschaften).
// selected: Array von Profil-IDs, onChange: (newIds) => void
export default function SiblingPicker({ selected, onChange }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [siblings, setSiblings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')
      const ids = (friendships || []).map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', ids)
          .order('full_name')
        setSiblings(profiles || [])
      }
      setLoading(false)
    })()
  }, [user?.id])

  const filtered = siblings.filter(s => {
    const name = (s.full_name || s.username || '').toLowerCase()
    return name.includes(query.toLowerCase())
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 10, backgroundColor: 'var(--color-bg)' }}>
        <Search size={14} color="var(--color-text-tertiary)" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Geschwister suchen…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text)' }}
        />
      </div>
      {loading && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '16px 0' }}>Lade…</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(s => {
          const checked = selected.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => onChange(checked ? selected.filter(id => id !== s.id) : [...selected, s.id])}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                border: `1.5px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: checked ? 'var(--color-accent)10' : 'var(--color-bg)',
                cursor: 'pointer',
              }}
            >
              <Avatar profile={s} size={30} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                {s.full_name || s.username}
              </span>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: checked ? 'var(--color-accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
            </button>
          )
        })}
        {!loading && filtered.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '16px 0' }}>Keine Geschwister gefunden</p>
        )}
      </div>
    </div>
  )
}
