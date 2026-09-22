import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

// Native Push läuft ausschließlich über APNs (iOS) bzw. FCM (Android) – im
// Browser gibt es das Plugin nicht. Web Push ist auf iOS in einer WKWebView
// nicht verfügbar, deshalb gibt es dafür keinen Fallback.
export function isNativePushAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')
}

async function storeToken(userId, token) {
  // Das Token ist unique: meldet sich auf demselben Gerät ein anderer Nutzer
  // an, wandert die Zeile zu ihm, statt ein Duplikat anzulegen.
  await supabase.from('device_tokens').upsert({
    user_id: userId,
    token,
    platform: Capacitor.getPlatform() === 'android' ? 'android' : 'ios',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'token' })
}

// Registriert das Gerät für Push und legt das Token ab. Gibt einen Aufräumer
// zurück, der die Listener wieder entfernt.
export async function registerForPush(userId, { onOpen } = {}) {
  if (!isNativePushAvailable() || !userId) return () => {}

  const { PushNotifications } = await import('@capacitor/push-notifications')

  let permission = await PushNotifications.checkPermissions()
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions()
  }
  if (permission.receive !== 'granted') return () => {}

  const handles = await Promise.all([
    PushNotifications.addListener('registration', ({ value }) => {
      storeToken(userId, value)
    }),
    // Ein fehlgeschlagenes Registrieren darf die App nie hochreißen – ohne
    // Token bekommt der Nutzer schlicht keine Pushes.
    PushNotifications.addListener('registrationError', () => {}),
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
