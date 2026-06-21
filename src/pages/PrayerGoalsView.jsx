import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Target } from 'lucide-react'
import { usePrayerGoals } from '../hooks/usePrayerGoals'
import GoalCard from '../components/prayer/GoalCard'
import CreateGoalSheet from '../components/prayer/CreateGoalSheet'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'

const TABS = [
  { key: 'discover', label: 'Entdecken' },
  { key: 'mine', label: 'Meine' },
  { key: 'community', label: 'Community' },
]

function Skeleton() {
  return (
    <div style={{ padding: '0 16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

function EmptyState({ text, onCreate }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
      <Target size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, margin: '0 0 16px' }}>{text}</p>
      <button onClick={onCreate} style={{
        padding: '10px 20px', borderRadius: 12, border: 'none',
        backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)',
        fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        + Ziel erstellen
      </button>
    </div>
  )
}

export default function PrayerGoalsView() {
  const navigate = useNavigate()
  const { publicGoals, myGoals, communityGoals, loading, createGoal, reload } = usePrayerGoals()
  const [tab, setTab] = useState('discover')
  const [showCreate, setShowCreate] = useState(false)
  const [prayGoal, setPrayGoal] = useState(null)

  const goalsByTab = { discover: publicGoals, mine: myGoals, community: communityGoals }
  const goals = goalsByTab[tab]

  function openHoursPrayer(goal) {
    setPrayGoal(goal)
  }

  // Karte für den geführten Modus: das Ziel selbst als Gebets-Thema
  const prayItems = prayGoal ? [{
    type: 'topic',
    request: { id: prayGoal.id, title: prayGoal.title, description: prayGoal.description, icon: prayGoal.icon },
    ampel: null,
  }] : []

  return (
    <div className="bg-bg min-h-full pb-24 md:max-w-2xl md:mx-auto">
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)',
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, flexShrink: 0 }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <h1 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Gebetsziele
            </h1>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: 4, border: 'none',
            backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)',
            borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
          }}>
            <Plus size={15} /> Neu
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer', border: 'none',
              backgroundColor: tab === t.key ? 'var(--color-warm-1)' : 'var(--color-warm-4)',
              color: tab === t.key ? 'var(--color-bg)' : 'var(--color-text-muted)',
              fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div style={{ padding: '16px 0' }}>
        {loading && <Skeleton />}
        {!loading && goals.length === 0 && (
          <EmptyState
            text={tab === 'mine' ? 'Du hast noch keine Gebetsziele erstellt.' : tab === 'community' ? 'In deinen Communities gibt es noch keine Ziele.' : 'Noch keine öffentlichen Gebetsziele.'}
            onCreate={() => setShowCreate(true)}
          />
        )}
        {!loading && goals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onOpenDetail={() => navigate(`/goals/${g.id}`)}
                onPrayHours={openHoursPrayer}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGoalSheet onClose={() => setShowCreate(false)} onCreate={createGoal} />
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
