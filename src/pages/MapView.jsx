import { useState, useEffect } from 'react'
import { Plus, ChevronDown, SlidersHorizontal, Layers, X, Link, Filter, MapPin, User, HandHeart } from 'lucide-react' // eslint-disable-line no-unused-vars
import { useAuth } from '../hooks/useAuth'
import { useOikosMaps } from '../hooks/useOikosMaps'
import { usePlaces } from '../hooks/usePlaces'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'
import MapCanvas from '../components/map/MapCanvas'
import NewMapModal from '../components/map/NewMapModal'
import AddPersonModal from '../components/map/AddPersonModal'
import PersonDetailSheet from '../components/map/PersonDetailSheet'
import MapSettingsSheet from '../components/map/MapSettingsSheet'
import OverlayPersonSheet from '../components/map/OverlayPersonSheet'
import PlaceDetailSheet, { AddPlaceSheet } from '../components/map/PlaceDetailSheet'
import WorldMapView from '../components/worldmap/WorldMapView'

// ─── Farb-Filter Panel ───────────────────────────────────────
const COLOR_FILTER_OPTIONS = [
  { label: 'Grün', hex: '#66BB6A' },
  { label: 'Rot', hex: '#EF5350' },
  { label: 'Blau', hex: '#42A5F5' },
  { label: 'Orange', hex: '#FFA726' },
  { label: 'Gelb', hex: '#FFEE58' },
  { label: 'Lila', hex: '#AB47BC' },
  { label: 'Pink', hex: '#EC407A' },
  { label: 'Standard', hex: '#E8E4DC' },
]

function ColorFilterPanel({ hiddenColors, onToggle, onShowAll, onClose }) {
  const allVisible = hiddenColors.size === 0
  return (
    <div style={{
      position: 'absolute',
      top: 112, right: 16,
      width: 200,
      backgroundColor: 'var(--color-white)',
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(58,46,36,0.15)',
      border: '1px solid var(--color-warm-3)',
      zIndex: 30,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          Nach Farbe filtern
        </p>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-light)', display: 'flex' }}>
          <X size={15} />
        </button>
      </div>

      {/* Alle einblenden */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-warm-3)', marginBottom: 6, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={allVisible}
          onChange={onShowAll}
          style={{ accentColor: 'var(--color-warm-1)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          Alle einblenden
        </span>
      </label>

      {COLOR_FILTER_OPTIONS.map(c => {
        const isVisible = !hiddenColors.has(c.hex)
        return (
          <label key={c.hex} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => onToggle(c.hex)}
              style={{ accentColor: 'var(--color-warm-1)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
            />
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: c.hex, border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)' }}>
              {c.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ─── Generationen-Ansicht Panel ───────────────────────────────
function GenerationenPanel({ persons, onUpdateOverlay, onClose }) {
  const [busyIds, setBusyIds] = useState(new Set())
  // { [personId]: { maps: [{id, name}], loading: bool } }
  const [personMaps, setPersonMaps] = useState({})

  // Pre-load maps for persons that are already enabled when panel opens
  useEffect(() => {
    persons.forEach(async (p) => {
      if (!p.overlay_map_ids?.length || !p.linked_user_id) return
      setPersonMaps(prev => ({ ...prev, [p.id]: { maps: [], loading: true } }))
      const { data } = await supabase
        .from('oikos_maps')
        .select('id, name')
        .eq('user_id', p.linked_user_id)
        .neq('visibility', 'private')
      setPersonMaps(prev => ({ ...prev, [p.id]: { maps: data || [], loading: false } }))
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMapsForPerson(person) {
    setPersonMaps(prev => ({ ...prev, [person.id]: { maps: prev[person.id]?.maps || [], loading: true } }))
    const { data } = await supabase
      .from('oikos_maps')
      .select('id, name')
      .eq('user_id', person.linked_user_id)
      .neq('visibility', 'private')
    const maps = data || []
    setPersonMaps(prev => ({ ...prev, [person.id]: { maps, loading: false } }))
    return maps
  }

  async function toggleOverlay(person) {
    const isOn = person.overlay_map_ids?.length > 0
    setBusyIds(prev => new Set([...prev, person.id]))
    if (isOn) {
      await onUpdateOverlay(person.id, {
        overlay_map_ids: [],
        overlay_show_christian: true,
        overlay_show_non_christian: true,
      })
    } else {
      const maps = personMaps[person.id]?.maps ?? await loadMapsForPerson(person)
      await onUpdateOverlay(person.id, {
        overlay_map_ids: maps.map(m => m.id),
        overlay_show_christian: true,
        overlay_show_non_christian: true,
      })
    }
    setBusyIds(prev => { const s = new Set(prev); s.delete(person.id); return s })
  }

  async function toggleMap(person, mapId) {
    const currentIds = person.overlay_map_ids || []
    const nextIds = currentIds.includes(mapId)
      ? currentIds.filter(id => id !== mapId)
      : [...currentIds, mapId]
    await onUpdateOverlay(person.id, {
      overlay_map_ids: nextIds,
      overlay_show_christian: true,
      overlay_show_non_christian: true,
    })
  }

  async function allOn() {
    for (const p of persons) {
      if (!p.overlay_map_ids?.length) {
        const maps = personMaps[p.id]?.maps ?? await loadMapsForPerson(p)
        await onUpdateOverlay(p.id, {
          overlay_map_ids: maps.map(m => m.id),
          overlay_show_christian: true,
          overlay_show_non_christian: true,
        })
      }
    }
  }

  async function allOff() {
    for (const p of persons) {
      if (p.overlay_map_ids?.length) {
        await onUpdateOverlay(p.id, {
          overlay_map_ids: [],
          overlay_show_christian: true,
          overlay_show_non_christian: true,
        })
      }
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 112, right: 16,
      width: 264,
      backgroundColor: 'var(--color-white)',
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(58,46,36,0.15)',
      border: '1px solid var(--color-warm-3)',
      zIndex: 30,
      padding: '12px 14px',
      maxHeight: 'calc(100% - 90px)',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          Generationen-Ansicht
        </p>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-light)', display: 'flex' }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={allOn} style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-warm-1)', cursor: 'pointer' }}>
          Alle ein
        </button>
        <button onClick={allOff} style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
          Alle aus
        </button>
      </div>

      {persons.length === 0 && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0', margin: 0 }}>
          Noch keine verknüpften Personen.
        </p>
      )}

      {persons.map(person => {
        const isOn = person.overlay_map_ids?.length > 0
        const maps = personMaps[person.id]?.maps || []
        const loadingMaps = personMaps[person.id]?.loading
        return (
          <div key={person.id} style={{ borderBottom: '1px solid var(--color-warm-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => !busyIds.has(person.id) && toggleOverlay(person)}
                style={{ accentColor: 'var(--color-warm-1)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {person.name}
              </span>
            </div>
            {isOn && (
              <div style={{ paddingLeft: 23, paddingBottom: 6 }}>
                {loadingMaps ? (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0' }}>…</p>
                ) : maps.length === 0 ? (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '2px 0' }}>Keine Maps verfügbar</p>
                ) : (
                  maps.map(map => (
                    <label key={map.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={person.overlay_map_ids?.includes(map.id) ?? false}
                        onChange={() => toggleMap(person, map.id)}
                        style={{ accentColor: 'var(--color-warm-1)', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {map.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MapView({ hideWorldMapToggle = false, initialMapId = null } = {}) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('oikos')
  const { user } = useAuth()
  const {
    maps, setMaps, activeMapId, setActiveMapId, activeMap,
    people, connections, overlayData, loading,
    createMap, updateMap, deleteMap, addPerson, setPersonSecondary, updatePerson, deletePerson,
    movePersonPosition, createConnection, deleteConnection, updateConnectionColor,
    linkAccount, unlinkAccount, updatePersonOverlay, reloadMap,
  } = useOikosMaps()

  const { places, placeConnections, createPlace, updatePlace, deletePlace, connectPerson: connectPlacePerson, disconnectPerson: disconnectPlacePerson, movePlacePosition } = usePlaces(activeMapId)

  const [showMapMenu, setShowMapMenu] = useState(false)
  const [showNewMap, setShowNewMap] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGenerationen, setShowGenerationen] = useState(false)
  const [showColorFilter, setShowColorFilter] = useState(false)
  const [hiddenColors, setHiddenColors] = useState(new Set())
  const [connectionMode, setConnectionMode] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedOverlayPerson, setSelectedOverlayPerson] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  // linkedProfile cache: { [userId]: profile }
  const [linkedProfiles, setLinkedProfiles] = useState({})
  const [searchParams, setSearchParams] = useSearchParams()

  // Gebetsmodus für die Personen dieser Map
  const [mapPrayerItems, setMapPrayerItems] = useState(null)
  const [loadingPrayerMode, setLoadingPrayerMode] = useState(false)

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Du'

  async function startMapPrayerMode() {
    if (loadingPrayerMode) return
    const ids = people.map(p => p.id).filter(Boolean)
    if (ids.length === 0) { showToast('Diese Map hat noch keine Personen'); return }
    setLoadingPrayerMode(true)
    try {
      // Ohne Profil-Embed laden – ein nicht auflösbarer Join würde sonst die
      // ganze Abfrage scheitern lassen ("Keine offenen Gebete" trotz vorhandener).
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .in('person_id', ids)
        .eq('owner_id', user.id)
        .eq('is_answered', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      // Name der betreffenden Person als Anzeige-Label anhängen.
      const nameById = Object.fromEntries(people.map(p => [p.id, p.name]))
      const items = (data || []).map(r => ({
        type: 'oikos',
        request: { ...r, profiles: { full_name: nameById[r.person_id] || 'Person' } },
        ampel: null,
      }))
      if (items.length === 0) { showToast('Keine offenen Gebete in dieser Map'); return }
      setMapPrayerItems(items)
    } catch {
      showToast('Fehler beim Laden', 'error')
    } finally {
      setLoadingPrayerMode(false)
    }
  }

  useEffect(() => {
    if (initialMapId && maps.length > 0) {
      const found = maps.find(m => m.id === initialMapId)
      if (found) setActiveMapId(initialMapId)
    }
  }, [initialMapId, maps.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load linked profiles whenever people changes
  useEffect(() => {
    const linkedIds = people
      .filter(p => p.linked_user_id)
      .map(p => p.linked_user_id)
      .filter(id => !linkedProfiles[id])

    if (linkedIds.length === 0) return

    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, bio_text, bio, city, country, church_name, show_bio, show_city, show_church, latitude, longitude')
      .in('id', linkedIds)
      .then(({ data }) => {
        if (!data) return
        setLinkedProfiles(prev => {
          const next = { ...prev }
          data.forEach(profile => { next[profile.id] = profile })
          return next
        })
      })
  }, [people])

  // Deep-link: ?openPerson=PERSON_ID → open that person's sheet
  useEffect(() => {
    const personId = searchParams.get('openPerson')
    if (!personId || !people.length) return
    const person = people.find(p => p.id === personId)
    if (person) {
      setSelectedPerson(person)
      // Remove the param so refreshing doesn't re-open
      setSearchParams(prev => { prev.delete('openPerson'); return prev }, { replace: true })
    }
  }, [searchParams, people])

  // Keep selectedPerson in sync with people state (e.g. after updates)
  useEffect(() => {
    if (!selectedPerson) return
    const updated = people.find(p => p.id === selectedPerson.id)
    if (updated) setSelectedPerson(updated)
  }, [people])

  const selectedLinkedProfile = selectedPerson?.linked_user_id
    ? linkedProfiles[selectedPerson.linked_user_id] || null
    : null

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-warm-3)', borderTopColor: 'var(--color-warm-1)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-bg relative overflow-hidden" style={{ overscrollBehavior: 'none' }}>

      {/* Tab Toggle (only shown when not embedded inside Home) */}
      {!hideWorldMapToggle && (
        <>
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', background: 'var(--color-bg)', borderRadius: 12, padding: 3, border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setActiveTab('oikos')}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: activeTab === 'oikos' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'oikos' ? '#fff' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: activeTab === 'oikos' ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Mein OIKOS
            </button>
            <button
              onClick={() => setActiveTab('world')}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: activeTab === 'world' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'world' ? '#fff' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: activeTab === 'world' ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Weltkarte
            </button>
          </div>

          {activeTab === 'world' && (
            <div style={{ position: 'absolute', inset: 0, paddingTop: 0, zIndex: 10 }}>
              <WorldMapView onNavigateToProfile={() => navigate('/profile')} />
            </div>
          )}
        </>
      )}

      {/* Header Island (OIKOS mode only) */}
      <div className="absolute top-[54px] sm:top-[54px] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-[calc(100%-2rem)] md:max-w-2xl bg-paper/90 backdrop-blur-md border border-warm-3 px-4 py-2.5 flex items-center justify-between z-20 shadow-glass rounded-2xl" style={{ display: activeTab === 'oikos' ? undefined : 'none' }}>
        <button
          onClick={() => setShowMapMenu(!showMapMenu)}
          className="flex items-center gap-2 border-none bg-transparent cursor-pointer font-serif text-[16px] font-semibold text-dark rounded-lg max-w-[65%] hover:opacity-80 transition-opacity"
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {activeMap?.name || 'Meine Oikos Map'}
          </span>
          <ChevronDown size={18} className="text-dark-muted shrink-0" />
        </button>

        {activeMap && (
          <div className="flex gap-1 items-center">
            <button
              onClick={() => setConnectionMode(v => !v)}
              title="Verbindungsmodus"
              className={`p-1 rounded-full transition-colors flex items-center ${connectionMode ? 'text-warm-1 bg-warm-1/10' : 'text-dark-muted hover:bg-black/5'}`}
            >
              <Link size={18} />
            </button>
            <button
              onClick={() => setShowColorFilter(v => !v)}
              title="Nach Farbe filtern"
              className={`p-1 rounded-full transition-colors flex items-center ${showColorFilter || hiddenColors.size > 0 ? 'text-warm-1 bg-warm-1/10' : 'text-dark-muted hover:bg-black/5'}`}
            >
              <Filter size={18} />
            </button>
            <button
              onClick={() => setShowGenerationen(v => !v)}
              title="Generationen-Ansicht"
              className={`p-1 rounded-full transition-colors flex items-center ${showGenerationen ? 'text-warm-1 bg-warm-1/10' : 'text-dark-muted hover:bg-black/5'}`}
            >
              <Layers size={18} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1 bg-warm-1 hover:bg-warm-1/90 text-bg border-none rounded-xl px-3 py-1.5 font-serif text-[13px] font-medium cursor-pointer shrink-0 shadow-sm transition-all active:scale-95"
              >
                <Plus size={15} /> Hinzufügen
              </button>
              {showAddMenu && (
                <>
                  <div onClick={() => setShowAddMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div className="absolute right-0 top-full mt-1 bg-paper rounded-xl shadow-glass border border-warm-3 overflow-hidden z-20 min-w-[160px]">
                    <button
                      onClick={() => { setShowAddMenu(false); setShowAddPerson(true) }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 border-none bg-transparent hover:bg-warm-4 font-serif text-[13px] text-dark font-medium cursor-pointer text-left transition-colors"
                    >
                      <User size={14} className="text-warm-1" /> Person hinzufügen
                    </button>
                    <div className="h-px bg-warm-3" />
                    <button
                      onClick={() => { setShowAddMenu(false); setShowAddPlace(true) }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 border-none bg-transparent hover:bg-warm-4 font-serif text-[13px] text-dark font-medium cursor-pointer text-left transition-colors"
                    >
                      <MapPin size={14} className="text-warm-1" /> Ort hinzufügen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gebetsmodus-Button (babyblau, unter der Menübar) */}
      {activeTab === 'oikos' && activeMap && (
        <button
          onClick={startMapPrayerMode}
          disabled={loadingPrayerMode}
          aria-label="Gebetsmodus starten"
          className="absolute top-[104px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border-none px-4 py-2 font-serif text-[13px] font-semibold text-white cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: '#5AC8FA' }}
        >
          <HandHeart size={16} /> {loadingPrayerMode ? 'Lädt…' : 'Gebetsmodus'}
        </button>
      )}

      {/* Dropdown-Menü für Map-Auswahl */}
      {showMapMenu && activeTab === 'oikos' && (
        <>
          <div onClick={() => setShowMapMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div className="absolute top-[110px] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-[calc(100%-2rem)] md:max-w-2xl bg-paper rounded-2xl z-30 shadow-glass border border-warm-3 overflow-hidden">
            {maps.map((m) => (
              <button
                key={m.id}
                onClick={() => { setActiveMapId(m.id); setShowMapMenu(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left',
                  padding: '13px 16px',
                  border: 'none',
                  background: m.id === activeMapId ? 'var(--color-warm-4)' : 'transparent',
                  fontFamily: 'Lora, serif', fontSize: 15,
                  color: m.id === activeMapId ? 'var(--color-warm-1)' : 'var(--color-text)',
                  fontWeight: m.id === activeMapId ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <span>{m.name}</span>
                {m.is_public && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-light)' }}>öffentlich</span>
                )}
              </button>
            ))}
              <div className="border border-warm-3 border-t-0 bg-warm-5 flex">
                <button
                  onClick={() => { setShowMapMenu(false); setShowSettings(true) }}
                  className="flex-1 py-3 border-none bg-transparent hover:bg-black/5 font-serif text-[13px] text-dark-muted font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <SlidersHorizontal size={13} /> Einstellungen
                </button>
                <div className="w-[1px] bg-warm-3" />
                <button
                  onClick={() => { setShowMapMenu(false); setShowNewMap(true) }}
                  className="flex-1 py-3 border-none bg-transparent hover:bg-black/5 font-serif text-[13px] text-warm-1 font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Neue Map
                </button>
              </div>
          </div>
        </>
      )}

      {/* Canvas (OIKOS mode only) */}
      <div style={{ flex: 1, minHeight: 0, display: activeTab === 'oikos' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', padding: 8, overflow: 'hidden', position: 'relative', touchAction: 'none', overscrollBehavior: 'none' }}>
        {!activeMap ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 17, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 24, lineHeight: 1.6 }}>
              Du hast noch keine Oikos Map.
            </p>
            <button
              onClick={() => setShowNewMap(true)}
              style={{
                backgroundColor: 'var(--color-warm-1)', color: 'var(--color-white)',
                border: 'none', borderRadius: 14, padding: '14px 32px',
                fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Erste Map erstellen
            </button>
          </div>
        ) : (
          <>
            <MapCanvas
              userName={userName}
              people={people}
              connections={connections}
              overlayData={overlayData}
              places={places}
              placeConnections={placeConnections}
              onPersonClick={setSelectedPerson}
              onPersonMoved={(personId, x, y) => movePersonPosition(personId, x, y)}
              onCreateConnection={(sourceId, targetId, label) => createConnection(sourceId, targetId, label)}
              onOverlayPersonClick={setSelectedOverlayPerson}
              connectionMode={connectionMode}
              onConnectionColorChange={updateConnectionColor}
              onDeleteConnection={deleteConnection}
              onAddConnectedPerson={async (name, connectedToPersonId) => {
                const newPerson = await addPerson(name, true)
                await createConnection(newPerson.id, connectedToPersonId, null)
                return newPerson
              }}
              onCenterLineColorChange={(personId, color) => updatePerson(personId, { center_line_color: color })}
              onPlaceClick={setSelectedPlace}
              onPlaceMoved={movePlacePosition}
              onConnectPlacePerson={connectPlacePerson}
              onDisconnectPlacePerson={disconnectPlacePerson}
              hiddenColors={hiddenColors}
              ownerDisconnectedIds={new Set(people.filter(p => p.owner_disconnected).map(p => p.id))}
            />
            {showColorFilter && (
              <ColorFilterPanel
                hiddenColors={hiddenColors}
                onToggle={(hex) => setHiddenColors(prev => {
                  const next = new Set(prev)
                  if (next.has(hex)) next.delete(hex)
                  else next.add(hex)
                  return next
                })}
                onShowAll={() => setHiddenColors(new Set())}
                onClose={() => setShowColorFilter(false)}
              />
            )}
            {showGenerationen && (
              <GenerationenPanel
                persons={people.filter(p => p.linked_user_id)}
                onUpdateOverlay={updatePersonOverlay}
                onClose={() => setShowGenerationen(false)}
              />
            )}
          </>
        )}
      </div>

      {/* Modals & Sheets */}
      {showNewMap && (
        <NewMapModal onClose={() => setShowNewMap(false)} onCreate={createMap} />
      )}
      {showSettings && activeMap && (
        <MapSettingsSheet map={activeMap} updateMap={updateMap} deleteMap={deleteMap} onClose={() => setShowSettings(false)} />
      )}
      {showAddPerson && (
        <AddPersonModal onClose={() => setShowAddPerson(false)} onAdd={addPerson} />
      )}
      {selectedOverlayPerson && (
        <OverlayPersonSheet
          person={selectedOverlayPerson}
          onClose={() => setSelectedOverlayPerson(null)}
          hostConnections={connections}
          hostPeople={people}
          hostOverlayData={overlayData}
        />
      )}
      {selectedPerson && (
        <PersonDetailSheet
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onUpdate={(updates) => updatePerson(selectedPerson.id, updates)}
          onDelete={() => { deletePerson(selectedPerson.id); setSelectedPerson(null) }}
          connections={connections}
          people={people}
          overlayData={overlayData}
          mapOwnerName={userName}
          ownerDisconnected={selectedPerson.owner_disconnected ?? false}
          onOwnerDisconnect={() => updatePerson(selectedPerson.id, { owner_disconnected: true })}
          onDeleteConnection={deleteConnection}
          onCreateConnection={createConnection}
          onUpdateConnectionColor={updateConnectionColor}
          onAddConnectedPerson={async (name, connectedToPersonId) => {
            const newPerson = await addPerson(name, true)
            await createConnection(newPerson.id, connectedToPersonId, null)
            return newPerson
          }}
          onSetSecondary={(id, val) => setPersonSecondary(id, val)}
          linkedProfile={selectedLinkedProfile}
          onLinkAccount={(personId, profileId) => {
            linkAccount(personId, profileId)
            supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, bio_text, bio, city, country, church_name, show_bio, show_city, show_church, latitude, longitude')
              .eq('id', profileId)
              .single()
              .then(({ data }) => {
                if (data) setLinkedProfiles(prev => ({ ...prev, [data.id]: data }))
              })
          }}
          onUnlinkAccount={unlinkAccount}
          onUpdateOverlay={updatePersonOverlay}
          placeConnections={placeConnections}
          places={places}
          onDisconnectFromPlace={disconnectPlacePerson}
        />
      )}
      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          people={people}
          placeConnections={placeConnections}
          onClose={() => setSelectedPlace(null)}
          onUpdate={updatePlace}
          onDelete={(id) => { deletePlace(id); setSelectedPlace(null) }}
          onConnectPerson={connectPlacePerson}
          onDisconnectPerson={disconnectPlacePerson}
        />
      )}
      {showAddPlace && (
        <AddPlaceSheet
          onClose={() => setShowAddPlace(false)}
          onCreate={async (opts) => {
            const pl = await createPlace({ ...opts, posX: 0, posY: 0 })
            if (pl) setSelectedPlace(pl)
          }}
        />
      )}

      {/* Gebetsmodus für die Personen dieser Map */}
      {mapPrayerItems && (
        <GuidedPrayerMode
          items={mapPrayerItems}
          onClose={() => setMapPrayerItems(null)}
        />
      )}
    </div>
  )
}
