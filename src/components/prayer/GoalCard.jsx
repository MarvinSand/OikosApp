import { useState } from 'react'
import { ChevronRight, Users, Clock } from 'lucide-react'
import ProgressBar from './ProgressBar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

// Karte für ein Gebetsziel mit Fortschrittsbalken.
// onOpenDetail(goal): Karte angeklickt → Detailseite
// onPrayHours(goal): Stunden-Ziel "Mitbeten" → geführter Gebetsmodus
export default function GoalCard({ goal, onOpenDetail, onPrayHours }) {
  const { showToast } = useToast()
  const [joined, setJoined] = useState(false)
  const [count, setCount] = useState(goal.participant_count || 0)
  const [current, setCurrent] = useState(Number(goal.current_value) || 0)

  const isHours = goal.goal_type === 'hours'
  const unit = isHours ? 'Std' : 'Pers.'

  async function handleJoin(e) {
    e.stopPropagation()
    if (joined) return
    setJoined(true)
    setCount(c => c + 1)
    setCurrent(c => c + 1)
    try {
      await supabase.rpc('contribute_to_prayer_goal', { p_goal_id: goal.id, p_minutes: 0 })
      showToast('Du betest mit 🙏')
    } catch {
      setJoined(false)
      setCount(c => Math.max(0, c - 1))
      setCurrent(c => Math.max(0, c - 1))
      showToast('Fehler beim Mitbeten', 'error')
    }
  }

  return (
    <div
      onClick={() => onOpenDetail?.(goal)}
      style={{
        backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '16px 18px',
        border: '1px solid var(--color-warm-3)', boxShadow: '0 2px 12px rgba(58,46,36,0.08)',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          backgroundColor: (goal.color || '#5AC8FA') + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {goal.icon || '🙏'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>
            {goal.title}
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
            {isHours ? <Clock size={11} /> : <Users size={11} />}
            {isHours ? 'Stunden-Ziel' : 'Personen-Ziel'}
          </p>
        </div>
        <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
      </div>

      {/* Fortschritt */}
      <ProgressBar value={current} target={Number(goal.target_value)} color={goal.color || 'var(--color-accent)'} unitLabel={unit} />

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
          🙏 {count} {count === 1 ? 'Person betet' : 'Personen beten'} mit
        </span>
        {isHours ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPrayHours?.(goal) }}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none',
              backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)',
              fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            🙏 Mitbeten
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joined}
            style={{
              padding: '8px 16px', borderRadius: 20,
              border: joined ? 'none' : '1.5px solid var(--color-warm-1)',
              backgroundColor: joined ? 'var(--color-gold-light)' : 'transparent',
              color: joined ? 'var(--color-gold-text)' : 'var(--color-warm-1)',
              fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
              cursor: joined ? 'default' : 'pointer',
            }}
          >
            {joined ? 'Du betest mit ✓' : '🙏 Ich bete mit'}
          </button>
        )}
      </div>
    </div>
  )
}
