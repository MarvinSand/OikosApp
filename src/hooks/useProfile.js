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
    await supabase.rpc('delete_user')
    await supabase.auth.signOut()
  }

  return { profile, stats, loading, updateProfile, uploadAvatar, deleteAccount }
}

// Compress image file to maxDim × maxDim, quality 0–1
function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
        else { width = Math.round(width * maxDim / height); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}
