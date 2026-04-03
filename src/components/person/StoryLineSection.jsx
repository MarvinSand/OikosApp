import { useState, useEffect } from 'react'
import { Plus, MoreVertical, Globe, Lock, Pencil, Trash2 } from 'lucide-react'
import { useStoryLine } from '../../hooks/useStoryLine'
import { useToast } from '../../context/ToastContext'

function formatEntryDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  if (dateStr === todayStr) return 'Heute'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Gestern'
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Inline Add/Edit Form ─────────────────────────────────────
function EntryForm({ initial, onSave, onCancel }) {
  const [text, setText] = useState(initial?.text || '')
  const [date, setDate] = useState(initial?.entry_date || today())
  const [isPublic, setIsPublic] = useState(initial?.is_public !== false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    await onSave({ text: text.trim(), entry_date: date, is_public: isPublic })
    setSaving(false)
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-white)', borderRadius: 14,
      padding: '14px', border: '1.5px solid var(--color-warm-1)',
      marginLeft: 24,
    }}>
      <input
        className="tour-storyline-date"
        type="date"
        value={date}
        max={today()}
        onChange={e => setDate(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}
      />
      <textarea
        className="tour-storyline-text"
        autoFocus
        value={text}
        onChange={e => setText(e.target.value.slice(0, 600))}
        placeholder="Was erlebt diese Person gerade?"
        rows={3}
        style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', resize: 'vertical', display: 'block', lineHeight: 1.5 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button
          className="tour-storyline-visibility"
          onClick={() => setIsPublic(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', padding: 0 }}
        >
          {isPublic
            ? <><Globe size={13} color="var(--color-accent)" /> Öffentlich</>
            : <><Lock size={13} /> Privat</>}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: text.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'not-allowed' }}
          >
            {saving ? '…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Single Entry Row ─────────────────────────────────────────
function EntryRow({ entry, isOwner, onUpdate, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showFull, setShowFull] = useState(false)

  const text = entry.text || ''
  const isLong = text.length > 200

  async function handleUpdate(updates) {
    await onUpdate(entry.id, updates)
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-accent)', border: '2px solid var(--color-white)', flexShrink: 0, marginTop: 4, zIndex: 1 }} />
        <div style={{ flex: 1, width: 2, backgroundColor: 'var(--color-warm-3)', minHeight: 16 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingLeft: 10, paddingBottom: 18 }}>
        {editing ? (
          <EntryForm
            initial={entry}
            onSave={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-accent-dark)' }}>
                  {formatEntryDate(entry.entry_date)}
                </span>
                {!entry.is_public && isOwner && (
                  <Lock size={10} color="var(--color-text-light)" />
                )}
              </div>
              {isOwner && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--color-text-light)', borderRadius: 6 }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showMenu && (
                    <>
                      <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                      <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.14)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 150 }}>
                        <button
                          onClick={() => { setShowMenu(false); setEditing(true) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)' }}
                        >
                          <Pencil size={12} /> Bearbeiten
                        </button>
                        <button
                          onClick={() => { setShowMenu(false); onUpdate(entry.id, { is_public: !entry.is_public }) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)' }}
                        >
                          {entry.is_public ? <><Lock size={12} /> Privat machen</> : <><Globe size={12} /> Öffentlich machen</>}
                        </button>
                        <button
                          onClick={() => { setShowMenu(false); onDelete(entry.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: '#C0392B', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <Trash2 size={12} /> Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <p style={{
              fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, margin: 0,
              display: '-webkit-box', WebkitLineClamp: showFull ? 'unset' : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {text}
            </p>
            {isLong && !showFull && (
              <button onClick={() => setShowFull(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', padding: '4px 0 0', fontStyle: 'italic' }}>
                Mehr lesen…
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── StoryLineSection ─────────────────────────────────────────
export default function StoryLineSection({ personId, isOwner }) {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useStoryLine(personId)
  const { showToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Tutorial can close the add form remotely
  useEffect(() => {
    const handler = () => setShowAddForm(false)
    window.addEventListener('tour-close-storyline-form', handler)
    return () => window.removeEventListener('tour-close-storyline-form', handler)
  }, [])

  const visible = showAll ? entries : entries.slice(0, 3)
  const hasMore = entries.length > 3

  async function handleAdd(data) {
    try {
      await addEntry(data)
      setShowAddForm(false)
      showToast('Eintrag hinzugefügt ✓')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eintrag wirklich löschen?')) return
    await deleteEntry(id)
    showToast('Eintrag gelöscht')
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h4 style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          📖 Story-Line
        </h4>
        {isOwner && !showAddForm && (
          <button
            className="tour-storyline-add"
            onClick={() => setShowAddForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer' }}
          >
            <Plus size={13} /> Eintrag
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Inline add form at top */}
          {showAddForm && (
            <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', border: '2px solid var(--color-white)', flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, width: 2, backgroundColor: 'var(--color-warm-3)', minHeight: 16 }} />
              </div>
              <div style={{ flex: 1, paddingLeft: 10, paddingBottom: 18 }}>
                <EntryForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
              </div>
            </div>
          )}

          {/* Entries */}
          {visible.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              isOwner={isOwner}
              onUpdate={updateEntry}
              onDelete={handleDelete}
            />
          ))}

          {/* Expand button */}
          {hasMore && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', padding: '8px 0', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 500, textAlign: 'center', paddingLeft: 24 }}
            >
              {showAll ? 'Weniger anzeigen ↑' : `Alle ${entries.length} Einträge anzeigen ↓`}
            </button>
          )}

          {/* Empty state */}
          {entries.length === 0 && !showAddForm && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', lineHeight: 1.6, paddingLeft: 24 }}>
              {isOwner
                ? 'Noch keine Einträge. Halte die Lebensgeschichte dieser Person fest.'
                : 'Noch keine öffentlichen Einträge.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
