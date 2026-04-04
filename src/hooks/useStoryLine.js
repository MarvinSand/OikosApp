import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useStoryLine(personId) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!personId) return
    load()
  }, [personId, user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('person_storyline')
      .select('*')
      .eq('person_id', personId)
      .or(user ? `owner_id.eq.${user.id},is_public.eq.true` : 'is_public.eq.true')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  async function addEntry({ text, entry_date, is_public }) {
    const tempId = 'temp-' + Date.now()
    const optimistic = {
      id: tempId, person_id: personId, owner_id: user.id,
      text, entry_date, is_public,
      created_at: new Date().toISOString(),
    }
    setEntries(e => [optimistic, ...e])

    const { data, error } = await supabase
      .from('person_storyline')
      .insert({ person_id: personId, owner_id: user.id, text, entry_date, is_public })
      .select().single()

    if (error) { 
      console.error('Supabase Storyline Insert Error:', error);
      setEntries(e => e.filter(x => x.id !== tempId)); 
      throw error; 
    }
    setEntries(e => e.map(x => x.id === tempId ? data : x))
    return data
  }

  async function updateEntry(id, updates) {
    setEntries(e => e.map(x => x.id === id ? { ...x, ...updates } : x))
    const { error } = await supabase
      .from('person_storyline')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { await load(); throw error }
  }

  async function deleteEntry(id) {
    setEntries(e => e.filter(x => x.id !== id))
    await supabase.from('person_storyline').delete().eq('id', id)
  }

  return { entries, loading, addEntry, updateEntry, deleteEntry, reload: load }
}
