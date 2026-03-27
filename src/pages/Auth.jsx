import { useState } from 'react'
import { Cross, MailCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

// ─── Haupt-Komponente ─────────────────────────────────────────
export default function Auth() {
  // 'login' | 'register' | 'reset' | 'reset-sent'
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState(null) // 'brother' | 'sister'
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login, register } = useAuth()
  const { showToast } = useToast()

  function goToReset() {
    setError('')
    setView('reset')
  }

  function goToLogin() {
    setError('')
    setView('login')
  }

  async function handleLoginOrRegister(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (view === 'login') {
        await login(email, password)
      } else {
        await register(email, password, fullName, gender)
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dekorationskreise */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', backgroundColor: 'var(--color-warm-3)', opacity: 0.3, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 320, height: 320, borderRadius: '50%', backgroundColor: 'var(--color-warm-3)', opacity: 0.3, pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 52, fontWeight: 700, color: 'var(--color-warm-1)', letterSpacing: '-1px', lineHeight: 1, marginBottom: 8 }}>
          OIKOS
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Cross size={20} color="var(--color-warm-2)" strokeWidth={2.5} />
        </div>
        <p style={{ fontFamily: 'Lora, Georgia, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          „Dein Umfeld. Dein Gebet. Deine Mission."
        </p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '28px 24px', boxShadow: '0 4px 24px rgba(58, 46, 36, 0.08)', position: 'relative', zIndex: 1 }}>

        {/* ── Zustand 1+2: Login / Register ── */}
        {(view === 'login' || view === 'register') && (
          <>
            {/* Tab Switch */}
            <div style={{ display: 'flex', backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
              {[['login', 'Anmelden'], ['register', 'Registrieren']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => { setView(t); setError('') }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontFamily: 'Lora, Georgia, serif', fontSize: 14,
                    fontWeight: view === t ? 600 : 400,
                    backgroundColor: view === t ? 'var(--color-white)' : 'transparent',
                    color: view === t ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                    boxShadow: view === t ? '0 2px 8px rgba(58, 46, 36, 0.08)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >{label}</button>
              ))}
            </div>

            <form onSubmit={handleLoginOrRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {view === 'register' && (
                <>
                  <div>
                    <label style={labelStyle}>Vollständiger Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Max Mustermann" required style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--color-warm-1)'}
                      onBlur={e => e.target.style.borderColor = 'var(--color-warm-3)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Ich bin...</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['brother', '🙋‍♂️ Bruder in Christus'], ['sister', '🙋‍♀️ Schwester in Christus']].map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setGender(val)}
                          style={{
                            flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                            fontFamily: 'Lora, Georgia, serif', fontSize: 13,
                            border: `1.5px solid ${gender === val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                            backgroundColor: gender === val ? 'var(--color-warm-4)' : 'var(--color-bg)',
                            color: gender === val ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                            fontWeight: gender === val ? 600 : 400,
                            transition: 'all 0.15s',
                          }}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.de" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--color-warm-1)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-warm-3)'}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Passwort</label>
                  {view === 'login' && (
                    <button type="button" onClick={goToReset} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, Georgia, serif', fontSize: 12, color: 'var(--color-text-muted)', padding: 0 }}
                      onMouseEnter={e => e.target.style.color = 'var(--color-warm-1)'}
                      onMouseLeave={e => e.target.style.color = 'var(--color-text-muted)'}
                    >
                      Passwort vergessen?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" required minLength={6} style={{ ...inputStyle, paddingRight: 44, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-warm-1)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-warm-3)'}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p style={errorStyle}>{error}</p>}

              <button type="submit" disabled={isLoading || (view === 'register' && !gender)} style={submitBtn(isLoading || (view === 'register' && !gender))}
                onMouseEnter={e => { if (!isLoading) e.target.style.backgroundColor = 'var(--color-warm-2)' }}
                onMouseLeave={e => { if (!isLoading) e.target.style.backgroundColor = 'var(--color-warm-1)' }}
              >
                {isLoading ? 'Einen Moment...' : view === 'login' ? 'Anmelden' : 'Konto erstellen'}
              </button>
            </form>
          </>
        )}

        {/* ── Zustand 2: E-Mail eingeben ── */}
        {view === 'reset' && (
          <>
            <button onClick={goToLogin} style={backBtn}>← Zurück zum Login</button>
            <h3 style={cardTitle}>Passwort zurücksetzen</h3>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 20 }}>
              Wir schicken dir einen Link per E-Mail.
            </p>

            <form onSubmit={handleSendReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>E-Mail</label>
                <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.de" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--color-warm-1)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-warm-3)'}
                />
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={isLoading || !email.trim()} style={submitBtn(isLoading || !email.trim())}>
                {isLoading ? 'Sende…' : 'Link senden'}
              </button>
            </form>
          </>
        )}

        {/* ── Zustand 3: Bestätigung ── */}
        {view === 'reset-sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <MailCheck size={52} color="var(--color-gold)" strokeWidth={1.5} />
            </div>
            <h3 style={{ ...cardTitle, textAlign: 'center', marginBottom: 10 }}>Schau in dein Postfach</h3>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 6 }}>
              Wir haben dir einen Link geschickt. Klicke darauf um ein neues Passwort zu setzen.
            </p>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 24 }}>
              {email}
            </p>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Keine Mail erhalten?{' '}
              <button onClick={handleResend} disabled={isLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, Georgia, serif', fontSize: 13, color: 'var(--color-warm-1)', fontWeight: 600, padding: 0 }}>
                Erneut senden
              </button>
            </p>
            <button onClick={goToLogin} style={backBtn}>← Zurück zum Login</button>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontFamily: 'Lora, Georgia, serif', fontSize: 13,
  fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6,
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)',
  fontFamily: 'Lora, Georgia, serif', fontSize: 15, color: 'var(--color-text)',
  transition: 'border-color 0.15s ease',
}

const errorStyle = {
  color: '#C0392B', fontFamily: 'Lora, Georgia, serif', fontSize: 13,
  fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4, margin: 0,
}

const submitBtn = (disabled) => ({
  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
  color: 'var(--color-white)', fontFamily: 'Lora, Georgia, serif',
  fontSize: 16, fontWeight: 600, marginTop: 4, letterSpacing: '0.3px',
  transition: 'background-color 0.15s ease',
})

const backBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'Lora, Georgia, serif', fontSize: 13,
  color: 'var(--color-text-muted)', padding: 0, marginBottom: 20,
  display: 'inline-flex', alignItems: 'center', gap: 4,
}

const cardTitle = {
  fontFamily: 'Lora, Georgia, serif', fontSize: 20, fontWeight: 700,
  color: 'var(--color-text)', marginBottom: 6,
}
