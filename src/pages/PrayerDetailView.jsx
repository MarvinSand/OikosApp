import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PrayerCardList from '../components/prayer/PrayerCardList'
import { normalizePrayer, KIND_OIKOS, KIND_PERSONAL } from '../lib/prayerModel'

const PROFILE_SELECT = 'profiles!owner_id(id, username, full_name, gender, is_christian, avatar_url)'

// Einzelnes Gebet – analog zur Feed-Detailseite (FeedPostView). Lädt das Gebet
// direkt per ID und zeigt es mit der gemeinsamen Gebets-Karte, also denselben
// Aktionen wie überall sonst (beten, kommentieren, Liste, weiterleiten).
export default function PrayerDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [prayer, setPrayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() /* eslint-disable-next-line */ }, [id])

  async function load() {
    setLoading(true)
    setNotFound(false)

    // 1) Persönliches Anliegen (Feed, Community, geteilt)
    const { data: personal } = await supabase
      .from('personal_prayer_requests')
      .select(`*, ${PROFILE_SELECT}`)
      .eq('id', id)
      .maybeSingle()

    if (personal) {
      setPrayer(normalizePrayer(personal, { kind: KIND_PERSONAL }))
      setLoading(false)
      return
    }

    // 2) Oikos-Anliegen (an eine Person gebunden)
    const { data: perPerson } = await supabase
      .from('prayer_requests')
      .select(`*, ${PROFILE_SELECT}, oikos_people!person_id(name, is_christian, map_id)`)
      .eq('id', id)
      .maybeSingle()

    if (perPerson) {
      setPrayer(normalizePrayer(perPerson, { kind: KIND_OIKOS }))
      setLoading(false)
      return
    }

    setNotFound(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0,
        backgroundColor: 'var(--color-bg)', zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} aria-label="Zurück" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Gebet</span>
      </div>

      <div style={{ padding: '14px 16px 90px', maxWidth: 640, margin: '0 auto' }}>
        {loading && <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>Lädt…</p>}
        {!loading && notFound && <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>Gebet nicht gefunden.</p>}
        {!loading && prayer && (
          <PrayerCardList prayers={[prayer]} onChanged={() => navigate(-1)} />
        )}
      </div>
    </div>
  )
}
