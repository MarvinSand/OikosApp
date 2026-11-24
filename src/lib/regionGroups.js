import { supabase } from './supabase'
import { reverseGeocodeRegion } from './googleMaps'

// Automatische Regions-Gruppen (Land + Bundesland): Wer sich mit Standort auf
// der Weltkarte einträgt, wird serverseitig (RPC join_region_groups, phase99)
// Mitglied beider Gruppen – sie werden bei Bedarf automatisch angelegt.
// Die RPC prüft selbst, dass der Nutzer auf der Weltkarte sichtbar ist.

export async function syncRegionGroups(region) {
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
  return data
}

export async function syncRegionGroupsFromCoords(lat, lng) {
  if (lat == null || lng == null) return null
  const region = await reverseGeocodeRegion(lat, lng)
  return syncRegionGroups(region)
}

// Einmaliger Nachtrag für bestehende Nutzer (Standort + Weltkarte, aber noch
// in keiner Regions-Gruppe). Braucht den geladenen Google-Geocoder.
export async function ensureRegionGroups(profile) {
  if (!profile?.show_on_world_map || profile.latitude == null || profile.longitude == null) return null
  const { data: status } = await supabase.rpc('get_my_region_status')
  if (status?.has_groups) return null
  return syncRegionGroupsFromCoords(profile.latitude, profile.longitude)
}
