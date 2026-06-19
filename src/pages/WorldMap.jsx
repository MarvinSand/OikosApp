import { useNavigate } from 'react-router-dom'
import WorldMapView from '../components/worldmap/WorldMapView'

export default function WorldMap() {
  const navigate = useNavigate()
  return (
    <div className="h-full w-full flex flex-col bg-bg">
      <div className="flex-1 min-h-0 relative">
        <WorldMapView onNavigateToProfile={() => navigate('/profile')} />
      </div>
    </div>
  )
}
