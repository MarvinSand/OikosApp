import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePersonalPrayer() {
  const { user } = useAuth()
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    const { data: reqs } = await supabase
      .from('personal_prayer_requests')
      .select('*')
      .eq('owner_id', user.id)
      .order('is_answered', { ascending: true })
      .order('created_at', { ascending: false })

    if (reqs && reqs.length > 0) {
      const { data: logs } = await supabase
        .from('personal_prayer_logs')
        .select('request_id')
        .in('request_id', reqs.map(r => r.id))

      const countMap = {}
      for (const l of (logs || [])) countMap[l.request_id] = (countMap[l.request_id] || 0) + 1
      setMyRequests(reqs.map(r => ({ ...r, prayerCount: countMap[r.id] || 0 })))
    } else {
      setMyRequests(reqs || [])
    }
    setLoading(false)
  }

  async function createRequest({ title, description, visibility }) {
    const { data, error } = await supabase
      .from('personal_prayer_requests')
      .insert({ owner_id: user.id, title, description: description || null, visibility })
      .select()
      .single()
    if (error) throw error

    // Notify friends if visible to them
    if (visibility === 'siblings' || visibility === 'communities') {
      try {
        const { data: friendsRaw } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted')

        if (friendsRaw && friendsRaw.length > 0) {
          const friendIds = friendsRaw.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
          const { data: prefs } = await supabase
            .from('profiles')
            .select('id, full_name, username, notify_prayer_requests')
            .in('id', friendIds)

          const toNotify = (prefs || []).filter(p => p.notify_prayer_requests !== false) // Default true if null/undefined
          
          if (toNotify.length > 0) {
            const { data: userProfile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single()
            const myName = userProfile?.full_name || userProfile?.username || 'Jemand'
            
            const notifs = toNotify.map(p => ({
              user_id: p.id,
              type: 'prayer_shared',
              title: `${myName} hat ein Anliegen geteilt`,
              body: title,
              related_url: `/user/${user.id}`
            }))
            
            await supabase.from('notifications').insert(notifs)
          }
        }
      } catch (e) {
        console.error('Failed to notify friends:', e)
      }
    }

    setMyRequests(prev => [{ ...data, prayerCount: 0 }, ...prev])
    return data
  }

  async function markAnswered(id) {
    const req = myRequests.find(r => r.id === id)
    const newVal = req ? !req.is_answered : true
    setMyRequests(prev => prev.map(r => r.id === id ? { ...r, is_answered: newVal } : r))
    await supabase.from('personal_prayer_requests').update({ is_answered: newVal }).eq('id', id)
  }

  async function updateRequest(id, updates) {
    setMyRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    await supabase.from('personal_prayer_requests').update(updates).eq('id', id)
  }

  async function deleteRequest(id) {
    setMyRequests(prev => prev.filter(r => r.id !== id))
    const { error } = await supabase.from('personal_prayer_requests').delete().eq('id', id)
    if (error) { console.error('Delete prayer error:', error); await load() }
  }

  return { myRequests, loading, createRequest, markAnswered, updateRequest, deleteRequest, reload: load }
}
