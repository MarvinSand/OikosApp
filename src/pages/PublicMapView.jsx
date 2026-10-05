import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePublicMap } from '../hooks/usePublicMap'
import { useSiblingsNetwork } from '../hooks/useSiblingsNetwork'
import MapCanvas from '../components/map/MapCanvas'
import PersonDetailSheet from '../components/map/PersonDetailSheet'

// ─── PublicMapView (Main) ─────────────────────────────────────
export default function PublicMapView() {
  const { id: userId, mapId } = useParams()
  const navigate = useNavigate()
  const { map, people, connections, places, placeConnections, ownerName, linkedProfiles, overlayData, togglePersonMapOverlay, loading } = usePublicMap(userId, mapId)
  const [selectedPerson, setSelectedPerson] = useState(null)
  // Systemkarte „Meine Geschwister in Christus": Auto-Kanten + Freunde von Freunden
  const [siblingsDepth, setSiblingsDepth] = useState(1)
  const isSiblingsMap = map?.kind === 'siblings'
  const siblingsGraph = useSiblingsNetwork({ active: isSiblingsMap, depth: siblingsDepth, people, ownerId: userId })
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

      {isSiblingsMap && (
        <div role="group" aria-label="Freunde von Freunden einblenden" style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 8px 0', flexShrink: 0 }}>
          {[[1, 'Verbundene'], [2, '+ Freunde von Freunden'], [3, '+ 3. Generation']].map(([d, label]) => (
            <button
              key={d}
              onClick={() => setSiblingsDepth(d)}
              aria-pressed={siblingsDepth === d}
              style={{
                border: '1px solid var(--color-warm-3)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                background: siblingsDepth === d ? 'var(--color-warm-1)' : 'var(--color-white)',
                color: siblingsDepth === d ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, padding: 8, overflow: 'hidden' }}>
        <MapCanvas
          userName={ownerName}
          people={people}
          connections={isSiblingsMap ? [...connections, ...siblingsGraph.connections] : connections}
          places={places}
          placeConnections={placeConnections}
          overlayData={isSiblingsMap ? siblingsGraph.overlayData : overlayData}
          onPersonClick={setSelectedPerson}
          onOverlayPersonClick={(op) => op.is_virtual && navigate(`/user/${op.user_id}`)}
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
