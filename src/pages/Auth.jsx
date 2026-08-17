import { useState } from 'react'
import { Cross, MailCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useChangePassword } from '../hooks/useChangePassword'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function Auth() {
  const hasSeenWelcome = typeof window !== 'undefined' && localStorage.getItem('oikos_welcome_seen')
  const [view, setView] = useState(hasSeenWelcome ? 'login' : 'welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)

  const { login, register } = useAuth()
  const { showToast } = useToast()
  const resetFlow = useChangePassword('loggedOut')

  function goToReset() { setError(''); resetFlow.reset(); setView('reset') }
  function goToLogin() { setError(''); setView('login') }
  function goToRegister() { localStorage.setItem('oikos_welcome_seen', 'true'); setError(''); setView('register') }
  function goFromWelcomeToLogin() { localStorage.setItem('oikos_welcome_seen', 'true'); setError(''); setView('login') }

  async function handleLoginOrRegister(e) {
    e.preventDefault()
    setError('')
    setEmailNotConfirmed(false)
    setIsLoading(true)
    try {
      if (view === 'login') {
        await login(email, password)
      } else {
        // Benutzername-Verfügbarkeit vor der Registrierung prüfen
        const { data: available, error: checkErr } = await supabase.rpc('is_username_available', { p_username: username.trim() })
        if (!checkErr && available === false) {
          setError('Dieser Benutzername ist bereits vergeben.')
          return
        }
        const data = await register(email, password, fullName, gender, username.trim())
        if (!data?.session) {
          setView('email-sent')
        }
        // Falls Session vorhanden, leitet App.jsx automatisch weiter
        return
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        setEmailNotConfirmed(true)
      } else if (err.code === '23505' || err.message?.toLowerCase().includes('duplicate') || err.message?.toLowerCase().includes('unique')) {
        setError('Dieser Benutzername ist bereits vergeben.')
      } else {
        setError(err.message || 'Ein Fehler ist aufgetreten.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendConfirmation() {
    setIsLoading(true)
    try {
      await supabase.auth.resend({ type: 'signup', email })
      showToast('Bestätigungs-E-Mail erneut gesendet ✓')
    } catch {
      showToast('Fehler beim Senden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendReset(e) {
    e?.preventDefault()
    await resetFlow.sendCode(email)
  }

  async function handleResendCode() {
    try {
      await resetFlow.sendCode(email)
      showToast('Code erneut gesendet ✓')
    } catch {
      showToast('Fehler beim Senden', 'error')
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    const ok = await resetFlow.submit(email)
    if (ok) {
      showToast('Passwort geändert ✓')
      setTimeout(goToLogin, 1500)
    }
  }

  return (
    <div className={`bg-bg flex flex-col items-center relative ${view === 'welcome' ? 'h-[100dvh] overflow-hidden justify-center px-5 py-4' : 'h-[100dvh] justify-start p-6 pt-10 pb-10 overflow-y-auto overflow-x-hidden'}`}>
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/10 pointer-events-none blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent/5 pointer-events-none blur-3xl animate-pulse" />

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
              className="w-full py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 transition-all duration-300"
            >
              Jetzt starten →
            </button>
            <button
              onClick={goFromWelcomeToLogin}
              className="w-full py-2 rounded-xl text-sm font-medium text-dark-muted hover:text-accent transition-colors"
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
                      ? 'bg-bg text-warm-1 shadow-sm font-semibold' 
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
                      className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-dark-muted ml-1">Benutzername</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="z.B. max_mustermann"
                      required
                      minLength={3}
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
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
                              ? 'bg-accent text-white border-accent shadow-md shadow-accent/20' 
                              : 'bg-paper text-dark-muted border-warm-3 hover:border-warm-2/50'
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
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline px-1">
                  <label className="text-sm font-medium text-dark-muted">Passwort</label>
                  {view === 'login' && (
                    <button 
                      type="button" 
                      onClick={goToReset} 
                      className="text-xs font-medium text-accent hover:text-accent-dark transition-colors"
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
                    className="w-full pl-4 pr-12 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(v => !v)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-dark-light hover:text-accent transition-colors rounded-lg"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-error-bg text-error text-sm p-3 rounded-xl text-center font-medium animate-fade-in border border-error/20">
                  {error}
                </div>
              )}

              {emailNotConfirmed && (
                <div className="bg-gold-light text-gold-text text-sm p-3 rounded-xl animate-fade-in border border-gold/30">
                  <p className="font-medium mb-1">E-Mail noch nicht bestätigt.</p>
                  <p className="text-xs text-gold-text mb-2">Bitte bestätige deine E-Mail-Adresse, um dich anzumelden.</p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                    className="text-xs font-bold text-accent hover:text-accent-dark transition-colors disabled:opacity-50"
                  >
                    Bestätigungs-E-Mail erneut senden →
                  </button>
                </div>
              )}

              <button
                type="submit" 
                disabled={isLoading || (view === 'register' && (!gender || !username.trim()))}
                className="w-full py-3.5 mt-2 rounded-xl font-semibold text-white bg-accent hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? 'Einen Moment...' : view === 'login' ? 'Anmelden' : 'Konto erstellen'}
              </button>
            </form>
          </>
        )}

        {/* Password Reset Logic – Code statt Link, funktioniert immer auf dem
            Gerät, auf dem man gerade ist */}
        {view === 'reset' && resetFlow.step === 'request' && (
          <div className="animate-fade-in">
            <button onClick={goToLogin} className="flex items-center gap-1.5 text-sm font-medium text-dark-muted hover:text-accent transition-colors mb-6">
              ← Zurück
            </button>
            <h3 className="text-2xl font-bold text-dark mb-2">Passwort zurücksetzen</h3>
            <p className="text-sm text-dark-muted mb-6 leading-relaxed">
              Gib deine E-Mail-Adresse ein, und wir senden dir einen Code zum Zurücksetzen deines Passworts.
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
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                />
              </div>

              {resetFlow.error && (
                <div className="bg-error-bg text-error text-sm p-3 rounded-xl text-center font-medium animate-fade-in border border-error/20">
                  {resetFlow.error}
                </div>
              )}

              <button
                type="submit"
                disabled={resetFlow.isLoading || !email.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-accent hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {resetFlow.isLoading ? 'Sende…' : 'Code senden'}
              </button>
            </form>
          </div>
        )}

        {/* Code + neues Passwort */}
        {view === 'reset' && resetFlow.step === 'code' && (
          <div className="animate-fade-in">
            <button onClick={goToLogin} className="flex items-center gap-1.5 text-sm font-medium text-dark-muted hover:text-accent transition-colors mb-6">
              ← Zurück
            </button>
            <h3 className="text-2xl font-bold text-dark mb-2">Code eingeben</h3>
            <p className="text-sm text-dark-muted mb-6 leading-relaxed">
              Wir haben einen Code an <strong className="text-dark">{email}</strong> geschickt. Gib ihn hier zusammen mit deinem neuen Passwort ein.
            </p>

            <form onSubmit={handleResetSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">Code</label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={resetFlow.code}
                  onChange={e => resetFlow.setCode(e.target.value)}
                  placeholder="6-stelliger Code"
                  required
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light tracking-widest"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">Neues Passwort</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={resetFlow.password}
                  onChange={e => resetFlow.setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">Passwort bestätigen</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={resetFlow.confirm}
                  onChange={e => resetFlow.setConfirm(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  className="w-full px-4 py-3 rounded-xl border-1.5 border-warm-3 bg-paper focus:bg-bg focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light"
                />
              </div>

              {resetFlow.error && (
                <div className="bg-error-bg text-error text-sm p-3 rounded-xl text-center font-medium animate-fade-in border border-error/20">
                  {resetFlow.error}
                </div>
              )}

              <button
                type="submit"
                disabled={resetFlow.isLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-accent hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {resetFlow.isLoading ? 'Speichere…' : 'Passwort ändern'}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resetFlow.isLoading}
                className="text-sm font-medium text-accent hover:text-accent-dark transition-colors disabled:opacity-50"
              >
                Code erneut senden
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
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-accent hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/40 transition-all duration-300"
            >
              Zum Login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
