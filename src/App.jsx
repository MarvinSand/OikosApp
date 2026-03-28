import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './context/ToastContext'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import MapView from './pages/MapView'
import ProfileView from './pages/ProfileView'
import FriendsView from './pages/FriendsView'
import CommunityDetail from './pages/CommunityDetail'
import UserProfile from './pages/UserProfile'
import PrayerView from './pages/PrayerView'
import PublicMapView from './pages/PublicMapView'
import ChatView from './pages/ChatView'
import ConversationView from './pages/ConversationView'
import NotificationsPage from './pages/NotificationsPage'
import BottomNav from './components/layout/BottomNav'

function LoadingSpinner() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '3px solid var(--color-warm-3)',
        borderTopColor: 'var(--color-warm-1)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-muted)',
      fontStyle: 'italic',
      paddingBottom: 80,
    }}>
      {title}
    </div>
  )
}

function AppShell() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/prayer" element={<PrayerView />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/chat/:conversationId" element={<ConversationView />} />
          <Route path="/friends" element={<FriendsView />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/community/:id" element={<CommunityDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/user/:id/map/:mapId" element={<PublicMapView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={user ? <Navigate to="/" replace /> : <Auth />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={user ? <AppShell /> : <Navigate to="/auth" replace />}
        />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}
