import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCommunities } from '../hooks/useCommunities'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

// Ziel der Community-QR-Codes (/join/<Code>): tritt per Einladungscode bei und
// öffnet die Community. Ist man schon Mitglied, wird sie einfach geöffnet.
export default function JoinByCode() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { joinByCode } = useCommunities()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    joinByCode(code)
      .then(c => { showToast(`Willkommen in ${c.name}!`); navigate(`/community/${c.id}`, { replace: true }) })
      .catch(async e => {
        // Schon Mitglied → einfach die Community öffnen
        const { data } = await supabase.from('communities').select('id').eq('invite_code', code.trim().toUpperCase()).maybeSingle()
        if (data && /bereits/.test(e.message)) navigate(`/community/${data.id}`, { replace: true })
        else setError(e.message || 'Beitritt fehlgeschlagen')
      })
  }, [code])

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center bg-bg">
      <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text)' }}>{error || 'Trete der Community bei…'}</p>
      {error && <button onClick={() => navigate('/', { replace: true })} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', color: 'var(--color-text)', fontFamily: 'Lora, serif', cursor: 'pointer' }}>Zur Startseite</button>}
    </div>
  )
}
