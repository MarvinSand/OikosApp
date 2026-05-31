import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

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

  async function subscribe() {
    if (!isSupported) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        // No VAPID key configured – still mark as "subscribed" locally for settings UI
        await supabase.from('profiles').update({ push_subscription: { type: 'local' } }).eq('id', user.id)
        setIsSubscribed(true)
        return true
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await supabase.from('profiles').update({
        push_subscription: sub.toJSON(),
      }).eq('id', user.id)

      setIsSubscribed(true)
      return true
    } catch {
      return false
    }
  }

  async function unsubscribe() {
    if (isSupported) {
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
    setPreferences(prev => ({ ...prev, ...newPrefs }))
    await supabase.from('profiles').update({
      prayer_reminder_types: { ...preferences, ...newPrefs },
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
