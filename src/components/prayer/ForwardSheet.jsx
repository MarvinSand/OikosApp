import { useState, useEffect } from 'react'
import { X, Search, Send, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

function Avatar({ profile, size = 36 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700,
    }}>{initials}</div>
  )
}

// Generisches Sheet zum Weiterleiten an Geschwister (Direktnachricht).
// previewTitle: kurze Vorschauzeile.
// buildMessage(): liefert die Nachrichten-Felder (ohne conversation_id/sender_id),
//                 z.B. { type, text, bible_verse_text, prayer_request_id }.
export default function ForwardSheet({ previewTitle, buildMessage, onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [sending, setSending] = useState(false)

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
        setFriends(profiles || [])
      }
      setLoading(false)
    })()
  }, [user?.id])

  const filtered = friends.filter(f => (f.full_name || f.username || '').toLowerCase().includes(query.toLowerCase()))

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSend() {
    if (selected.length === 0 || sending) return
    setSending(true)
    try {
      let ok = 0
      const messageFields = buildMessage()
      for (const friendId of selected) {
        // Direkt-Chat holen/erstellen
        const { data: convId, error: convErr } = await supabase.rpc('start_direct_chat', { other_user_id: friendId })
        if (convErr || !convId) continue
        const { error: msgErr } = await supabase.from('messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          ...messageFields,
        })
        if (!msgErr) ok++
      }
      if (ok > 0) {
        showToast(ok === 1 ? 'Weitergeleitet ✓' : `An ${ok} Geschwister weitergeleitet ✓`)
        onClose()
      } else {
        showToast('Fehler beim Weiterleiten', 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Weiterleiten</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {previewTitle && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            „{previewTitle}“
          </p>
        )}

        {/* Suche */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1.5px solid var(--color-warm-3)', borderRadius: 12, marginBottom: 12, backgroundColor: 'var(--color-bg)' }}>
          <Search size={15} color="var(--color-text-tertiary)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Geschwister suchen…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, backgroundColor: 'transparent', color: 'var(--color-text)' }}
          />
        </div>

        {loading && <div style={{ height: 56, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />}

        {!loading && friends.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
            Du hast noch keine verbundenen Geschwister.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '42vh', overflowY: 'auto' }}>
          {filtered.map(f => {
            const checked = selected.includes(f.id)
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, textAlign: 'left',
                  border: `1.5px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: checked ? 'var(--color-accent-light)' : 'var(--color-bg)', cursor: 'pointer',
                }}
              >
                <Avatar profile={f} size={36} />
                <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  {f.full_name || f.username}
                </span>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: checked ? 'var(--color-accent)' : 'transparent',
                  border: checked ? 'none' : '1.5px solid var(--color-border)',
                }}>
                  {checked && <Check size={13} color="#fff" />}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSend}
          disabled={selected.length === 0 || sending}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: selected.length > 0 ? 'var(--color-accent)' : 'var(--color-warm-3)',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
            cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={16} />
          {sending ? 'Sende…' : selected.length > 0 ? `Senden (${selected.length})` : 'Senden'}
        </button>
      </div>
    </>
  )
}
