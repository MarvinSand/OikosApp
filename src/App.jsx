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
import ConversationView from './pages/ConversationView'
import NotificationsPage from './pages/NotificationsPage'
import BottomNav from './components/layout/BottomNav'
import { ErrorBoundary } from './components/ErrorBoundary'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 w-32 h-32 bg-warm-2 rounded-full blur-3xl" />
      <div className="w-12 h-12 rounded-full border-[3px] border-warm-3 border-t-warm-1 animate-spin z-10 shadow-glass-sm" />
    </div>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-dark-muted italic pb-20">
      {title}
    </div>
  )
}

function AppShell() {
  return (
    <div className="h-[100dvh] flex flex-col bg-bg w-full max-w-md mx-auto relative overflow-hidden shadow-glass">
      <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/prayer" element={<PrayerView />} />
          <Route path="/chat" element={<Navigate to="/friends?tab=chats" replace />} />
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
      <div className="h-[84px] sm:h-[92px] shrink-0 pointer-events-none" />
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-bg w-full flex justify-center selection:bg-warm-1/20 selection:text-dark">
          {/* Centered container for desktop view, full width on mobile */}
          <div className="w-full max-w-md h-[100dvh] relative shadow-glass overflow-hidden bg-bg">
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
          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}
