import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { startYouVersionLogin, disconnectYouVersion, startYouVersionSignIn } from '../lib/youversion'
import { isNativeApp, PUBLIC_APP_URL } from '../lib/platform'

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
  // In der App ist die Origin capacitor://localhost (bei YouVersion nicht
  // registriert) – dort läuft der Login im System-Browser über die App-Subdomain.
  if (isNativeApp) return `${PUBLIC_APP_URL}/auth/youversion/callback`
  const { hostname, origin } = window.location
  if (hostname === 'oikos-app-tau.vercel.app') {
    return `${origin}/bible/youversion/callback`
  }
  return `${origin}/auth/youversion/callback`
}

// Route, unter der die App auf den Redirect von YouVersion wartet.
export const YOUVERSION_CALLBACK_PATH = '/auth/youversion/callback'
// App-Login: Brückenseite im System-Browser + Rückweg per Universal/App Link.
export const YOUVERSION_HANDOFF_PATH = '/auth/youversion/handoff'
export const YOUVERSION_FROM_APP_KEY = 'oikos_yv_from_app'
// Rückkehr-Link in die App: Host + Pfadpräfix müssen in AASA/assetlinks stehen
// (oikosconnect.net, /join). Anderer Host als die Callback-Seite, damit iOS den
// Tipp als Universal Link öffnet und nicht in Safari bleibt.
export const YOUVERSION_APP_RETURN_PATH = '/join/yv-login'
export const YOUVERSION_APP_RETURN_HOST = 'https://oikosconnect.net'

export function useYouVersionAccount() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(null) // null = noch unbekannt
  const [email, setEmail] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const reloadStatus = useCallback(async () => {
    if (!user) return
    // youversion_email ist ein privates Feld -> nur über die Owner-RPC lesbar
    const { data } = await supabase.rpc('get_my_profile').maybeSingle()
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

  return { connected, email, connecting, error, connect, disconnect, reloadStatus }
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
      if (isNativeApp) {
        // App: Login im System-Browser (Safari/Chrome) über eine kleine Brücken-
        // Seite, die dort merkt, dass der Login aus der App kommt. Danach holt
        // der Nutzer per Link die Anmeldung zurück in die App
        // (YouVersionHandoff / YouVersionCallback / NativeYouVersionReturn).
        // Externe https-Adressen öffnet Capacitor automatisch außerhalb der App.
        setStarting(false)
        window.location.href = `${PUBLIC_APP_URL}${YOUVERSION_HANDOFF_PATH}?to=${encodeURIComponent(authorizeUrl)}`
        return
      }
      window.location.href = authorizeUrl
    } catch (e) {
      setError(e.message)
      setStarting(false)
    }
  }, [])

  return { start, starting, error }
}
