import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Verhindert, dass mehrere Hook-Instanzen gleichzeitig die Standard-Liste anlegen.
let ensuringDefaultList = false
export const LATER_LIST_NAME = 'Später beten'

export function usePrayerLists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    let { data } = await supabase
      .from('prayer_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!data) { setLoading(false); return }

    // Standard-Liste "Später beten" für alle sicherstellen (einmalig anlegen).
    if (!data.some(l => (l.name || '').toLowerCase() === LATER_LIST_NAME.toLowerCase()) && !ensuringDefaultList) {
      ensuringDefaultList = true
      const { data: created } = await supabase
        .from('prayer_lists')
        .insert({ user_id: user.id, name: LATER_LIST_NAME, icon: '⏰', color: '#7A9E7E', sort_order: 0 })
        .select()
        .single()
      ensuringDefaultList = false
      if (created) data = [created, ...data]
    }

    // Zähle Anliegen pro Liste
    const listIds = data.map(l => l.id)
    let countMap = {}
    if (listIds.length > 0) {
      const { data: items } = await supabase
        .from('prayer_list_items')
        .select('list_id')
        .in('list_id', listIds)
      for (const item of (items || [])) {
        countMap[item.list_id] = (countMap[item.list_id] || 0) + 1
      }
    }

    setLists(data.map(l => ({ ...l, itemCount: countMap[l.id] || 0 })))
    setLoading(false)
  }

  async function createList({ name, icon = '🙏', color = '#7A9E7E', description = null }) {
    const maxOrder = lists.reduce((max, l) => Math.max(max, l.sort_order || 0), 0)
    const { data, error } = await supabase
      .from('prayer_lists')
      .insert({ user_id: user.id, name, icon, color, description, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw error
    setLists(prev => [...prev, { ...data, itemCount: 0 }])
    return data
  }

  async function updateList(listId, updates) {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, ...updates } : l))
    const { error } = await supabase
      .from('prayer_lists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', listId)
    if (error) { await load() }
  }

  async function deleteList(listId) {
    setLists(prev => prev.filter(l => l.id !== listId))
    await supabase.from('prayer_lists').delete().eq('id', listId)
  }

  async function reorderLists(newOrder) {
    const updated = newOrder.map((id, i) => ({
      ...lists.find(l => l.id === id),
      sort_order: i,
    }))
    setLists(updated)
    await Promise.all(
      updated.map(l =>
        supabase.from('prayer_lists').update({ sort_order: l.sort_order }).eq('id', l.id)
      )
    )
  }

  return { lists, loading, createList, updateList, deleteList, reorderLists, reload: load }
}
