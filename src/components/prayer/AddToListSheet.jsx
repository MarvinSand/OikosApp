import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { usePrayerLists } from '../../hooks/usePrayerLists'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

function isLightColor(hex) {
  if (!hex || hex[0] !== '#') return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

// Sheet zum Hinzufügen eines Anliegens zu einer Gebetsliste.
// request: das Anliegen (aus dem Feed). Typ wird anhand person_id erkannt.
export default function AddToListSheet({ request, onClose }) {
  const { lists, loading, createList } = usePrayerLists()
  const { showToast } = useToast()
  const [busyId, setBusyId] = useState(null)
  const [done, setDone] = useState([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  // OIKOS-Anliegen (mit person_id) → prayer_request_id, sonst personal_prayer_request_id
  const isOikos = !!request?.person_id
  const idColumn = isOikos ? 'prayer_request_id' : 'personal_prayer_request_id'

  async function addToList(listId) {
    if (busyId || done.includes(listId)) return
    setBusyId(listId)
    try {
      // Doppel-Eintrag vermeiden
      const { data: existing } = await supabase
        .from('prayer_list_items')
        .select('id')
        .eq('list_id', listId)
        .eq(idColumn, request.id)
        .maybeSingle()

      if (existing) {
        setDone(d => [...d, listId])
        showToast('Schon in dieser Liste')
        return
      }

      const { error } = await supabase.from('prayer_list_items').insert({
        list_id: listId,
        [idColumn]: request.id,
      })
      if (error) throw error
      setDone(d => [...d, listId])
      showToast('Zur Liste hinzugefügt ✓')
    } catch {
      showToast('Fehler beim Hinzufügen', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreateAndAdd() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const list = await createList({ name: newName.trim() })
      setNewName('')
      await addToList(list.id)
    } catch {
      showToast('Fehler beim Erstellen', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Zu Liste hinzufügen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {request?.title && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            „{request.title}“
          </p>
        )}

        {/* Neue Liste */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Neue Liste erstellen…"
            style={{ flex: 1, padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
          />
          <button
            onClick={handleCreateAndAdd}
            disabled={!newName.trim() || creating}
            style={{
              width: 46, borderRadius: 12, flexShrink: 0, border: 'none',
              backgroundColor: newName.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
              color: 'var(--color-bg)', cursor: newName.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Listen */}
        {loading && <div style={{ height: 56, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />}

        {!loading && lists.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0', margin: 0 }}>
            Noch keine Liste – erstelle oben deine erste.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lists.map(l => {
            const added = done.includes(l.id)
            return (
              <button
                key={l.id}
                onClick={() => addToList(l.id)}
                disabled={busyId === l.id || added}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px',
                  borderRadius: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                  cursor: added ? 'default' : 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0, fontSize: 19,
                  backgroundColor: l.color || 'var(--color-bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isLightColor(l.color) ? '#2C2416' : '#fff',
                }}>
                  {l.icon || '🙏'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.name}
                  </p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    {l.itemCount} Anliegen
                  </p>
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: added ? 'var(--color-accent)' : 'transparent',
                  border: added ? 'none' : '1.5px solid var(--color-border)',
                  color: '#fff',
                }}>
                  {added ? <Check size={15} /> : <Plus size={15} color="var(--color-text-muted)" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
