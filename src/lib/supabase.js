import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Zeitlimit für Datenbank- (PostgREST) und Auth-Requests.
// Warum: Ist das Backend überlastet, beantwortet PostgREST Requests teils erst
// nach ~100 s (Gateway-Timeout) – bis dahin zeigten Profil, Chats und der
// Community-Tab nur Skelett-Platzhalter, ohne Fehler und ohne Retry. Mit dem
// Limit kommt nach spätestens REQUEST_TIMEOUT_MS ein normales `{ error }`
// zurück (postgrest-js fängt den Abbruch ab), die Hooks beenden ihren
// Ladezustand und zeigen Cache bzw. Fehler + „Erneut versuchen".
// Storage-Uploads und Edge Functions sind ausgenommen (große Dateien / lange
// Laufzeiten auf langsamen Mobilverbindungen).
const REQUEST_TIMEOUT_MS = 20_000

function fetchWithTimeout(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || ''
  const limited = url.includes('/rest/v1/') || url.includes('/auth/v1/')
  if (!limited || typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return fetch(input, init)
  }
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let signal = timeoutSignal
  if (init.signal) {
    if (typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([init.signal, timeoutSignal])
    } else {
      // Ältere WebViews: eigenes Signal respektieren, Timeout dann weglassen
      signal = init.signal
    }
  }
  return fetch(input, { ...init, signal })
}

// implicit statt pkce: Passwort-Reset-Links werden oft in einem anderen Tab/
// Browser (z. B. der Mail-App) geöffnet als dem, der die Anfrage gestellt hat.
// PKCE braucht dafür einen im selben Browser gespeicherten Code-Verifier –
// fehlt der, schlägt der Code-Tausch lautlos fehl. Der implicit Flow trägt
// das Token direkt im Link und braucht keinen geräte-/browser-gebundenen Zustand.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
  global: { fetch: fetchWithTimeout },
})
