import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookMarked, AlertCircle } from 'lucide-react'
import { completeYouVersionLogin, completeYouVersionSignIn } from '../lib/youversion'
import { resolveYouVersionRedirectUri } from '../hooks/useYouVersionAccount'
import { supabase } from '../lib/supabase'

export default function YouVersionCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'permission' | 'error'
  const [errorDetail, setErrorDetail] = useState(null)
  const [fallbackPath, setFallbackPath] = useState('/bible')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Zweiter Redirect (nach der "Data Exchange"-Zustimmungsseite für
    // Highlights) landet vermutlich auf derselben Route - erkennbar an
    // data_exchange_status statt code/state.
    const dxStatus = params.get('data_exchange_status')
    if (dxStatus) {
      if (dxStatus === 'granted') {
        setStatus('success')
      } else {
        setStatus('permission')
        setErrorDetail(params.get('error_description') || 'Zugriff auf Highlights nicht erteilt.')
      }
      setTimeout(() => navigate('/bible', { replace: true }), 1500)
      return
    }

    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError) {
      setStatus('error')
      setErrorDetail(oauthError)
      return
    }
    if (!state) {
      setStatus('error')
      setErrorDetail('invalid_request')
      return
    }
    // Seit Juli 2026 ist der erste Rücksprung von /auth/authorize bewusst
    // "state-only" (Identität wird serverseitig an den State gebunden). Erst
    // eine zweite Top-Level-Navigation zu /auth/callback?state=... liefert
    // per 302 den echten "code" - ein fetch() kann den Location-Header davon
    // nicht lesen, es muss eine echte Browser-Navigation sein. Diese Seite
    // wird dadurch ein zweites Mal geladen, diesmal mit ?code=...&state=...
    if (!code) {
      window.location.assign(`https://api.youversion.com/auth/callback?state=${encodeURIComponent(state)}`)
      return
    }
    // Kein Client-seitiger sessionStorage-Abgleich des States: YouVersion
    // kann auf eine andere (Sub-)Domain zurückleiten als die, auf der der
    // Login gestartet wurde (z.B. www.oikosapp.net -> oikosapp.net, weil nur
    // Letzteres als Callback-URL registriert ist) - das ist ein anderer
    // Origin, dessen sessionStorage nicht lesbar ist. Die Edge Function
    // validiert den State bereits serverseitig, das reicht.

    ;(async () => {
      const redirectUri = resolveYouVersionRedirectUri()
      const { data: { session } } = await supabase.auth.getSession()

      try {
        if (session) {
          // Bereits bei Oikos eingeloggt -> "link"-Modus (Bibel/Einstellungen).
          const { dataExchangeUrl } = await completeYouVersionLogin({ code, state, redirectUri })
          if (dataExchangeUrl) {
            window.location.href = dataExchangeUrl
            return
          }
          setStatus('success')
          setTimeout(() => navigate('/bible', { replace: true }), 1200)
        } else {
          // Keine Oikos-Session -> "signin"-Modus (Login-Bildschirm).
          setFallbackPath('/auth')
          const { email, tokenHash } = await completeYouVersionSignIn({ code, state, redirectUri })
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token_hash: tokenHash,
            type: 'magiclink',
          })
          if (verifyError) throw verifyError
          setStatus('success')
          setTimeout(() => navigate('/', { replace: true }), 800)
        }
      } catch (e) {
        setStatus('error')
        setErrorDetail(e.message)
      }
    })()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      {status === 'loading' && (
        <>
          <div className="w-14 h-14 rounded-full animate-spin mb-6" style={{ border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Verbinde mit YouVersion…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <BookMarked size={36} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>YouVersion verbunden</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Du wirst weitergeleitet…</p>
        </>
      )}
      {status === 'permission' && (
        <>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <BookMarked size={36} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Verbunden, aber ohne Highlights</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>{errorDetail}</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <AlertCircle size={36} style={{ color: 'var(--color-error, #e11d48)' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Verbindung fehlgeschlagen</h1>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {errorDetail || 'Unbekannter Fehler'}
          </p>
          <button
            onClick={() => navigate(fallbackPath, { replace: true })}
            className="px-5 py-2.5 rounded-xl font-medium"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            Zurück
          </button>
        </>
      )}
    </div>
  )
}
