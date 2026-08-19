import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { startYouVersionLogin, disconnectYouVersion, syncYouVersionData } from '../lib/youversion'

export const YOUVERSION_CALLBACK_PATH = '/bible/youversion/callback'
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
      const redirectUri = window.location.origin + YOUVERSION_CALLBACK_PATH
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
