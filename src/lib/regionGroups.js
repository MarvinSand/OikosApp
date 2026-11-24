import { supabase } from './supabase'
import { reverseGeocodeRegion } from './googleMaps'
import { showRegionJoinNotice } from './regionNotice'

// Automatische Regions-Gruppen (Land + Bundesland): Wer sich mit Standort auf
// der Weltkarte einträgt, wird serverseitig (RPC join_region_groups, phase99/100)
// Mitglied beider Gruppen – sie werden bei Bedarf automatisch angelegt.
// Die RPC prüft selbst, dass der Nutzer auf der Weltkarte sichtbar ist.
// Zusätzlich wird der Stadtmittelpunkt gespeichert (phase100): Wer nur den Ort
// zeigt, steht auf der Karte exakt dort – alle aus demselben Ort übereinander.

export async function syncRegionGroups(region, { notify = true } = {}) {
  if (!region?.countryCode || !region?.country) return null
  const { data, error } = await supabase.rpc('join_region_groups', {
    p_country: region.country,
    p_country_code: region.countryCode,
    p_state: region.state || null,
    p_state_code: region.stateCode || null,
  })
  if (error) {
    console.error('[regionGroups] join_region_groups', error)
    return null
  }
  // Pop-up nur, wenn der Nutzer jetzt NEU in mindestens einer Gruppe ist
  const groups = Array.isArray(data?.groups) ? data.groups : []
  if (notify && groups.some(g => g.is_new)) showRegionJoinNotice(groups)
  return data
}

export async function syncRegionGroupsFromCoords(lat, lng) {
  if (lat == null || lng == null) return null
  const region = await reverseGeocodeRegion(lat, lng)
  if (!region) return null
  if (region.cityCenter) {
    await supabase.rpc('set_my_city_center', { p_lat: region.cityCenter.lat, p_lng: region.cityCenter.lng })
  }
  return syncRegionGroups(region)
}

// Einmaliger Nachtrag für bestehende Nutzer (Standort + Weltkarte, aber noch
// ohne Regions-Gruppen oder Stadtmittelpunkt). Braucht den geladenen Geocoder.
export async function ensureRegionGroups(profile) {
  if (!profile?.show_on_world_map || profile.latitude == null || profile.longitude == null) return null
  const { data: status } = await supabase.rpc('get_my_region_status')
  if (status?.has_groups && status?.has_city_center) return null
  return syncRegionGroupsFromCoords(profile.latitude, profile.longitude)
}

// Für App-Admins: ergänzt andere sichtbare Nutzer, die noch nicht in
// Regions-Gruppen sind (ihr Gerät hat die Standorte schon geladen und den
// Geocoder). Es werden nur die auf der Karte gezeigten Koordinaten benutzt.
export async function assistRegionBackfill(users) {
  const list = (users || []).filter(u => u.latitude != null && u.longitude != null)
  if (list.length === 0) return 0
  const { data: missing, error } = await supabase.rpc('admin_users_missing_region', { p_ids: list.map(u => u.id) })
  if (error || !Array.isArray(missing) || missing.length === 0) return 0
  let done = 0
  for (const id of missing.slice(0, 30)) {
    const u = list.find(x => x.id === id)
    if (!u) continue
    const region = await reverseGeocodeRegion(u.latitude, u.longitude)
    if (!region) continue
    const { error: e2 } = await supabase.rpc('admin_apply_user_region', {
      p_user: id,
      p_country: region.country,
      p_country_code: region.countryCode,
      p_state: region.state || null,
      p_state_code: region.stateCode || null,
      p_city_lat: region.cityCenter?.lat ?? null,
      p_city_lng: region.cityCenter?.lng ?? null,
    })
    if (!e2) done++
  }
  return done
}
