import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Bell, ChevronRight } from 'lucide-react'
import { useConversations } from '../hooks/useConversations'
import { useNotifications } from '../hooks/useNotifications'
import { usePrayerGoals } from '../hooks/usePrayerGoals'
import DailyPrayerCard from '../components/home/DailyPrayerCard'
import HomeCommunitySection from '../components/home/HomeCommunitySection'
import PrayerListsSection from '../components/prayer/PrayerListsSection'
import GoalCard from '../components/prayer/GoalCard'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'

// ─── Gemeinsam beten (Featured Goals) ─────────────────────────
function FeaturedGoals() {
  const navigate = useNavigate()
  const { featuredGoals, loading, reload } = usePrayerGoals()
  const [prayGoal, setPrayGoal] = useState(null)

  if (!loading && featuredGoals.length === 0) return null

  const prayItems = prayGoal ? [{
    type: 'topic',
    request: { id: prayGoal.id, title: prayGoal.title, description: prayGoal.description, icon: prayGoal.icon },
    ampel: null,
  }] : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          Gemeinsam beten
        </p>
        <button onClick={() => navigate('/goals')} style={{ display: 'flex', alignItems: 'center', gap: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-warm-1)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600 }}>
          Alle ansehen <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {featuredGoals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              onOpenDetail={() => navigate(`/goals/${g.id}`)}
              onPrayHours={setPrayGoal}
            />
          ))}
        </div>
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

export default function Home() {
  const navigate = useNavigate()
  const { hasUnread } = useConversations()
  const { unreadCount } = useNotifications()

  return (
    <div className="h-full w-full flex flex-col bg-bg">
      {/* Sticky Header */}
      <header
        className="flex items-center justify-between px-4"
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
          }}
        >
          OIKOS
        </h1>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/friends?tab=chats')}
            aria-label="Chats"
            style={{
              position: 'relative', width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            <MessageCircle size={22} strokeWidth={2} />
            {hasUnread && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: 'var(--color-error)',
                border: '1.5px solid var(--color-bg)',
              }} />
            )}
          </button>

          <button
            onClick={() => navigate('/notifications')}
            aria-label="Benachrichtigungen"
            style={{
              position: 'relative', width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            <Bell size={22} strokeWidth={2} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                backgroundColor: 'var(--color-error)', color: 'white',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--color-bg)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Scrollbarer Inhalt */}
      <div className="flex-1 overflow-y-auto hide-scrollbar" style={{ paddingBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '20px 16px 0' }}>
          {/* Gebet des Tages */}
          <DailyPrayerCard />

          {/* Gemeinsam beten / Gebetsziele */}
          <FeaturedGoals />

          {/* Community */}
          <HomeCommunitySection />
        </div>

        {/* Meine Gebetslisten (eigene Section-Optik mit horizontalem Scroll) */}
        <div style={{ marginTop: 8 }}>
          <PrayerListsSection />
        </div>
      </div>
    </div>
  )
}
