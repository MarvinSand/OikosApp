import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { startYouVersionLogin, disconnectYouVersion, syncYouVersionData, startYouVersionSignIn } from '../lib/youversion'

// Muss exakt einer im YouVersion-Dashboard registrierten Callback-URL
// entsprechen. Bewusst die AKTUELLE Origin verwenden (nicht auf eine feste
// Domain wie "oikosapp.net" umbiegen): würde der Redirect auf eine andere
// (Sub-)Domain als die zeigen, auf der der Login gestartet wurde (z.B.
// www.oikosapp.net -> oikosapp.net), wäre das für den Browser ein anderer
// Origin - die Oikos-Login-Session (localStorage) ist dort nicht sichtbar,
// der Nutzer landet "ausgeloggt" auf der Callback-Seite. Im YouVersion-
// Dashboard müssen deshalb ALLE tatsächlich genutzten (Sub-)Domains als
// Callback-URL eingetragen sein - aktuell: oikosapp.net, www.oikosapp.net,
// localhost:5173, oikos-app-tau.vercel.app (dort mit /bible/... Pfad).
export function resolveYouVersionRedirectUri() {
  const { hostname, origin } = window.location
  if (hostname === 'oikos-app-tau.vercel.app') {
    return `${origin}/bible/youversion/callback`
  }
  return `${origin}/auth/youversion/callback`
}

// Route, unter der die App auf den Redirect von YouVersion wartet.
export const YOUVERSION_CALLBACK_PATH = '/auth/youversion/callback'

export function useYouVersionAccount() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(null) // null = noch unbekannt
  const [email, setEmail] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [error, setError] = useState(null)

  const reloadStatus = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('youversion_connected, youversion_email')
      .eq('id', user.id)
      .maybeSingle()
    setConnected(!!data?.youversion_connected)
    setEmail(data?.youversion_email ?? null)
  }, [user?.id])

  useEffect(() => { reloadStatus() }, [reloadStatus])

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const redirectUri = resolveYouVersionRedirectUri()
      const { authorizeUrl } = await startYouVersionLogin(redirectUri)
      window.location.href = authorizeUrl
    } catch (e) {
      setError(e.message)
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectYouVersion()
    setConnected(false)
    setEmail(null)
  }, [])

  const sync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncYouVersionData()
      setSyncResult(result.synced)
      return result.synced
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setSyncing(false)
    }
  }, [])

  return { connected, email, connecting, syncing, syncResult, error, connect, disconnect, sync, reloadStatus }
}

// Für den Login-Bildschirm: startet den Sign-in/up-Flow ohne bestehende
// Oikos-Session. Der Rückweg landet auf derselben Callback-Route wie beim
// "Verbinden"-Flow (useYouVersionAccount.connect) - dort entscheidet das
// Vorhandensein einer Oikos-Session, welcher Zweig (link/signin) gemeint war.
export function useYouVersionSignIn() {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async () => {
    setStarting(true)
    setError(null)
    try {
      const redirectUri = resolveYouVersionRedirectUri()
      const { authorizeUrl } = await startYouVersionSignIn(redirectUri)
      window.location.href = authorizeUrl
    } catch (e) {
      setError(e.message)
      setStarting(false)
    }
  }, [])

  return { start, starting, error }
}
