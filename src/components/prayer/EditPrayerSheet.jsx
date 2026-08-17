import { useState } from 'react'
import { X, Globe, Lock } from 'lucide-react'
import { KIND_OIKOS } from '../../lib/prayerModel'

// Bearbeiten eines Gebets (Titel, Beschreibung, Sichtbarkeit).
// Community-Gebete behalten ihre Community-Sichtbarkeit – dort wird der
// Öffentlich/Privat-Schalter nicht angeboten.
export default function EditPrayerSheet({ prayer, onSave, onClose }) {
  const [title, setTitle] = useState(prayer.title || '')
  const [description, setDescription] = useState(prayer.description || '')
  const [isPublic, setIsPublic] = useState(prayer.isPublic)
  const [saving, setSaving] = useState(false)

  const isCommunity = prayer.visibility === 'community'

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const updates = { title: title.trim(), description: description.trim() || null }
    if (!isCommunity) {
      if (prayer.kind === KIND_OIKOS) updates.is_public = isPublic
      else updates.visibility = isPublic ? 'public' : 'private'
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

        {!isCommunity && (
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
          disabled={!title.trim() || saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 16,
            backgroundColor: title.trim() ? 'var(--color-accent)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
            cursor: title.trim() ? 'pointer' : 'not-allowed',
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
