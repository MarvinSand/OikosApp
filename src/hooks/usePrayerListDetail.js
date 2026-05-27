import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getAmpelStatus } from './useAmpelStatus'

export function usePrayerListDetail(listId) {
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!listId) return
    load()
  }, [listId])

  async function load() {
    setLoading(true)

    const [{ data: listData }, { data: itemsData }] = await Promise.all([
      supabase.from('prayer_lists').select('*').eq('id', listId).single(),
      supabase
        .from('prayer_list_items')
        .select(`
          id, sort_order, added_at,
          prayer_request_id,
          personal_prayer_request_id
        `)
        .eq('list_id', listId)
        .order('sort_order', { ascending: true }),
    ])

    setList(listData)

    if (!itemsData?.length) {
      setItems([])
      setLoading(false)
      return
    }

    // Lade die tatsächlichen Anliegen
    const personalIds = itemsData.filter(i => i.personal_prayer_request_id).map(i => i.personal_prayer_request_id)
    const oikosIds = itemsData.filter(i => i.prayer_request_id).map(i => i.prayer_request_id)

    const [
      { data: personalReqs },
      { data: oikosReqs },
      { data: personalLogs },
      { data: oikosLogs },
    ] = await Promise.all([
      personalIds.length > 0
        ? supabase.from('personal_prayer_requests')
            .select('*, profiles!owner_id(id, username, full_name, is_christian)')
            .in('id', personalIds)
        : Promise.resolve({ data: [] }),
      oikosIds.length > 0
        ? supabase.from('prayer_requests')
            .select('*, profiles!owner_id(id, username, full_name, is_christian)')
            .in('id', oikosIds)
        : Promise.resolve({ data: [] }),
      personalIds.length > 0
        ? supabase.from('personal_prayer_logs')
            .select('request_id, created_at')
            .in('request_id', personalIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      oikosIds.length > 0
        ? supabase.from('prayer_logs')
            .select('prayer_request_id, created_at')
            .in('prayer_request_id', oikosIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

    // Baue last_prayed_at Map
    const lastPrayedMap = {}
    for (const l of (personalLogs || [])) {
      if (!lastPrayedMap[l.request_id]) lastPrayedMap[l.request_id] = l.created_at
    }
    for (const l of (oikosLogs || [])) {
      if (!lastPrayedMap[l.prayer_request_id]) lastPrayedMap[l.prayer_request_id] = l.created_at
    }

    const personalMap = Object.fromEntries((personalReqs || []).map(r => [r.id, r]))
    const oikosMap = Object.fromEntries((oikosReqs || []).map(r => [r.id, r]))

    const enriched = itemsData.map(item => {
      const reqId = item.personal_prayer_request_id || item.prayer_request_id
      const req = item.personal_prayer_request_id
        ? personalMap[item.personal_prayer_request_id]
        : oikosMap[item.prayer_request_id]
      const lastPrayed = lastPrayedMap[reqId] || null
      const ampel = getAmpelStatus(lastPrayed, req?.next_due_date)

      return {
        itemId: item.id,
        sortOrder: item.sort_order,
        addedAt: item.added_at,
        type: item.personal_prayer_request_id ? 'personal' : 'oikos',
        request: req || null,
        lastPrayedAt: lastPrayed,
        ampel,
        _deleted: !req,
      }
    }).filter(i => !i._deleted)

    // Sortierung nach Ampel
    const ampelOrder = { never: 0, red: 1, orange: 2, yellow: 3, green: 4 }
    enriched.sort((a, b) => {
      if (a.request?.next_due_date && b.request?.next_due_date) {
        return new Date(a.request.next_due_date) - new Date(b.request.next_due_date)
      }
      const ao = ampelOrder[a.ampel.status] ?? 5
      const bo = ampelOrder[b.ampel.status] ?? 5
      if (ao !== bo) return ao - bo
      return new Date(a.lastPrayedAt || 0) - new Date(b.lastPrayedAt || 0)
    })

    setItems(enriched)
    setLoading(false)
  }

  async function addItem(requestId, type) {
    const payload = {
      list_id: listId,
      sort_order: items.length,
      ...(type === 'personal'
        ? { personal_prayer_request_id: requestId }
        : { prayer_request_id: requestId }),
    }
    const { error } = await supabase.from('prayer_list_items').insert(payload)
    if (!error) await load()
  }

  async function removeItem(itemId) {
    setItems(prev => prev.filter(i => i.itemId !== itemId))
    await supabase.from('prayer_list_items').delete().eq('id', itemId)
  }

  async function reorderItems(newOrder) {
    await Promise.all(
      newOrder.map((id, i) =>
        supabase.from('prayer_list_items').update({ sort_order: i }).eq('id', id)
      )
    )
    await load()
  }

  return { list, items, loading, addItem, removeItem, reorderItems, reload: load }
}
