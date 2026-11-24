import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

// Native Push läuft ausschließlich über APNs (iOS) bzw. FCM (Android) – im
// Browser gibt es das Plugin nicht. Web Push ist auf iOS in einer WKWebView
// nicht verfügbar, deshalb gibt es dafür keinen Fallback.
export function isNativePushAvailable() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) return false
  // Android braucht eine Firebase-Konfiguration (google-services.json) und
  // einen FCM-Versand auf dem Server. Ohne sie würde register() den Start
  // gefährden – deshalb nur aktiv, wenn der Build bewusst damit gebaut wurde.
  if (Capacitor.getPlatform() === 'android') return import.meta.env.VITE_ANDROID_PUSH === '1'
  return true
}

// Ohne Mac/Safari-Ferndebugging gibt es keine andere Möglichkeit, ein
// stillschweigend fehlschlagendes Registrieren auf einem TestFlight-Gerät
// überhaupt zu bemerken – deshalb ein sichtbarer Toast statt nur Konsole.
const FIRST_REGISTRATION_KEY = 'oikos_push_registered_once'
const DENIED_HINT_KEY = 'oikos_push_denied_hint'

// Token dieses Geräts (für die Abmeldung beim Logout)
let currentToken = null

async function storeToken(userId, token, showToast) {
  currentToken = token
  // Das Token ist unique: meldet sich auf demselben Gerät ein anderer Nutzer
  // an, wandert die Zeile zu ihm, statt ein Duplikat anzulegen.
  const { error } = await supabase.from('device_tokens').upsert({
    user_id: userId,
    token,
    platform: Capacitor.getPlatform() === 'android' ? 'android' : 'ios',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'token' })

  if (error) {
    showToast?.(`Push-Token konnte nicht gespeichert werden: ${error.message}`, 'error')
    return
  }

  // Nur beim allerersten Mal pro Gerät bestätigen, sonst nervt der Toast bei
  // jedem App-Start dauerhaft.
  try {
    if (!localStorage.getItem(FIRST_REGISTRATION_KEY)) {
      localStorage.setItem(FIRST_REGISTRATION_KEY, '1')
      showToast?.('Push-Benachrichtigungen aktiviert 🔔', 'success')
    }
  } catch { /* localStorage kann in seltenen Fällen blockiert sein - nicht kritisch */ }
}

// Registriert das Gerät für Push und legt das Token ab. Gibt einen Aufräumer
// zurück, der die Listener wieder entfernt. `showToast` ist optional, damit
// der Aufrufer (App.jsx) sichtbares Feedback zu Erfolg/Fehlschlag geben kann.
export async function registerForPush(userId, { onOpen, showToast } = {}) {
  if (!isNativePushAvailable() || !userId) return () => {}

  const { PushNotifications } = await import('@capacitor/push-notifications')

  // Berechtigung prüfen/erfragen und (erneut) bei APNs registrieren. Läuft bei
  // jedem Start UND bei jeder Rückkehr in die App: Nach einem Update bzw. wenn
  // der Nutzer Push erst später in den iOS-Einstellungen erlaubt, kommt so
  // automatisch ein frisches Token an – ohne Neuanmeldung. Apple liefert das
  // Token bei jedem register() erneut, storeToken() ist ein Upsert.
  let registering = false
  const ensureRegistered = async (interactive) => {
    if (registering) return
    registering = true
    try {
      let permission = await PushNotifications.checkPermissions()
      if (interactive && (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale')) {
        permission = await PushNotifications.requestPermissions()
      }
      if (permission.receive !== 'granted') {
        // Hinweis nur einmal pro Gerät – nicht bei jedem Start/Resume.
        if (interactive && permission.receive === 'denied') {
          try {
            if (!localStorage.getItem(DENIED_HINT_KEY)) {
              localStorage.setItem(DENIED_HINT_KEY, '1')
              showToast?.('Push-Benachrichtigungen sind aus. Du kannst sie in den iOS-Einstellungen → Mitteilungen → Oikos Connect aktivieren.', 'info')
            }
          } catch { /* nicht kritisch */ }
        }
        return
      }
      try { localStorage.removeItem(DENIED_HINT_KEY) } catch { /* nicht kritisch */ }
      await PushNotifications.register()
    } catch (e) {
      showToast?.(`Push-Registrierung fehlgeschlagen: ${e?.message || 'unbekannter Fehler'}`, 'error')
    } finally {
      registering = false
    }
  }

  const handles = await Promise.all([
    PushNotifications.addListener('registration', ({ value }) => {
      storeToken(userId, value, showToast)
    }),
    // Der einzige Weg, ohne Mac zu sehen, WARUM APNs die Registrierung
    // ablehnt (z.B. fehlendes Push-Entitlement im Provisioning-Profil).
    PushNotifications.addListener('registrationError', (err) => {
      showToast?.(`Push-Registrierung fehlgeschlagen: ${err?.error || 'unbekannter Fehler'}`, 'error')
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const url = notification?.data?.url
      if (url && onOpen) onOpen(url)
    }),
  ])

  // Beim Zurückkehren in die App still nachregistrieren (ohne Dialog).
  let appHandle = null
  try {
    const { App } = await import('@capacitor/app')
    appHandle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) ensureRegistered(false)
    })
  } catch { /* @capacitor/app nicht verfügbar – dann nur beim Start */ }

  await ensureRegistered(true)

  return () => {
    for (const h of handles) h.remove()
    appHandle?.remove()
  }
}

// Beim Logout das Token dieses Geräts entfernen, damit der nächste Nutzer
// auf dem Gerät keine fremden Benachrichtigungen bekommt.
// Nur die Zeile DIESES Geräts – andere Geräte desselben Kontos bleiben angemeldet.
export async function unregisterCurrentDevice(userId) {
  if (!isNativePushAvailable() || !userId || !currentToken) return
  await supabase.from('device_tokens').delete().eq('user_id', userId).eq('token', currentToken)
  currentToken = null
}
