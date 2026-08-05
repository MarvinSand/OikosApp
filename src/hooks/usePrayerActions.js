import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from '../context/ToastContext'
import { usePrayerLists, LATER_LIST_NAME } from './usePrayerLists'
import {
  requestTable, logTable, logColumn, listColumn, noteColumn,
} from '../lib/prayerModel'

// ════════════════════════════════════════════════════════════════════════
// Aktionen auf einem Gebet – unabhängig davon, in welcher Tabelle es liegt
// ════════════════════════════════════════════════════════════════════════
// Beten, Kommentieren, Bearbeiten, „Später beten", Erhört, Löschen.
// Weiterleiten und „Zu Liste hinzufügen" laufen über die jeweiligen Sheets
// (ForwardSheet / AddToListSheet), die von PrayerCardList gemountet werden.

function getPreviousDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// Streak/Gesamtzahl fortschreiben. Nicht kritisch – Fehler werden geschluckt.
export async function updatePrayerStats(userId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: stats } = await supabase
      .from('user_prayer_stats').select('*').eq('user_id', userId).maybeSingle()

    const lastDate = stats?.last_prayer_date
    const isToday = lastDate === today
    const isConsecutive = lastDate === getPreviousDay(today)
    const nextStreak = isConsecutive ? (stats?.current_streak || 0) + 1 : 1

    if (!isToday) {
      await supabase.from('user_prayer_stats').upsert({
        user_id: userId,
        last_prayer_date: today,
        current_streak: nextStreak,
        longest_streak: Math.max(stats?.longest_streak || 0, nextStreak),
        total_prayers: (stats?.total_prayers || 0) + 1,
        updated_at: new Date().toISOString(),
      })
    } else {
      await supabase.from('user_prayer_stats')
        .update({ total_prayers: (stats?.total_prayers || 0) + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
  } catch {
    // Statistik ist nicht kritisch
  }
}

export function usePrayerActions() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { lists, createList } = usePrayerLists()

  // Ein Gebet protokollieren. Gibt den eingefügten Log zurück.
  async function pray(prayer) {
    const { data, error } = await supabase
      .from(logTable(prayer.kind))
      .insert({ [logColumn(prayer.kind)]: prayer.id, user_id: user.id })
      .select('id, user_id, created_at')
      .single()
    if (error) throw error
    updatePrayerStats(user.id)
    return {
      ...data,
      profiles: {
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        username: user.email?.split('@')[0] || null,
        is_christian: null,
      },
    }
  }

  // Kommentar zu einem Gebet. isPublic=false → nur der Ersteller sieht ihn.
  async function comment(prayer, text, isPublic = true) {
    const { data, error } = await supabase
      .from('prayer_notes')
      .insert({
        [noteColumn(prayer.kind)]: prayer.id,
        author_id: user.id,
        text,
        is_public: isPublic,
      })
      .select('id, text, is_public, author_id, created_at, profiles!author_id(id, username, full_name)')
      .single()
    if (error) throw error
    return data
  }

  async function updatePrayer(prayer, updates) {
    const { error } = await supabase
      .from(requestTable(prayer.kind))
      .update(updates)
      .eq('id', prayer.id)
    if (error) throw error
  }

  async function toggleAnswered(prayer) {
    await updatePrayer(prayer, { is_answered: !prayer.isAnswered })
  }

  async function remove(prayer) {
    const { error } = await supabase
      .from(requestTable(prayer.kind))
      .delete().eq('id', prayer.id).eq('owner_id', user.id)
    if (error) throw error
  }

  // „Später beten": in die Standard-Liste legen (legt sie bei Bedarf an).
  async function laterPray(prayer) {
    let list = lists.find(l => (l.name || '').toLowerCase() === LATER_LIST_NAME.toLowerCase())
    if (!list) {
      // DB prüfen, um Doppel-Anlage der Standard-Liste zu vermeiden.
      const { data: existingList } = await supabase
        .from('prayer_lists').select('*').eq('user_id', user.id).ilike('name', LATER_LIST_NAME).maybeSingle()
      list = existingList || await createList({ name: LATER_LIST_NAME, icon: '⏰' })
    }
    const idColumn = listColumn(prayer.kind)
    const { data: existing } = await supabase
      .from('prayer_list_items').select('id').eq('list_id', list.id).eq(idColumn, prayer.id).maybeSingle()
    if (existing) {
      showToast(`Schon in „${LATER_LIST_NAME}"`)
      return
    }
    const { error } = await supabase.from('prayer_list_items').insert({ list_id: list.id, [idColumn]: prayer.id })
    if (error) throw error
    showToast(`Zu „${LATER_LIST_NAME}" hinzugefügt ✓`)
  }

  return { pray, comment, updatePrayer, toggleAnswered, remove, laterPray }
}
