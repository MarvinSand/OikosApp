import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { clearAllCaches } from '../lib/swrCache'
import { publicOrigin } from '../lib/platform'

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

// Gespeicherte Session synchron aus localStorage lesen. `getSession()` ist
// asynchron und wartet bei abgelaufenem Access-Token (nach > 1 h ohne App-
// Nutzung – auf dem Handy der Normalfall) auf den Token-Refresh beim
// Server. Bis dahin zeigte die App nur einen Spinner – bei kaltem Backend
// mehrere Sekunden. Mit dem gespeicherten User rendert die App sofort (inkl.
// der gecachten Tab-Inhalte, siehe swrCache.js); Datenabfragen warten intern
// ohnehin auf das frische Token. Schlägt der Refresh fehl, meldet
// `getSession()` bzw. `onAuthStateChange` gleich danach `null` und die App
// leitet wie bisher auf /auth um.
function readStoredSession() {
  try {
    const raw = localStorage.getItem(supabase.auth.storageKey)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.user?.id && session?.refresh_token ? session : null
  } catch {
    return null
  }
}

const storedSession = readStoredSession()

let state = storedSession
  ? { user: storedSession.user, session: storedSession, loading: false }
  : { user: null, session: null, loading: true }

function setState(session, loading) {
  const nextUser = session?.user ?? null
  // Anderer oder kein User mehr (Logout, Konto gewechselt): gecachte
  // Tab-Inhalte des vorherigen Kontos verwerfen.
  if (state.user?.id && state.user.id !== nextUser?.id) clearAllCaches()
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

// Gender/Benutzername werden erst nach der ersten Anmeldung ins Profil
// geschrieben (vorher fehlt die Session). Bei E-Mail-Bestätigung per Code
// liegt zwischen Registrierung und Anmeldung die Code-Eingabe – bis dahin
// merken wir uns die Angaben lokal.
const PENDING_PROFILE_KEY = 'oikos_pending_profile'

function rememberPendingProfile(email, fields) {
  try { localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ email: email.toLowerCase(), fields })) } catch { /* ignore */ }
}

async function applyPendingProfile(userId, email) {
  try {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY)
    if (!raw) return
    const pending = JSON.parse(raw)
    if (pending?.email !== (email || '').toLowerCase()) return
    if (Object.keys(pending.fields || {}).length > 0) {
      const { error } = await supabase.from('profiles').update(pending.fields).eq('id', userId)
      if (error) return // beim nächsten Login erneut versuchen
    }
    localStorage.removeItem(PENDING_PROFILE_KEY)
  } catch { /* ignore */ }
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data?.user) applyPendingProfile(data.user.id, email)
  return data
}

async function register(email, password, fullName, gender = null, username = null) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: publicOrigin() + '/auth/callback',
    },
  })
  if (error) throw error
  // Supabase meldet bei einer bereits registrierten Adresse einen "Fake-User"
  // ohne Identitäten zurück (kein Fehler, kein Code) – verständlich melden.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.')
  }
  const profileUpdate = {}
  if (gender) profileUpdate.gender = gender
  if (username) profileUpdate.username = username
  if (data?.session && data?.user) {
    // Sofort angemeldet (keine E-Mail-Bestätigung nötig)
    if (Object.keys(profileUpdate).length > 0) {
      await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id)
    }
  } else if (data?.user) {
    // Code per E-Mail nötig: Angaben bis nach der Bestätigung merken
    rememberPendingProfile(email, profileUpdate)
  }
  return data
}

// 6-stelligen Code aus der Bestätigungs-E-Mail einlösen → Session
async function verifySignupCode(email, code) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
  if (error) throw error
  if (data?.user) await applyPendingProfile(data.user.id, email)
  return data
}

async function resendSignupCode(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) throw error
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
    verifySignupCode,
    resendSignupCode,
    logout,
    resendVerificationEmail,
  }
}

// Zugriff auf den aktuellen User außerhalb von React (z. B. in Hilfsfunktionen).
export function getCurrentUser() {
  return state.user
}

// `last_active_at` ist der mit Abstand teuerste Schreibzugriff der App
// (~42 ms laut pg_stat_statements, gegenüber 0,1–13 ms für die Lesequeries).
// Er lief bisher bei jedem App-Start und konkurrierte dort mit den Queries,
// die tatsächlich den ersten Bildschirm füllen. Jetzt: Drosselung über
// localStorage (überlebt Reloads, nicht nur den Page-Load) und Ausführung
// erst im Leerlauf, wenn die eigentlichen Daten schon unterwegs sind.
const LAST_ACTIVE_KEY = 'oikos_last_active_ping'
const LAST_ACTIVE_INTERVAL = 5 * 60 * 1000

function updateLastActive(userId) {
  let last = 0
  try { last = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10) || 0 } catch { /* ignore */ }
  if (Date.now() - last < LAST_ACTIVE_INTERVAL) return
  try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())) } catch { /* ignore */ }

  const run = () => {
    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {}, () => { /* non-critical */ })
  }

  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 5000 })
  else setTimeout(run, 2000)
}
