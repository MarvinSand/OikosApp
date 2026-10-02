import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

// Native Push läuft ausschließlich über APNs (iOS) bzw. FCM (Android) – im
// Browser gibt es das Plugin nicht. Web Push ist auf iOS in einer WKWebView
// nicht verfügbar, deshalb gibt es dafür keinen Fallback.
export function isNativePushAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')
}

// Ohne Mac/Safari-Ferndebugging gibt es keine andere Möglichkeit, ein
// stillschweigend fehlschlagendes Registrieren auf einem TestFlight-Gerät
// überhaupt zu bemerken – deshalb ein sichtbarer Toast statt nur Konsole.
const FIRST_REGISTRATION_KEY = 'oikos_push_registered_once'

async function storeToken(userId, token, showToast) {
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

  let permission = await PushNotifications.checkPermissions()
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions()
  }
  if (permission.receive !== 'granted') {
    showToast?.('Push-Berechtigung nicht erteilt – Benachrichtigungen bleiben aus. Kann in den iOS-Einstellungen für Oikos Connect nachträglich erlaubt werden.', 'info')
    return () => {}
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

  await PushNotifications.register()

  return () => { for (const h of handles) h.remove() }
}

// Beim Logout das Token dieses Geräts entfernen, damit der nächste Nutzer
// auf dem Gerät keine fremden Benachrichtigungen bekommt.
export async function unregisterCurrentDevice(userId) {
  if (!isNativePushAvailable() || !userId) return
  await supabase.from('device_tokens').delete().eq('user_id', userId)
}
