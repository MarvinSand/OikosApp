// Central config + helpers for Google Maps integration.
// API key is read exclusively from import.meta.env.VITE_GOOGLE_MAPS_API_KEY.

export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: 'google-maps-script',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries: ['places', 'marker'],
  language: 'de',
  region: 'DE',
}

// Map ID used by AdvancedMarkerElement. A non-empty string is required;
// any value works for development. Override later if cloud-styled maps are added.
export const DEFAULT_MAP_ID = 'oikos_world_map'

// ─── Geocoder (lazy singleton) ───────────────────────────────────────
let _geocoder = null
function getGeocoder() {
  if (!_geocoder && window.google?.maps?.Geocoder) {
    _geocoder = new window.google.maps.Geocoder()
  }
  return _geocoder
}

// Parse a Google Geocoder result into the same shape AddressAutocomplete consumers expect.
export function parseGeocoderResult(result) {
  const comps = result.address_components || []
  const get = (type) => comps.find((c) => c.types.includes(type))?.long_name || ''
  const getShort = (type) => comps.find((c) => c.types.includes(type))?.short_name || ''

  const street = [get('route'), get('street_number')].filter(Boolean).join(' ')
  const city =
    get('locality') ||
    get('postal_town') ||
    get('administrative_area_level_2') ||
    get('administrative_area_level_3') ||
    ''
  const district =
    get('sublocality') ||
    get('sublocality_level_1') ||
    get('neighborhood') ||
    ''
  const state = get('administrative_area_level_1')
  const country = get('country')
  const countryCode = getShort('country').toUpperCase()
  const postcode = get('postal_code')

  const shortName = [street || city, street && city ? city : state].filter(Boolean).join(', ')
    || (result.formatted_address || '').split(',').slice(0, 2).join(',').trim()

  const loc = result.geometry?.location
  const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat
  const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng

  return {
    lat,
    lng,
    address: result.formatted_address || shortName,
    shortName,
    subLine: [state, country].filter(Boolean).join(', '),
    city,
    country,
    countryCode,
    district,
    street,
    postcode,
  }
}

// lat/lng → "Straße Nr, Stadt" (best effort)
export async function reverseGeocode(lat, lng) {
  const geocoder = getGeocoder()
  if (!geocoder) return null
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } })
    if (!results || results.length === 0) return null
    const parsed = parseGeocoderResult(results[0])
    return parsed.shortName || parsed.address || null
  } catch {
    return null
  }
}

// placeId → full location details (uses Geocoder which also accepts placeId — avoids needing the
// Place class which is part of the newer Places API surface and varies in availability).
export async function fetchPlaceDetails(placeId) {
  const geocoder = getGeocoder()
  if (!geocoder) return null
  try {
    const { results } = await geocoder.geocode({ placeId })
    if (!results || results.length === 0) return null
    return parseGeocoderResult(results[0])
  } catch {
    return null
  }
}
