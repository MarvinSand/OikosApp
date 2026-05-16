import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) updateLastActive(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) updateLastActive(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function register(email, password, fullName, gender = null) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })
    if (error) throw error
    if (data?.user && gender) {
      await supabase.from('profiles').update({ gender }).eq('id', data.user.id)
    }
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function resendVerificationEmail() {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user?.email,
    })
    if (error) throw error
  }

  return { user, session, loading, login, register, logout, resendVerificationEmail }
}

let _lastActiveTime = 0
async function updateLastActive(userId) {
  const now = Date.now()
  if (now - _lastActiveTime < 5 * 60 * 1000) return
  _lastActiveTime = now
  try {
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId)
  } catch { /* non-critical */ }
}
