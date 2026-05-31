import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePrayerSession() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [listId, setListId] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [prayedSet, setPrayedSet] = useState(new Set())
  const [timerDuration, setTimerDuration] = useState(60)
  const [timeLeft, setTimeLeft] = useState(60)
  const [timerExpired, setTimerExpired] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [sessionSummary, setSessionSummary] = useState(null)

  const sessionStartRef = useRef(null)
  const prayedSetRef = useRef(new Set())
  const prayedCountRef = useRef(0)
  const wakeLockRef = useRef(null)
  const cardsRef = useRef([])
  const cardIndexRef = useRef(0)

  const currentCard = cards[cardIndex] || null
  const totalCards = cards.length
  const prayedCount = prayedSet.size

  // Timer countdown – resets when cardIndex or timerDuration changes
  useEffect(() => {
    if (!isActive || isFinished || timerDuration === 0) return
    setTimeLeft(timerDuration)
    setTimerExpired(false)
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimerExpired(true)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive, isFinished, cardIndex, timerDuration]) // eslint-disable-line react-hooks/exhaustive-deps

  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch { /* non-critical */ }
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null }
  }

  function startSession(itemCards, listIdentifier, durationSeconds = 60) {
    prayedSetRef.current = new Set()
    prayedCountRef.current = 0
    cardsRef.current = itemCards
    cardIndexRef.current = 0
    setCards(itemCards)
    setListId(listIdentifier)
    setCardIndex(0)
    setPrayedSet(new Set())
    setTimerDuration(durationSeconds)
    setTimeLeft(durationSeconds)
    setTimerExpired(false)
    setIsFinished(false)
    setSessionSummary(null)
    sessionStartRef.current = Date.now()
    setIsActive(true)
    acquireWakeLock()
  }

  async function logPrayer(card) {
    if (!card?.request || !user) return
    try {
      if (card.type === 'personal') {
        await supabase.from('personal_prayer_logs').insert({ request_id: card.request.id, user_id: user.id })
      } else {
        await supabase.from('prayer_logs').insert({ prayer_request_id: card.request.id, user_id: user.id })
      }
    } catch { /* non-critical in session */ }
  }

  async function finishSession(finalPrayedCount) {
    setIsActive(false)
    setIsFinished(true)
    releaseWakeLock()
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000)

    try {
      await supabase.from('prayer_sessions').insert({
        user_id: user.id,
        list_id: listId || null,
        started_at: new Date(sessionStartRef.current).toISOString(),
        ended_at: new Date().toISOString(),
        prayers_count: finalPrayedCount,
        duration_seconds: duration,
      })
    } catch { /* non-critical */ }

    let streak = 0
    try {
      const { data: stats } = await supabase.from('user_prayer_stats').select('current_streak').eq('user_id', user.id).single()
      streak = stats?.current_streak || 0
    } catch { /* non-critical */ }

    setSessionSummary({ prayedCount: finalPrayedCount, duration, streak })
  }

  async function markPrayed() {
    const idx = cardIndexRef.current
    const card = cardsRef.current[idx]
    if (!prayedSetRef.current.has(idx)) {
      prayedSetRef.current.add(idx)
      prayedCountRef.current += 1
      setPrayedSet(new Set(prayedSetRef.current))
      logPrayer(card) // fire and forget
    }
    const nextIdx = idx + 1
    if (nextIdx >= cardsRef.current.length) {
      await finishSession(prayedCountRef.current)
    } else {
      cardIndexRef.current = nextIdx
      setCardIndex(nextIdx)
    }
  }

  function skipCard() {
    const nextIdx = cardIndexRef.current + 1
    if (nextIdx >= cardsRef.current.length) {
      finishSession(prayedCountRef.current)
    } else {
      cardIndexRef.current = nextIdx
      setCardIndex(nextIdx)
    }
  }

  function goBack() {
    const prevIdx = cardIndexRef.current - 1
    if (prevIdx < 0) return
    if (prayedSetRef.current.has(prevIdx)) {
      prayedSetRef.current.delete(prevIdx)
      prayedCountRef.current = Math.max(0, prayedCountRef.current - 1)
      setPrayedSet(new Set(prayedSetRef.current))
    }
    cardIndexRef.current = prevIdx
    setCardIndex(prevIdx)
  }

  function endSession() {
    finishSession(prayedCountRef.current)
  }

  function resetSession() {
    setIsActive(false)
    setIsFinished(false)
    setCards([])
    setCardIndex(0)
    setPrayedSet(new Set())
    setSessionSummary(null)
    prayedSetRef.current = new Set()
    prayedCountRef.current = 0
    cardsRef.current = []
    cardIndexRef.current = 0
    releaseWakeLock()
  }

  return {
    isActive, isFinished, cards, currentCard, cardIndex, totalCards,
    prayedCount, prayedSet, timerDuration, timeLeft, timerExpired,
    sessionSummary, startSession, markPrayed, skipCard, goBack, endSession, resetSession,
  }
}
