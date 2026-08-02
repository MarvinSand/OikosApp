import { useState } from 'react'
import { X, Bookmark, Folder, Plus, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useBookmarkCollections } from '../../hooks/useBookmarkCollections'
import { useToast } from '../../context/ToastContext'

// Sheet zum Speichern eines Posts – wie bei Instagram: ohne Kategorie speichern,
// in eine bestehende Sammlung ablegen oder eine neue Sammlung anlegen.
export default function SavePostSheet({ postId, onClose, onSaved }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { collections, createCollection } = useBookmarkCollections()
  const [saving, setSaving] = useState(false)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newName, setNewName] = useState('')

  async function saveTo(collectionId) {
    if (saving) return
    setSaving(true)
    const { error } = await supabase
      .from('feed_bookmarks')
      .upsert({ post_id: postId, user_id: user.id, collection_id: collectionId }, { onConflict: 'post_id,user_id' })
    setSaving(false)
    if (error) {
      showToast('Fehler beim Speichern', 'error')
      return
    }
    showToast('Gespeichert ✓')
    onSaved?.(collectionId)
    onClose()
  }

  async function handleCreateAndSave() {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    const collection = await createCollection(name)
    setSaving(false)
    if (!collection) {
      showToast('Fehler beim Anlegen der Kategorie', 'error')
      return
    }
    saveTo(collection.id)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '75vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Post speichern</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => saveTo(null)}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px solid var(--color-warm-3)', background: 'var(--color-bg)', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bookmark size={16} color="var(--color-accent-dark)" />
            </div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Ohne Kategorie speichern</p>
          </button>

          {collections.map(c => (
            <button
              key={c.id}
              onClick={() => saveTo(c.id)}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px solid var(--color-warm-3)', background: 'var(--color-bg)', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Folder size={16} color="var(--color-warm-1)" />
              </div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0, flex: 1 }}>{c.name}</p>
            </button>
          ))}

          {!showNewCollection ? (
            <button
              onClick={() => setShowNewCollection(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px dashed var(--color-warm-3)', background: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-bg)', border: '1.5px solid var(--color-warm-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={16} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)', margin: 0 }}>Neue Kategorie</p>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateAndSave() }}
                placeholder="Name der Kategorie…"
                style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
              />
              <button
                onClick={handleCreateAndSave}
                disabled={!newName.trim() || saving}
                style={{ width: 44, borderRadius: 12, border: 'none', backgroundColor: newName.trim() ? 'var(--color-accent)' : 'var(--color-warm-3)', color: '#fff', cursor: newName.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Check size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
