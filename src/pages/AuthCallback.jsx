import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cross, MailCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'

  useEffect(() => {
    // Für PKCE-Flow (Supabase v2 Standard) den Code aus der URL explizit gegen
    // eine Session tauschen, bevor wir auf Auth-Events warten.
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {
        // Fehler ignorieren – onAuthStateChange behandelt das Ergebnis
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        // E-Mail als verifiziert markieren
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('id', session.user.id)

        setStatus('success')
        // Kurz Erfolgsmeldung zeigen, dann zur Login-Seite –
        // dort erkennt App.jsx die aktive Session und leitet automatisch weiter.
        setTimeout(() => navigate('/auth', { replace: true }), 1500)
      }
    })

    // Fallback: falls kein Auth-Event innerhalb von 5s eintrifft
    const fallback = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/auth', { replace: true })
        } else {
          setStatus('error')
          setTimeout(() => navigate('/auth', { replace: true }), 3000)
        }
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-warm-3/30 pointer-events-none blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-warm-2/20 pointer-events-none blur-3xl" />

      <div className="text-center mb-8 relative z-10">
        <h1 className="font-serif text-5xl font-bold text-warm-1 tracking-tight leading-none mb-2">OIKOS</h1>
        <div className="flex justify-center mb-2">
          <Cross size={22} className="text-warm-2" strokeWidth={2.5} />
        </div>
      </div>

      <div className="w-full max-w-sm glass-panel rounded-3xl p-7 text-center relative z-10 animate-slide-up">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full border-[3px] border-warm-3 border-t-warm-1 animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-dark mb-2">E-Mail wird bestätigt…</h3>
            <p className="text-sm text-dark-muted">Einen Moment bitte.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-gold-light/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailCheck size={40} className="text-gold" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-dark mb-3">E-Mail bestätigt!</h3>
            <p className="text-sm text-dark-muted leading-relaxed">
              Dein Konto ist jetzt aktiv. Du wirst weitergeleitet…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-400" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-dark mb-3">Link ungültig</h3>
            <p className="text-sm text-dark-muted leading-relaxed mb-6">
              Der Link ist abgelaufen oder wurde bereits verwendet. Du wirst zum Login weitergeleitet…
            </p>
          </>
        )}
      </div>
    </div>
  )
}
