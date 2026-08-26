import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'

// Erstellen/Bearbeiten eines eigenen Bekenntnisses (Titel + Zeilen, pro
// Zeile optional eine Bibelstelle, Sichtbarkeit privat/öffentlich).
// `initial` gesetzt = Bearbeiten (auch für die per "Übernehmen" erzeugte
// Kopie eines fremden Bekenntnisses, die sofort danach bearbeitbar sein soll).
export default function CreedEditorSheet({ initial, onClose, onSaved }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [title, setTitle] = useState(initial?.title || '')
  const [visibility, setVisibility] = useState(initial?.visibility || 'private')
  const [lines, setLines] = useState(
    initial?.lines?.length ? initial.lines.map(l => ({ body: l.body, bible_reference: l.bible_reference || '' })) : [{ body: '', bible_reference: '' }]
  )
  const [saving, setSaving] = useState(false)

  const valid = title.trim() && lines.some(l => l.body.trim())

  function updateLine(i, patch) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function addLine() {
    setLines(prev => [...prev, { body: '', bible_reference: '' }])
  }
  function removeLine(i) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      const cleanLines = lines.filter(l => l.body.trim())
      let creedId = initial?.id

      if (creedId) {
        await supabase.from('creeds').update({ title: title.trim(), visibility, updated_at: new Date().toISOString() }).eq('id', creedId)
        await supabase.from('creed_lines').delete().eq('creed_id', creedId)
      } else {
        const { data, error } = await supabase.from('creeds').insert({
          user_id: user.id, title: title.trim(), visibility,
          source_creed_id: initial?.sourceCreedId || null,
        }).select('id').single()
        if (error) throw error
        creedId = data.id
      }

      await supabase.from('creed_lines').insert(
        cleanLines.map((l, i) => ({
          creed_id: creedId, order_index: (i + 1) * 10,
          body: l.body.trim(), bible_reference: l.bible_reference.trim() || null,
        }))
      )

      showToast('Bekenntnis gespeichert ✓')
      onSaved?.()
      onClose()
    } catch {
      showToast('Fehler beim Speichern', 'error')
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
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>{initial?.id ? 'Bekenntnis bearbeiten' : 'Neues Bekenntnis'}</p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel"
          className="w-full px-3 py-2.5 rounded-xl text-sm mb-3"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        />

        <div className="flex gap-2 mb-4">
          {[{ v: 'private', label: 'Privat' }, { v: 'public', label: 'Öffentlich' }].map(o => (
            <button
              key={o.v}
              onClick={() => setVisibility(o.v)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: visibility === o.v ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: visibility === o.v ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 mb-3">
          {lines.map((line, i) => (
            <div key={i} className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex items-start gap-2">
                <textarea
                  value={line.body}
                  onChange={e => updateLine(i, { body: e.target.value })}
                  placeholder={`Zeile ${i + 1}`}
                  rows={2}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: 'none', resize: 'vertical' }}
                />
                {lines.length > 1 && (
                  <button onClick={() => removeLine(i)} className="p-1 flex-shrink-0">
                    <Trash2 size={15} style={{ color: 'var(--color-text-tertiary)' }} />
                  </button>
                )}
              </div>
              <input
                value={line.bible_reference}
                onChange={e => updateLine(i, { bible_reference: e.target.value })}
                placeholder="Bibelstelle (optional, z.B. Römer 10,9)"
                className="w-full mt-2 px-2.5 py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: 'none' }}
              />
            </div>
          ))}
        </div>

        <button onClick={addLine} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: 'var(--color-accent)' }}>
          <Plus size={15} /> Zeile hinzufügen
        </button>

        <button
          onClick={save}
          disabled={!valid || saving}
          className="w-full py-3 rounded-xl font-semibold"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff', opacity: valid ? 1 : 0.5 }}
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>
    </>
  )
}
