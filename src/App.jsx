import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useAuth } from './hooks/useAuth'
import { useSwipeNav } from './hooks/useSwipeNav'
import { ToastProvider } from './context/ToastContext'
import { supabase } from './lib/supabase'
// Public pages stay eager so the login screen renders without a second fetch
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import BottomNav from './components/layout/BottomNav'
import SideNav from './components/layout/SideNav'
import { ErrorBoundary } from './components/ErrorBoundary'
// All authenticated pages load lazily: each route becomes its own chunk and
// shared heavy deps (Google Maps SDK bindings) end up in async chunks instead
// of the entry bundle
const Home = lazy(() => import('./pages/Home'))
const WorldMap = lazy(() => import('./pages/WorldMap'))
const ProfileView = lazy(() => import('./pages/ProfileView'))
const SettingsView = lazy(() => import('./pages/SettingsView'))
const ConnectionsView = lazy(() => import('./pages/ConnectionsView'))
const FriendsView = lazy(() => import('./pages/FriendsView'))
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const PrayerListDetailView = lazy(() => import('./pages/PrayerListDetailView'))
const PrayerGoalDetail = lazy(() => import('./pages/PrayerGoalDetail'))
const AnsweredPrayersView = lazy(() => import('./pages/AnsweredPrayersView'))
const PrayerStatsView = lazy(() => import('./pages/PrayerStatsView'))
const FeedPostView = lazy(() => import('./pages/FeedPostView'))
const SavedPostsView = lazy(() => import('./pages/SavedPostsView'))
const CommentDetailView = lazy(() => import('./pages/CommentDetailView'))
const PrayerDetailView = lazy(() => import('./pages/PrayerDetailView'))
const PublicMapView = lazy(() => import('./pages/PublicMapView'))
const Prayers = lazy(() => import('./pages/Prayers'))
const MapView = lazy(() => import('./pages/MapView'))
const ConversationView = lazy(() => import('./pages/ConversationView'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const NotificationSettingsView = lazy(() => import('./pages/NotificationSettingsView'))

// Der Start lief bisher streng seriell: Entry-Bundle → Session prüfen →
// *dann erst* den Chunk der Landing-Route holen → dann die Daten laden.
// Schritt 3 ist ein kompletter Round-Trip, der nichts von Schritt 2 braucht.
// Deshalb den Home-Chunk sofort beim Import anstoßen (er lädt parallel zur
// Session-Prüfung; `lazy` greift danach auf den Modul-Cache zu) und die
// übrigen Haupt-Tabs nachziehen, sobald der Browser Leerlauf hat.
import('./pages/Home')

const idle = typeof requestIdleCallback === 'function'
  ? requestIdleCallback
  : (cb) => setTimeout(cb, 1500)

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    idle(() => {
      import('./pages/FriendsView')
      import('./pages/Prayers')
      import('./pages/ProfileView')
    })
  }, { once: true })
}

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
    location.pathname.startsWith('/chat/') ||
    location.pathname.startsWith('/community/')

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-bg w-full relative overflow-hidden">
      <SideNav />

      <div
        className={`flex-1 min-h-0 min-w-0 hide-scrollbar ${
          isFullScreenRoute ? 'overflow-hidden' : 'overflow-y-auto mobile-nav-padding'
        }`}
      >
        <Suspense fallback={<LoadingSpinner />}>
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
          <Route path="/feed/saved" element={<SavedPostsView />} />
          <Route path="/feed/comment/:id" element={<CommentDetailView />} />
          <Route path="/chat" element={<Navigate to="/chats" replace />} />
          <Route path="/chats" element={<FriendsView />} />
          <Route path="/chat/:conversationId" element={<ConversationView />} />
          <Route path="/friends" element={<FriendsView />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notifications/settings" element={<NotificationSettingsView />} />
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
        </Suspense>
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

// Supabase liest den Recovery-Code beim Laden automatisch aus der URL (egal auf
// welcher Route der Link landet) und meldet den User über die Recovery-Session
// an. Ohne diese Weiche würde man dadurch einfach in der normalen App landen,
// statt die Seite zum Passwort-Ändern zu sehen.
//
// Mail-Apps öffnen den Recovery-Link oft in einem neuen Tab, während zufällig
// (oder durch den Klick selbst) ein zweiter Tab auf Home aufgeht. Supabase
// broadcastet PASSWORD_RECOVERY zwar per BroadcastChannel an alle offenen Tabs
// derselben Origin, aber ein Tab, der erst NACH dem Broadcast gemountet wird,
// verpasst die Nachricht (BroadcastChannel liefert nicht nach). Deshalb zieht
// jeder Tab zusätzlich einen localStorage-Marker, den auch ein später
// gestarteter Tab beim Start noch sieht.
const RECOVERY_MARKER_KEY = 'oikos_recovery_redirect_at'
const RECOVERY_MARKER_TTL_MS = 15000

function RecoveryRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirectToReset = () => {
      if (window.location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true })
      }
    }

    const markerAt = Number(localStorage.getItem(RECOVERY_MARKER_KEY))
    if (markerAt && Date.now() - markerAt < RECOVERY_MARKER_TTL_MS) {
      redirectToReset()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        localStorage.setItem(RECOVERY_MARKER_KEY, String(Date.now()))
        redirectToReset()
      }
    })

    const onStorage = (e) => {
      if (e.key === RECOVERY_MARKER_KEY && e.newValue) {
        redirectToReset()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', onStorage)
    }
  }, [navigate])

  return null
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
      // Note: `notifications` has no `related_url` column (never migrated) -
      // an insert/filter referencing it fails the whole query. Use the
      // `data` jsonb column instead, same as the DB notification triggers.
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'birthday')
        .gte('created_at', new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString())
        .eq('data->>person_id', p.id)
        .maybeSingle()
      if (!existing) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'birthday',
          title: `🎂 ${name} hat heute Geburtstag!`,
          body: 'Schreib ihm/ihr eine Nachricht',
          data: { person_id: p.id },
        })
      }
    }
  } catch {
    /* silent fail */
  }
}

// Recovery-Links tragen `type=recovery` im URL-Hash (implicit flow) oder in
// der Query (falls Supabase mal auf PKCE zurückfällt). Das synchron beim
// ersten Rendern zu prüfen – statt erst auf das asynchrone PASSWORD_RECOVERY-
// Event zu warten – verhindert, dass Geräte mit bereits bestehender Session
// (z. B. ein Handy, auf dem man schon eingeloggt ist) kurz Home/AppShell
// rendern, bevor die Weiche zu /reset-password greift.
function isRecoveryLink() {
  return /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search)
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  const recovery = isRecoveryLink() && window.location.pathname !== '/reset-password'

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-bg w-full flex justify-center md:block">
          <div className="w-full max-w-md md:max-w-none h-[100dvh] relative overflow-hidden bg-bg">
            <BrowserRouter>
              <RecoveryRedirect />
              <Routes>
                <Route
                  path="/auth"
                  element={recovery ? <Navigate to="/reset-password" replace /> : (user ? <Navigate to="/" replace /> : <Auth />)}
                />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  path="/*"
                  element={recovery ? <Navigate to="/reset-password" replace /> : (user ? <AppShell /> : <Navigate to="/auth" replace />)}
                />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
        <Analytics />
        <SpeedInsights />
      </ToastProvider>
    </ErrorBoundary>
  )
}
