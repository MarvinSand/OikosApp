import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useDiscipleship() {
  const { user } = useAuth()
  const [myStage, setMyStage] = useState(1)
  const [contents, setContents] = useState([])
  const [progress, setProgress] = useState([])
  const [pairs, setPairs] = useState({ mentor: null, mentees: [] })
  const [peopleCount, setPeopleCount] = useState(0)
  const [registeredAt, setRegisteredAt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)

    const [
      { data: profile },
      { data: contentData },
      { data: progressData },
      { count: pCount },
    ] = await Promise.all([
      supabase.from('profiles').select('discipleship_stage, created_at').eq('id', user.id).single(),
      supabase.from('discipleship_content').select('*').order('sort_order'),
      supabase.from('discipleship_progress').select('content_id, completed_at').eq('user_id', user.id),
      supabase.from('oikos_people').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const rawStage = profile?.discipleship_stage ?? 0
    let stage = rawStage

    // Stage 00 is auto-completed: advance new users to stage 1
    if (rawStage === 0) {
      await supabase.from('profiles').update({ discipleship_stage: 1 }).eq('id', user.id)
      stage = 1
    }

    setMyStage(stage)
    setContents(contentData || [])
    setProgress(progressData || [])
    setPeopleCount(pCount || 0)
    setRegisteredAt(profile?.created_at || null)

    // Load mentor (where I am the mentee)
    const { data: mentorPairData } = await supabase
      .from('discipleship_pairs')
      .select('id, mentor_id, started_at')
      .eq('mentee_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    let mentorProfile = null
    if (mentorPairData) {
      const { data: mp } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', mentorPairData.mentor_id)
        .single()
      if (mp) mentorProfile = { ...mp, pairId: mentorPairData.id, startedAt: mentorPairData.started_at }
    }

    // Load mentees (where I am the mentor)
    const { data: menteePairsData } = await supabase
      .from('discipleship_pairs')
      .select('id, mentee_id, started_at')
      .eq('mentor_id', user.id)
      .eq('is_active', true)

    let menteeProfiles = []
    if (menteePairsData && menteePairsData.length > 0) {
      const menteeIds = menteePairsData.map(p => p.mentee_id)
      const { data: mps } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', menteeIds)
      if (mps) {
        menteeProfiles = mps.map(mp => {
          const pair = menteePairsData.find(p => p.mentee_id === mp.id)
          return { ...mp, pairId: pair?.id, startedAt: pair?.started_at }
        })
      }
    }

    setPairs({ mentor: mentorProfile, mentees: menteeProfiles })
    setLoading(false)
  }

  async function completeContent(contentId) {
    if (progress.some(p => p.content_id === contentId)) return
    const { error } = await supabase
      .from('discipleship_progress')
      .insert({ user_id: user.id, content_id: contentId })
    if (!error) {
      setProgress(prev => [...prev, { content_id: contentId, completed_at: new Date().toISOString() }])
    }
  }

  async function advanceStage() {
    const nextStage = Math.min(myStage + 1, 3)
    const { error } = await supabase
      .from('profiles')
      .update({ discipleship_stage: nextStage })
      .eq('id', user.id)
    if (!error) setMyStage(nextStage)
  }

  async function requestMentor(userId) {
    const { error } = await supabase
      .from('discipleship_pairs')
      .insert({ mentor_id: userId, mentee_id: user.id })
    if (error) throw error
    await load()
  }

  async function addMentee(userId) {
    const { error } = await supabase
      .from('discipleship_pairs')
      .insert({ mentor_id: user.id, mentee_id: userId })
    if (error) throw error
    await load()
  }

  return {
    myStage,
    contents,
    progress,
    pairs,
    peopleCount,
    registeredAt,
    loading,
    completeContent,
    advanceStage,
    requestMentor,
    addMentee,
  }
}
