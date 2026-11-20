// Store-Links für die Landingpage. Per Vercel-Env überschreibbar.
// App Store: seit 19.11.2026 live (Apple-ID 6814642591, per iTunes-Lookup
// bestätigt). Ist die URL leer, zeigt die Landingpage „Bald im App Store“.
// Google Play: noch nicht veröffentlicht (Listing liefert 404) → leer = „Bald bei Google Play“.
// Beim Livegang VITE_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=app.oikos.mobile
// in Vercel setzen oder hier als Default eintragen.
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || ''
export const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/de/app/oikos-connect/id6814642591'
