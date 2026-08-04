import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// implicit statt pkce: Passwort-Reset-Links werden oft in einem anderen Tab/
// Browser (z. B. der Mail-App) geöffnet als dem, der die Anfrage gestellt hat.
// PKCE braucht dafür einen im selben Browser gespeicherten Code-Verifier –
// fehlt der, schlägt der Code-Tausch lautlos fehl. Der implicit Flow trägt
// das Token direkt im Link und braucht keinen geräte-/browser-gebundenen Zustand.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
})
