import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import MemberAvatarStack from '../community/MemberAvatarStack'
import { getInitials } from '../../lib/communityTheme'

// Gemeinde-Eingabe mit Dropdown der bereits eingetragenen Gemeinden
// (phase91: get_churches). Freitext bleibt möglich – eine neue Gemeinde
// erscheint nach dem Speichern automatisch für alle in der Liste.
export default function ChurchPicker({ value, onChange, inputStyle }) {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [churches, setChurches] = useState([])
  const [open, setOpen] = useState(false)
  const [membersOf, setMembersOf] = useState(null) // { name, list }

  useEffect(() => {
    let alive = true
    supabase.rpc('get_churches').then(({ data, error }) => {
      if (alive && !error) setChurches(data || [])
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const q = (value || '').trim().toLowerCase()
  const filtered = churches.filter(c => !q || c.name.toLowerCase().includes(q))
  const isNew = q && !churches.some(c => c.name.toLowerCase() === q)

  async function showMembers(c) {
    setMembersOf({ name: c.name, list: null })
    const { data } = await supabase.rpc('get_church_members', { p_name: c.name })
    setMembersOf({ name: c.name, list: data || [] })
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Gemeinde wählen oder neu eingeben"
        style={inputStyle}
      />
      {open && (filtered.length > 0 || isNew) && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, zIndex: 40,
            maxHeight: 260, overflowY: 'auto', borderRadius: 12,
            backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {isNew && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              „{value.trim()}“ als neue Gemeinde hinzufügen
            </div>
          )}
          {filtered.map(c => (
            <div
              key={c.name}
              onClick={() => { onChange(c.name); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); showMembers(c) }}
                aria-label={`Mitglieder von ${c.name} anzeigen`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
              >
                <MemberAvatarStack members={c.members || []} count={c.member_count} size={20} max={3} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{c.member_count}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {membersOf && (
        <div
          onClick={() => setMembersOf(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '42rem', maxHeight: '70%', overflowY: 'auto',
              backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0',
              padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>{membersOf.name}</h3>
              <button type="button" onClick={() => setMembersOf(null)} aria-label="Schließen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            {membersOf.list === null ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Lade…</p>
            ) : membersOf.list.map(m => (
              <div
                key={m.id}
                onClick={() => navigate(`/user/${m.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-warm-1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 14 }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(m.full_name || m.username)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.full_name || m.username}</div>
                  {m.username && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>@{m.username}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
