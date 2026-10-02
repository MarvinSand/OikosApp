import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { useProfileCompletion } from '../../hooks/useProfileCompletion'

// Zeigt den Fortschritt der Profil-Vervollständigung auf der Home-Startseite –
// verschwindet automatisch, sobald alle Schritte erledigt sind.
export default function ProfileCompletionCard() {
  const navigate = useNavigate()
  const { percent, steps, loading, isComplete } = useProfileCompletion()
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div style={{ height: 96, borderRadius: 18, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    )
  }

  if (isComplete) return null

  const openSteps = steps.filter(s => !s.isDone)
  const visibleSteps = expanded ? steps : openSteps.slice(0, 2)

  return (
    <div
      style={{
        borderRadius: 18,
        padding: '18px 16px 16px',
        background: 'linear-gradient(150deg, var(--color-accent-light) 0%, var(--color-bg) 78%)',
        border: '1px solid var(--color-accent)',
        boxShadow: '0 6px 20px rgba(58,46,36,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
          Profil vervollständigen
        </p>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 800, color: 'var(--color-accent)', margin: 0 }}>
          {percent}%
        </p>
      </div>

      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
        Nur noch ein paar Schritte, bis dein Profil vollständig ist.
      </p>

      {/* Fortschrittsbalken */}
      <div style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            borderRadius: 4,
            background: 'var(--color-accent)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleSteps.map(step => (
          <button
            key={step.key}
            onClick={() => !step.isDone && navigate(step.target)}
            disabled={step.isDone}
            aria-label={`${step.title}${step.isDone ? ' (erledigt)' : ' öffnen'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: 6, margin: -6, borderRadius: 12, border: 'none', background: 'none',
              cursor: step.isDone ? 'default' : 'pointer',
            }}
          >
            {step.isDone ? (
              <CheckCircle2 size={20} strokeWidth={2} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={20} strokeWidth={2} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, margin: '0 0 1px',
                color: step.isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                textDecoration: step.isDone ? 'line-through' : 'none',
              }}>
                {step.title}
              </p>
              {!step.isDone && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.45, margin: 0 }}>
                  {step.text}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {openSteps.length > 2 && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            width: '100%', marginTop: 12, padding: '8px 0', borderRadius: 10,
            border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-accent)',
          }}
        >
          {expanded ? <>Weniger anzeigen <ChevronUp size={15} /></> : <>Alle Schritte anzeigen <ChevronDown size={15} /></>}
        </button>
      )}
    </div>
  )
}
