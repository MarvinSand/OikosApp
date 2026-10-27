import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import WorldMapView from '../components/worldmap/WorldMapView'

export default function WorldMap() {
  const navigate = useNavigate()
  return (
    <div className="w-full flex flex-col bg-bg" style={{ height: '100%', overflow: 'hidden', overscrollBehavior: 'none' }}>
      <AppHeader />
      <div className="flex-1 min-h-0 relative">
        <WorldMapView onNavigateToProfile={() => navigate('/profile')} />
      </div>
    </div>
  )
}
