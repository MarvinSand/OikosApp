import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Verwaltet die eigenen Bookmark-Sammlungen (Kategorien für gespeicherte Posts).
export function useBookmarkCollections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('feed_bookmark_collections')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at')
    setCollections(data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function createCollection(name) {
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = collections.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const { data, error } = await supabase
      .from('feed_bookmark_collections')
      .insert({ user_id: user.id, name: trimmed })
      .select('id, name, created_at')
      .single()
    if (error) return null
    setCollections(prev => [...prev, data])
    return data
  }

  async function deleteCollection(id) {
    setCollections(prev => prev.filter(c => c.id !== id))
    await supabase.from('feed_bookmark_collections').delete().eq('id', id)
  }

  return { collections, loading, createCollection, deleteCollection, reload: load }
}
