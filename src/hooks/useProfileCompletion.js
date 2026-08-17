import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useProfile } from './useProfile'
import { useFriendships } from './useFriendships'

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
    target: '/settings',
    done: profile => !!profile?.bio_text?.trim(),
  },
  {
    key: 'avatar',
    weight: 15,
    title: 'Profilbild hinzufügen',
    text: 'Zeig dein Gesicht – so erkennen dich Geschwister leichter.',
    target: '/profile',
    done: profile => !!profile?.avatar_url,
  },
  {
    key: 'location',
    weight: 20,
    title: 'Standort angeben',
    text: 'Trag deinen Standort ein und zeig ihn auf der Weltkarte.',
    target: '/settings',
    done: profile => profile?.latitude != null && profile?.longitude != null,
  },
  {
    key: 'oikosMap',
    weight: 20,
    title: 'Erste Oikos Map erstellen',
    text: 'Trag Menschen aus deinem Umfeld ein, für die du beten möchtest.',
    target: '/profile',
    done: (_profile, stats) => (stats?.peopleCount || 0) > 0,
  },
  {
    key: 'friendRequest',
    weight: 20,
    title: 'Erste Freundschaftsanfrage schicken',
    text: 'Verbinde dich mit Geschwistern aus deiner Community.',
    target: '/friends',
    done: (_profile, _stats, friendState) =>
      (friendState?.friends?.length || 0) > 0 || (friendState?.pendingSent?.length || 0) > 0,
  },
]

export function useProfileCompletion() {
  const { user } = useAuth()
  const { profile, stats, loading: profileLoading } = useProfile()
  const { friends, pendingSent, loading: friendsLoading } = useFriendships()

  const loading = !user || profileLoading || friendsLoading

  const { percent, steps, nextStep } = useMemo(() => {
    const evaluated = STEPS.map(step => ({
      ...step,
      isDone: step.done(profile, stats, { friends, pendingSent }),
    }))
    const totalWeight = evaluated.reduce((sum, s) => sum + s.weight, 0)
    const doneWeight = evaluated.reduce((sum, s) => sum + (s.isDone ? s.weight : 0), 0)
    return {
      percent: totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0,
      steps: evaluated,
      nextStep: evaluated.find(s => !s.isDone) || null,
    }
  }, [profile, stats, friends, pendingSent])

  return { percent, steps, nextStep, loading, isComplete: percent >= 100 }
}
