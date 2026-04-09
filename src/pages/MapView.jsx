import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown, SlidersHorizontal, Layers, X, Link, Filter, MapPin, User } from 'lucide-react' // eslint-disable-line no-unused-vars
import { useAuth } from '../hooks/useAuth'
import { useOikosMaps } from '../hooks/useOikosMaps'
import { usePlaces } from '../hooks/usePlaces'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'react-router-dom'
import MapCanvas from '../components/map/MapCanvas'
import NewMapModal from '../components/map/NewMapModal'
import AddPersonModal from '../components/map/AddPersonModal'
import PersonDetailSheet from '../components/map/PersonDetailSheet'
import MapSettingsSheet from '../components/map/MapSettingsSheet'
import OverlayPersonSheet from '../components/map/OverlayPersonSheet'
import PlaceDetailSheet, { AddPlaceSheet } from '../components/map/PlaceDetailSheet'

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
      top: 76, right: 16,
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

  async function toggleOverlay(person) {
    const isOn = person.overlay_map_ids?.length > 0
    setBusyIds(prev => new Set([...prev, person.id]))
    if (isOn) {
      await onUpdateOverlay(person.id, {
        overlay_map_ids: [],
        overlay_show_christian: person.overlay_show_christian !== false,
        overlay_show_non_christian: person.overlay_show_non_christian !== false,
      })
    } else {
      const { data: maps } = await supabase
        .from('oikos_maps')
        .select('id')
        .eq('user_id', person.linked_user_id)
        .neq('visibility', 'private')
      await onUpdateOverlay(person.id, {
        overlay_map_ids: (maps || []).map(m => m.id),
        overlay_show_christian: person.overlay_show_christian !== false,
        overlay_show_non_christian: person.overlay_show_non_christian !== false,
      })
    }
    setBusyIds(prev => { const s = new Set(prev); s.delete(person.id); return s })
  }

  async function toggleChristian(person) {
    await onUpdateOverlay(person.id, {
      overlay_map_ids: person.overlay_map_ids || [],
      overlay_show_christian: !(person.overlay_show_christian !== false),
      overlay_show_non_christian: person.overlay_show_non_christian !== false,
    })
  }

  async function toggleNonChristian(person) {
    await onUpdateOverlay(person.id, {
      overlay_map_ids: person.overlay_map_ids || [],
      overlay_show_christian: person.overlay_show_christian !== false,
      overlay_show_non_christian: !(person.overlay_show_non_christian !== false),
    })
  }

  async function allOn() {
    for (const p of persons) {
      if (!p.overlay_map_ids?.length) {
        const { data: maps } = await supabase
          .from('oikos_maps').select('id').eq('user_id', p.linked_user_id).neq('visibility', 'private')
        await onUpdateOverlay(p.id, {
          overlay_map_ids: (maps || []).map(m => m.id),
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
          overlay_show_christian: p.overlay_show_christian !== false,
          overlay_show_non_christian: p.overlay_show_non_christian !== false,
        })
      }
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 76, right: 16,
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
        const showChristian = person.overlay_show_christian !== false
        const showNonChristian = person.overlay_show_non_christian !== false
        return (
          <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => !busyIds.has(person.id) && toggleOverlay(person)}
              style={{ accentColor: 'var(--color-warm-1)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {person.name}
            </span>
            {isOn && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={showChristian}
                    onChange={() => toggleChristian(person)}
                    style={{ accentColor: 'var(--color-accent)', width: 13, height: 13, cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)' }}>Chr.</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={showNonChristian}
                    onChange={() => toggleNonChristian(person)}
                    style={{ accentColor: 'var(--color-warm-1)', width: 13, height: 13, cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text-muted)' }}>And.</span>
                </label>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MapView() {
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
  const [ownerDisconnectedIds, setOwnerDisconnectedIds] = useState(new Set())
  // linkedProfile cache: { [userId]: profile }
  const [linkedProfiles, setLinkedProfiles] = useState({})
  const [searchParams, setSearchParams] = useSearchParams()

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Du'

  // Load linked profiles whenever people changes
  useEffect(() => {
    const linkedIds = people
      .filter(p => p.linked_user_id)
      .map(p => p.linked_user_id)
      .filter(id => !linkedProfiles[id])

    if (linkedIds.length === 0) return

    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
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
    if (selectedPerson.id === 'dummy-tutorial') return
    const updated = people.find(p => p.id === selectedPerson.id)
    if (updated) setSelectedPerson(updated)
  }, [people])

  // Tutorial listener for opening the modal programmatically
  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail?.person) {
        setSelectedPerson(e.detail.person)
      } else if (people && people.length > 0) {
        setSelectedPerson(people[0])
      } else {
        setSelectedPerson({
          id: 'dummy-tutorial',
          name: 'Maria (Beispiel)',
          relationship_type: 'Freund/in',
          is_christian: false,
          impact_stage: 2,
          notes: 'Dies ist ein Beispiel für das Tutorial.',
          user_id: user?.id,
        })
      }
    }
    const handleClose = () => setSelectedPerson(null)

    window.addEventListener('tour-open-person', handleOpen)
    window.addEventListener('tour-close-person', handleClose)
    return () => {
      window.removeEventListener('tour-open-person', handleOpen)
      window.removeEventListener('tour-close-person', handleClose)
    }
  }, [people, user])

  // Tutorial: reload map canvas when a person was created outside of normal flow
  const reloadMapRef = useRef(reloadMap)
  useEffect(() => { reloadMapRef.current = reloadMap }, [reloadMap])
  useEffect(() => {
    const handler = () => reloadMapRef.current?.()
    window.addEventListener('tour-reload-map', handler)
    return () => window.removeEventListener('tour-reload-map', handler)
  }, [])

  // Tutorial: open/close NewMapModal + inject a newly created map into state
  useEffect(() => {
    const openHandler = () => setShowNewMap(true)
    const closeHandler = () => setShowNewMap(false)
    const mapCreatedHandler = (e) => {
      const m = e.detail?.map
      if (!m) return
      setMaps(prev => [...prev, m])
      setActiveMapId(m.id)
    }
    window.addEventListener('tour-open-new-map', openHandler)
    window.addEventListener('tour-close-new-map', closeHandler)
    window.addEventListener('tour-map-created', mapCreatedHandler)
    return () => {
      window.removeEventListener('tour-open-new-map', openHandler)
      window.removeEventListener('tour-close-new-map', closeHandler)
      window.removeEventListener('tour-map-created', mapCreatedHandler)
    }
  }, [])

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
    <div className="h-full flex flex-col bg-bg relative">

      {/* Header Island */}
      <div className="tour-map-header absolute top-4 sm:top-5 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-[calc(100%-2rem)] md:max-w-2xl bg-white/85 backdrop-blur-md border border-white/60 px-4 py-2.5 flex items-center justify-between z-20 shadow-glass rounded-2xl">
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
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setConnectionMode(v => !v)}
              title="Verbindungsmodus"
              className={`p-1.5 rounded-full transition-colors flex items-center ${connectionMode ? 'text-warm-1 bg-warm-1/10' : 'text-dark-muted hover:bg-black/5'}`}
            >
              <Link size={20} />
            </button>
            <button
              onClick={() => setShowColorFilter(v => !v)}
              title="Nach Farbe filtern"
              className={`p-1.5 rounded-full transition-colors flex items-center ${showColorFilter || hiddenColors.size > 0 ? 'text-warm-1 bg-warm-1/10' : 'text-dark-muted hover:bg-black/5'}`}
            >
              <Filter size={20} />
            </button>
            <button
              onClick={() => setShowGenerationen(v => !v)}
              title="Generationen-Ansicht"
              className={`p-1.5 rounded-full transition-colors flex items-center ${showGenerationen ? 'text-warm-1 bg-warm-1/10' : 'text-dark-muted hover:bg-black/5'}`}
            >
              <Layers size={20} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-dark-muted hover:bg-black/5 rounded-full transition-colors flex items-center"
            >
              <SlidersHorizontal size={20} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="tour-map-add flex items-center gap-1.5 bg-warm-1 hover:bg-warm-1/90 text-white border-none rounded-xl px-3.5 py-2 font-serif text-[13px] font-medium cursor-pointer shrink-0 shadow-sm transition-all active:scale-95"
              >
                <Plus size={16} /> Hinzufügen
              </button>
              {showAddMenu && (
                <>
                  <div onClick={() => setShowAddMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-glass border border-warm-3 overflow-hidden z-20 min-w-[160px]">
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

      {/* Dropdown-Menü für Map-Auswahl */}
      {showMapMenu && (
        <>
          <div onClick={() => setShowMapMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div className="absolute top-[72px] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-[calc(100%-2rem)] md:max-w-2xl bg-white rounded-2xl z-30 shadow-glass border border-warm-3 overflow-hidden">
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
                  className="flex-1 py-3 border-none bg-transparent hover:bg-black/5 font-serif text-[13px] text-dark-muted font-medium cursor-pointer transition-colors"
                >
                  Map verwalten
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

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, overflow: 'hidden', position: 'relative' }}>
        {!activeMap ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 17, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 24, lineHeight: 1.6 }}>
              Du hast noch keine Oikos Map.
            </p>
            <button
              onClick={() => setShowNewMap(true)}
              className="tour-map-add"
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
              hiddenColors={hiddenColors}
              ownerDisconnectedIds={ownerDisconnectedIds}
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
          ownerDisconnected={ownerDisconnectedIds.has(selectedPerson.id)}
          onOwnerDisconnect={() => setOwnerDisconnectedIds(prev => { const n = new Set(prev); n.add(selectedPerson.id); return n })}
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
              .select('id, full_name, username, avatar_url')
              .eq('id', profileId)
              .single()
              .then(({ data }) => {
                if (data) setLinkedProfiles(prev => ({ ...prev, [data.id]: data }))
              })
          }}
          onUnlinkAccount={unlinkAccount}
          onUpdateOverlay={updatePersonOverlay}
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
    </div>
  )
}
