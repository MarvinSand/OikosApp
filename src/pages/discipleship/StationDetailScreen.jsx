import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { fetchUserStationProgress, markStationDone } from '../../lib/pilgerweg'
import StationDetail from '../../components/discipleship/StationDetail'

export default function StationDetailScreen() {
  const { stationId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [station, setStation] = useState(null)
  const [isDone, setIsDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: st, error }, progress] = await Promise.all([
        supabase.from('stations').select('id, type, category, title, description, stages(name)').eq('id', stationId).single(),
        fetchUserStationProgress(user.id),
      ])
      if (cancelled) return
      if (error) {
        showToast?.('Station konnte nicht geladen werden', 'error')
        setLoading(false)
        return
      }
      setStation(st)
      setIsDone(progress[stationId]?.status === 'done')
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [stationId, user.id])

  async function handleMarkDone() {
    try {
      await markStationDone(user.id, stationId)
      setIsDone(true)
      showToast?.('Als erledigt markiert', 'success')
    } catch (err) {
      showToast?.(err.message || 'Konnte nicht gespeichert werden', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
    )
  }

  if (!station) return null

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          backgroundColor: 'var(--color-bg)', position: 'sticky', top: 0, zIndex: 10,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button onClick={() => navigate(-1)} aria-label="Zurück" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {station.stages?.name}
          </p>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{station.title}</h1>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <StationDetail station={station} isDone={isDone} onMarkDone={handleMarkDone} user={user} />
      </div>
    </div>
  )
}
