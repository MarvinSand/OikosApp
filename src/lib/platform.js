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
  // Lokal und auf der App-Subdomain bleibt die aktuelle Origin: die Login-Session
  // (localStorage) gilt pro Origin, ein Link auf eine andere Domain wäre ausgeloggt.
  return h === 'localhost' || h === '127.0.0.1' || h.toLowerCase() === APP_HOST ? window.location.origin : PUBLIC_APP_URL
}

// Domains (Stand Nov. 2026):
//  · app.oikosconnect.net  → IMMER die App (nie die Landingpage; „/“ → Login bzw. Home)
//  · oikosconnect.net, www. und oikosconnect.site → nur die Landingpage („/“) plus die
//    Rechtstexte (Impressum, Datenschutz, Nutzungsbedingungen, Support); alles andere
//    (/auth, /user/… …) leitet App.jsx auf die App-Subdomain weiter
//  · oikosapp.net (alt) → unverändert: Landingpage nur ausgeloggt auf „/“, sonst App
export const APP_HOST = 'app.oikosconnect.net'
export const MAIN_APP_URL = `https://${APP_HOST}`
const HOST = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
export const isAppHost = HOST === APP_HOST
export const isLandingOnlyHost = /(^|\.)oikosconnect\.site$/.test(HOST) || /^(www\.)?oikosconnect\.net$/.test(HOST)
// Pfade, die auf der reinen Landing-Domain selbst ausgeliefert werden
export const LANDING_HOST_PATHS = ['/', '/impressum', '/imprint', '/privacy', '/terms', '/support']
// Ziel für „Anmelden/Registrieren“: auf der Landing-Domain die App-Subdomain, sonst relativ
export function appUrl(path) {
  return isLandingOnlyHost ? MAIN_APP_URL + path : path
}
