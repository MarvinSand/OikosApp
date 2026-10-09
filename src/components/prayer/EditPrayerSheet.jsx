import { useState } from 'react'
import { X, Globe, Lock } from 'lucide-react'
import { KIND_OIKOS } from '../../lib/prayerModel'
import { useCommunities } from '../../hooks/useCommunities'
import { FEED_VISIBILITY, SiblingPickerFeed } from '../feed/FeedPostSheet'

// Bearbeiten eines Gebets (Titel, Beschreibung, Sichtbarkeit).
// Oikos-Anliegen: Sichtbarkeit wie beim Feedpost (öffentlich / Community /
// Geschwister / ausgewählte Geschwister / privat). Feed-Gebete: Öffentlich/Privat;
// Community-Gebete behalten ihre Community-Sichtbarkeit.
export default function EditPrayerSheet({ prayer, onSave, onClose }) {
  const [title, setTitle] = useState(prayer.title || '')
  const [description, setDescription] = useState(prayer.description || '')
  const [isPublic, setIsPublic] = useState(prayer.isPublic)
  const [saving, setSaving] = useState(false)

  const isOikos = prayer.kind === KIND_OIKOS
  const isCommunity = !isOikos && prayer.visibility === 'community'
  const { myCommunities } = useCommunities()
  // Oikos: DB-Wert 'community' ↔ UI-Schlüssel 'communities'
  const [visibility, setVisibility] = useState(prayer.visibility === 'community' ? 'communities' : (prayer.visibility || 'private'))
  const [communityIds, setCommunityIds] = useState(prayer.visibilityCommunityIds || [])
  const [userIds, setUserIds] = useState(prayer.visibilityUserIds || [])
  const visOk = !isOikos ||
    (visibility !== 'communities' || communityIds.length > 0) &&
    (visibility !== 'specific_include' || userIds.length > 0)

  async function handleSave() {
    if (!title.trim() || !visOk) return
    setSaving(true)
    const updates = { title: title.trim(), description: description.trim() || null }
    if (isOikos) {
      updates.visibility = visibility === 'communities' ? 'community' : visibility
      updates.is_public = visibility === 'public'
      updates.visibility_community_ids = visibility === 'communities' ? communityIds : null
      updates.visibility_user_ids = visibility === 'specific_include' ? userIds : null
    } else if (!isCommunity) {
      updates.visibility = isPublic ? 'public' : 'private'
    }
    await onSave(updates)
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.25s ease-out', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Anliegen bearbeiten</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <label style={lbl}>Titel *</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} style={inp} />

        <label style={{ ...lbl, marginTop: 12 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={3} style={{ ...inp, resize: 'vertical' }} />

        {isOikos && (
          <div style={{ marginTop: 14 }}>
            <label style={lbl}>Wer soll es sehen?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...FEED_VISIBILITY, { key: 'private', label: 'Nur für mich', icon: Lock }].map(o => {
                const Icon = o.icon
                const active = visibility === o.key
                return (
                  <button key={o.key} onClick={() => setVisibility(o.key)} style={rowStyle(active)}>
                    <Icon size={16} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} />
                    <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{o.label}</span>
                  </button>
                )
              })}
            </div>
            {visibility === 'communities' && (
              myCommunities.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '8px 0 0' }}>Du bist noch in keiner Community.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {myCommunities.map(c => {
                    const checked = communityIds.includes(c.id)
                    return (
                      <button key={c.id} onClick={() => setCommunityIds(checked ? communityIds.filter(x => x !== c.id) : [...communityIds, c.id])} style={rowStyle(checked)}>
                        <span style={{ fontSize: 16 }}>{c.icon || '🏠'}</span>
                        <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</span>
                        <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`, background: checked ? 'var(--color-accent)' : 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{checked && '✓'}</span>
                      </button>
                    )
                  })}
                </div>
              )
            )}
            {visibility === 'specific_include' && (
              <div style={{ marginTop: 8 }}>
                <SiblingPickerFeed selected={userIds} onChange={setUserIds} />
              </div>
            )}
          </div>
        )}

        {!isOikos && !isCommunity && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px' }}>
                {isPublic
                  ? <><Globe size={12} style={{ display: 'inline', marginRight: 4 }} />Öffentlich</>
                  : <><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />Privat</>}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>
                {isPublic ? 'Für andere sichtbar' : 'Nur für dich'}
              </p>
            </div>
            <button
              onClick={() => setIsPublic(v => !v)}
              style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: isPublic ? 'var(--color-accent)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: 3, left: isPublic ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!title.trim() || !visOk || saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 16,
            backgroundColor: title.trim() && visOk ? 'var(--color-accent)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
            cursor: title.trim() && visOk ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </>
  )
}

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
function rowStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
  }
}
