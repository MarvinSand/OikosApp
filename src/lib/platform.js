import { Capacitor } from '@capacitor/core'

// true in der iOS-App (Capacitor), false im Browser/PWA.
export const isNativeApp = Capacitor.isNativePlatform()

// In der App ist `window.location.origin` `capacitor://localhost` – als Ziel
// für geteilte Links oder E-Mail-Bestätigungen unbrauchbar (öffnet sich auf
// keinem anderen Gerät). Dort stattdessen die öffentliche Web-Adresse nutzen.
// Überschreibbar per VITE_PUBLIC_APP_URL (Vercel/GitHub-Secret).
const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://oikosapp.net').replace(/\/+$/, '')

export function publicOrigin() {
  return isNativeApp ? PUBLIC_APP_URL : window.location.origin
}
