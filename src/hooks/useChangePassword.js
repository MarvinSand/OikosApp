import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Passwort ändern per 6-stelligem E-Mail-Code statt per Link. Der Code wird im
// selben Tab/Gerät eingegeben, auf dem man gerade ist – es muss kein Link mehr
// angeklickt werden, der (je nach Mail-App/Gerät) woanders landet.
//
// 'loggedIn'  – User ist bereits angemeldet: supabase.auth.reauthenticate()
//               schickt den Code an die hinterlegte E-Mail, der Code wird dann
//               als `nonce` bei updateUser() mitgeschickt. Erfordert, dass
//               "Secure password change" im Supabase-Dashboard aktiviert ist.
// 'loggedOut' – User ist ausgeloggt (Login-Bildschirm "Passwort vergessen"):
//               resetPasswordForEmail() schickt den Code, verifyOtp() tauscht
//               ihn gegen eine kurzlebige Session, mit der dann updateUser()
//               aufgerufen wird. Danach wird bewusst wieder ausgeloggt.
export function useChangePassword(mode) {
  const [step, setStep] = useState('request') // 'request' | 'code' | 'done'
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function sendCode(email) {
    setError('')
    setIsLoading(true)
    try {
      if (mode === 'loggedIn') {
        const { error: err } = await supabase.auth.reauthenticate()
        if (err) throw err
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email)
        if (err) throw err
      }
      setStep('code')
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  async function submit(email) {
    setError('')
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben.'); return false }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return false }
    if (!code.trim()) { setError('Bitte den Code aus der E-Mail eingeben.'); return false }

    setIsLoading(true)
    try {
      if (mode === 'loggedIn') {
        const { error: err } = await supabase.auth.updateUser({ password, nonce: code.trim() })
        if (err) throw err
      } else {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email, token: code.trim(), type: 'recovery',
        })
        if (verifyErr) throw verifyErr
        const { error: updErr } = await supabase.auth.updateUser({ password })
        if (updErr) throw updErr
        await supabase.auth.signOut()
      }
      setStep('done')
      return true
    } catch (err) {
      setError(err.message || 'Der Code ist ungültig oder abgelaufen.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  function reset() {
    setStep('request')
    setCode('')
    setPassword('')
    setConfirm('')
    setError('')
  }

  return {
    step, code, setCode, password, setPassword, confirm, setConfirm,
    error, isLoading, sendCode, submit, reset,
  }
}
