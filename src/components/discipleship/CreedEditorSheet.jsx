import { useState } from 'react'
import { X, Plus, Trash2, Globe, Users, UserCheck, Lock, Home as HomeIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCommunities } from '../../hooks/useCommunities'
import { useToast } from '../../context/ToastContext'
import { verseFieldsFromAttachment, verseAttachmentFromRow } from '../../lib/bibleLink'
import BibleReferenceChip from '../bible/BibleReferenceChip'
import VersePickerSheet from '../bible/VersePickerSheet'
import SiblingPicker from '../prayer/SiblingPicker'

// Sichtbarkeit wie beim Feed-Post-Composer (FeedPostSheet.jsx): öffentlich /
// privat / Community / meine Geschwister / ausgewählte Geschwister.
const VISIBILITY_OPTIONS = [
  { key: 'private',           label: 'Privat',                  icon: Lock },
  { key: 'public',            label: 'Öffentlich',              icon: Globe },
  { key: 'community',         label: 'Community',               icon: HomeIcon },
  { key: 'siblings',          label: 'Meine Geschwister',       icon: UserCheck },
  { key: 'specific_include',  label: 'Ausgewählte Geschwister', icon: Users },
]

const field = { width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box', display: 'block' }
function row(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12,
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  }
}

// Erstellen/Bearbeiten eines eigenen Bekenntnisses (Titel + Zeilen, pro Zeile
// optional eine exakte, per VersePickerSheet ausgewählte Bibelstelle,
// Sichtbarkeit wie beim Feed-Post-Composer).
// `initial` gesetzt = Bearbeiten (auch für die per "Übernehmen" erzeugte
// Kopie eines fremden Bekenntnisses, die sofort danach bearbeitbar sein soll).
export default function CreedEditorSheet({ initial, onClose, onSaved }) {
  const { user } = useAuth()
  const { myCommunities } = useCommunities()
  const { showToast } = useToast()
  const [title, setTitle] = useState(initial?.title || '')
  const [visibility, setVisibility] = useState(initial?.visibility || 'private')
  const [selectedCommunity, setSelectedCommunity] = useState(initial?.visibility_community_id || null)
  const [selectedSiblings, setSelectedSiblings] = useState(initial?.visibility_user_ids || [])
  const [lines, setLines] = useState(
    initial?.lines?.length
      ? initial.lines.map(l => ({ body: l.body, verse: verseAttachmentFromRow(l) }))
      : [{ body: '', verse: null }]
  )
  const [versePickerFor, setVersePickerFor] = useState(null) // Index der Zeile, für die gerade eine Bibelstelle gewählt wird
  const [saving, setSaving] = useState(false)

  const visOk =
    (visibility !== 'community' || selectedCommunity) &&
    (visibility !== 'specific_include' || selectedSiblings.length > 0)
  const valid = title.trim() && lines.some(l => l.body.trim()) && visOk

  function updateLine(i, patch) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function addLine() {
    setLines(prev => [...prev, { body: '', verse: null }])
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
      const visibilityPayload = {
        visibility,
        visibility_community_id: visibility === 'community' ? selectedCommunity : null,
        visibility_user_ids: visibility === 'specific_include' ? selectedSiblings : [],
      }

      if (creedId) {
        await supabase.from('creeds').update({ title: title.trim(), ...visibilityPayload, updated_at: new Date().toISOString() }).eq('id', creedId)
        await supabase.from('creed_lines').delete().eq('creed_id', creedId)
      } else {
        const { data, error } = await supabase.from('creeds').insert({
          user_id: user.id, title: title.trim(), ...visibilityPayload,
          source_creed_id: initial?.sourceCreedId || null,
        }).select('id').single()
        if (error) throw error
        creedId = data.id
      }

      await supabase.from('creed_lines').insert(
        cleanLines.map((l, i) => ({
          creed_id: creedId, order_index: (i + 1) * 10,
          body: l.body.trim(),
          ...verseFieldsFromAttachment(l.verse),
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
              {line.verse ? (
                <div style={{ marginTop: 8 }}>
                  <BibleReferenceChip attachment={line.verse} variant="block" showVerse={false} onRemove={() => updateLine(i, { verse: null })} />
                </div>
              ) : (
                <button onClick={() => setVersePickerFor(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, border: '1px dashed var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', marginTop: 8, width: '100%' }}
                >
                  <span style={{ fontSize: 13 }}>📖</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Bibelstelle auswählen</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={addLine} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: 'var(--color-accent)' }}>
          <Plus size={15} /> Zeile hinzufügen
        </button>

        <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.4px' }}>Wer soll es sehen?</p>
        <div className="flex flex-col gap-2 mb-3">
          {VISIBILITY_OPTIONS.map(o => {
            const Icon = o.icon
            const active = visibility === o.key
            return (
              <button key={o.key} onClick={() => setVisibility(o.key)} style={row(active)}>
                <Icon size={17} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{o.label}</span>
              </button>
            )
          })}
        </div>
        {visibility === 'community' && (
          myCommunities.length === 0 ? (
            <p className="text-xs italic mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Du bist noch in keiner Community.</p>
          ) : (
            <select value={selectedCommunity || ''} onChange={e => setSelectedCommunity(e.target.value || null)} style={{ ...field, marginBottom: 12, appearance: 'none' }}>
              <option value="">— Community auswählen —</option>
              {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )
        )}
        {visibility === 'specific_include' && (
          <div className="mb-3">
            <SiblingPicker selected={selectedSiblings} onChange={setSelectedSiblings} />
          </div>
        )}

        <button
          onClick={save}
          disabled={!valid || saving}
          className="w-full py-3 rounded-xl font-semibold"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff', opacity: valid ? 1 : 0.5 }}
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>

      {versePickerFor !== null && (
        // Eigener Stacking-Kontext mit höherem z-index als das Editor-Sheet
        // (z-50 oben) - VersePickerSheet selbst ist fest auf z-40 gesetzt und
        // würde sonst hinter dem Editor-Sheet verschwinden.
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <VersePickerSheet
            onClose={() => setVersePickerFor(null)}
            onSelect={(att) => { updateLine(versePickerFor, { verse: att }); setVersePickerFor(null) }}
          />
        </div>
      )}
    </>
  )
}
