import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cross, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function validate() {
    if (password.length < 8) return 'Das Passwort muss mindestens 8 Zeichen haben.'
    if (password !== confirm) return 'Die Passwörter stimmen nicht überein.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError('')
    setIsLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      showToast('Passwort geändert ✓')
      setTimeout(() => navigate('/', { replace: true }), 2000)
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten.')
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
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '28px 24px', boxShadow: '0 4px 24px rgba(58, 46, 36, 0.08)', position: 'relative', zIndex: 1 }}>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 32, marginBottom: 12 }}>✓</p>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
              Passwort geändert!
            </p>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Du wirst weitergeleitet…
            </p>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>
              Neues Passwort setzen
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Neues Passwort</label>
                <div style={{ position: 'relative' }}>
                  <input
                    autoFocus
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Mindestens 8 Zeichen"
                    required
                    minLength={8}
                    style={{ ...inputStyle, paddingRight: 44, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-warm-1)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-warm-3)'}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Passwort bestätigen</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="Passwort wiederholen"
                    required
                    style={{ ...inputStyle, paddingRight: 44, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-warm-1)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-warm-3)'}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div>
                  <p style={{ color: '#C0392B', fontFamily: 'Lora, Georgia, serif', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4, marginBottom: 4 }}>
                    {error}
                  </p>
                  {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                    <p style={{ textAlign: 'center', fontFamily: 'Lora, Georgia, serif', fontSize: 13 }}>
                      <a href="/auth" style={{ color: 'var(--color-warm-1)', fontWeight: 600 }}>
                        Neuen Reset-Link anfordern
                      </a>
                    </p>
                  ) : null}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  backgroundColor: isLoading ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
                  color: 'var(--color-white)', fontFamily: 'Lora, Georgia, serif',
                  fontSize: 16, fontWeight: 600, marginTop: 4, letterSpacing: '0.3px',
                }}
              >
                {isLoading ? 'Speichere…' : 'Speichern'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

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
