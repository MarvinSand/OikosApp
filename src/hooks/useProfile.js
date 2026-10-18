import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { compressImage } from '../lib/image'
import { readCache, writeCache } from '../lib/swrCache'

// `useCache: true` zeigt sofort den zuletzt geladenen Stand (Profil-Tab).
// Formulare mit Cache (SettingsView) dürfen frische Daten nur übernehmen,
// solange der Nutzer noch nichts geändert hat – sonst überschreibt das
// spätere Eintreffen bereits getippte Eingaben.
// `withStats: false` spart die drei Zähler-Requests, wo keine Stats nötig sind.
export function useProfile({ useCache = false, withStats = true } = {}) {
  const { user } = useAuth()
  const [cached] = useState(() => (useCache ? readCache(user?.id, 'profile') : undefined))
  const [profile, setProfile] = useState(cached?.profile ?? null)
  const [stats, setStats] = useState(cached?.stats ?? { peopleCount: 0, prayerCount: 0, maxStage: 0 })
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    if (!cached) setLoading(true)
    setError(null)
    try {
      // Eigenes Profil inkl. privater Felder (Adresse, Koordinaten, Geburtstag,
      // YouVersion-E-Mail) nur über die Owner-RPC – direkte Spalten-Reads auf
      // diese Felder sind für andere Nutzer gesperrt.
      const [
        { data: profileRows, error: profileError },
        { count: peopleCount },
        { count: prayerCount },
        { data: stageData },
      ] = await Promise.all([
        supabase.rpc('get_my_profile'),
        ...(withStats ? [
          supabase.from('oikos_people').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('prayer_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('impact_map_progress')
            .select('stage')
            .eq('owner_id', user.id)
            .not('completed_at', 'is', null)
            .order('stage', { ascending: false })
            .limit(1),
        ] : [{}, {}, {}]),
      ])
      const profileData = Array.isArray(profileRows) ? (profileRows[0] ?? null) : (profileRows ?? null)

      // Fehlgeschlagener Profil-Request (offline, Timeout): gecachten Stand behalten
      if (!profileData) {
        if (profileError) setError(profileError)
        return
      }
      const nextStats = !withStats ? (readCache(user.id, 'profile')?.stats ?? stats) : {
        peopleCount: peopleCount || 0,
        prayerCount: prayerCount || 0,
        maxStage: stageData?.[0]?.stage || 0,
      }
      setProfile(profileData)
      setStats(nextStats)
      writeCache(user.id, 'profile', { profile: profileData, stats: nextStats })
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(updates) {
    // Kein `.select()` nach dem Update: die Antwort würde alle Spalten
    // zurückgeben, private Spalten sind aber nicht mehr direkt lesbar.
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) throw error
    const { data: rows } = await supabase.rpc('get_my_profile')
    const fresh = Array.isArray(rows) ? rows[0] : rows
    let next
    setProfile(p => {
      next = { ...(p || {}), ...updates, ...(fresh || {}) }
      writeCache(user.id, 'profile', { profile: next, stats })
      return next
    })
    return fresh || { ...(profile || {}), ...updates }
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

  return { profile, stats, loading, error, reload: load, updateProfile, uploadAvatar, deleteAccount }
}
