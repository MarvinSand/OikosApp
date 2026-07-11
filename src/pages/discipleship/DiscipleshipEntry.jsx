import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { fetchDiscipleshipProfile } from '../../lib/pilgerweg'
import ForkScreen from './ForkScreen'
import PathScreen from './PathScreen'

export default function DiscipleshipEntry() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    let cancelled = false
    fetchDiscipleshipProfile(user.id).then(p => { if (!cancelled) setProfile(p) })
    return () => { cancelled = true }
  }, [user.id])

  if (profile === undefined) return null

  if (profile?.path_choice === 'schmaler_weg') return <PathScreen />

  if (!profile || profile.glaubensstand === 'noch_nicht_glaeubig') {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 28 }}>
          🌱
        </div>
        <h1 className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
          Dein Pilgerweg beginnt bald
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: 320, lineHeight: 1.5 }}>
          Dieser Bereich schaltet sich frei, sobald du dich für Jesus entschieden hast.
        </p>
        <button
          onClick={() => navigate('/discipleship/debug')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <SlidersHorizontal size={14} /> Debug: Profil-Tags setzen
        </button>
      </div>
    )
  }

  return <ForkScreen />
}
