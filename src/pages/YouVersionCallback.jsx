import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookMarked, AlertCircle } from 'lucide-react'
import { completeYouVersionLogin } from '../lib/youversion'
import { YOUVERSION_CALLBACK_PATH } from '../hooks/useYouVersionAccount'

const STATE_KEY = 'oikos_youversion_oauth_state'

export default function YouVersionCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'permission' | 'error'
  const [errorDetail, setErrorDetail] = useState(null)

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
    const expectedState = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)

    if (oauthError) {
      setStatus('error')
      setErrorDetail(oauthError)
      return
    }
    if (!code || !state || state !== expectedState) {
      setStatus('error')
      setErrorDetail('invalid_state')
      return
    }

    completeYouVersionLogin({ code, state, redirectUri: window.location.origin + YOUVERSION_CALLBACK_PATH })
      .then(({ dataExchangeUrl }) => {
        if (dataExchangeUrl) {
          // Zweiter Hop: Nutzer bestätigt separat den Zugriff auf Highlights.
          window.location.href = dataExchangeUrl
          return
        }
        setStatus('success')
        setTimeout(() => navigate('/bible', { replace: true }), 1200)
      })
      .catch(e => {
        setStatus('error')
        setErrorDetail(e.message)
      })
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
          <p style={{ color: 'var(--color-text-secondary)' }}>Deine Markierungen und Notizen werden gleich synchronisiert…</p>
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
            onClick={() => navigate('/bible', { replace: true })}
            className="px-5 py-2.5 rounded-xl font-medium"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            Zurück zur Bibel
          </button>
        </>
      )}
    </div>
  )
}
