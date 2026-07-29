import { supabase } from './supabase'

// ─── Profil-Tags ────────────────────────────────────────────

export async function fetchDiscipleshipProfile(userId) {
  const { data, error } = await supabase
    .from('user_discipleship_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertDiscipleshipProfile(userId, fields) {
  const { data, error } = await supabase
    .from('user_discipleship_profile')
    .upsert(
      { user_id: userId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Stationen & Fortschritt ────────────────────────────────

export async function fetchStagesWithStations() {
  const { data, error } = await supabase
    .from('stages')
    .select(
      'id, order_index, name, slug, stations(id, order_index, type, category, title, description, tags, min_glaubensstand)'
    )
    .order('order_index', { ascending: true })
  if (error) throw error
  return (data || []).map(stage => ({
    ...stage,
    stations: [...(stage.stations || [])].sort((a, b) => a.order_index - b.order_index),
  }))
}

export async function fetchUserStationProgress(userId) {
  const { data, error } = await supabase
    .from('user_station_progress')
    .select('station_id, status, completed_at')
    .eq('user_id', userId)
  if (error) throw error
  const map = {}
  for (const row of data || []) map[row.station_id] = row
  return map
}

export async function markStationDone(userId, stationId) {
  const { error } = await supabase.from('user_station_progress').upsert(
    { user_id: userId, station_id: stationId, status: 'done', completed_at: new Date().toISOString() },
    { onConflict: 'user_id,station_id' }
  )
  if (error) throw error
}

// Baut eine flache, sortierte Liste aller Stationen und berechnet je
// Station den Freischalt-Status: sequenziell pro Kategorie, Kategorien
// laufen parallel. `mentor_match`-Stationen erst, wenn alle Stationen
// vorheriger Stufen erledigt sind (= letzte Stufe erreicht).
export function computeStationStatuses(stages, progressMap) {
  const flat = []
  for (const stage of stages) {
    for (const station of stage.stations) {
      flat.push({
        ...station,
        stage_id: stage.id,
        stage_name: stage.name,
        stage_order_index: stage.order_index,
      })
    }
  }
  flat.sort(
    (a, b) => a.stage_order_index - b.stage_order_index || a.order_index - b.order_index
  )

  const doneIds = new Set(
    flat.filter(s => progressMap[s.id]?.status === 'done').map(s => s.id)
  )

  const byCategory = {}
  for (const s of flat) {
    if (!byCategory[s.category]) byCategory[s.category] = []
    byCategory[s.category].push(s)
  }

  const unlockedIds = new Set()
  for (const list of Object.values(byCategory)) {
    const nextUndone = list.find(s => !doneIds.has(s.id))
    if (nextUndone) unlockedIds.add(nextUndone.id)
  }

  const finalStageOrderIndex = flat.reduce(
    (max, s) => Math.max(max, s.stage_order_index),
    -Infinity
  )
  const reachedFinalStage = flat
    .filter(s => s.stage_order_index < finalStageOrderIndex)
    .every(s => doneIds.has(s.id))

  for (const s of flat) {
    if (s.type === 'mentor_match' && unlockedIds.has(s.id) && !reachedFinalStage) {
      unlockedIds.delete(s.id)
    }
  }

  const currentId = flat.find(s => unlockedIds.has(s.id))?.id ?? null

  return flat.map(s => ({
    ...s,
    status: doneIds.has(s.id)
      ? 'done'
      : s.id === currentId
        ? 'current'
        : unlockedIds.has(s.id)
          ? 'available'
          : 'locked',
  }))
}

// ─── Bibelleseplan ──────────────────────────────────────────

export async function fetchBiblePlan(stationId) {
  const { data, error } = await supabase
    .from('bible_plans')
    .select('id, days')
    .eq('station_id', stationId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchBibleProgress(userId, planId) {
  const { data, error } = await supabase
    .from('user_bible_progress')
    .select('day')
    .eq('user_id', userId)
    .eq('plan_id', planId)
  if (error) throw error
  return new Set((data || []).map(r => r.day))
}

export async function toggleBibleDay(userId, planId, day, done) {
  if (done) {
    const { error } = await supabase
      .from('user_bible_progress')
      .upsert({ user_id: userId, plan_id: planId, day }, { onConflict: 'user_id,plan_id,day' })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('user_bible_progress')
      .delete()
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('day', day)
    if (error) throw error
  }
}

// ─── Journal ────────────────────────────────────────────────

export async function fetchJournalEntries(userId, stationId) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, content, shared_with_mentor, created_at')
    .eq('user_id', userId)
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addJournalEntry(userId, stationId, content, sharedWithMentor) {
  const { error } = await supabase.from('journal_entries').insert({
    user_id: userId,
    station_id: stationId,
    content,
    shared_with_mentor: sharedWithMentor,
  })
  if (error) throw error
}

// ─── Taufe ──────────────────────────────────────────────────

export async function fetchBaptismStatus(userId) {
  const { data, error } = await supabase
    .from('baptism_status')
    .select('status, requested_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function requestBaptism(userId) {
  const { error } = await supabase.from('baptism_status').upsert(
    { user_id: userId, status: 'angefragt', requested_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

// ─── Mentor-Match ───────────────────────────────────────────

export async function fetchMentorSuggestion(userId) {
  const { data, error } = await supabase
    .from('mentor_pool')
    .select('user_id, profiles!user_id(full_name, username, avatar_url)')
    .neq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchMentorMatch(userId) {
  const { data, error } = await supabase
    .from('mentor_matches')
    .select('id, mentor_id, mentee_id, status, matched_at, profiles!mentor_id(full_name, username, avatar_url)')
    .eq('mentee_id', userId)
    .order('matched_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function confirmMentorMatch(menteeId, mentorId) {
  const { error } = await supabase.from('mentor_matches').insert({
    mentee_id: menteeId,
    mentor_id: mentorId,
    status: 'bestaetigt',
    initiated_by: 'mentee',
  })
  if (error) throw error
}
