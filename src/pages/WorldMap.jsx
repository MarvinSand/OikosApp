import { useNavigate } from 'react-router-dom'
import WorldMapView from '../components/worldmap/WorldMapView'

export default function WorldMap() {
  const navigate = useNavigate()
  return (
    <div className="h-full w-full flex flex-col bg-bg">
      <header
        className="flex items-center justify-between px-4"
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          flexShrink: 0,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          Weltkarte
        </h1>
      </header>
      <div className="flex-1 min-h-0 relative">
        <WorldMapView onNavigateToProfile={() => navigate('/profile')} />
      </div>
    </div>
  )
}
