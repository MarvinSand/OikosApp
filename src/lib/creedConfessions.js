import { supabase } from './supabase'

// Abhaken: Zähler +1 und Verlaufs-Eintrag (ID clientseitig, damit der
// Eintrag sofort gelöscht werden kann, auch vor der Server-Antwort).
export async function addConfession(userId, creedId, nextCount, nowIso, logId) {
  await Promise.all([
    supabase.from('creed_confessions').upsert({
      user_id: userId, creed_id: creedId, count: nextCount, last_confessed_at: nowIso,
    }, { onConflict: 'user_id,creed_id' }),
    supabase.from('creed_confession_logs').insert({ id: logId, user_id: userId, creed_id: creedId, confessed_at: nowIso }),
  ])
}

// Einen einzelnen Verlaufs-Eintrag entfernen (versehentlich abgehakt):
// Zähler -1, last_confessed_at auf den neuesten verbleibenden Eintrag.
// Liefert den neuen Zeitpunkt des letzten Bekennens (oder null).
export async function removeConfessionLog(userId, creedId, logId, nextCount) {
  await supabase.from('creed_confession_logs').delete().eq('id', logId).eq('user_id', userId)
  const { data } = await supabase
    .from('creed_confession_logs')
    .select('confessed_at')
    .eq('user_id', userId)
    .eq('creed_id', creedId)
    .order('confessed_at', { ascending: false })
    .limit(1)
  const last = data?.[0]?.confessed_at ?? null
  await supabase.from('creed_confessions').upsert({
    user_id: userId, creed_id: creedId, count: nextCount, last_confessed_at: last,
  }, { onConflict: 'user_id,creed_id' })
  return last
}
