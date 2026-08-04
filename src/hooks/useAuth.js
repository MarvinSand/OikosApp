import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────
// Ein einziger, geteilter Auth-Store für die ganze App.
//
// Vorher legte jeder `useAuth()`-Aufruf eigenen State an, rief
// `supabase.auth.getSession()` auf und registrierte einen eigenen
// `onAuthStateChange`-Listener. Bei ~80 Aufrufstellen bedeutete das
// ~80 parallele Session-Abfragen und ~80 Listener pro Seitenaufbau –
// und weil jeder davon mit `user = null` startete, liefen alle
// abhängigen Hooks (`useEffect(..., [user?.id])`) doppelt: einmal
// leer, einmal mit User. Das war die Hauptursache für den langsamen
// Start und die doppelten Netzwerk-Requests.
//
// Jetzt: ein Modul-Store, eine Session-Abfrage, ein Listener.
// `useSyncExternalStore` verteilt den Zustand an alle Consumer.
// ─────────────────────────────────────────────────────────────

const listeners = new Set()

let state = {
  user: null,
  session: null,
  loading: true,
}

function setState(session, loading) {
  const nextUser = session?.user ?? null
  // Nur bei echter Änderung neu rendern – sonst re-rendert jeder
  // Token-Refresh (alle ~50 Min.) die komplette App.
  if (
    state.loading === loading &&
    state.user?.id === nextUser?.id &&
    state.session?.access_token === (session?.access_token ?? undefined)
  ) {
    return
  }
  state = { user: nextUser, session: session ?? null, loading }
  for (const l of listeners) l()
}

let initialized = false

function init() {
  if (initialized) return
  initialized = true

  supabase.auth.getSession().then(({ data: { session } }) => {
    setState(session, false)
    if (session?.user) updateLastActive(session.user.id)
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    setState(session, false)
    if (session?.user) updateLastActive(session.user.id)
  })
}

// Session-Abfrage sofort beim Import starten, nicht erst beim ersten
// Render – so überlappt sie mit dem Laden der Route-Chunks.
init()

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return state
}

// ─── Aktionen (modulweit stabil, keine Re-Renders durch neue Identität) ───

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

async function register(email, password, fullName, gender = null, username = null) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + '/auth/callback',
    },
  })
  if (error) throw error
  if (data?.user) {
    const profileUpdate = {}
    if (gender) profileUpdate.gender = gender
    if (username) profileUpdate.username = username
    if (Object.keys(profileUpdate).length > 0) {
      await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id)
    }
  }
  return data
}

async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function resendVerificationEmail() {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: state.user?.email,
  })
  if (error) throw error
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    user: snapshot.user,
    session: snapshot.session,
    loading: snapshot.loading,
    login,
    register,
    logout,
    resendVerificationEmail,
  }
}

// Zugriff auf den aktuellen User außerhalb von React (z. B. in Hilfsfunktionen).
export function getCurrentUser() {
  return state.user
}

let _lastActiveTime = 0
async function updateLastActive(userId) {
  const now = Date.now()
  if (now - _lastActiveTime < 5 * 60 * 1000) return
  _lastActiveTime = now
  try {
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId)
  } catch { /* non-critical */ }
}
