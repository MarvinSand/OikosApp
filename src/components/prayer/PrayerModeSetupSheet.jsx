import { useState, useEffect } from 'react'
import { X, Globe, UserCheck, Home as HomeIcon, ListChecks, MapPin, Shuffle, ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react'
import { usePrayerLists } from '../../hooks/usePrayerLists'
import { useCommunities } from '../../hooks/useCommunities'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { fetchPrayerModeItems } from '../../hooks/usePrayerModeSource'

const CATEGORIES = [
  { key: 'heilung',    label: 'Heilung',    emoji: '🌿' },
  { key: 'weisheit',   label: 'Weisheit',   emoji: '🕊️' },
  { key: 'erweckung',  label: 'Erweckung',  emoji: '🔥' },
  { key: 'wahrheit',   label: 'Wahrheit',   emoji: '📖' },
  { key: 'liebe',      label: 'Liebe',      emoji: '❤️' },
  { key: 'sonstiges',  label: 'Sonstiges',  emoji: '🙏' },
]

const SOURCES = [
  { key: 'list',      label: 'Liste',       icon: ListChecks },
  { key: 'oikos',     label: 'Oikos Map',   icon: MapPin },
  { key: 'all',       label: 'Alle Nutzer', icon: Globe },
  { key: 'siblings',  label: 'Geschwister', icon: UserCheck },
  { key: 'community', label: 'Community',   icon: HomeIcon },
]

const SORTS = [
  { key: 'random', label: 'Zufällig',  icon: Shuffle },
  { key: 'newest', label: 'Neueste',   icon: ArrowDownNarrowWide },
  { key: 'oldest', label: 'Älteste',   icon: ArrowUpNarrowWide },
]

// Konfiguration vor dem Start des Gebetsmodus.
// onStart(items): übergibt die geladenen Anliegen zum Durchbeten.
export default function PrayerModeSetupSheet({ onClose, onStart }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { lists } = usePrayerLists()
  const { myCommunities } = useCommunities()

  const [source, setSource] = useState('all')
  const [listId, setListId] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [mapId, setMapId] = useState('')
  const [maps, setMaps] = useState([])
  const [categories, setCategories] = useState([])
  const [sort, setSort] = useState('random')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('oikos_maps').select('id, name').eq('user_id', user.id).order('created_at')
      .then(({ data }) => setMaps(data || []))
  }, [user?.id])

  function toggleCategory(key) {
    setCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
  }

  const canStart =
    !loading &&
    (source !== 'list' || listId) &&
    (source !== 'community' || communityId) &&
    (source !== 'oikos' || mapId)

  async function handleStart() {
    if (!canStart) return
    setLoading(true)
    try {
      const items = await fetchPrayerModeItems({ source, userId: user.id, listId, communityId, mapId: mapId === '__all__' ? null : mapId, categories, sort })
      if (!items.length) {
        showToast('Keine passenden Gebete gefunden', 'error')
        setLoading(false)
        return
      }
      onStart(items)
    } catch {
      showToast('Fehler beim Laden', 'error')
      setLoading(false)
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
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Gebetsmodus</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Quelle */}
        <label style={lbl}>Woraus möchtest du beten?</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {SOURCES.map(s => {
            const Icon = s.icon
            const active = source === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSource(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                  backgroundColor: active ? 'var(--color-warm-4)' : 'var(--color-bg)',
                }}
              >
                <Icon size={16} color={active ? 'var(--color-warm-1)' : 'var(--color-text-muted)'} />
                <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{s.label}</span>
              </button>
            )
          })}
        </div>

        {/* Liste wählen */}
        {source === 'list' && (
          lists.length === 0 ? (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
              Du hast noch keine Gebetsliste.
            </p>
          ) : (
            <select value={listId} onChange={e => setListId(e.target.value)} style={{ ...inp, appearance: 'none', marginBottom: 16 }}>
              <option value="">— Liste auswählen —</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
            </select>
          )
        )}

        {/* Oikos Map wählen */}
        {source === 'oikos' && (
          maps.length === 0 ? (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
              Du hast noch keine Oikos Map.
            </p>
          ) : (
            <select value={mapId} onChange={e => setMapId(e.target.value)} style={{ ...inp, appearance: 'none', marginBottom: 16 }}>
              <option value="">— Map auswählen —</option>
              {maps.length > 1 && <option value="__all__">Alle Maps</option>}
              {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )
        )}

        {/* Community wählen */}
        {source === 'community' && (
          myCommunities.length === 0 ? (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
              Du bist noch in keiner Community.
            </p>
          ) : (
            <select value={communityId} onChange={e => setCommunityId(e.target.value)} style={{ ...inp, appearance: 'none', marginBottom: 16 }}>
              <option value="">— Community auswählen —</option>
              {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )
        )}

        {/* Kategorien */}
        <label style={lbl}>Kategorien (optional)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {CATEGORIES.map(c => {
            const active = categories.includes(c.key)
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCategory(c.key)}
                style={{
                  padding: '7px 11px', borderRadius: 999, cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                  backgroundColor: active ? 'var(--color-warm-4)' : 'var(--color-bg)',
                  fontFamily: 'Lora, serif', fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            )
          })}
        </div>

        {/* Sortierung */}
        <label style={lbl}>Reihenfolge</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {SORTS.map(s => {
            const Icon = s.icon
            const active = sort === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 11, cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                  backgroundColor: active ? 'var(--color-warm-4)' : 'var(--color-bg)',
                  fontFamily: 'Lora, serif', fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                }}
              >
                <Icon size={14} /> {s.label}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            backgroundColor: canStart ? 'var(--color-accent)' : 'var(--color-warm-3)',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Lädt…' : '🙏 Gebetsmodus starten'}
        </button>
      </div>
    </>
  )
}

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
