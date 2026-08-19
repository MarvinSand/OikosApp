import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { startYouVersionLogin, disconnectYouVersion, syncYouVersionData } from '../lib/youversion'

// Muss exakt einer im YouVersion-Dashboard registrierten Callback-URL
// entsprechen: https://oikosapp.net/auth/youversion/callback,
// http://localhost:5173/auth/youversion/callback,
// https://oikos-app-tau.vercel.app/bible/youversion/callback (Vercel-Default-
// Domain, anderer Pfad!). Deshalb Origin/Pfad hier zentral auflösen statt
// naiv window.location.origin zu nehmen (das liefert z.B. "www.oikosapp.net",
// was NICHT registriert ist und die YouVersion-Anfrage ablehnt).
export function resolveYouVersionRedirectUri() {
  const { hostname, origin } = window.location
  if (hostname === 'oikosapp.net' || hostname === 'www.oikosapp.net') {
    return 'https://oikosapp.net/auth/youversion/callback'
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/auth/youversion/callback`
  }
  // Vercel-Preview/-Default-Domains o.ä. sind nicht vorregistriert -
  // fällt auf den Vercel-Default-Domain-Pfad zurück, falls das die aktuelle
  // Domain ist; sonst bleibt der Login-Versuch (erwartbar) an YouVersion
  // hängen, bis die jeweilige Domain im Dashboard eingetragen wird.
  if (hostname === 'oikos-app-tau.vercel.app') {
    return `${origin}/bible/youversion/callback`
  }
  return `${origin}/auth/youversion/callback`
}

// Route, unter der die App auf den Redirect von YouVersion wartet.
export const YOUVERSION_CALLBACK_PATH = '/auth/youversion/callback'
const STATE_KEY = 'oikos_youversion_oauth_state'

export function useYouVersionAccount() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(null) // null = noch unbekannt
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [error, setError] = useState(null)

  const reloadStatus = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('youversion_connected')
      .eq('id', user.id)
      .maybeSingle()
    setConnected(!!data?.youversion_connected)
  }, [user?.id])

  useEffect(() => { reloadStatus() }, [reloadStatus])

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const redirectUri = resolveYouVersionRedirectUri()
      const { authorizeUrl, state } = await startYouVersionLogin(redirectUri)
      sessionStorage.setItem(STATE_KEY, state)
      window.location.href = authorizeUrl
    } catch (e) {
      setError(e.message)
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectYouVersion()
    setConnected(false)
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

  return { connected, connecting, syncing, syncResult, error, connect, disconnect, sync, reloadStatus }
}
