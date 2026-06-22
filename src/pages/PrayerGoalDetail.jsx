import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Clock } from 'lucide-react'
import { usePrayerGoal } from '../hooks/usePrayerGoal'
import { useToast } from '../context/ToastContext'
import ProgressBar from '../components/prayer/ProgressBar'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function PrayerGoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { goal, participants, hasJoined, loading, contribute, reload } = usePrayerGoal(id)
  const [showPrayer, setShowPrayer] = useState(false)
  const [joining, setJoining] = useState(false)

  if (loading) {
    return (
      <div className="bg-bg min-h-full flex items-center justify-center">
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--color-warm-3)', borderTopColor: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="bg-bg min-h-full flex flex-col items-center justify-center gap-4 px-8" style={{ color: 'var(--color-text-muted)' }}>
        <p style={{ fontFamily: 'Lora, serif' }}>Dieses Gebetsziel wurde nicht gefunden.</p>
        <button onClick={() => navigate('/')} style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontWeight: 600, cursor: 'pointer' }}>
          Zur Startseite
        </button>
      </div>
    )
  }

  const isHours = goal.goal_type === 'hours'
  const unit = isHours ? 'Std' : 'Pers.'

  async function handleJoinPeople() {
    if (hasJoined || joining) return
    setJoining(true)
    try {
      await contribute(0)
      showToast('Du betest mit 🙏')
    } catch {
      showToast('Fehler beim Mitbeten', 'error')
    } finally {
      setJoining(false)
    }
  }

  const prayItems = [{
    type: 'topic',
    request: { id: goal.id, title: goal.title, description: goal.description, icon: goal.icon },
    ampel: null,
  }]

  return (
    <div className="bg-bg min-h-full pb-24 md:max-w-2xl md:mx-auto">
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)',
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, flexShrink: 0 }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Gebetsziel
          </h1>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Großes Icon + Titel */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 14px',
            backgroundColor: (goal.color || '#5AC8FA') + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          }}>
            {goal.icon || '🙏'}
          </div>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
            {goal.title}
          </h2>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            {isHours ? <Clock size={13} /> : <Users size={13} />}
            {isHours ? 'Stunden-Ziel' : 'Personen-Ziel'}
          </p>
        </div>

        {/* Fortschritt */}
        <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '20px 18px', border: '1px solid var(--color-warm-3)', boxShadow: '0 2px 12px rgba(58,46,36,0.08)', marginBottom: 20 }}>
          <ProgressBar value={Number(goal.current_value) || 0} target={Number(goal.target_value)} color={goal.color || 'var(--color-accent)'} height={14} unitLabel={unit} />
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '14px 0 0', textAlign: 'center' }}>
            🙏 {goal.participant_count || 0} {(goal.participant_count || 0) === 1 ? 'Person betet' : 'Personen beten'} mit
          </p>
        </div>

        {/* Beschreibung */}
        {goal.description && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 24 }}>
            {goal.description}
          </p>
        )}

        {/* Mitbeten-Button */}
        {isHours ? (
          <button onClick={() => setShowPrayer(true)} style={primaryBtn}>
            🙏 Jetzt mitbeten
          </button>
        ) : (
          <button onClick={handleJoinPeople} disabled={hasJoined || joining} style={{
            ...primaryBtn,
            backgroundColor: hasJoined ? 'var(--color-gold-light)' : 'var(--color-warm-1)',
            color: hasJoined ? 'var(--color-gold-text)' : 'var(--color-bg)',
            cursor: hasJoined ? 'default' : 'pointer',
          }}>
            {hasJoined ? 'Du betest mit ✓' : '🙏 Ich bete mit'}
          </button>
        )}

        {/* Teilnehmer */}
        {participants.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Beter ({participants.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {participants.slice(0, 30).map(p => {
                const name = p.profiles?.full_name || p.profiles?.username || 'Unbekannt'
                return (
                  <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: p.profiles?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700,
                    }}>{getInitials(name)}</div>
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)' }}>{name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showPrayer && (
        <GuidedPrayerMode
          items={prayItems}
          goalId={goal.id}
          onClose={() => { setShowPrayer(false); reload() }}
        />
      )}
    </div>
  )
}

const primaryBtn = {
  width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
  backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)',
  fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
