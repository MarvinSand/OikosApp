import { useState } from 'react'
import { Cross, MailCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function Auth() {
  const hasSeenWelcome = typeof window !== 'undefined' && localStorage.getItem('oikos_welcome_seen')
  const [view, setView] = useState(hasSeenWelcome ? 'login' : 'welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login, register } = useAuth()
  const { showToast } = useToast()

  function goToReset() { setError(''); setView('reset') }
  function goToLogin() { setError(''); setView('login') }
  function goToRegister() { localStorage.setItem('oikos_welcome_seen', 'true'); setError(''); setView('register') }
  function goFromWelcomeToLogin() { localStorage.setItem('oikos_welcome_seen', 'true'); setError(''); setView('login') }

  async function handleLoginOrRegister(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (view === 'login') {
        await login(email, password)
      } else {
        await register(email, password, fullName, gender)
        setView('email-sent')
        return
      }
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendReset(e) {
    e?.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (err) throw err
      setView('reset-sent')
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    setIsLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      showToast('E-Mail erneut gesendet ✓')
    } catch {
      showToast('Fehler beim Senden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`bg-bg flex flex-col items-center relative ${view === 'welcome' ? 'h-[100dvh] overflow-hidden justify-center px-5 py-4' : 'min-h-screen justify-start p-6 pt-10 pb-10 overflow-y-auto'}`}>
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-warm-3/30 pointer-events-none blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-warm-2/20 pointer-events-none blur-3xl animate-pulse" />

      {/* Logo Section */}
      <div className={`text-center relative z-10 animate-fade-in ${view === 'welcome' ? 'mb-4' : 'mb-10'}`}>
        <h1 className="font-serif text-5xl font-bold text-warm-1 tracking-tight leading-none mb-2 drop-shadow-sm">
          OIKOS
        </h1>
        <div className="flex justify-center mb-2">
          <Cross size={22} className="text-warm-2" strokeWidth={2.5} />
        </div>
        <p className="font-serif italic text-sm text-dark-muted leading-relaxed">
          „Dein Umfeld. Dein Gebet. Deine Mission."
        </p>
      </div>

      {/* Main Card */}
      <div className={`w-full max-w-sm glass-panel rounded-3xl relative z-10 animate-slide-up ${view === 'welcome' ? 'p-5' : 'p-7'}`}>

        {/* Welcome Screen */}
        {view === 'welcome' && (
          <div className="animate-fade-in flex flex-col gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-warm-1 mb-0.5">Willkommen bei OIKOS 🌱</h2>
              <p className="font-serif text-xs font-semibold text-dark">Schön, dass du hier bist!</p>
            </div>
            <div className="flex flex-col gap-2 text-xs text-dark-muted leading-relaxed font-serif">
              <p>
                OIKOS hilft dir, dein Umfeld mit neuen Augen zu sehen. Die Menschen, die Gott dir anvertraut hat, bewusster wahrzunehmen und sie im Gebet vor ihn zu bringen.
              </p>
              <p>
                Schritt für Schritt begleitet dich die App dabei, Personen in deinem Leben, die Jesus noch nicht kennen, näher zu ihm zu führen. Ganz natürlich, in deinem Alltag.
              </p>
              <p>
                Gleichzeitig verbindet OIKOS dich mit deinen Glaubensgeschwistern. Auch über Entfernungen hinweg. Du siehst, wie und wo Gott in ihrem Umfeld wirkt, kennst ihre Gebetsanliegen und kannst sie geistlich mittragen.
              </p>
              <p className="text-dark font-medium">Lass uns gemeinsam erleben, was Gott tut. 🙏</p>
            </div>
            <button
              onClick={goToRegister}
              className="w-full py-3 rounded-xl font-semibold text-white bg-warm-1 hover:bg-warm-2 hover:shadow-lg hover:shadow-warm-1/30 transition-all duration-300"
            >
              Jetzt starten →
            </button>
            <button
              onClick={goFromWelcomeToLogin}
              className="w-full py-2 rounded-xl text-sm font-medium text-dark-muted hover:text-warm-1 transition-colors"
            >
              Bereits registriert? Anmelden
            </button>
          </div>
        )}

        {/* Login & Register Logic */}
        {(view === 'login' || view === 'register') && (
          <>
            {/* Tab Switch */}
            <div className="flex bg-warm-4/50 p-1.5 rounded-2xl mb-7 backdrop-blur-sm">
              {[['login', 'Anmelden'], ['register', 'Registrieren']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => { setView(t); setError('') }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    view === t 
                      ? 'bg-white text-warm-1 shadow-sm font-semibold' 
                      : 'text-dark-muted hover:text-dark'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleLoginOrRegister} className="flex flex-col gap-4">
              {view === 'register' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-dark-muted ml-1">Vollständiger Name</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)} 
                      placeholder="Max Mustermann" 
                      required 
                      className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-white/50 focus:bg-white focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-dark-muted ml-1">Geschlecht</label>
                    <div className="flex gap-2">
                      {[['brother', '🙋‍♂️ Bruder'], ['sister', '🙋‍♀️ Schwester']].map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setGender(val)}
                          className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all border ${
                            gender === val 
                              ? 'bg-warm-1 text-white border-warm-1 shadow-md shadow-warm-1/20' 
                              : 'bg-white/50 text-dark-muted border-warm-3 hover:border-warm-2/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">E-Mail</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@beispiel.de" 
                  required 
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-white/50 focus:bg-white focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline px-1">
                  <label className="text-sm font-medium text-dark-muted">Passwort</label>
                  {view === 'login' && (
                    <button 
                      type="button" 
                      onClick={goToReset} 
                      className="text-xs font-medium text-warm-1 hover:text-warm-2 transition-colors"
                    >
                      Passwort vergessen?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Mindestens 6 Zeichen" 
                    required minLength={6} 
                    className="w-full pl-4 pr-12 py-3 rounded-xl border-1.5 border-warm-3 bg-white/50 focus:bg-white focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(v => !v)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-dark-light hover:text-warm-1 transition-colors rounded-lg"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-fade-in border border-red-100">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading || (view === 'register' && !gender)} 
                className="w-full py-3.5 mt-2 rounded-xl font-semibold text-white bg-warm-1 hover:bg-warm-2 hover:shadow-lg hover:shadow-warm-1/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? 'Einen Moment...' : view === 'login' ? 'Anmelden' : 'Konto erstellen'}
              </button>
            </form>
          </>
        )}

        {/* Password Reset Logic */}
        {view === 'reset' && (
          <div className="animate-fade-in">
            <button onClick={goToLogin} className="flex items-center gap-1.5 text-sm font-medium text-dark-muted hover:text-warm-1 transition-colors mb-6">
              ← Zurück
            </button>
            <h3 className="text-2xl font-bold text-dark mb-2">Passwort zurücksetzen</h3>
            <p className="text-sm text-dark-muted mb-6 leading-relaxed">
              Gib deine E-Mail-Adresse ein, und wir senden dir einen Link zum Zurücksetzen deines Passworts.
            </p>

            <form onSubmit={handleSendReset} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">E-Mail</label>
                <input 
                  autoFocus 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@beispiel.de" 
                  required 
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-white/50 focus:bg-white focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-fade-in border border-red-100">
                  {error}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isLoading || !email.trim()} 
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-warm-1 hover:bg-warm-2 hover:shadow-lg hover:shadow-warm-1/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? 'Sende…' : 'Link senden'}
              </button>
            </form>
          </div>
        )}

        {/* Email Confirmation Sent */}
        {view === 'email-sent' && (
          <div className="text-center animate-fade-in py-4">
            <div className="w-20 h-20 bg-gold-light/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailCheck size={40} className="text-gold" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-dark mb-3">Fast geschafft!</h3>
            <p className="text-sm text-dark-muted leading-relaxed mb-6">
              Wir haben dir eine Bestätigungs-E-Mail an <strong className="text-dark">{email}</strong> geschickt.
              Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
            </p>
            <button
              onClick={goToLogin}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-warm-1 hover:bg-warm-2 hover:shadow-lg hover:shadow-warm-1/30 transition-all duration-300"
            >
              Zum Login
            </button>
          </div>
        )}

        {/* Reset Confirmation Logic */}
        {view === 'reset-sent' && (
          <div className="text-center animate-fade-in py-4">
            <div className="w-20 h-20 bg-gold-light/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailCheck size={40} className="text-gold" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-dark mb-3">Schau in dein Postfach</h3>
            <p className="text-sm text-dark-muted leading-relaxed mb-6">
              Wir haben dir einen Link an <strong className="text-dark">{email}</strong> geschickt. Klicke darauf, um ein neues Passwort zu setzen.
            </p>
            
            <div className="bg-warm-4/40 p-4 rounded-xl mb-6">
              <p className="text-xs text-dark-muted mb-1">Keine Mail erhalten?</p>
              <button 
                onClick={handleResend} 
                disabled={isLoading} 
                className="text-sm font-bold text-warm-1 hover:text-warm-2 transition-colors disabled:opacity-50"
              >
                Erneut senden
              </button>
            </div>
            
            <button 
              onClick={goToLogin} 
              className="w-full py-3.5 rounded-xl font-semibold text-dark border-1.5 border-warm-3 hover:bg-warm-4/50 transition-colors"
            >
              Zurück zum Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
