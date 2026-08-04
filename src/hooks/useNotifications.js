import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Kleiner Modul-Cache: `useNotifications` wird gleichzeitig von Home,
// FriendsView und der NotificationsPage genutzt. Ohne Cache lädt jede
// Instanz dieselben 50 Zeilen erneut. Der Cache liefert sofort einen
// Startwert (kein Spinner beim Tab-Wechsel) und bündelt parallele Ladungen.
let cache = { userId: null, rows: null }
let inFlight = null

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const initial = cache.userId === userId && cache.rows ? cache.rows : []
  const [notifications, setNotifications] = useState(initial)
  const [unreadCount, setUnreadCount] = useState(initial.filter(n => !n.is_read).length)
  const [loading, setLoading] = useState(!(cache.userId === userId && cache.rows))
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    if (!inFlight || cache.userId !== userId) {
      cache = { userId, rows: cache.userId === userId ? cache.rows : null }
      inFlight = (async () => {
        // Gelesene Benachrichtigungen älter als 1 Monat automatisch löschen
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId)
          .eq('is_read', true)
          .lt('created_at', oneMonthAgo.toISOString())

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        const rows = data || []
        cache = { userId, rows }
        return rows
      })().catch(() => [])
        .finally(() => { inFlight = null })
    }

    setLoading(true)
    const rows = await inFlight
    if (!mounted.current) return
    setNotifications(rows)
    setUnreadCount(rows.filter(n => !n.is_read).length)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    load()

    // Kanalname pro Instanz eindeutig – zwei Komponenten mit demselben
    // Topic-Namen teilen sich sonst einen Kanal, und der erste Unmount
    // entfernt das Abo auch für die noch gemountete Komponente.
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (cache.userId === userId && cache.rows) {
            cache = { userId, rows: [payload.new, ...cache.rows] }
          }
          setNotifications(prev => (
            prev.some(n => n.id === payload.new.id) ? prev : [payload.new, ...prev]
          ))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  const markAllRead = useCallback(async () => {
    // Ohne diese Prüfung warf der Aufruf beim Mount der NotificationsPage
    // "Cannot read properties of null (reading 'id')", weil die Session
    // beim ersten Render noch nicht geladen war.
    if (!userId) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    if (cache.userId === userId && cache.rows) {
      cache = { userId, rows: cache.rows.map(n => ({ ...n, is_read: true })) }
    }
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }, [userId])

  const markRead = useCallback(async (id) => {
    if (!id) return
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    if (cache.userId === userId && cache.rows) {
      cache = { userId, rows: cache.rows.map(n => n.id === id ? { ...n, is_read: true } : n) }
    }
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [userId])

  const deleteNotification = useCallback(async (id) => {
    if (!id) return
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
    if (cache.userId === userId && cache.rows) {
      cache = { userId, rows: cache.rows.filter(n => n.id !== id) }
    }
    await supabase.from('notifications').delete().eq('id', id)
  }, [userId, notifications])

  return { notifications, unreadCount, loading, markAllRead, markRead, deleteNotification, reload: load }
}
