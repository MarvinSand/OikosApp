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

    // Siblings tab: hard stop if no friends
    if (tab === 'siblings' && ownerIds?.length === 0) {
      if (reset) { setRequests([]); setLogsMap({}); setNotesMap({}) }
      setHasMore(false)
      setLoading(false)
      return
    }

    const sourceType = tab === 'siblings' ? 'sibling_personal' : 'all_public'

    // ── personal_prayer_requests (paginated) ──────────────────
    // Communities tab: skip entirely – only community chat prayers are shown there
    let personalItems = []
    if (tab !== 'communities') {
      let query = supabase
        .from('personal_prayer_requests')
        .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
        .eq('is_answered', false)
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1)

      if (tab === 'all') {
        query = query.eq('visibility', 'public').neq('owner_id', user.id)
      } else if (tab === 'siblings') {
        query = query.in('owner_id', ownerIds).in('visibility', ['public', 'siblings'])
      }

      const { data: personalResults } = await query
      personalItems = (personalResults || []).map(r => ({ ...r, _sourceType: sourceType }))
    }

    // ── prayer_requests (OIKOS-linked), only for siblings tab on reset ──
    let oikosItems = []
    if (tab === 'siblings' && ownerIds?.length > 0 && reset) {
      const { data: oikosResults } = await supabase
        .from('prayer_requests')
        .select('*, profiles!owner_id(id, username, full_name, gender, is_christian), oikos_people!person_id(name, is_christian, map_id)')
        .in('owner_id', ownerIds)
        .not('person_id', 'is', null)
        .eq('is_public', true)
        .eq('is_answered', false)
        .order('created_at', { ascending: false })
        .limit(50)
      oikosItems = (oikosResults || []).map(r => ({ ...r, _sourceType: 'sibling_oikos' }))
    }

    // ── community message prayers, only for communities tab on reset ──
    // Fetched via two paths to maximise RLS coverage:
    // Path A: conversation_members (works if user has opened community chat before)
    // Path B: community_members → conversations (works if user is a community member)
    let communityMsgItems = []
    if (tab === 'communities' && reset) {
      const [
        { data: convMemberships },
        { data: myMemberships },
      ] = await Promise.all([
        supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id),
        supabase.from('community_members').select('community_id').eq('user_id', user.id),
      ])

      // Path A: from conversation_members
      const convMemberIds = (convMemberships || []).map(m => m.conversation_id)

      // Path B: community_members → conversations
      const communityIds = (myMemberships || []).map(m => m.community_id)
      let convViaCommIds = []
      if (communityIds.length > 0) {
        const { data: communityConvs } = await supabase
          .from('conversations').select('id')
          .in('community_id', communityIds).eq('type', 'community')
        convViaCommIds = (communityConvs || []).map(c => c.id)
      }

      // Union both sets
      const communityConvIds = [...new Set([...convMemberIds, ...convViaCommIds])]

      if (communityConvIds.length > 0) {
        // Also confirm these are community-type conversations (in case Path A includes DMs)
        const { data: confirmedConvs } = await supabase
          .from('conversations').select('id')
          .in('id', communityConvIds).eq('type', 'community')
        const finalConvIds = (confirmedConvs || []).map(c => c.id)

        if (finalConvIds.length > 0) {
          const { data: msgData } = await supabase
            .from('messages')
            .select('id, sender_id, text, bible_verse_text, created_at, conversation_id')
            .in('conversation_id', finalConvIds)
            .eq('type', 'prayer_request')
            .neq('is_deleted', true)
            .neq('sender_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

          if (msgData && msgData.length > 0) {
            const senderIds = [...new Set(msgData.map(m => m.sender_id))]
            const { data: profiles } = await supabase
              .from('profiles').select('id, username, full_name, gender, is_christian')
              .in('id', senderIds)
            const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
            communityMsgItems = msgData.map(m => ({
              id: m.id,
              title: m.text,
              description: m.bible_verse_text || null,
              owner_id: m.sender_id,
              profiles: profileMap[m.sender_id] || null,
              created_at: m.created_at,
              is_answered: false,
              visibility: 'communities',
              _sourceType: 'community_message',
            }))
          }
          // Pre-populate logsMap from localStorage for community message prayers
          const localPrayed = (() => { try { return JSON.parse(localStorage.getItem('comm_prayed') || '{}') } catch { return {} } })()
          const localLogs = {}
          for (const item of communityMsgItems) {
            if (localPrayed[item.id]) {
              localLogs[item.id] = [{ id: 'local_' + item.id, request_id: item.id, user_id: user.id, created_at: new Date().toISOString(), profiles: null }]
            }
          }
          if (Object.keys(localLogs).length > 0) {
            setLogsMap(prev => reset ? { ...prev, ...localLogs } : { ...prev, ...localLogs })
          }
        }
      }
    }

    // If communities tab and both personal and community messages are empty, show empty state
    if (tab === 'communities' && reset && personalItems.length === 0 && communityMsgItems.length === 0) {
      setRequests([]); setLogsMap({}); setNotesMap({})
      setHasMore(false)
      setLoading(false)
      return
    }

    // Combine: on reset merge all; on load-more append only personal
    const allNewItems = reset
      ? [...personalItems, ...oikosItems, ...communityMsgItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
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
    if (item?._sourceType === 'community_message') {
      // localStorage-based tracking (no backend table for chat message prayers)
      try {
        const map = JSON.parse(localStorage.getItem('comm_prayed') || '{}')
        map[requestId] = true
        localStorage.setItem('comm_prayed', JSON.stringify(map))
      } catch {}
      const fakeLog = { id: 'local_' + Date.now(), request_id: requestId, user_id: user.id, created_at: new Date().toISOString(), profiles: null }
      setLogsMap(prev => ({ ...prev, [requestId]: [fakeLog, ...(prev[requestId] || [])] }))
      return
    }
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
