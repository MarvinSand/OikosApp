import { useState } from 'react'
import { Check, Globe, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { useImpactMap, STAGES } from '../../hooks/useImpactMap'
import { useToast } from '../../context/ToastContext'
import Confetti from '../ui/Confetti'

function StepIndicator({ stageStatuses, currentStage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((n, i) => {
        const status = stageStatuses[n]
        const isCurrent = n === currentStage
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 5 ? 1 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: status === 'done' ? 'var(--color-gold)' : isCurrent ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
              color: status === 'done' || isCurrent ? 'white' : 'var(--color-text-muted)',
              fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700,
              animation: isCurrent ? 'stagePulse 2s ease-in-out infinite' : 'none',
              transition: 'all 0.3s',
            }}>
              {status === 'done' ? <Check size={13} strokeWidth={3} /> : n}
            </div>
            {i < 5 && (
              <div style={{
                flex: 1, height: 2,
                backgroundColor: status === 'done' ? 'var(--color-gold)' : 'var(--color-warm-3)',
                transition: 'background-color 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ActiveStageCard({ stage, entry, isOwner, onSave, onComplete, personName }) {
  const s = STAGES[stage - 1]
  const [note, setNote] = useState(entry?.note || '')
  const [isPublic, setIsPublic] = useState(entry?.is_public !== false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function handleSave() {
    if (!note.trim()) return
    setSaving(true)
    await onSave(stage, note, isPublic)
    setSaving(false)
  }

  async function handleComplete() {
    if (!note.trim()) return
    setCompleting(true)
    await onComplete(stage, note, isPublic)
    setCompleting(false)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 16, padding: 16, border: '1.5px solid var(--color-warm-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-warm-1)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Stufe {stage}
          </span>
          <h5 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
            {s.name}
          </h5>
        </div>
        {isOwner && (
          <button
            onClick={() => setIsPublic(!isPublic)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
            title={isPublic ? 'Öffentlich' : 'Privat'}
          >
            {isPublic ? <Globe size={15} color="var(--color-accent)" /> : <Lock size={15} color="var(--color-text-light)" />}
          </button>
        )}
      </div>

      <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-warm-2)', marginBottom: 6, lineHeight: 1.4 }}>
        „{s.question(personName)}"
      </p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
        {s.explanation}
      </p>

      {isOwner && (
        <>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Schreibe deine Gedanken, Gebete oder Erkenntnisse…"
            rows={4}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', resize: 'vertical', display: 'block' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={handleSave}
              disabled={!note.trim() || saving}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: note.trim() ? 'var(--color-warm-1)' : 'var(--color-text-light)', cursor: note.trim() ? 'pointer' : 'default' }}
            >
              {saving ? 'Gespeichert ✓' : 'Speichern'}
            </button>
            <button
              onClick={handleComplete}
              disabled={!note.trim() || completing}
              style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: note.trim() ? 'var(--color-gold)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: note.trim() ? 'pointer' : 'default' }}
            >
              {completing ? 'Wird abgeschlossen…' : `Stufe ${stage} abschließen ✓`}
            </button>
          </div>
        </>
      )}

      {!isOwner && entry?.note && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', fontStyle: 'italic', backgroundColor: 'var(--color-white)', borderRadius: 10, padding: 10 }}>
          {entry.note}
        </p>
      )}
    </div>
  )
}

function CompletedStageRow({ stage, entry, isOwner, onSaveNote }) {
  const s = STAGES[stage - 1]
  const [expanded, setExpanded] = useState(false)
  const [editNote, setEditNote] = useState(entry?.note || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const date = entry?.completed_at ? new Date(entry.completed_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''

  async function handleSaveNote() {
    setSaving(true)
    await onSaveNote(stage, editNote, entry?.is_public !== false)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-warm-3)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: 'none', background: 'var(--color-warm-4)', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={11} color="white" strokeWidth={3} />
          </div>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
            Stufe {stage} – {s.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>{date}</span>
          {expanded ? <ChevronUp size={14} color="var(--color-text-muted)" /> : <ChevronDown size={14} color="var(--color-text-muted)" />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-white)' }}>
          {editing ? (
            <>
              <textarea
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', resize: 'vertical', display: 'block' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={handleSaveNote} disabled={saving} style={{ flex: 2, padding: '8px 0', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, cursor: 'pointer' }}>Speichern</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: isOwner ? 8 : 0 }}>
                {entry?.note || '(Keine Notiz)'}
              </p>
              {isOwner && (
                <button onClick={() => setEditing(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)' }}>
                  Notiz bearbeiten
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function ImpactMapSection({ personId, isOwner, personName, onStageCompleted }) {
  const { entries, loading, currentStage, isAllDone, getEntry, getStageStatus, saveNote, completeStage } = useImpactMap(personId)
  const { showToast } = useToast()
  const [showConfetti, setShowConfetti] = useState(false)

  const stageStatuses = Object.fromEntries([1,2,3,4,5,6].map(n => [n, getStageStatus(n)]))

  async function handleComplete(stage, note, isPublic) {
    try {
      const result = await completeStage(stage, note, isPublic)
      onStageCompleted?.(result.nextImpactStage)
      if (stage === 6) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3500)
        showToast(`🎉 Du hast alle Stufen für ${personName} abgeschlossen!`)
      } else {
        showToast(`Stufe ${stage} abgeschlossen! Weiter zu Stufe ${stage + 1}.`)
      }
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleSaveNote(stage, note, isPublic) {
    try {
      await saveNote(stage, note, isPublic)
      showToast('Notiz gespeichert')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Confetti show={showConfetti} />
      <h4 style={{ ...sectionTitle, marginBottom: 14 }}>Impact Map</h4>

      {loading ? (
        <div style={skeleton} />
      ) : (
        <>
          <StepIndicator stageStatuses={stageStatuses} currentStage={currentStage} />

          {isAllDone && (
            <div style={{ textAlign: 'center', padding: '12px 0', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-accent)', fontStyle: 'italic' }}>
              🌿 Alle Stufen für {personName} abgeschlossen!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Abgeschlossene Stufen */}
            {[1,2,3,4,5,6].filter(n => getStageStatus(n) === 'done').map(n => (
              <CompletedStageRow
                key={n} stage={n} entry={getEntry(n)}
                isOwner={isOwner} onSaveNote={handleSaveNote}
              />
            ))}

            {/* Aktive Stufe */}
            {currentStage && (
              <ActiveStageCard
                stage={currentStage} entry={getEntry(currentStage)}
                isOwner={isOwner} onSave={handleSaveNote} onComplete={handleComplete}
                personName={personName}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }
const skeleton = { height: 80, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }
