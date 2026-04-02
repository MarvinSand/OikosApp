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
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-warm-3/30 pointer-events-none blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-warm-2/20 pointer-events-none blur-3xl animate-pulse" />

      {/* Logo */}
      <div className="text-center mb-10 relative z-10 animate-fade-in">
        <h1 className="font-serif text-5xl font-bold text-warm-1 tracking-tight leading-none mb-3 drop-shadow-sm">
          OIKOS
        </h1>
        <div className="flex justify-center mb-4">
          <Cross size={24} className="text-warm-2" strokeWidth={2.5} />
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm glass-panel rounded-3xl p-7 relative z-10 animate-slide-up">
        {done ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 bg-accent-light/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <p className="font-serif text-3xl text-accent font-bold">✓</p>
            </div>
            <p className="text-lg font-bold text-dark mb-2">
              Passwort geändert!
            </p>
            <p className="text-sm text-dark-muted italic">
              Du wirst weitergeleitet…
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h3 className="text-2xl font-bold text-dark mb-6">
              Neues Passwort setzen
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">Neues Passwort</label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Mindestens 8 Zeichen"
                    required
                    minLength={8}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border-1.5 border-warm-3 bg-white/50 focus:bg-white focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light box-border"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-dark-light hover:text-warm-1 transition-colors rounded-lg">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-dark-muted ml-1">Passwort bestätigen</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="Passwort wiederholen"
                    required
                    className="w-full pl-4 pr-12 py-3 rounded-xl border-1.5 border-warm-3 bg-white/50 focus:bg-white focus:border-warm-1 focus:ring-4 focus:ring-warm-1/10 transition-all outline-none text-dark placeholder:text-dark-light box-border"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-dark-light hover:text-warm-1 transition-colors rounded-lg">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-fade-in border border-red-100 flex flex-col gap-2">
                  <p>{error}</p>
                  {(error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')) && (
                    <a href="/auth" className="text-warm-1 hover:text-warm-2 font-bold underline transition-colors">
                      Neuen Reset-Link anfordern
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 rounded-xl font-semibold text-white bg-warm-1 hover:bg-warm-2 hover:shadow-lg hover:shadow-warm-1/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? 'Speichere…' : 'Speichern'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
