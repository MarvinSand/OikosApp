import { useState, useEffect } from 'react'
import { Plus, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOikosMaps } from '../hooks/useOikosMaps'
import { supabase } from '../lib/supabase'
import MapCanvas from '../components/map/MapCanvas'
import NewMapModal from '../components/map/NewMapModal'
import AddPersonModal from '../components/map/AddPersonModal'
import PersonDetailSheet from '../components/map/PersonDetailSheet'
import MapSettingsSheet from '../components/map/MapSettingsSheet'
import OverlayPersonSheet from '../components/map/OverlayPersonSheet'

export default function MapView() {
  const { user } = useAuth()
  const {
    maps, activeMapId, setActiveMapId, activeMap,
    people, connections, overlayData, loading,
    createMap, updateMap, addPerson, updatePerson, deletePerson,
    movePersonPosition, createConnection, deleteConnection,
    linkAccount, unlinkAccount, updatePersonOverlay,
  } = useOikosMaps()

  const [showMapMenu, setShowMapMenu] = useState(false)
  const [showNewMap, setShowNewMap] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedOverlayPerson, setSelectedOverlayPerson] = useState(null)
  // linkedProfile cache: { [userId]: profile }
  const [linkedProfiles, setLinkedProfiles] = useState({})

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', position: 'relative' }}>

      {/* Header */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-warm-3)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setShowMapMenu(!showMapMenu)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600,
            color: 'var(--color-text)', padding: '4px 8px', borderRadius: 8,
            maxWidth: '65%',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeMap?.name || 'Meine Oikos Map'}
          </span>
          <ChevronDown size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        </button>

        {activeMap && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              onClick={() => setShowAddPerson(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                backgroundColor: 'var(--color-warm-1)', color: 'var(--color-white)',
                border: 'none', borderRadius: 10, padding: '8px 14px',
                fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Plus size={15} />
              Person
            </button>
          </div>
        )}
      </div>

      {/* Dropdown-Menü für Map-Auswahl */}
      {showMapMenu && (
        <>
          <div onClick={() => setShowMapMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute', top: 57, left: 12, right: 12,
            backgroundColor: 'var(--color-white)',
            borderRadius: 14, zIndex: 20,
            boxShadow: '0 4px 20px rgba(58,46,36,0.12)',
            border: '1px solid var(--color-warm-3)',
            overflow: 'hidden',
          }}>
            {maps.map((m, i) => (
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
                  borderBottom: i < maps.length - 1 || true ? '1px solid var(--color-warm-3)' : 'none',
                }}
              >
                <span>{m.name}</span>
                {m.is_public && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-light)' }}>öffentlich</span>
                )}
              </button>
            ))}
            <button
              onClick={() => { setShowMapMenu(false); setShowNewMap(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '13px 16px',
                border: 'none', background: 'transparent',
                fontFamily: 'Lora, serif', fontSize: 14,
                color: 'var(--color-warm-1)', cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Neue Map erstellen
            </button>
          </div>
        </>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, overflow: 'hidden' }}>
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
          <MapCanvas
            userName={userName}
            people={people}
            connections={connections}
            overlayData={overlayData}
            onPersonClick={setSelectedPerson}
            onPersonMoved={(personId, x, y) => movePersonPosition(personId, x, y)}
            onCreateConnection={(sourceId, targetId, label) => createConnection(sourceId, targetId, label)}
            onOverlayPersonClick={setSelectedOverlayPerson}
          />
        )}
      </div>

      {/* Modals & Sheets */}
      {showNewMap && (
        <NewMapModal onClose={() => setShowNewMap(false)} onCreate={createMap} />
      )}
      {showSettings && activeMap && (
        <MapSettingsSheet map={activeMap} updateMap={updateMap} onClose={() => setShowSettings(false)} />
      )}
      {showAddPerson && (
        <AddPersonModal onClose={() => setShowAddPerson(false)} onAdd={addPerson} />
      )}
      {selectedOverlayPerson && (
        <OverlayPersonSheet
          person={selectedOverlayPerson}
          onClose={() => setSelectedOverlayPerson(null)}
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
          onDeleteConnection={deleteConnection}
          onCreateConnection={createConnection}
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
    </div>
  )
}
