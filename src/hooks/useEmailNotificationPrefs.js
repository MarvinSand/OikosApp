import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Global (nicht pro Person) einstellbar: welche Benachrichtigungsarten
// zusätzlich per E-Mail geschickt werden sollen. Gespeichert als Array von
// notifications.type-Strings in profiles.email_notification_types.
export function useEmailNotificationPrefs() {
  const { user } = useAuth()
  const [emailTypes, setEmailTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('email_notification_types')
      .eq('id', user.id)
      .single()

    setEmailTypes(data?.email_notification_types || [])
    setLoading(false)
  }

  async function toggleType(type, enabled) {
    const next = enabled
      ? [...new Set([...emailTypes, type])]
      : emailTypes.filter(t => t !== type)
    setEmailTypes(next)
    await supabase.from('profiles').update({ email_notification_types: next }).eq('id', user.id)
  }

  return { emailTypes, loading, toggleType }
}
