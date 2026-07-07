import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const ENCOURAGEMENTS = [
  (stats) => `Du hast diesen Monat ${stats.thisMonthPrayers} Mal gebetet – jedes Gebet zählt.`,
  (stats) => `${stats.peopleCount} Menschen wissen nicht, dass du für sie betest – Gott weiß es.`,
  (stats) => `Dein längster Streak war ${stats.longestStreak} Tage – du weißt wie es geht.`,
  (stats) => `${stats.answeredCount} erhörte Gebete erinnern dich: Gott hört.`,
  () => 'Gebet verändert Dinge – und es verändert dich.',
  () => 'Jedes Gebet ist ein Akt des Vertrauens.',
  (stats) => `Du hast insgesamt ${stats.totalPrayers} Gebete gesprochen. Das ist Treue in Aktion.`,
]

function getDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getYesterday() {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0]
}

function getLastMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export function usePrayerStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [monthlyAnswered, setMonthlyAnswered] = useState([])
  const [totalPrayerTime, setTotalPrayerTime] = useState(0)
  const [weekPrayerTime, setWeekPrayerTime] = useState(0)
  const [monthPrayerTime, setMonthPrayerTime] = useState(0)
  const [peopleCount, setPeopleCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [monthPrayerCount, setMonthPrayerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const today = getToday()
    const yesterday = getYesterday()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const monday = getLastMonday()
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    // Logs must cover both the weekly chart and the month total
    const logsSince = monthStart < sevenDaysAgo ? monthStart : sevenDaysAgo

    const [
      { data: rawStats },
      { data: myLogs },
      { data: sessions },
      { data: personalAnswered },
      { data: oikosAnswered },
      { data: categoryData },
      { count: peopleCnt },
    ] = await Promise.all([
      supabase.from('user_prayer_stats').select('*').eq('user_id', user.id).single(),
      supabase.from('personal_prayer_logs').select('created_at').eq('user_id', user.id).gte('created_at', logsSince),
      supabase.from('prayer_sessions').select('duration_seconds, started_at').eq('user_id', user.id),
      supabase.from('personal_prayer_requests').select('answered_at, created_at, id').eq('owner_id', user.id).eq('is_answered', true),
      supabase.from('prayer_requests').select('answered_at, created_at, id').eq('owner_id', user.id).eq('is_answered', true),
      supabase.from('personal_prayer_requests').select('category_id, prayer_categories(name, emoji, color)').eq('owner_id', user.id).not('category_id', 'is', null),
      supabase.from('oikos_people').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    // ── Streak sync ──────────────────────────────────────────────
    let currentStats = rawStats
    if (currentStats) {
      const hasPrayedToday = (myLogs || []).some(l => l.created_at.split('T')[0] === today)
      const lastDate = currentStats.last_prayer_date

      let updated = false
      let newStreak = currentStats.current_streak
      let newLongest = currentStats.longest_streak
      let newLastDate = lastDate

      if (hasPrayedToday && lastDate !== today) {
        if (lastDate === yesterday) {
          newStreak = currentStats.current_streak + 1
        } else {
          newStreak = 1
        }
        newLongest = Math.max(currentStats.longest_streak, newStreak)
        newLastDate = today
        updated = true
      } else if (!hasPrayedToday && lastDate !== today && lastDate !== yesterday && currentStats.current_streak > 0) {
        newStreak = 0
        updated = true
      }

      // Reset freeze day on Monday
      const thisMonday = monday
      if (currentStats.last_freeze_reset !== thisMonday && currentStats.freeze_days_remaining < 1) {
        await supabase.from('user_prayer_stats').update({
          freeze_days_remaining: 1,
          last_freeze_reset: thisMonday,
          ...(updated ? { current_streak: newStreak, longest_streak: newLongest, last_prayer_date: newLastDate } : {}),
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id)
        const { data: refreshed } = await supabase.from('user_prayer_stats').select('*').eq('user_id', user.id).single()
        currentStats = refreshed || currentStats
      } else if (updated) {
        await supabase.from('user_prayer_stats').update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_prayer_date: newLastDate,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id)
        currentStats = { ...currentStats, current_streak: newStreak, longest_streak: newLongest, last_prayer_date: newLastDate }
      }
    }

    setStats(currentStats)

    // ── Weekly activity (last 7 days) ────────────────────────────
    const days = []
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().split('T')[0]
      const isToday = key === today
      const count = (myLogs || []).filter(l => l.created_at.split('T')[0] === key).length
      days.push({ date: key, day: dayNames[d.getDay()], count, isToday })
    }
    setWeeklyActivity(days)
    setMonthPrayerCount((myLogs || []).filter(l => l.created_at >= monthStart).length)

    // ── Prayer time ──────────────────────────────────────────────
    const allSessions = sessions || []
    const total = allSessions.reduce((s, x) => s + (x.duration_seconds || 0), 0)
    const weekSessions = allSessions.filter(x => x.started_at >= monday)
    const monthSessions = allSessions.filter(x => x.started_at >= monthStart)
    setTotalPrayerTime(total)
    setWeekPrayerTime(weekSessions.reduce((s, x) => s + (x.duration_seconds || 0), 0))
    setMonthPrayerTime(monthSessions.reduce((s, x) => s + (x.duration_seconds || 0), 0))

    // ── Category breakdown ───────────────────────────────────────
    const catMap = {}
    for (const r of (categoryData || [])) {
      if (!r.prayer_categories) continue
      const key = r.category_id
      if (!catMap[key]) {
        catMap[key] = {
          name: r.prayer_categories.name,
          emoji: r.prayer_categories.emoji,
          color: r.prayer_categories.color || '#7A9E7E',
          count: 0,
        }
      }
      catMap[key].count++
    }
    setCategoryBreakdown(Object.values(catMap).sort((a, b) => b.count - a.count))

    // ── Monthly answered ─────────────────────────────────────────
    const allAnswered = [
      ...(personalAnswered || []),
      ...(oikosAnswered || []),
    ]
    const monthMap = {}
    for (const r of allAnswered) {
      const d = new Date(r.answered_at || r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      if (!monthMap[key]) monthMap[key] = { key, label, count: 0 }
      monthMap[key].count++
    }
    const sorted = Object.values(monthMap).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6)
    setMonthlyAnswered(sorted)
    setAnsweredCount(allAnswered.length)
    setPeopleCount(peopleCnt || 0)

    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Derived values for encouragement card
  const today = getToday()
  const statsCtx = {
    longestStreak: stats?.longest_streak || 0,
    answeredCount,
    totalPrayers: stats?.total_prayers || 0,
    peopleCount,
    thisMonthPrayers: monthPrayerCount,
  }
  const encouragementIndex = getDayOfYear() % ENCOURAGEMENTS.length
  const encouragement = ENCOURAGEMENTS[encouragementIndex](statsCtx)

  // Streak status
  const yesterday = getYesterday()
  const last = stats?.last_prayer_date
  let streakStatus = 'broken'
  if (last === today) streakStatus = 'active'
  else if (last === yesterday) streakStatus = 'at_risk'

  async function useFreezeDay() {
    if (!stats || stats.freeze_days_remaining <= 0) return
    const today = getToday()
    await supabase.from('user_prayer_stats').update({
      freeze_days_remaining: stats.freeze_days_remaining - 1,
      freeze_days_used: (stats.freeze_days_used || 0) + 1,
      last_prayer_date: today,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    await load()
  }

  return {
    stats,
    weeklyActivity,
    categoryBreakdown,
    monthlyAnswered,
    totalPrayerTime,
    weekPrayerTime,
    monthPrayerTime,
    peopleCount,
    answeredCount,
    encouragement,
    streakStatus,
    loading,
    reload: load,
    useFreezeDay,
  }
}
