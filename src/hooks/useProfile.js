import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { compressImage } from '../lib/image'
import { readCache, writeCache } from '../lib/swrCache'

// `useCache: true` zeigt sofort den zuletzt geladenen Stand (Profil-Tab).
// Bewusst NICHT für Formulare wie SettingsView: dort würde das spätere
// Eintreffen der frischen Daten bereits getippte Eingaben überschreiben.
export function useProfile({ useCache = false } = {}) {
  const { user } = useAuth()
  const [cached] = useState(() => (useCache ? readCache(user?.id, 'profile') : undefined))
  const [profile, setProfile] = useState(cached?.profile ?? null)
  const [stats, setStats] = useState(cached?.stats ?? { peopleCount: 0, prayerCount: 0, maxStage: 0 })
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    if (!cached) setLoading(true)
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

    // Fehlgeschlagener Profil-Request (z. B. offline): gecachten Stand behalten
    if (!profileData && cached) { setLoading(false); return }
    const nextStats = {
      peopleCount: peopleCount || 0,
      prayerCount: prayerCount || 0,
      maxStage: stageData?.[0]?.stage || 0,
    }
    setProfile(profileData)
    setStats(nextStats)
    if (profileData) writeCache(user.id, 'profile', { profile: profileData, stats: nextStats })
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
    setProfile(p => {
      const next = { ...p, ...data }
      writeCache(user.id, 'profile', { profile: next, stats })
      return next
    })
    return data
  }

  async function uploadAvatar(file) {
    // Compress to max 800x800 / 500KB via Canvas
    const compressed = await compressImage(file, 800, 0.8)
    const path = `${user.id}/avatar.jpg`

    // Delete old file first (ignore errors)
    await supabase.storage.from('avatars').remove([path])

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw upErr

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust so the browser reloads the new image
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()

    await updateProfile({ avatar_url: publicUrl })
    return publicUrl
  }

  async function deleteAccount() {
    // Fehler weiterreichen – sonst meldet die UI „gelöscht", obwohl das
    // Konto noch existiert (App-Store-Prüfer testen genau diesen Flow).
    const { error } = await supabase.rpc('delete_user')
    if (error) throw error
    await supabase.auth.signOut()
  }

  return { profile, stats, loading, updateProfile, uploadAvatar, deleteAccount }
}
