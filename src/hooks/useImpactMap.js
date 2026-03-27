import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const STAGES = [
  {
    num: 1, name: 'Freisetzung',
    question: (name) => `Hat ${name} das Evangelium schon gehört?`,
    explanation: 'Übergib diese Person im Gebet an Gott. Lass los und vertraue.',
  },
  {
    num: 2, name: 'Meine Rolle',
    question: (name) => `Bin ich es, der ${name} das Evangelium weitergibt? Wenn ja – wann?`,
    explanation: 'Bitte Gott um Klarheit: Bin ich derjenige, der das Evangelium weitergibt?',
  },
  {
    num: 3, name: 'Empathie',
    question: (name) => `In welcher Situation ist ${name} gerade?`,
    explanation: 'Nimm dir Zeit, um wirklich in die Situation dieser Person hineinzufühlen.',
  },
  {
    num: 4, name: 'Perspektive',
    question: (name) => `Wie sieht Gott ${name}?`,
    explanation: 'Bete um Gottes Sicht auf diese Person. Wie liebt er sie?',
  },
  {
    num: 5, name: 'Wortkraft',
    question: (name) => `Hat Gott eine Bibelstelle für ${name}?`,
    explanation: 'Bitte Gott um eine Bibelstelle oder ein Wort speziell für diesen Menschen.',
  },
  {
    num: 6, name: 'Kontinuität',
    question: (name) => `Plane dir 10 Min/Tag ein – für ${name}`,
    explanation: 'Plane konkrete Zeit ein. 10 Minuten täglich für Gebet und Beziehung.',
  },
]

export function useImpactMap(personId) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!personId || !user) return
    load()
  }, [personId, user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('impact_map_progress')
      .select('*')
      .eq('person_id', personId)
      .order('stage')
    setEntries(data || [])
    setLoading(false)
  }

  function getEntry(stage) {
    return entries.find(e => e.stage === stage)
  }

  function getStageStatus(stage) {
    const e = getEntry(stage)
    if (!e) return 'future'
    if (e.completed_at) return 'done'
    return 'active'
  }

  const currentStage = [1, 2, 3, 4, 5, 6].find(n => getStageStatus(n) !== 'done') || null
  const isAllDone = currentStage === null && entries.length > 0

  async function saveNote(stage, note, is_public) {
    const existing = getEntry(stage)
    let data, error

    if (existing) {
      ;({ data, error } = await supabase
        .from('impact_map_progress')
        .update({ note, is_public })
        .eq('id', existing.id)
        .select().single())
    } else {
      ;({ data, error } = await supabase
        .from('impact_map_progress')
        .insert({ person_id: personId, owner_id: user.id, stage, note, is_public })
        .select().single())
    }

    if (error) throw error
    setEntries(e =>
      existing ? e.map(x => x.id === existing.id ? data : x) : [...e, data]
    )
  }

  async function completeStage(stage, note, is_public) {
    const existing = getEntry(stage)
    const completed_at = new Date().toISOString()
    let data, error

    if (existing) {
      ;({ data, error } = await supabase
        .from('impact_map_progress')
        .update({ note, is_public, completed_at })
        .eq('id', existing.id)
        .select().single())
    } else {
      ;({ data, error } = await supabase
        .from('impact_map_progress')
        .insert({ person_id: personId, owner_id: user.id, stage, note, is_public, completed_at })
        .select().single())
    }

    if (error) throw error
    setEntries(e =>
      existing ? e.map(x => x.id === existing.id ? data : x) : [...e, data]
    )

    // Badge in oikos_people synchron halten
    const nextImpactStage = stage < 6 ? stage + 1 : 6
    await supabase.from('oikos_people').update({ impact_stage: nextImpactStage }).eq('id', personId)

    return { data, nextImpactStage }
  }

  return { entries, loading, currentStage, isAllDone, getEntry, getStageStatus, saveNote, completeStage }
}
