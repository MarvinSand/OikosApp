import { useState, useEffect } from 'react'
import { Plus, Lock, Globe } from 'lucide-react'
import { usePrayerRequests } from '../../hooks/usePrayerRequests'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import PrayerCardList from '../prayer/PrayerCardList'
import { normalizePrayer, KIND_OIKOS } from '../../lib/prayerModel'

// ─── AddRequestForm ───────────────────────────────────────────
function AddRequestForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), description: description.trim() || null, is_public: isPublic })
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px', border: '1.5px solid var(--color-accent)' }}>
      <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel des Anliegens *" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSave()} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beschreibung (optional)" rows={2} style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button onClick={() => setIsPublic(!isPublic)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {isPublic ? <Globe size={13} color="var(--color-accent)" /> : <Lock size={13} />}
          {isPublic ? 'Öffentlich' : 'Privat'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ ...smallBtn, backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Abbrechen</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{ ...smallBtn, backgroundColor: title.trim() ? 'var(--color-accent)' : 'var(--color-border)', color: '#fff', border: 'none' }}>Speichern</button>
        </div>
      </div>
    </div>
  )
}

const FILTER_OPTIONS = [
  { value: 'alle', label: 'Alle' },
  { value: 'offen', label: 'Offen' },
  { value: 'erhoert', label: 'Erhört' },
  { value: 'privat', label: 'Privat' },
  { value: 'oeffentlich', label: 'Öffentlich' },
]

// ─── PrayerRequestsSection ────────────────────────────────────
// Gebetsanliegen einer Oikos-Person. Rendert die gemeinsame Gebets-Karte
// (components/prayer/PrayerCard) – dasselbe Design wie im For-You-Feed und in
// Communities.
export default function PrayerRequestsSection({ personId, isOwner }) {
  const { user } = useAuth()
  const { requests, loading, addRequest, reload } = usePrayerRequests(personId)
  const { showToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [ownLastPrayedMap, setOwnLastPrayedMap] = useState({})
  const [globalLastPrayedMap, setGlobalLastPrayedMap] = useState({})
  const [personStats, setPersonStats] = useState({ people: 0, prayers: 0 })
  const [filterMode, setFilterMode] = useState('alle')
  const [sortMode, setSortMode] = useState('standard')

  const reqIds = requests.map(r => r.id).join(',')
  useEffect(() => {
    if (!requests.length || !user) return
    loadPrayerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqIds, user?.id])

  // Ein Rutsch für alle Gebets-Logs dieser Person: eigenes letztes Gebet pro
  // Anliegen, letztes Gebet von irgendjemandem pro Anliegen (für die
  // "am längsten nicht gebetet"-Sortierung) und die Gesamtstatistik.
  async function loadPrayerData() {
    const ids = requests.map(r => r.id)
    const { data } = await supabase
      .from('prayer_logs')
      .select('prayer_request_id, user_id, created_at')
      .in('prayer_request_id', ids)
      .order('created_at', { ascending: false })
    const rows = data || []

    const ownMap = {}
    const globalMap = {}
    for (const row of rows) {
      if (!globalMap[row.prayer_request_id]) globalMap[row.prayer_request_id] = row.created_at
      if (row.user_id === user.id && !ownMap[row.prayer_request_id]) ownMap[row.prayer_request_id] = row.created_at
    }
    setOwnLastPrayedMap(ownMap)
    setGlobalLastPrayedMap(globalMap)
    setPersonStats({
      people: new Set(rows.map(r => r.user_id)).size,
      prayers: rows.length,
    })
  }

  async function handleAdd(data) {
    try {
      await addRequest(data)
      setShowAddForm(false)
      showToast('Anliegen hinzugefügt')
      // Server-Stand nachladen, damit das Anliegen sicher persistiert ist
      reload()
    } catch (err) {
      // Echten Fehler (z.B. RLS-Ablehnung) in der Konsole sichtbar machen.
      console.error('[PrayerRequestsSection] Anliegen speichern fehlgeschlagen:', err)
      const msg = err?.message ? `Fehler beim Speichern: ${err.message}` : 'Fehler beim Speichern'
      showToast(msg, 'error')
    }
  }

  function matchesFilter(r) {
    if (filterMode === 'offen') return !r.is_answered
    if (filterMode === 'erhoert') return r.is_answered
    if (filterMode === 'privat') return r.is_public === false
    if (filterMode === 'oeffentlich') return r.is_public === true
    return true
  }
  function compareBySort(a, b) {
    if (sortMode === 'aeltestes') return new Date(a.created_at) - new Date(b.created_at)
    const map = sortMode === 'laengste_pause' ? globalLastPrayedMap : ownLastPrayedMap
    const la = map[a.id], lb = map[b.id]
    if (!la && !lb) return 0
    if (!la) return -1
    if (!lb) return 1
    return new Date(la) - new Date(lb)
  }
  const pinnedFirst = arr => [...arr.filter(r => r.is_pinned), ...arr.filter(r => !r.is_pinned)]
  const sorted = requests.filter(matchesFilter).sort(compareBySort)
  const active = pinnedFirst(sorted.filter(r => !r.is_answered)).map(r => normalizePrayer(r, { kind: KIND_OIKOS }))
  const answered = pinnedFirst(sorted.filter(r => r.is_answered)).map(r => normalizePrayer(r, { kind: KIND_OIKOS }))

  function handleChanged() {
    reload()
    loadPrayerData()
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={sectionHeader}>
        <h4 style={sectionTitle}>Gebetsanliegen</h4>
        {isOwner && !showAddForm && (
          <button onClick={() => setShowAddForm(true)} style={addBtn}>
            <Plus size={13} /> Hinzufügen
          </button>
        )}
      </div>

      {!loading && requests.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={statChip}>
            🙏 <strong>{personStats.people}</strong> {personStats.people === 1 ? 'Person hat' : 'Personen haben'} gebetet
          </div>
          <div style={statChip}>
            📿 <strong>{personStats.prayers}</strong> {personStats.prayers === 1 ? 'Gebet' : 'Gebete'} insgesamt
          </div>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterMode(opt.value)}
                style={{
                  ...filterChip,
                  backgroundColor: filterMode === opt.value ? 'var(--color-accent)' : 'transparent',
                  color: filterMode === opt.value ? '#fff' : 'var(--color-text-secondary)',
                  borderColor: filterMode === opt.value ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select value={sortMode} onChange={e => setSortMode(e.target.value)} style={sortSelect}>
            <option value="standard">Sortierung: Standard</option>
            <option value="laengste_pause">Am längsten nicht gebetet</option>
            <option value="aeltestes">Ältestes Anliegen zuerst</option>
          </select>
        </div>
      )}

      {loading ? (
        <div style={skeleton} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrayerCardList prayers={active} onChanged={handleChanged} showContext={false} />

          {showAddForm && (
            <AddRequestForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
          )}

          {answered.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginBottom: 8 }}>Erhört ✓</p>
              <PrayerCardList prayers={answered} onChanged={handleChanged} showContext={false} />
            </div>
          )}

          {requests.length === 0 && !showAddForm && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              {isOwner ? 'Füge dein erstes Gebetsanliegen hinzu.' : 'Noch keine öffentlichen Anliegen.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', display: 'block' }
const smallBtn = { padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500 }
const sectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }
const addBtn = { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-accent-dark)', cursor: 'pointer' }
const statChip = { flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 10, backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-secondary)' }
const filterChip = { padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-border)', fontFamily: 'Lora, serif', fontSize: 11.5, cursor: 'pointer', transition: 'all 0.15s' }
const sortSelect = { marginLeft: 'auto', padding: '5px 8px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 11.5, color: 'var(--color-text-secondary)' }
const skeleton = { height: 60, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }
