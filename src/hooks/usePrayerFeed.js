import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PAGE_SIZE = 20

export function usePrayerFeed(tab) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [logsMap, setLogsMap] = useState({})   // requestId → [log]
  const [notesMap, setNotesMap] = useState({})  // requestId → [note]
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)

  useEffect(() => {
    if (!user) return
    loadFeed(true)
  }, [tab, user?.id])

  async function getOwnerIds() {
    if (tab === 'all') return null

    if (tab === 'siblings') {
      const { data } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')
      return (data || []).map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
    }

    if (tab === 'communities') {
      const { data: memberships } = await supabase
        .from('community_members').select('community_id').eq('user_id', user.id)
      const communityIds = (memberships || []).map(m => m.community_id)
      if (!communityIds.length) return []
      const { data: members } = await supabase
        .from('community_members').select('user_id')
        .in('community_id', communityIds).neq('user_id', user.id)
      return [...new Set((members || []).map(m => m.user_id))]
    }

    return null
  }

  async function loadFeed(reset) {
    if (reset) offsetRef.current = 0
    setLoading(true)

    const ownerIds = await getOwnerIds()
    if ((tab === 'siblings' || tab === 'communities') && ownerIds?.length === 0) {
      if (reset) { setRequests([]); setLogsMap({}); setNotesMap({}) }
      setHasMore(false)
      setLoading(false)
      return
    }

    // ── personal_prayer_requests (paginated) ──────────────────
    let query = supabase
      .from('personal_prayer_requests')
      .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
      .eq('is_answered', false)
      .order('created_at', { ascending: false })
      .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1)

    const sourceType = tab === 'siblings' ? 'sibling_personal' : tab === 'communities' ? 'community' : 'all_public'

    if (tab === 'all') {
      query = query.eq('visibility', 'public').neq('owner_id', user.id)
    } else if (tab === 'siblings') {
      query = query.in('owner_id', ownerIds).in('visibility', ['public', 'siblings'])
    } else {
      query = query.in('owner_id', ownerIds).in('visibility', ['public', 'communities'])
    }

    const { data: personalResults } = await query
    const personalItems = (personalResults || []).map(r => ({ ...r, _sourceType: sourceType }))

    // ── prayer_requests (OIKOS-linked), only for siblings tab on reset ──
    let oikosItems = []
    if (tab === 'siblings' && ownerIds?.length > 0 && reset) {
      const { data: oikosResults } = await supabase
        .from('prayer_requests')
        .select('*, profiles!owner_id(id, username, full_name, gender, is_christian), oikos_people!person_id(name, is_christian)')
        .in('owner_id', ownerIds)
        .not('person_id', 'is', null)
        .eq('is_public', true)
        .eq('is_answered', false)
        .order('created_at', { ascending: false })
        .limit(50)
      oikosItems = (oikosResults || []).map(r => ({ ...r, _sourceType: 'sibling_oikos' }))
    }

    // Combine: on reset merge both; on load-more append only personal
    const allNewItems = reset
      ? [...personalItems, ...oikosItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : personalItems

    // ── Fetch logs + notes ────────────────────────────────────
    if (allNewItems.length > 0) {
      const personalIds = allNewItems.filter(r => r._sourceType !== 'sibling_oikos').map(r => r.id)
      const oikosIds    = allNewItems.filter(r => r._sourceType === 'sibling_oikos').map(r => r.id)

      const [{ data: personalLogs }, { data: oikosLogs }, { data: notesData }] = await Promise.all([
        personalIds.length > 0
          ? supabase.from('personal_prayer_logs')
              .select('id, request_id, user_id, created_at, profiles!user_id(id, username, full_name)')
              .in('request_id', personalIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        oikosIds.length > 0
          ? supabase.from('prayer_logs')
              .select('id, prayer_request_id, user_id, created_at, profiles!user_id(id, username, full_name)')
              .in('prayer_request_id', oikosIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        personalIds.length > 0
          ? supabase.from('prayer_notes')
              .select('id, request_id, text, created_at, profiles!author_id(id, username, full_name)')
              .in('request_id', personalIds).eq('is_public', true)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])

      const newLogs = {}
      for (const l of (personalLogs || [])) {
        if (!newLogs[l.request_id]) newLogs[l.request_id] = []
        newLogs[l.request_id].push(l)
      }
      for (const l of (oikosLogs || [])) {
        const id = l.prayer_request_id
        if (!newLogs[id]) newLogs[id] = []
        newLogs[id].push({ ...l, request_id: id })
      }
      const newNotes = {}
      for (const n of (notesData || [])) {
        if (!newNotes[n.request_id]) newNotes[n.request_id] = []
        newNotes[n.request_id].push(n)
      }
      setLogsMap(prev => reset ? newLogs : { ...prev, ...newLogs })
      setNotesMap(prev => reset ? newNotes : { ...prev, ...newNotes })
    } else if (reset) {
      setLogsMap({}); setNotesMap({})
    }

    setRequests(prev => reset ? allNewItems : [...prev, ...personalItems])
    setHasMore(personalItems.length === PAGE_SIZE)
    offsetRef.current += personalItems.length
    setLoading(false)
  }

  async function logPrayer(requestId) {
    const item = requests.find(r => r.id === requestId)
    const isOikos = item?._sourceType === 'sibling_oikos'
    const opt = { id: 'opt_' + Date.now(), request_id: requestId, user_id: user.id, created_at: new Date().toISOString(), profiles: null }
    setLogsMap(prev => ({ ...prev, [requestId]: [opt, ...(prev[requestId] || [])] }))
    const { error } = isOikos
      ? await supabase.from('prayer_logs').insert({ prayer_request_id: requestId, user_id: user.id })
      : await supabase.from('personal_prayer_logs').insert({ request_id: requestId, user_id: user.id })
    if (error) {
      setLogsMap(prev => ({ ...prev, [requestId]: (prev[requestId] || []).filter(l => l.id !== opt.id) }))
    }
  }

  async function addNote(requestId, text, isPublic) {
    const { data, error } = await supabase.from('prayer_notes')
      .insert({ request_id: requestId, author_id: user.id, text, is_public: isPublic })
      .select('id, request_id, text, created_at, profiles!author_id(id, username, full_name)')
      .single()
    if (error) throw error
    if (isPublic) {
      setNotesMap(prev => ({ ...prev, [requestId]: [data, ...(prev[requestId] || [])] }))
    }
    return data
  }

  return {
    requests, logsMap, notesMap, loading, hasMore,
    loadMore: () => loadFeed(false),
    reload: () => loadFeed(true),
    logPrayer, addNote,
  }
}
