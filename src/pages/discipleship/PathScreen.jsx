import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchStagesWithStations,
  fetchUserStationProgress,
  computeStationStatuses,
} from '../../lib/pilgerweg'
import MountainBackground from '../../components/discipleship/MountainBackground'
import PilgrimPath from '../../components/discipleship/PilgrimPath'

export default function PathScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stations, setStations] = useState(null)
  const pathContainerRef = useRef(null)
  const scrolledRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [stages, progress] = await Promise.all([
        fetchStagesWithStations(),
        fetchUserStationProgress(user.id),
      ])
      if (cancelled) return
      setStations(computeStationStatuses(stages, progress))
    }
    load()
    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    if (!stations || scrolledRef.current) return
    const currentNode = pathContainerRef.current?.querySelector('[data-station-status="current"]')
    if (currentNode) {
      currentNode.scrollIntoView({ block: 'center' })
      scrolledRef.current = true
    }
  }, [stations])

  if (!stations) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', backgroundColor: '#12271A', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <MountainBackground variant="plain" />
      </div>

      <div
        style={{
          position: 'sticky', top: 0, zIndex: 3, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 18px',
        }}
      >
        <h1 className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
          Dein Weg
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

      <div ref={pathContainerRef} style={{ position: 'relative', zIndex: 2, padding: '10px 24px 40px' }}>
        <PilgrimPath
          stations={stations}
          onStationClick={station => navigate(`/discipleship/station/${station.id}`)}
        />
      </div>
    </div>
  )
}
