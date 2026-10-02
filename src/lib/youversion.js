import { supabase } from './supabase'

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('not_authenticated')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

// Für den Sign-in/up-Flow (Login-Bildschirm): es gibt noch keine Oikos-
// Session. `apikey` reicht der Edge Function (verify_jwt ist dort
// deaktiviert, die Function unterscheidet den Modus selbst danach, ob ein
// gültiges Bearer-Token mitkommt oder nicht).
function anonHeaders() {
  return { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
}

// ─── YouVersion Login (OAuth/PKCE über die youversion-auth Edge Function) ───

export async function startYouVersionLogin(redirectUri) {
  const headers = await authHeaders()
  const res = await fetch(`${FUNCTIONS_BASE}/youversion-auth`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'start', redirectUri }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'start_failed')
  return res.json() // { authorizeUrl, state }
}

export async function completeYouVersionLogin({ code, state, redirectUri }) {
  const headers = await authHeaders()
  const res = await fetch(`${FUNCTIONS_BASE}/youversion-auth`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'callback', code, state, redirectUri }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'callback_failed')
  return res.json() // { connected: true }
}

// ─── "Mit YouVersion anmelden/registrieren" (Login-Bildschirm, kein Oikos-
// Login vorausgesetzt) ───

export async function startYouVersionSignIn(redirectUri) {
  const res = await fetch(`${FUNCTIONS_BASE}/youversion-auth`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify({ action: 'start', redirectUri }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'start_failed')
  return res.json() // { authorizeUrl, state, mode: 'signin' }
}

export async function completeYouVersionSignIn({ code, state, redirectUri }) {
  const res = await fetch(`${FUNCTIONS_BASE}/youversion-auth`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify({ action: 'callback', code, state, redirectUri }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'callback_failed')
  return res.json() // { email, tokenHash }
}

export async function disconnectYouVersion() {
  const headers = await authHeaders()
  const res = await fetch(`${FUNCTIONS_BASE}/youversion-auth`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'disconnect' }),
  })
  if (!res.ok) throw new Error('disconnect_failed')
  return res.json()
}

// ─── Bibeltext (bible-api Proxy) ───

export async function fetchBiblePath(path, { asUser = false } = {}) {
  const headers = await authHeaders()
  delete headers['Content-Type']
  const separator = path.includes('?') ? '&' : '?'
  const qs = asUser ? `${separator}asUser=1` : ''
  const res = await fetch(`${FUNCTIONS_BASE}/bible-api${path}${qs}`, { headers })
  if (!res.ok) throw new Error(`bible_api_${res.status}`)
  return res.json()
}
