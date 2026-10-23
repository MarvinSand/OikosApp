import { supabase } from './supabase'

export function confessedToday(iso) {
  if (!iso) return false
  return new Date(iso).toDateString() === new Date().toDateString()
}

// Abhaken: Zähler +1 und Verlaufs-Eintrag.
export async function addConfession(userId, creedId, nextCount, nowIso) {
  await Promise.all([
    supabase.from('creed_confessions').upsert({
      user_id: userId, creed_id: creedId, count: nextCount, last_confessed_at: nowIso,
    }, { onConflict: 'user_id,creed_id' }),
    supabase.from('creed_confession_logs').insert({ user_id: userId, creed_id: creedId, confessed_at: nowIso }),
  ])
}

// Haken entfernen: neuesten Verlaufs-Eintrag löschen, Zähler -1 und
// last_confessed_at auf den vorherigen Eintrag zurücksetzen.
// Liefert den neuen Zeitpunkt des letzten Bekennens (oder null).
export async function removeLastConfession(userId, creedId, nextCount) {
  const { data: logs } = await supabase
    .from('creed_confession_logs')
    .select('id, confessed_at')
    .eq('user_id', userId)
    .eq('creed_id', creedId)
    .order('confessed_at', { ascending: false })
    .limit(2)
  const last = logs?.[1]?.confessed_at ?? null
  await Promise.all([
    logs?.[0] ? supabase.from('creed_confession_logs').delete().eq('id', logs[0].id) : Promise.resolve(),
    supabase.from('creed_confessions').upsert({
      user_id: userId, creed_id: creedId, count: nextCount, last_confessed_at: last,
    }, { onConflict: 'user_id,creed_id' }),
  ])
  return last
}
