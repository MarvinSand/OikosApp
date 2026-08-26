import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'

const GOAL_TYPES = [
  { v: 'days', label: 'Tage' },
  { v: 'count', label: 'Anzahl' },
  { v: 'once', label: 'Einmalig' },
]

export default function CreateChallengeSheet({ onClose, onCreated }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('personal')
  const [goalType, setGoalType] = useState('days')
  const [goalValue, setGoalValue] = useState('')
  const [saving, setSaving] = useState(false)

  const valid = title.trim() && (goalType === 'once' || parseInt(goalValue, 10) > 0)

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      await supabase.from('challenges').insert({
        created_by: user.id, is_official: false, type, title: title.trim(),
        description: description.trim(), goal_type: goalType,
        goal_value: goalType === 'once' ? null : parseInt(goalValue, 10),
      })
      showToast('Challenge erstellt ✓')
      onCreated?.()
      onClose()
    } catch {
      showToast('Fehler beim Erstellen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
          backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 50,
          padding: '16px 20px calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>Neue Challenge</p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel"
          className="w-full px-3 py-2.5 rounded-xl text-sm mb-3"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Beschreibung (optional)"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm mb-3"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)', resize: 'vertical' }}
        />

        <p className="mb-1.5" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Art</p>
        <div className="flex gap-2 mb-3">
          {[{ v: 'personal', label: 'Persönlich' }, { v: 'social', label: 'Sozial' }].map(o => (
            <button
              key={o.v}
              onClick={() => setType(o.v)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: type === o.v ? 'var(--color-accent)' : 'var(--color-bg-secondary)', color: type === o.v ? '#fff' : 'var(--color-text-secondary)' }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <p className="mb-1.5" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Ziel</p>
        <div className="flex gap-2 mb-3">
          {GOAL_TYPES.map(o => (
            <button
              key={o.v}
              onClick={() => setGoalType(o.v)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: goalType === o.v ? 'var(--color-accent)' : 'var(--color-bg-secondary)', color: goalType === o.v ? '#fff' : 'var(--color-text-secondary)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
        {goalType !== 'once' && (
          <input
            type="number"
            min="1"
            value={goalValue}
            onChange={e => setGoalValue(e.target.value)}
            placeholder={goalType === 'days' ? 'z.B. 7' : 'z.B. 5'}
            className="w-full px-3 py-2.5 rounded-xl text-sm mb-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          />
        )}

        <button
          onClick={save}
          disabled={!valid || saving}
          className="w-full py-3 rounded-xl font-semibold mt-1"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff', opacity: valid ? 1 : 0.5 }}
        >
          {saving ? 'Speichert…' : 'Erstellen'}
        </button>
      </div>
    </>
  )
}
