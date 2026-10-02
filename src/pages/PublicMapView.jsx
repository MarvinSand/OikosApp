import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePublicMap } from '../hooks/usePublicMap'
import MapCanvas from '../components/map/MapCanvas'
import PersonDetailSheet from '../components/map/PersonDetailSheet'

// ─── PublicMapView (Main) ─────────────────────────────────────
export default function PublicMapView() {
  const { id: userId, mapId } = useParams()
  const navigate = useNavigate()
  const { map, people, connections, places, placeConnections, ownerName, linkedProfiles, overlayData, togglePersonMapOverlay, loading } = usePublicMap(userId, mapId)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep-link: ?openPerson=PERSON_ID → open that person's sheet (used by notifications)
  useEffect(() => {
    const personId = searchParams.get('openPerson')
    if (!personId || !people.length) return
    const person = people.find(p => p.id === personId)
    if (person) {
      setSelectedPerson(person)
      setSearchParams(prev => { prev.delete('openPerson'); return prev }, { replace: true })
    }
  }, [searchParams, people])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <div style={{ height: 18, width: 140, borderRadius: 8, backgroundColor: 'var(--color-warm-3)' }} />
          <div style={{ width: 36 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-warm-3)', borderTopColor: 'var(--color-warm-1)', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (!map) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <span style={headerTitle}>Nicht gefunden</span>
          <div style={{ width: 36 }} />
        </div>
        <p style={{ padding: 24, fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
          Diese Map ist nicht verfügbar.
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }} className="md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
        <span style={headerTitle}>{map.name}</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, padding: 8, overflow: 'hidden' }}>
        <MapCanvas
          userName={ownerName}
          people={people}
          connections={connections}
          places={places}
          placeConnections={placeConnections}
          overlayData={overlayData}
          onPersonClick={setSelectedPerson}
          readOnly
          ownerDisconnectedIds={new Set(people.filter(p => p.owner_disconnected).map(p => p.id))}
        />
      </div>

      {selectedPerson && (
        <PersonDetailSheet
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          connections={connections}
          people={people}
          places={places}
          placeConnections={placeConnections}
          overlayData={overlayData}
          mapOwnerName={ownerName}
          ownerDisconnected={selectedPerson.owner_disconnected ?? false}
          linkedProfile={selectedPerson.linked_user_id ? linkedProfiles[selectedPerson.linked_user_id] || null : null}
          onOverlayPreview={togglePersonMapOverlay}
        />
      )}
    </div>
  )
}

const headerStyle = {
  backgroundColor: 'var(--color-white)',
  borderBottom: '1px solid var(--color-warm-3)',
  padding: '14px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  position: 'sticky', top: 0, zIndex: 5, flexShrink: 0,
}
const backBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }
const headerTitle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center', margin: '0 8px' }
