import { useState } from 'react'
import { X, Clock, Users, CalendarDays } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useCommunities } from '../../hooks/useCommunities'
import SiblingPicker from './SiblingPicker'

const GOAL_COLORS = ['#5AC8FA', '#7A9E7E', '#D4A853', '#C0392B', '#8E44AD', '#2980B9', '#E67E22', '#2C3E50']
const GOAL_EMOJIS = ['🙏', '🌍', '🇩🇪', '🔥', '🕊️', '❤️', '✝️', '🌅', '🛡️', '🤲', '⛪', '🌿']

export default function CreateGoalSheet({ onClose, onCreate, initialTitle = '' }) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🙏')
  const [color, setColor] = useState('#5AC8FA')
  const [goalType, setGoalType] = useState('people')
  const [targetValue, setTargetValue] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [communityId, setCommunityId] = useState('')
  const [selectedSiblings, setSelectedSiblings] = useState([])
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const { myCommunities } = useCommunities()

  const targetNum = parseInt(targetValue, 10)
  const valid = title.trim() && targetNum > 0 &&
    (visibility !== 'community' || communityId) &&
    (visibility !== 'specific' || selectedSiblings.length > 0)

  async function handleCreate() {
    if (!valid) return
    setSaving(true)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || null,
        icon, color,
        goalType,
        targetValue: targetNum,
        visibility,
        communityId: visibility === 'community' ? communityId : null,
        visibilityUserIds: visibility === 'specific' ? selectedSiblings : [],
      })
      showToast('Gebetsziel erstellt ✓')
      onClose()
    } catch {
      showToast('Fehler beim Erstellen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Neues Gebetsziel</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Ziel-Typ */}
        <label style={lbl}>Art des Ziels</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { val: 'people', icon: <Users size={15} />, label: 'Personen', hint: 'z.B. 100 beten mit' },
            { val: 'hours', icon: <Clock size={15} />, label: 'Stunden', hint: 'z.B. 1000 Std.' },
            { val: 'days', icon: <CalendarDays size={15} />, label: 'Tage', hint: 'z.B. 30 Tage' },
          ].map(t => (
            <button
              key={t.val}
              type="button"
              onClick={() => setGoalType(t.val)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${goalType === t.val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: goalType === t.val ? 'var(--color-warm-4)' : 'var(--color-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                {t.icon} {t.label}
              </div>
              <div style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)' }}>{t.hint}</div>
            </button>
          ))}
        </div>

        {/* Emoji */}
        <label style={lbl}>Emoji</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {GOAL_EMOJIS.map(e => (
            <button key={e} onClick={() => setIcon(e)} style={{
              width: 40, height: 40, borderRadius: 10, fontSize: 20, cursor: 'pointer',
              border: `2px solid ${icon === e ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
              background: icon === e ? 'var(--color-warm-4)' : 'none',
            }}>{e}</button>
          ))}
        </div>

        {/* Titel */}
        <label style={lbl}>Titel *</label>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. 1000 Stunden für Deutschland" style={inp} />

        {/* Zielwert */}
        <label style={{ ...lbl, marginTop: 14 }}>
          {goalType === 'hours' ? 'Ziel (Stunden) *' : goalType === 'days' ? 'Ziel (Tage) *' : 'Ziel (Anzahl Personen) *'}
        </label>
        <input type="number" inputMode="numeric" min="1" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder={goalType === 'hours' ? '1000' : goalType === 'days' ? '30' : '100'} style={inp} />

        {/* Beschreibung */}
        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 300))} placeholder="Worum geht es bei diesem Ziel?" rows={2} style={{ ...inp, resize: 'none' }} />

        {/* Farbe */}
        <label style={{ ...lbl, marginTop: 14 }}>Farbe</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {GOAL_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 32, height: 32, borderRadius: '50%', backgroundColor: c,
              border: color === c ? '3px solid var(--color-text)' : '2px solid transparent',
              cursor: 'pointer', flexShrink: 0,
            }} />
          ))}
        </div>

        {/* Sichtbarkeit */}
        <label style={lbl}>Sichtbarkeit</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { val: 'public', icon: '🌐', label: 'Öffentlich' },
            { val: 'community', icon: '🏘', label: 'Community' },
            { val: 'siblings', icon: '🤝', label: 'Verbundene Geschwister' },
            { val: 'specific', icon: '👥', label: 'Ausgewählte Geschwister' },
          ].map(v => (
            <button key={v.val} type="button" onClick={() => setVisibility(v.val)} style={{
              padding: '10px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${visibility === v.val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
              backgroundColor: visibility === v.val ? 'var(--color-warm-4)' : 'var(--color-bg)',
              fontFamily: 'Lora, serif', fontSize: 12.5, fontWeight: visibility === v.val ? 600 : 400,
              color: visibility === v.val ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
              textAlign: 'left', lineHeight: 1.3,
            }}>{v.icon} {v.label}</button>
          ))}
        </div>

        {visibility === 'community' && (
          myCommunities.length === 0 ? (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 12 }}>
              Du bist noch in keiner Community.
            </p>
          ) : (
            <select value={communityId} onChange={e => setCommunityId(e.target.value)} style={{ ...inp, appearance: 'none', marginBottom: 12 }}>
              <option value="">— Community auswählen —</option>
              {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )
        )}

        {visibility === 'specific' && (
          <div style={{ marginBottom: 12 }}>
            <SiblingPicker selected={selectedSiblings} onChange={setSelectedSiblings} />
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!valid || saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 8,
            backgroundColor: valid ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
            color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
            cursor: valid ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Erstelle…' : 'Ziel erstellen'}
        </button>
      </div>
    </>
  )
}

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
