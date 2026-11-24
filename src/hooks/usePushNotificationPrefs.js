import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Global (nicht pro Person) einstellbar: welche Benachrichtigungsarten als
// Push aufs Handy kommen. Standard = ALLE an; gespeichert wird nur, was der
// Nutzer abschaltet (profiles.push_disabled_types, Array von
// notifications.type-Strings). So kommen neue Typen automatisch an.
export function usePushNotificationPrefs() {
  const { user } = useAuth()
  const [disabledTypes, setDisabledTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    supabase
      .from('profiles')
      .select('push_disabled_types')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setDisabledTypes(data?.push_disabled_types || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id])

  async function setTypeEnabled(type, enabled) {
    const prev = disabledTypes
    const next = enabled
      ? prev.filter(t => t !== type)
      : [...new Set([...prev, type])]
    setDisabledTypes(next)
    const { error } = await supabase
      .from('profiles')
      .update({ push_disabled_types: next })
      .eq('id', user.id)
    if (error) setDisabledTypes(prev)
  }

  return { disabledTypes, loading, setTypeEnabled }
}
