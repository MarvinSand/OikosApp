import { useState } from 'react'
import { X } from 'lucide-react'
import { useFriendships } from '../../hooks/useFriendships'
import { useCommunities } from '../../hooks/useCommunities'
import { useToast } from '../../context/ToastContext'

const VISIBILITY_OPTIONS = [
  { value: 'private',          icon: '🔒', label: 'Nur ich' },
  { value: 'all_siblings',     icon: '👥', label: 'Alle meine Geschwister' },
  { value: 'specific_include', icon: '✅', label: 'Nur bestimmte Geschwister' },
  { value: 'specific_exclude', icon: '🚫', label: 'Alle außer...' },
  { value: 'community',        icon: '🏘', label: 'Nur eine Community' },
]

export default function MapSettingsSheet({ map, updateMap, onClose }) {
  const { showToast } = useToast()
  const { friends } = useFriendships()
  const { myCommunities } = useCommunities()

  const [name, setName] = useState(map.name || '')
  const [visibility, setVisibility] = useState(map.visibility || 'private')
  const [selectedIds, setSelectedIds] = useState(map.visibility_user_ids || [])
  const [communityId, setCommunityId] = useState(map.visibility_community_id || '')
  const [saving, setSaving] = useState(false)

  function toggleId(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateMap(map.id, {
        name: name.trim(),
        visibility,
        visibility_user_ids: ['specific_include', 'specific_exclude'].includes(visibility) ? selectedIds : [],
        visibility_community_id: visibility === 'community' ? (communityId || null) : null,
      })
      showToast('Einstellungen gespeichert ✓')
      onClose()
    } catch {
      showToast('Fehler beim Speichern', 'error')
    } finally {
      setSaving(false)
    }
  }

  const showFriendsList = visibility === 'specific_include' || visibility === 'specific_exclude'
  const showCommunityPicker = visibility === 'community'
  const isDirty = name.trim() !== (map.name || '').trim()
    || visibility !== (map.visibility || 'private')
    || JSON.stringify(selectedIds.sort()) !== JSON.stringify((map.visibility_user_ids || []).sort())
    || communityId !== (map.visibility_community_id || '')

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px 48px',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
            Map-Einstellungen
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <p style={sectionLabel}>Allgemein</p>
        <label style={lbl}>Map-Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inp}
        />

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '20px 0' }} />

        {/* Sichtbarkeit */}
        <p style={sectionLabel}>Sichtbarkeit</p>
        <label style={lbl}>Wer kann diese Map sehen?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {VISIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: visibility === opt.value ? 'var(--color-warm-4)' : 'var(--color-bg)',
                fontFamily: 'Lora, serif', fontSize: 14, textAlign: 'left',
                color: visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-text)',
                fontWeight: visibility === opt.value ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span>{opt.icon}</span>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {visibility === opt.value && <span style={{ fontSize: 12 }}>●</span>}
            </button>
          ))}
        </div>

        {/* Geschwister-Liste */}
        {showFriendsList && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...lbl, marginBottom: 8 }}>
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

        {/* Community-Auswahl */}
        {showCommunityPicker && (
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Community auswählen</label>
            {myCommunities.length === 0 ? (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Du bist noch in keiner Community.
              </p>
            ) : (
              <select
                value={communityId}
                onChange={e => setCommunityId(e.target.value)}
                style={{ ...inp, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23888\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="">— Auswählen —</option>
                {myCommunities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving || !isDirty}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 8,
            cursor: (!name.trim() || saving || !isDirty) ? 'not-allowed' : 'pointer',
            backgroundColor: isDirty && name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
            color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
          }}
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </>
  )
}

const sectionLabel = { fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
