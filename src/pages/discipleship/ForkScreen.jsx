import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { upsertDiscipleshipProfile } from '../../lib/pilgerweg'
import MountainBackground from '../../components/discipleship/MountainBackground'

export default function ForkScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  async function chooseNarrowPath() {
    if (saving) return
    setSaving(true)
    try {
      await upsertDiscipleshipProfile(user.id, { path_choice: 'schmaler_weg' })
      navigate('/discipleship', { replace: true })
    } catch (err) {
      showToast?.(err.message || 'Konnte Entscheidung nicht speichern', 'error')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
      <MountainBackground variant="fork" />

      <button
        onClick={() => navigate(-1)}
        aria-label="Zurück"
        style={{
          position: 'relative', zIndex: 2, margin: '14px 0 0 14px',
          width: 38, height: 38, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.85)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: '#000',
        }}
      >
        <ArrowLeft size={19} />
      </button>

      <div style={{ position: 'relative', zIndex: 2, padding: '18px 24px 0', textAlign: 'center' }}>
        <p
          className="font-serif"
          style={{
            fontSize: 19, lineHeight: 1.5, color: '#fff',
            textShadow: '0 1px 6px rgba(0,0,0,0.45)', maxWidth: 320, margin: '0 auto',
          }}
        >
          Zwei Wege liegen vor dir – Matthäus 7,13–14
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 2, minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 20px 56px', gap: 12 }}>
          {/* Breiter Weg – nur illustrativ */}
          <div style={{ textAlign: 'center', maxWidth: 140 }}>
            <span
              style={{
                display: 'inline-block', padding: '6px 12px', borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.75)', color: '#3A3A3C',
                fontSize: 12, fontWeight: 600,
              }}
            >
              Der breite Weg
            </span>
          </div>

          {/* Schmaler Weg – tappbar */}
          <div style={{ textAlign: 'center', maxWidth: 200 }}>
            <button
              onClick={chooseNarrowPath}
              disabled={saving}
              className="press-scale"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 20px', borderRadius: 999, border: 'none',
                backgroundColor: '#2E7D46', color: '#fff',
                fontSize: 14.5, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1, boxShadow: '0 6px 18px rgba(46,125,70,0.35)',
              }}
            >
              Ich wähle den schmalen Weg <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
