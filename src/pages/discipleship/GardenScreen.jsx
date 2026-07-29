import { useState } from 'react'
import { Loader2, SlidersHorizontal, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGarden } from '../../hooks/useGarden'
import VillageCanvas from '../../components/discipleship/VillageCanvas'
import OverlayPersonSheet from '../../components/map/OverlayPersonSheet'

export default function GardenScreen() {
  const navigate = useNavigate()
  const { plots, loading } = useGarden()
  const [selectedPerson, setSelectedPerson] = useState(null)

  return (
    <div className="h-full relative overflow-hidden" style={{ backgroundColor: '#7FB061', overscrollBehavior: 'none' }}>
      {!loading && plots.length > 0 && (
        <VillageCanvas
          plots={plots}
          onSelectPlant={plant => {
            // Eigene Pflanze → zur eigenen Map (dort bearbeitbar).
            // Pflanze eines Geschwisters → Detail-Ansicht (lesend).
            if (plant.isOwn) navigate(`/map/${plant.mapId}`)
            else setSelectedPerson({ id: plant.id })
          }}
        />
      )}

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={26} className="animate-spin" style={{ color: '#fff' }} />
        </div>
      )}

      {!loading && plots.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', gap: 10 }}>
          <Sprout size={30} style={{ color: '#fff' }} />
          <p style={{ fontSize: 14, color: '#fff', maxWidth: 300, lineHeight: 1.5, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            Füge Kontakte zu deiner Oikos-Map hinzu, um dein Beet im Dorf zu bepflanzen.
          </p>
        </div>
      )}

      {/* Kopfzeile über der Karte */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', pointerEvents: 'none',
        }}
      >
        <h1
          className="font-serif"
          style={{ fontSize: 18, fontWeight: 600, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}
        >
          Unser Dorf
        </h1>
        <button
          onClick={() => navigate('/discipleship/debug')}
          aria-label="Debug: Profil-Tags"
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none', pointerEvents: 'auto',
            backgroundColor: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#1C1C1E',
          }}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {selectedPerson && (
        <OverlayPersonSheet
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  )
}
