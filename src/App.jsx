import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './context/ToastContext'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import MapView from './pages/MapView'
import ProfileView from './pages/ProfileView'
import FriendsView from './pages/FriendsView'
import CommunityDetail from './pages/CommunityDetail'
import UserProfile from './pages/UserProfile'
import PrayerView from './pages/PrayerView'
import DiscipleshipView from './pages/DiscipleshipView'
import DiscipleshipStageView from './pages/DiscipleshipStageView'
import DiscipleshipLessonView from './pages/DiscipleshipLessonView'
import FeedPostView from './pages/FeedPostView'
import PublicMapView from './pages/PublicMapView'
import ConversationView from './pages/ConversationView'
import NotificationsPage from './pages/NotificationsPage'
import BottomNav from './components/layout/BottomNav'
import SideNav from './components/layout/SideNav'
import { ErrorBoundary } from './components/ErrorBoundary'
import OnboardingTutorial from './components/tutorial/OnboardingTutorial'

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

function AppShellInner() {
  const location = useLocation()
  const isMapRoute = location.pathname === '/'

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-bg w-full relative overflow-hidden">
      {/* Sidebar – nur auf Desktop sichtbar */}
      <SideNav />

      {/* Hauptbereich */}
      <div
        className={`flex-1 min-h-0 min-w-0 hide-scrollbar ${
          isMapRoute ? 'overflow-hidden' : 'overflow-y-auto mobile-nav-padding'
        }`}
      >
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/prayer" element={<PrayerView />} />
          <Route path="/discipleship" element={<DiscipleshipView />} />
          <Route path="/discipleship/stage/:stage" element={<DiscipleshipStageView />} />
          <Route path="/discipleship/lesson/:lessonId" element={<DiscipleshipLessonView />} />
          <Route path="/feed/post/:id" element={<FeedPostView />} />
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

      {/* Bottom-Nav – nur auf Mobilgeräten */}
      <BottomNav />
      <OnboardingTutorial />
    </div>
  )
}

function AppShell() {
  return <AppShellInner />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-bg w-full flex justify-center md:block selection:bg-warm-1/20 selection:text-dark">
          {/* Auf Mobile: zentrierte max-w-md Karte; auf Desktop: volle Breite */}
          <div className="w-full max-w-md md:max-w-none h-[100dvh] relative md:shadow-none shadow-glass overflow-hidden bg-bg">
            <BrowserRouter>
              <Routes>
                <Route
                  path="/auth"
                  element={user ? <Navigate to="/" replace /> : <Auth />}
                />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
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
