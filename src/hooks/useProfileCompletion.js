import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Schritte zur Profil-Vervollständigung mit Gewichtung (Summe = 100).
// Jeder Schritt hat ein Ziel (Route), zu dem die Home-Karte navigiert.
const STEPS = [
  {
    key: 'account',
    weight: 10,
    title: 'Account erstellt',
    text: 'Willkommen bei OIKOS!',
    target: '/settings',
    done: () => true,
  },
  {
    key: 'bio',
    weight: 15,
    title: 'Bio schreiben',
    text: 'Erzähl anderen kurz, wer du bist.',
    target: '/settings?section=profile&anchor=bio',
    done: status => !!status?.has_bio,
  },
  {
    key: 'avatar',
    weight: 15,
    title: 'Profilbild hinzufügen',
    text: 'Zeig dein Gesicht – so erkennen dich Geschwister leichter.',
    target: '/settings?section=profile&anchor=avatar',
    done: status => !!status?.has_avatar,
  },
  {
    key: 'location',
    weight: 20,
    title: 'Standort angeben',
    text: 'Trag deinen Standort ein und zeig ihn auf der Weltkarte.',
    target: '/settings?section=profile&anchor=location',
    done: status => !!status?.has_location,
  },
  {
    key: 'oikosMap',
    weight: 20,
    title: 'Erste Oikos Map erstellen',
    text: 'Trag Menschen aus deinem Umfeld ein, für die du beten möchtest.',
    target: '/profile',
    done: status => (status?.people_count || 0) > 0,
  },
  {
    key: 'friendRequest',
    weight: 20,
    title: 'Erste Freundschaftsanfrage schicken',
    text: 'Verbinde dich mit Geschwistern aus deiner Community.',
    target: '/friends',
    done: status => !!status?.has_friend_or_pending_sent,
  },
]

// Vorher: useProfile (4 Requests: Profil, peopleCount, prayerCount,
// impact-stage) + useFriendships (2 Requests: friendships, Profile der
// Gegenüber) – 6 Requests nur um 5 Booleans/Zahlen zu bestimmen. Die
// `get_profile_completion_status()`-RPC liefert genau diese Werte
// serverseitig in einem Request.
export function useProfileCompletion() {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.rpc('get_profile_completion_status')
    setStatus(data?.[0] || null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const { percent, steps, nextStep } = useMemo(() => {
    const evaluated = STEPS.map(step => ({
      ...step,
      isDone: step.done(status),
    }))
    const totalWeight = evaluated.reduce((sum, s) => sum + s.weight, 0)
    const doneWeight = evaluated.reduce((sum, s) => sum + (s.isDone ? s.weight : 0), 0)
    return {
      percent: totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0,
      steps: evaluated,
      nextStep: evaluated.find(s => !s.isDone) || null,
    }
  }, [status])

  return { percent, steps, nextStep, loading, isComplete: percent >= 100 }
}
