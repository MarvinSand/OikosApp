import { useState, useRef, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import { usePrayerGoals } from '../hooks/usePrayerGoals'
import SwipePager from '../components/layout/SwipePager'
import TopPrayerToday from '../components/home/TopPrayerToday'
import WelcomeBanner from '../components/home/WelcomeBanner'
import ProfileCompletionCard from '../components/home/ProfileCompletionCard'
import GoalCard from '../components/prayer/GoalCard'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'
import SegmentedTabs from '../components/layout/SegmentedTabs'

// Lazy: zieht sonst PeopleYouMayKnow, CommunityCard, CreateCommunitySheet
// (inkl. AddressAutocomplete/Google-Maps-Loader) in Homes kritischen
// Ladepfad – obwohl der Community-Tab erst nach einem Tap sichtbar wird.
const HomeCommunityTab = lazy(() => import('../components/home/HomeCommunityTab'))

// ─── Gruppengebet mit meistem Engagement (Top-Goal) ───────────
function TopGroupGoal() {
  const navigate = useNavigate()
  const { featuredGoals, loading, reload } = usePrayerGoals()
  const [prayGoal, setPrayGoal] = useState(null)

  if (!loading && featuredGoals.length === 0) return null

  const topGoal = featuredGoals[0] // sortiert nach participant_count (meiste Teilnehmer)

  const prayItems = prayGoal ? [{
    type: 'topic',
    request: { id: prayGoal.id, title: prayGoal.title, description: prayGoal.description, icon: prayGoal.icon },
    ampel: null,
  }] : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          Gruppengebet
        </p>
      </div>

      {loading ? (
        <div style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <GoalCard
          goal={topGoal}
          onOpenDetail={() => navigate(`/goals/${topGoal.id}`)}
          onPrayHours={setPrayGoal}
        />
      )}

      {prayGoal && (
        <GuidedPrayerMode
          items={prayItems}
          goalId={prayGoal.id}
          onClose={() => { setPrayGoal(null); reload() }}
        />
      )}
    </div>
  )
}

const HOME_TABS = [
  { key: 'aktuelles', label: 'Aktuelles' },
  { key: 'community', label: 'Community' },
]

export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'community' ? 'community' : 'aktuelles'

  function setTab(key) {
    const next = new URLSearchParams(searchParams)
    if (key === 'aktuelles') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next, { replace: true })
  }

  const rootRef = useRef(null)
  const tabIndex = tab === 'community' ? 1 : 0

  return (
    <div ref={rootRef} className="h-full w-full flex flex-col bg-bg">
      <AppHeader />

      {/* Premium-Tabs */}
      <div style={{ padding: '12px 16px 0' }}>
        <SegmentedTabs tabs={HOME_TABS} active={tab} onSelect={setTab} synced />
      </div>

      {/* Wisch-Pager: Seiten folgen dem Finger, der Tab-Indikator wandert mit */}
      <div className="flex-1 min-h-0">
        <SwipePager
          count={2}
          index={tabIndex}
          onIndexChange={i => setTab(HOME_TABS[i].key)}
          syncRef={rootRef}
          paneClassName="mobile-nav-padding"
          renderPane={i => i === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '20px 16px 0' }}>
              {/* Profil-Fortschritt (verschwindet, sobald das Profil vollständig ist) */}
              <ProfileCompletionCard />

              {/* Willkommens- & Funktionsübersicht (dauerhaft) */}
              <WelcomeBanner />

              {/* Gebet mit den meisten Interaktionen heute */}
              <TopPrayerToday />

              {/* Gruppengebet mit meistem Engagement */}
              <TopGroupGoal />
            </div>
          ) : (
            <div style={{ padding: '20px 16px 0', minWidth: 0, overflowX: 'hidden' }}>
              <Suspense fallback={<div style={{ height: 200, borderRadius: 18, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />}>
                <HomeCommunityTab />
              </Suspense>
            </div>
          )}
        />
      </div>
    </div>
  )
}
