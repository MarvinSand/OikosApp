import { supabase } from '../lib/supabase'

// Holt die Anliegen für den Gebetsmodus je nach gewählter Quelle/Filter.
// Rückgabe: Array von Items im Format { type, request, ampel } – kompatibel
// mit GuidedPrayerMode (siehe PrayerListDetailView / Home).
//
// params:
//   source:      'list' | 'all' | 'siblings' | 'community'
//   userId:      aktueller Nutzer
//   listId:      bei source='list'
//   communityId: bei source='community'
//   categories:  string[] (leer = alle)
//   sort:        'random' | 'oldest' | 'newest'
export async function fetchPrayerModeItems({ source, userId, listId = null, communityId = null, categories = [], sort = 'random' }) {
  let items = []

  if (source === 'list' && listId) {
    items = await fetchListItems(listId)
  } else {
    items = await fetchFeedItems({ source, userId, communityId })
  }

  // Kategorie-Filter
  if (categories.length > 0) {
    items = items.filter(i => categories.includes(i.request?.category))
  }

  // Sortierung
  if (sort === 'random') {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
  } else {
    items.sort((a, b) => {
      const da = new Date(a.request?.created_at || 0).getTime()
      const db = new Date(b.request?.created_at || 0).getTime()
      return sort === 'oldest' ? da - db : db - da
    })
  }

  return items
}

async function fetchFeedItems({ source, userId, communityId }) {
  // Verbundene Geschwister bestimmen (für siblings)
  let ownerIds = []
  if (source === 'siblings') {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
    ownerIds = (friendships || []).map(f => f.requester_id === userId ? f.addressee_id : f.requester_id)
    if (ownerIds.length === 0) return []
  }

  let query = supabase
    .from('personal_prayer_requests')
    .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
    .eq('is_answered', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (source === 'all') {
    query = query.eq('visibility', 'public').neq('owner_id', userId)
  } else if (source === 'siblings') {
    query = query.in('owner_id', ownerIds).in('visibility', ['public', 'siblings'])
  } else if (source === 'community') {
    if (!communityId) return []
    query = query.eq('visibility', 'community').eq('visibility_community_id', communityId)
  }

  const { data } = await query
  // Feed-Quellen stammen aus personal_prayer_requests → type 'personal',
  // damit Gebete im Gebetsmodus korrekt geloggt werden.
  return (data || []).map(r => ({ type: 'personal', request: r, ampel: null }))
}

async function fetchListItems(listId) {
  const { data: listItems } = await supabase
    .from('prayer_list_items')
    .select('id, sort_order, prayer_request_id, personal_prayer_request_id')
    .eq('list_id', listId)
    .order('sort_order', { ascending: true })

  if (!listItems?.length) return []

  const personalIds = listItems.filter(i => i.personal_prayer_request_id).map(i => i.personal_prayer_request_id)
  const oikosIds = listItems.filter(i => i.prayer_request_id).map(i => i.prayer_request_id)

  const [{ data: personalReqs }, { data: oikosReqs }] = await Promise.all([
    personalIds.length > 0
      ? supabase.from('personal_prayer_requests').select('*, profiles!owner_id(id, username, full_name, is_christian)').in('id', personalIds)
      : Promise.resolve({ data: [] }),
    oikosIds.length > 0
      ? supabase.from('prayer_requests').select('*, profiles!owner_id(id, username, full_name, is_christian)').in('id', oikosIds)
      : Promise.resolve({ data: [] }),
  ])

  const personalMap = Object.fromEntries((personalReqs || []).map(r => [r.id, r]))
  const oikosMap = Object.fromEntries((oikosReqs || []).map(r => [r.id, r]))

  return listItems
    .map(item => {
      const req = item.personal_prayer_request_id ? personalMap[item.personal_prayer_request_id] : oikosMap[item.prayer_request_id]
      if (!req) return null
      return { type: item.personal_prayer_request_id ? 'personal' : 'oikos', request: req, ampel: null }
    })
    .filter(Boolean)
}
