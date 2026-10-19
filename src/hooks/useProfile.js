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
  const [tabSeed, setTabSeed] = useState(null)

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
      // Ein Round-Trip (Bootstrap-RPC); Fallback auf get_my_profile + Stats.
      const { data: boot, error: bootErr } = await supabase.rpc('get_my_profile_bootstrap', {
        p_with_stats: !!withStats,
      })
      let profileData = boot?.profile ?? null
      let nextStats = boot?.stats ? {
        peopleCount: boot.stats.peopleCount || 0,
        prayerCount: boot.stats.prayerCount || 0,
        maxStage: boot.stats.maxStage || 0,
      } : null

      if (!profileData) {
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
        profileData = Array.isArray(profileRows) ? (profileRows[0] ?? null) : (profileRows ?? null)
        if (!profileData) {
          if (profileError || bootErr) setError(profileError || bootErr)
          return
        }
        nextStats = !withStats ? (readCache(user.id, 'profile')?.stats ?? stats) : {
          peopleCount: peopleCount || 0,
          prayerCount: prayerCount || 0,
          maxStage: stageData?.[0]?.stage || 0,
        }
      } else if (!withStats) {
        nextStats = readCache(user.id, 'profile')?.stats ?? stats
      }

      setProfile(profileData)
      setStats(nextStats)
      writeCache(user.id, 'profile', { profile: profileData, stats: nextStats })
      if (boot?.maps || boot?.posts || boot?.prayer_requests) {
        setTabSeed({
          connectionsCount: boot.connections_count ?? 0,
          publicCommunities: boot.public_communities ?? [],
          maps: boot.maps ?? [],
          posts: boot.posts ?? [],
          reposts: boot.reposts ?? [],
          prayerRequests: boot.prayer_requests ?? [],
        })
      }
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
    const { blob, contentType, ext } = await compressImage(file, 400, 0.8)
    const path = `${user.id}/avatar.${ext}`

    // Alte Varianten entfernen (jpg/webp), dann neu hochladen
    await supabase.storage.from('avatars').remove([
      `${user.id}/avatar.jpg`, `${user.id}/avatar.webp`, path,
    ])

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      })
    if (upErr) throw upErr

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust: gleicher Pfad nach Upsert, Browser soll neu laden
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

  return { profile, stats, loading, error, tabSeed, reload: load, updateProfile, uploadAvatar, deleteAccount }
}
