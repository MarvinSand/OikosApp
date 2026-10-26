// Store-Links für die Landingpage. Per Vercel-Env überschreibbar, sobald die
// Einträge live sind (App Store: https://apps.apple.com/de/app/…/id<ID>).
// Ohne App-Store-URL zeigt die Landingpage „Bald im App Store“ statt eines
// toten Links.
export const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=app.oikos.mobile'
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || ''
