import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

function getCurrentWeek() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return {
    week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7),
    year: d.getUTCFullYear(),
  }
}

export function useDiscipleshipStage(stage) {
  const { user } = useAuth()
  const [modules, setModules]                     = useState([])
  const [completedLessons, setCompletedLessons]   = useState([])
  const [weeklyImpulse, setWeeklyImpulse]         = useState(null)
  const [testimonies, setTestimonies]             = useState([])
  const [stagePrayers, setStagePrayers]           = useState([])
  const [nextCall, setNextCall]                   = useState(null)
  const [stageConversationId, setStageConvId]     = useState(null)
  const [stageMemberCount, setStageMemberCount]   = useState(0)
  const [certificate, setCertificate]             = useState(null)
  const [stageCommunity, setStageCommunity]       = useState(null)
  const [isCommunityMember, setIsCommunityMember] = useState(false)
  const [joiningCommunity, setJoiningCommunity]   = useState(false)
  const [loading, setLoading]                     = useState(true)

  const load = useCallback(async () => {
    if (!user || !stage) return
    setLoading(true)
    const { week, year } = getCurrentWeek()

    const [
      { data: modulesData },
      { data: completionsData },
      { data: impulseData },
      { data: callData },
      { data: certData },
    ] = await Promise.all([
      supabase
        .from('course_modules')
        .select('*, course_lessons(id, title, content_text, video_url, duration_minutes, sort_order)')
        .eq('stage', stage)
        .order('sort_order'),
      supabase
        .from('lesson_completions')
        .select('lesson_id, completed_at')
        .eq('user_id', user.id),
      supabase
        .from('weekly_impulses')
        .select('*')
        .eq('stage', stage)
        .eq('week_number', week)
        .eq('year', year)
        .maybeSingle(),
      supabase
        .from('discipleship_calls')
        .select('*')
        .eq('stage', stage)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(1),
      supabase
        .from('stage_certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('stage', stage)
        .maybeSingle(),
    ])

    const processedModules = (modulesData || []).map(m => ({
      ...m,
      course_lessons: [...(m.course_lessons || [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    setModules(processedModules)
    setCompletedLessons(completionsData || [])
    setWeeklyImpulse(impulseData)
    setNextCall(callData?.[0] || null)
    setCertificate(certData)

    // Load testimonies
    const { data: testimoniesData } = await supabase
      .from('discipleship_testimonies')
      .select('id, user_id, stage, title, body, is_public, created_at, profiles(id, full_name, username, avatar_url)')
      .eq('stage', stage)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (testimoniesData && testimoniesData.length > 0) {
      const tIds = testimoniesData.map(t => t.id)
      const { data: reactionsData } = await supabase
        .from('testimony_reactions')
        .select('testimony_id, user_id, type')
        .in('testimony_id', tIds)
      const reactMap = {}
      ;(reactionsData || []).forEach(r => {
        if (!reactMap[r.testimony_id]) reactMap[r.testimony_id] = []
        reactMap[r.testimony_id].push(r)
      })
      setTestimonies(testimoniesData.map(t => ({ ...t, reactions: reactMap[t.id] || [] })))
    } else {
      setTestimonies([])
    }

    // Stage prayers: public prayer_requests from users on same stage
    const { data: stageUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('discipleship_stage', stage)
      .limit(100)

    if (stageUsers && stageUsers.length > 0) {
      const uids = stageUsers.map(p => p.id)
      const { data: prayers } = await supabase
        .from('prayer_requests')
        .select('id, title, description, owner_id, created_at, profiles(id, full_name, username)')
        .in('owner_id', uids)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)
      setStagePrayers(prayers || [])
    } else {
      setStagePrayers([])
    }

    // Ensure stage chat exists + auto-join
    await ensureStageChat(stage)

    // Load stage community
    const { data: communityData } = await supabase
      .from('communities')
      .select('id, name, description, invite_code')
      .eq('discipleship_stage', stage)
      .limit(1)
      .maybeSingle()

    if (communityData) {
      // Count members
      const { count: memberCount } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityData.id)

      setStageCommunity({ ...communityData, memberCount: memberCount || 0 })

      // Check if user is already a member
      const { data: membership } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityData.id)
        .eq('user_id', user.id)
        .maybeSingle()

      setIsCommunityMember(!!membership)
    } else {
      setStageCommunity(null)
      setIsCommunityMember(false)
    }

    setLoading(false)
  }, [user?.id, stage])

  async function ensureStageChat(stageNum) {
    const { data: existing } = await supabase
      .from('discipleship_stage_chats')
      .select('conversation_id')
      .eq('stage', stageNum)
      .maybeSingle()

    let convId = existing?.conversation_id

    if (!convId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ type: 'discipleship' })
        .select('id')
        .single()
      if (conv?.id) {
        await supabase
          .from('discipleship_stage_chats')
          .insert({ stage: stageNum, conversation_id: conv.id })
        convId = conv.id
      }
    }

    if (convId) {
      await supabase
        .from('conversation_members')
        .upsert(
          { conversation_id: convId, user_id: user.id },
          { onConflict: 'conversation_id,user_id' }
        )
      setStageConvId(convId)

      // Count members
      const { count } = await supabase
        .from('conversation_members')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId)
      setStageMemberCount(count || 1)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  // Derived values
  const allLessons    = modules.flatMap(m => m.course_lessons || [])
  const totalLessons  = allLessons.length
  const doneCount     = allLessons.filter(l => completedLessons.some(c => c.lesson_id === l.id)).length
  const stageProgress = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0

  function isLessonDone(lessonId) {
    return completedLessons.some(c => c.lesson_id === lessonId)
  }

  function moduleProgress(moduleId) {
    const mod = modules.find(m => m.id === moduleId)
    if (!mod) return { done: 0, total: 0 }
    const lessons = mod.course_lessons || []
    const done = lessons.filter(l => completedLessons.some(c => c.lesson_id === l.id)).length
    return { done, total: lessons.length }
  }

  async function completeLesson(lessonId) {
    if (isLessonDone(lessonId)) return
    const { error } = await supabase
      .from('lesson_completions')
      .insert({ user_id: user.id, lesson_id: lessonId })
    if (error) return

    const updated = [...completedLessons, { lesson_id: lessonId, completed_at: new Date().toISOString() }]
    setCompletedLessons(updated)

    // Award certificate if 100%
    const newDone = allLessons.filter(l => updated.some(c => c.lesson_id === l.id)).length
    if (newDone === totalLessons && totalLessons > 0 && !certificate) {
      const { data: cert } = await supabase
        .from('stage_certificates')
        .insert({ user_id: user.id, stage })
        .select('*')
        .single()
      if (cert) setCertificate(cert)
    }
  }

  async function joinStageCommunity() {
    if (!stageCommunity || isCommunityMember || joiningCommunity) return
    setJoiningCommunity(true)
    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: stageCommunity.id, user_id: user.id, role: 'member' })
    if (!error) {
      setIsCommunityMember(true)
      setStageCommunity(prev => prev ? { ...prev, memberCount: (prev.memberCount || 0) + 1 } : prev)
    }
    setJoiningCommunity(false)
  }

  async function submitAnswer(questionId, { answerText, selectedOption }) {
    await supabase
      .from('lesson_answers')
      .upsert(
        { user_id: user.id, question_id: questionId, answer_text: answerText || null, selected_option: selectedOption ?? null },
        { onConflict: 'user_id,question_id' }
      )
  }

  async function addTestimony({ title, body, isPublic }) {
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId, _optimistic: true,
      user_id: user.id, stage, title, body,
      is_public: isPublic, created_at: new Date().toISOString(),
      profiles: null, reactions: [],
    }
    setTestimonies(prev => [optimistic, ...prev])
    const { data, error } = await supabase
      .from('discipleship_testimonies')
      .insert({ user_id: user.id, stage, title, body, is_public: isPublic })
      .select('id, user_id, stage, title, body, is_public, created_at, profiles(id, full_name, username, avatar_url)')
      .single()
    if (!error && data) {
      setTestimonies(prev => prev.map(t => t.id === tempId ? { ...data, reactions: [] } : t))
    } else {
      setTestimonies(prev => prev.filter(t => t.id !== tempId))
    }
  }

  async function reactToTestimony(testimonyId, type) {
    const testimony = testimonies.find(t => t.id === testimonyId)
    const myReaction = testimony?.reactions?.find(r => r.user_id === user.id && r.type === type)

    // Optimistic update
    setTestimonies(prev => prev.map(t => {
      if (t.id !== testimonyId) return t
      const reactions = myReaction
        ? t.reactions.filter(r => !(r.user_id === user.id && r.type === type))
        : [...(t.reactions || []), { testimony_id: testimonyId, user_id: user.id, type }]
      return { ...t, reactions }
    }))

    if (myReaction) {
      await supabase.from('testimony_reactions')
        .delete()
        .eq('testimony_id', testimonyId)
        .eq('user_id', user.id)
        .eq('type', type)
    } else {
      await supabase.from('testimony_reactions')
        .insert({ testimony_id: testimonyId, user_id: user.id, type })
    }
  }

  return {
    modules,
    allLessons,
    completedLessons,
    weeklyImpulse,
    testimonies,
    stagePrayers,
    nextCall,
    stageConversationId,
    stageMemberCount,
    stageProgress,
    certificate,
    stageCommunity,
    isCommunityMember,
    joiningCommunity,
    loading,
    isLessonDone,
    moduleProgress,
    completeLesson,
    submitAnswer,
    addTestimony,
    reactToTestimony,
    joinStageCommunity,
    reload: load,
  }
}
