import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/** True if the signed-in user is in app_admins. */
export function useIsAppAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(!!user)

  useEffect(() => {
    let cancelled = false
    if (!user?.id) {
      setIsAdmin(false)
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase.rpc('is_app_admin')
      if (cancelled) return
      if (error) {
        // Fallback: direct table read (own row)
        const { data: row } = await supabase
          .from('app_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!cancelled) setIsAdmin(!!row)
      } else {
        setIsAdmin(!!data)
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.id])

  return { isAppAdmin: isAdmin, loading }
}
