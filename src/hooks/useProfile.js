import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ peopleCount: 0, prayerCount: 0, maxStage: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const [
      { data: profileData },
      { count: peopleCount },
      { count: prayerCount },
      { data: stageData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('oikos_people').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('prayer_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('impact_map_progress')
        .select('stage')
        .eq('owner_id', user.id)
        .not('completed_at', 'is', null)
        .order('stage', { ascending: false })
        .limit(1),
    ])

    setProfile(profileData)
    setStats({
      peopleCount: peopleCount || 0,
      prayerCount: prayerCount || 0,
      maxStage: stageData?.[0]?.stage || 0,
    })
    setLoading(false)
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(p => ({ ...p, ...data }))
    return data
  }

  async function deleteAccount() {
    await supabase.rpc('delete_user')
    await supabase.auth.signOut()
  }

  return { profile, stats, loading, updateProfile, deleteAccount }
}
