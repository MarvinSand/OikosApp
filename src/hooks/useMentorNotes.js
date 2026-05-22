import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMentorNotes(menteeId) {
  const { user } = useAuth()
  const [noteText, setNoteText]   = useState('')
  const [noteId, setNoteId]       = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [saving, setSaving]       = useState(false)
  const debounceRef               = useRef(null)

  useEffect(() => {
    if (!user || !menteeId) return
    loadNote()
  }, [user?.id, menteeId])

  async function loadNote() {
    const { data } = await supabase
      .from('mentor_notes')
      .select('id, note, updated_at')
      .eq('mentor_id', user.id)
      .eq('mentee_id', menteeId)
      .maybeSingle()
    if (data) {
      setNoteText(data.note || '')
      setNoteId(data.id)
      setLastSaved(new Date(data.updated_at))
    }
  }

  async function persist(text) {
    setSaving(true)
    const now = new Date().toISOString()
    if (noteId) {
      await supabase
        .from('mentor_notes')
        .update({ note: text, updated_at: now })
        .eq('id', noteId)
    } else {
      const { data } = await supabase
        .from('mentor_notes')
        .insert({ mentor_id: user.id, mentee_id: menteeId, note: text })
        .select('id')
        .single()
      if (data) setNoteId(data.id)
    }
    setLastSaved(new Date())
    setSaving(false)
  }

  function handleChange(text) {
    setNoteText(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(text), 1000)
  }

  return { noteText, handleChange, lastSaved, saving }
}
