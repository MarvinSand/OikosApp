import { publicOrigin, PUBLIC_APP_URL } from './platform'

// Links, die in QR-Codes stecken: reine HTTPS-URLs, damit auch die normale
// Kamera-App und fremde Scanner sie öffnen können.
export const profileLink = (userId) => `${publicOrigin()}/user/${userId}`
export const communityLink = (community) =>
  community.is_public || !community.invite_code
    ? `${publicOrigin()}/community/${community.id}`
    : `${publicOrigin()}/join/${community.invite_code}`

const UUID = '[0-9a-fA-F-]{36}'

// Liefert den App-internen Pfad für einen gescannten Text oder null.
export function pathFromScan(text) {
  const raw = (text || '').trim()
  if (!raw) return null
  let pathname = raw
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      // Alte Adresse bleibt gültig, damit bereits geteilte QR-Codes weiter funktionieren.
      const known = [new URL(PUBLIC_APP_URL).host, 'oikos-app-tau.vercel.app', window.location.host]
      if (!known.includes(u.host)) return null
      pathname = u.pathname
    } catch { return null }
  }
  if (new RegExp(`^/user/${UUID}$`).test(pathname)) return pathname
  if (new RegExp(`^/community/${UUID}$`).test(pathname)) return pathname
  if (/^\/join\/[A-Za-z0-9]{4,16}$/.test(pathname)) return pathname
  // Nur der nackte Einladungscode
  if (/^[A-Za-z0-9]{6,10}$/.test(raw)) return `/join/${raw.toUpperCase()}`
  return null
}
