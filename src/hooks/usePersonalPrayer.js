import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { verseFieldsFromAttachment } from '../lib/bibleLink'

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

  async function createRequest({ title, description, visibility, visibility_user_ids = [], visibility_community_id = null, category = null, bibleVerseRef = null }) {
    const { data, error } = await supabase
      .from('personal_prayer_requests')
      .insert({
        owner_id: user.id, title, description: description || null, visibility,
        visibility_user_ids: visibility_user_ids.length > 0 ? visibility_user_ids : null,
        visibility_community_id: visibility_community_id || null,
        category: category || null,
        ...verseFieldsFromAttachment(bibleVerseRef),
      })
      .select()
      .single()
    if (error) throw error

    // Notify friends if visible to them
    if (visibility === 'all_siblings' || visibility === 'specific_include' || visibility === 'community') {
      try {
        const { data: friendsRaw } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted')

        if (friendsRaw && friendsRaw.length > 0) {
          const friendIds = friendsRaw.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
          // Per-friend opt-outs live in notification_preferences (user_id wants
          // notifications about target_user_id); no row = default true
          const { data: prefRows } = await supabase
            .from('notification_preferences')
            .select('user_id, notify_prayer_requests')
            .in('user_id', friendIds)
            .eq('target_user_id', user.id)

          const optedOut = new Set((prefRows || []).filter(r => r.notify_prayer_requests === false).map(r => r.user_id))
          const toNotify = friendIds.filter(id => !optedOut.has(id))

          if (toNotify.length > 0) {
            const { data: userProfile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single()
            const myName = userProfile?.full_name || userProfile?.username || 'Jemand'

            // `notifications` has no `related_url` column (never migrated) -
            // an insert referencing it fails the WHOLE insert silently.
            const notifs = toNotify.map(friendId => ({
              user_id: friendId,
              type: 'prayer_shared',
              title: `${myName} hat ein Anliegen geteilt`,
              body: title,
              data: { requester_id: user.id, request_id: data.id },
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
