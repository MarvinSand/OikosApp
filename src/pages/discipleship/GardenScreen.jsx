import { useState } from 'react'
import { Loader2, SlidersHorizontal, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGarden } from '../../hooks/useGarden'
import GardenBackground from '../../components/discipleship/GardenBackground'
import PlantNode from '../../components/discipleship/PlantNode'
import OverlayPersonSheet from '../../components/map/OverlayPersonSheet'

export default function GardenScreen() {
  const navigate = useNavigate()
  const { plots, loading } = useGarden()
  const [selectedFriendPerson, setSelectedFriendPerson] = useState(null)

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', backgroundColor: '#E7EFCB', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <GardenBackground />
      </div>

      <div
        style={{
          position: 'sticky', top: 0, zIndex: 3, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 18px',
        }}
      >
        <h1 className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: '#1C1C1E', textShadow: '0 1px 6px rgba(255,255,255,0.5)' }}>
          Unser Garten
        </h1>
        <button
          onClick={() => navigate('/discipleship/debug')}
          aria-label="Debug: Profil-Tags"
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            backgroundColor: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#1C1C1E',
          }}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '10px 18px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && (
          <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={26} className="animate-spin" style={{ color: '#1C1C1E' }} />
          </div>
        )}

        {!loading && plots.length === 0 && (
          <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', gap: 10 }}>
            <Sprout size={28} style={{ color: '#3F7E30' }} />
            <p style={{ fontSize: 13.5, color: '#3A3A3C', maxWidth: 280, lineHeight: 1.5 }}>
              Füge Kontakte zu deiner Oikos-Map hinzu, um deinen Garten zu bepflanzen.
            </p>
          </div>
        )}

        {!loading && plots.map(plot => (
          <div
            key={plot.ownerId}
            style={{
              backgroundColor: 'rgba(255,255,255,0.55)',
              borderRadius: 20,
              padding: '14px 16px 16px',
              border: plot.isOwn ? '2px solid #E8B33C' : '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>
              {plot.ownerName}
            </div>
            {plot.plants.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6B6B6F' }}>Noch keine Pflanzen</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {plot.plants.map(plant => (
                  <PlantNode
                    key={plant.id}
                    growthStage={plant.growthStage}
                    isHarvested={plant.isHarvested}
                    isOwn={plant.isOwn}
                    label={plant.name}
                    onClick={plant.isOwn
                      ? () => navigate(`/map/${plant.mapId}`)
                      : () => setSelectedFriendPerson({ id: plant.id })}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedFriendPerson && (
        <OverlayPersonSheet
          person={selectedFriendPerson}
          onClose={() => setSelectedFriendPerson(null)}
        />
      )}
    </div>
  )
}
