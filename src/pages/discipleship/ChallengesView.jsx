import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

const CreateChallengeSheet = lazy(() => import('../../components/discipleship/CreateChallengeSheet'))

function ChallengeRow({ challenge, onOpen, progress }) {
  return (
    <button onClick={onOpen} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-bg)' }}>
        {challenge.type === 'social' ? <Users size={16} style={{ color: 'var(--color-accent)' }} /> : <User size={16} style={{ color: 'var(--color-accent)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{challenge.title}</p>
        {progress != null && challenge.goal_type !== 'once' && (
          <p style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{progress} / {challenge.goal_value} {challenge.goal_type === 'days' ? 'Tage' : ''}</p>
        )}
      </div>
    </button>
  )
}

export default function ChallengesView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState([])
  const [open, setOpen] = useState([])
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: completedStations }, { data: participations }] = await Promise.all([
      supabase.from('user_station_progress').select('station_id').eq('user_id', user.id).eq('status', 'completed'),
      supabase.from('challenge_participants').select('challenge_id, status, progress_value, challenges:challenge_id (id, title, type, goal_type, goal_value, station_id)').eq('user_id', user.id),
    ])

    const completedStationIds = (completedStations || []).map(s => s.station_id)
    const participatedIds = (participations || []).map(p => p.challenge_id)

    let openChallenges = []
    if (completedStationIds.length > 0) {
      const { data } = await supabase
        .from('challenges')
        .select('id, title, type, goal_type, goal_value, station_id')
        .eq('is_official', true)
        .in('station_id', completedStationIds)
      openChallenges = (data || []).filter(c => !participatedIds.includes(c.id))
    }

    setActive((participations || []).filter(p => p.status === 'active').map(p => ({ ...p.challenges, progress: p.progress_value })))
    setCompleted((participations || []).filter(p => p.status === 'completed').map(p => ({ ...p.challenges, progress: p.progress_value })))
    setOpen(openChallenges)
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user?.id])

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft/challenges" />

      <div className="px-4 py-4" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold mb-6"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={17} /> Eigene Challenge erstellen
        </button>

        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}

        {!loading && (
          <>
            <ChallengeGroup title="Aktiv" items={active} navigate={navigate} />
            <ChallengeGroup title="Offen (nachholbar)" items={open} navigate={navigate} />
            <ChallengeGroup title="Abgeschlossen" items={completed} navigate={navigate} />
          </>
        )}
      </div>

      <Suspense fallback={null}>
        {showCreate && <CreateChallengeSheet onClose={() => setShowCreate(false)} onCreated={load} />}
      </Suspense>
    </div>
  )
}

function ChallengeGroup({ title, items, navigate }) {
  if (items.length === 0) return null
  return (
    <div className="mb-6">
      <h2 className="font-bold mb-2.5" style={{ fontFamily: 'Lora, serif', fontSize: 16, color: 'var(--color-text)' }}>{title} ({items.length})</h2>
      <div className="space-y-2">
        {items.map(c => (
          <ChallengeRow key={c.id} challenge={c} progress={c.progress} onOpen={() => navigate(`/juengerschaft/challenges/${c.id}`)} />
        ))}
      </div>
    </div>
  )
}
