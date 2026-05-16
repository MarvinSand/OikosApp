import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './context/ToastContext'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import MapView from './pages/MapView'
import ProfileView from './pages/ProfileView'
import FriendsView from './pages/FriendsView'
import CommunityDetail from './pages/CommunityDetail'
import UserProfile from './pages/UserProfile'
import PrayerView from './pages/PrayerView'
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
          <Route path="/discipleship" element={<DiscipleshipComingSoon />} />
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
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    checkBirthdays(user.id)
  }, [user?.id])
  return <AppShellInner />
}

function DiscipleshipComingSoon() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-warm-2/30 flex items-center justify-center mb-6 shadow-glass-sm">
        <span className="text-4xl">📖</span>
      </div>
      <h1 className="text-2xl font-semibold text-dark mb-2">Jüngerschaft</h1>
      <p className="text-dark/70 max-w-sm">Coming soon – dieser Bereich ist gerade in Arbeit. Bald kannst du hier deinen Weg im Glauben begleiten lassen.</p>
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
    // Get all friends
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

    // Filter to today's birthdays (extract month/day from birthday string YYYY-MM-DD)
    const todayBirthdays = profiles.filter(p => {
      const [, m, d] = (p.birthday || '').split('-')
      return parseInt(m) === month && parseInt(d) === day
    })

    for (const p of todayBirthdays) {
      const name = p.full_name || p.username || 'Jemand'
      // Insert notification if not already created today
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
    // Silent fail – birthday check is non-critical
  }
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
