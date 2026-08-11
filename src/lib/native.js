// ─────────────────────────────────────────────────────────────
// Brücke zur nativen Hülle (Capacitor).
//
// Die App läuft in drei Umgebungen: als Website, als installierte PWA und
// als native App im WKWebView/WebView. Statt an jeder Stelle
// `Capacitor.isNativePlatform()` zu importieren, kapselt dieses Modul die
// Unterschiede – und liefert im Web überall harmlose No-Ops zurück.
// ─────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const nativePlatform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

// Die Domain, unter der die Web-App läuft. Auth-Mails zeigen dorthin;
// in der nativen App fängt der App-/Universal-Link diese URLs ab.
export const WEB_ORIGIN = 'https://oikos-app-tau.vercel.app'

/**
 * Deep Links an den Router weiterreichen.
 *
 * Ohne das öffnet ein Bestätigungs- oder Passwort-Reset-Link zwar die App,
 * landet aber immer auf der Startseite – der Token in der URL geht verloren.
 *
 * @param {(path: string) => void} navigate  Router-Navigation
 * @returns {() => void}  Aufräumfunktion
 */
export function listenToDeepLinks(navigate) {
  if (!isNative) return () => {}

  let remove = () => {}
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url)
        // Supabase hängt Tokens teils als Hash an (implicit flow), teils als
        // Query. Beides muss mitgenommen werden, sonst schlägt der
        // Token-Tausch fehl.
        navigate(parsed.pathname + parsed.search + parsed.hash)
      } catch {
        /* keine gültige URL – ignorieren */
      }
    }).then(handle => { remove = () => handle.remove() })
  })

  return () => remove()
}

/**
 * Statusleiste an das Theme angleichen. Ohne das steht auf iOS schwarze
 * Schrift auf schwarzem Grund, sobald der Dark Mode aktiv ist.
 */
export async function syncStatusBar(theme) {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    if (nativePlatform === 'android') {
      await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#000000' : '#FFFFFF' })
    }
  } catch {
    /* Plugin nicht verfügbar – nicht kritisch */
  }
}
