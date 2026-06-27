import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './hooks/useAuth'
import { useSwipeNav } from './hooks/useSwipeNav'
import { ToastProvider } from './context/ToastContext'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import Home from './pages/Home'
import WorldMap from './pages/WorldMap'
import ProfileView from './pages/ProfileView'
import SettingsView from './pages/SettingsView'
import ConnectionsView from './pages/ConnectionsView'
import FriendsView from './pages/FriendsView'
import CommunityDetail from './pages/CommunityDetail'
import UserProfile from './pages/UserProfile'
import PrayerListDetailView from './pages/PrayerListDetailView'
import PrayerGoalDetail from './pages/PrayerGoalDetail'
import AnsweredPrayersView from './pages/AnsweredPrayersView'
import PrayerStatsView from './pages/PrayerStatsView'
import FeedPostView from './pages/FeedPostView'
import PrayerDetailView from './pages/PrayerDetailView'
import PublicMapView from './pages/PublicMapView'
import Prayers from './pages/Prayers'
import MapView from './pages/MapView'
import ConversationView from './pages/ConversationView'
import NotificationsPage from './pages/NotificationsPage'
import BottomNav from './components/layout/BottomNav'
import SideNav from './components/layout/SideNav'
import { ErrorBoundary } from './components/ErrorBoundary'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
        }}
      />
    </div>
  )
}

function AppShellInner() {
  const location = useLocation()
  useSwipeNav()
  // Routes where the inner container should not be vertically scrollable
  // (full-bleed map views)
  const isFullScreenRoute =
    location.pathname === '/' ||
    location.pathname === '/worldmap' ||
    location.pathname.startsWith('/map/') ||
    location.pathname.startsWith('/chat/')

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-bg w-full relative overflow-hidden">
      <SideNav />

      <div
        className={`flex-1 min-h-0 min-w-0 hide-scrollbar ${
          isFullScreenRoute ? 'overflow-hidden' : 'overflow-y-auto mobile-nav-padding'
        }`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/worldmap" element={<WorldMap />} />
          <Route path="/prayers" element={<Prayers />} />
          <Route path="/prayer/list/:listId" element={<PrayerListDetailView />} />
          <Route path="/goals/:id" element={<PrayerGoalDetail />} />
          <Route path="/prayer/answered" element={<AnsweredPrayersView />} />
          <Route path="/prayer/stats" element={<PrayerStatsView />} />
          <Route path="/prayer/:id" element={<PrayerDetailView />} />
          <Route path="/discipleship" element={<DiscipleshipComingSoon />} />
          <Route path="/feed/post/:id" element={<FeedPostView />} />
          <Route path="/chat" element={<Navigate to="/friends?tab=chats" replace />} />
          <Route path="/chat/:conversationId" element={<ConversationView />} />
          <Route path="/friends" element={<FriendsView />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/community/:id" element={<CommunityDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/user/:id/map/:mapId" element={<PublicMapView />} />
          <Route path="/map/:mapId" element={<OwnMapPage />} />
          <Route path="/user/:id/connections" element={<ConnectionsView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/profile/connections" element={<ConnectionsView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <BottomNav />
    </div>
  )
}

function AppShell() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    checkBirthdays(user.id)
  }, [user?.id])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return <AppShellInner />
}

function OwnMapPage() {
  const { mapId } = useParams()
  return <MapView initialMapId={mapId} hideWorldMapToggle />
}

function DiscipleshipComingSoon() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <span className="text-4xl">📖</span>
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        Jüngerschaft
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 360 }}>
        Coming soon – dieser Bereich ist gerade in Arbeit. Bald kannst du hier deinen Weg im Glauben begleiten lassen.
      </p>
    </div>
  )
}

async function checkBirthdays(userId) {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const todayKey = `birthday_check_${today.toDateString()}`
  if (localStorage.getItem(todayKey)) return
  localStorage.setItem(todayKey, '1')

  try {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
    if (!friendships?.length) return

    const friendIds = friendships.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', friendIds)
      .eq('show_birthday', true)
      .not('birthday', 'is', null)
    if (!profiles?.length) return

    const todayBirthdays = profiles.filter(p => {
      const [, m, d] = (p.birthday || '').split('-')
      return parseInt(m) === month && parseInt(d) === day
    })

    for (const p of todayBirthdays) {
      const name = p.full_name || p.username || 'Jemand'
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'birthday')
        .gte('created_at', new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString())
        .eq('related_url', `/user/${p.id}`)
        .maybeSingle()
      if (!existing) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'birthday',
          title: `🎂 ${name} hat heute Geburtstag!`,
          body: 'Schreib ihm/ihr eine Nachricht',
          related_url: `/user/${p.id}`,
        })
      }
    }
  } catch {
    /* silent fail */
  }
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-bg w-full flex justify-center md:block">
          <div className="w-full max-w-md md:max-w-none h-[100dvh] relative overflow-hidden bg-bg">
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
        <Analytics />
      </ToastProvider>
    </ErrorBoundary>
  )
}
