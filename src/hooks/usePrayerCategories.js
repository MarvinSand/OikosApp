import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePrayerCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    const { data } = await supabase
      .from('prayer_categories')
      .select('*')
      .or(`is_system.eq.true,user_id.eq.${user.id}`)
      .order('sort_order', { ascending: true })
    setCategories(data || [])
    setLoading(false)
  }

  async function createCategory({ name, emoji, color = null }) {
    const maxOrder = categories.filter(c => !c.is_system).reduce((max, c) => Math.max(max, c.sort_order || 0), 100)
    const { data, error } = await supabase
      .from('prayer_categories')
      .insert({ user_id: user.id, name, emoji, color, is_system: false, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw error
    setCategories(prev => [...prev, data])
    return data
  }

  async function deleteCategory(categoryId) {
    setCategories(prev => prev.filter(c => c.id !== categoryId))
    await supabase.from('prayer_categories').delete().eq('id', categoryId)
  }

  return { categories, loading, createCategory, deleteCategory, reload: load }
}
