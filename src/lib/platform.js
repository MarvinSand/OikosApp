import { Capacitor } from '@capacitor/core'

// true in der iOS-App (Capacitor), false im Browser/PWA.
export const isNativeApp = Capacitor.isNativePlatform()

// In der App ist `window.location.origin` `capacitor://localhost` – als Ziel
// für geteilte Links oder E-Mail-Bestätigungen unbrauchbar (öffnet sich auf
// keinem anderen Gerät). Dort stattdessen die öffentliche Web-Adresse nutzen.
// Überschreibbar per VITE_PUBLIC_APP_URL (Vercel/GitHub-Secret).
export const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://oikosapp.net').replace(/\/+$/, '')

// Links (Teilen, QR, E-Mail-Bestätigung) zeigen immer auf die öffentliche
// Domain – auch wenn jemand die App noch über die alte Vercel-Adresse
// (oikos-app-tau.vercel.app) nutzt. Nur lokal bleibt die aktuelle Origin.
export function publicOrigin() {
  if (isNativeApp) return PUBLIC_APP_URL
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' ? window.location.origin : PUBLIC_APP_URL
}
