import { useState } from 'react'
import { X } from 'lucide-react'
import { useFriendships } from '../../hooks/useFriendships'
import { useCommunities } from '../../hooks/useCommunities'

const VISIBILITY_OPTIONS = [
  {
    value: 'private',
    icon: '🔒',
    label: 'Nur ich',
    hint: 'Nur du kannst diese Map sehen.',
  },
  {
    value: 'all_siblings',
    icon: '👥',
    label: 'Alle meine Geschwister',
    hint: 'Alle mit dir verbundenen Christen können sie sehen.',
  },
  {
    value: 'specific_include',
    icon: '✅',
    label: 'Nur bestimmte Geschwister',
    hint: 'Du wählst genau, wer Zugriff bekommt.',
  },
  {
    value: 'specific_exclude',
    icon: '🚫',
    label: 'Alle außer…',
    hint: 'Alle sehen sie – außer den Personen, die du ausschließt.',
  },
  {
    value: 'community',
    icon: '🏘',
    label: 'Nur eine Community',
    hint: 'Nur Mitglieder der gewählten Community haben Zugriff.',
  },
]

export default function NewMapModal({ onClose, onCreate }) {
  const { friends } = useFriendships()
  const { myCommunities } = useCommunities()

  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [selectedIds, setSelectedIds] = useState([])
  const [communityId, setCommunityId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleId(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onCreate({
        name: name.trim(),
        visibility,
        visibility_user_ids: ['specific_include', 'specific_exclude'].includes(visibility) ? selectedIds : [],
        visibility_community_id: visibility === 'community' ? (communityId || null) : null,
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const showFriendsList = visibility === 'specific_include' || visibility === 'specific_exclude'
  const showCommunityPicker = visibility === 'community'

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={title}>Neue Oikos Map</h3>
          <button onClick={onClose} style={closeBtn}><X size={18} /></button>
        </div>

        <label style={label}>Name der Map</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="z.B. Meine Familie"
          style={input}
        />

        <label style={{ ...label, marginTop: 18 }}>Wer kann diese Map sehen?</label>
        <div className="tour-map-visibility" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {VISIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: visibility === opt.value ? 'var(--color-warm-4)' : 'var(--color-bg)',
                fontFamily: 'Lora, serif', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{opt.icon}</span>
              <div>
                <div style={{
                  fontSize: 14,
                  color: visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-text)',
                  fontWeight: visibility === opt.value ? 600 : 400,
                }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                  {opt.hint}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Friends list for specific_include / specific_exclude */}
        {showFriendsList && (
          <div style={{ marginTop: 14 }}>
            <label style={{ ...label, marginBottom: 8 }}>
              {visibility === 'specific_include' ? 'Sichtbar für:' : 'Ausgenommen:'}
            </label>
            {friends.length === 0 ? (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Noch keine verbundenen Geschwister.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {friends.map(f => {
                  const uid = f.otherUser?.id
                  const checked = selectedIds.includes(uid)
                  return (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(uid)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-warm-1)', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', flex: 1 }}>
                        {f.otherUser?.full_name || f.otherUser?.username}
                      </span>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        @{f.otherUser?.username}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Community picker */}
        {showCommunityPicker && (
          <div style={{ marginTop: 14 }}>
            <label style={label}>Community auswählen</label>
            {myCommunities.length === 0 ? (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Du bist noch in keiner Community.
              </p>
            ) : (
              <select
                value={communityId}
                onChange={e => setCommunityId(e.target.value)}
                style={{ ...input, appearance: 'none' }}
              >
                <option value="">— Auswählen —</option>
                {myCommunities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && <p style={errorText}>{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          style={{ ...primaryBtn(!name.trim() || loading), marginTop: 20 }}
        >
          {loading ? 'Erstelle…' : 'Map erstellen'}
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 50,
  backgroundColor: 'rgba(58,46,36,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 16px',
}
const modal = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 20, padding: '24px 20px',
  width: '100%', maxWidth: 400,
  boxShadow: '0 8px 32px rgba(58,46,36,0.15)',
  maxHeight: '90vh', overflowY: 'auto',
}
const title = { fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', margin: 0 }
const closeBtn = { border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }
const label = { display: 'block', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const input = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid var(--color-warm-3)',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)',
  display: 'block',
}
const errorText = { color: '#C0392B', fontSize: 13, fontStyle: 'italic', marginTop: 8, fontFamily: 'Lora, serif' }
const primaryBtn = (disabled) => ({
  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
  color: 'var(--color-white)',
  fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
})
