import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { isNative, nativePlatform } from '../lib/native'

const DEFAULT_PREFS = {
  long_not_prayed: true,
  birthday: true,
  answered_anniversary: true,
  streak_reminder: true,
  daily_morning: false,
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [preferences, setPreferences] = useState(DEFAULT_PREFS)
  const [reminderTimes, setReminderTimes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In der nativen App laufen Benachrichtigungen über APNs bzw. FCM.
    // Web Push (PushManager) existiert im WKWebView von iOS gar nicht –
    // die alte Prüfung hätte dort immer "nicht unterstützt" ergeben.
    if (isNative) {
      setIsSupported(true)
      return
    }
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  const loadPrefs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('prayer_reminder_types, prayer_reminder_times, push_subscription')
      .eq('id', user.id)
      .single()

    if (data) {
      setPreferences({ ...DEFAULT_PREFS, ...(data.prayer_reminder_types || {}) })
      setReminderTimes(data.prayer_reminder_times || [])
      setIsSubscribed(!!data.push_subscription)
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadPrefs() }, [loadPrefs])

  // ─── Nativ: APNs / FCM ────────────────────────────────────────
  async function subscribeNative() {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    let status = await PushNotifications.checkPermissions()
    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PushNotifications.requestPermissions()
    }
    if (status.receive !== 'granted') return false

    // Das Token kommt asynchron über ein Event, nicht als Rückgabewert.
    const token = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000)
      PushNotifications.addListener('registration', ({ value }) => {
        clearTimeout(timeout)
        resolve(value)
      })
      PushNotifications.addListener('registrationError', () => {
        clearTimeout(timeout)
        resolve(null)
      })
      PushNotifications.register()
    })

    if (!token) return false

    await supabase.from('profiles').update({
      push_subscription: { type: 'native', platform: nativePlatform, token },
    }).eq('id', user.id)

    setIsSubscribed(true)
    return true
  }

  // ─── Web: VAPID / PushManager ─────────────────────────────────
  async function subscribeWeb() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    // Früher wurde der Nutzer hier ohne Key als "subscribed" markiert.
    // Die Einstellung zeigte dann an, Benachrichtigungen seien aktiv,
    // obwohl nie eine ankommen konnte.
    if (!vapidKey) return false

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    await supabase.from('profiles').update({
      push_subscription: sub.toJSON(),
    }).eq('id', user.id)

    setIsSubscribed(true)
    return true
  }

  async function subscribe() {
    if (!isSupported || !user) return false
    try {
      return isNative ? await subscribeNative() : await subscribeWeb()
    } catch {
      return false
    }
  }

  async function unsubscribe() {
    if (isNative) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        await PushNotifications.removeAllListeners()
      } catch { /* non-critical */ }
    } else if (isSupported) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      } catch { /* non-critical */ }
    }

    await supabase.from('profiles').update({ push_subscription: null }).eq('id', user.id)
    setIsSubscribed(false)
  }

  async function updatePreferences(newPrefs) {
    const merged = { ...preferences, ...newPrefs }
    setPreferences(merged)
    // Use the freshly merged object (not the `preferences` closure) so two
    // quick successive calls don't clobber each other's changes.
    await supabase.from('profiles').update({
      prayer_reminder_types: merged,
    }).eq('id', user.id)
  }

  async function updateReminderTimes(times) {
    setReminderTimes(times)
    await supabase.from('profiles').update({
      prayer_reminder_times: times,
    }).eq('id', user.id)
  }

  return {
    isSupported,
    isSubscribed,
    preferences,
    reminderTimes,
    loading,
    subscribe,
    unsubscribe,
    updatePreferences,
    updateReminderTimes,
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}
