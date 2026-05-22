import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { Search } from 'lucide-react'
import {
  GOOGLE_MAPS_LOADER_OPTIONS,
  DEFAULT_MAP_ID,
  fetchPlaceDetails,
} from '../../lib/googleMaps'
import AdvancedMarker from '../worldmap/AdvancedMarker'

function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// ─── Suggestion fetching ─────────────────────────────────────────────
//
// Uses AutocompleteService (legacy but still supported & widely available).
// Returns the same shape consumers already expect.
async function fetchSuggestions(query, sessionToken) {
  if (!window.google?.maps?.places?.AutocompleteService) return []
  const service = new window.google.maps.places.AutocompleteService()
  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        sessionToken,
        language: 'de',
      },
      (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([])
          return
        }
        resolve(
          predictions.map((p) => ({
            placeId: p.place_id,
            shortName: p.structured_formatting?.main_text || p.description,
            subLine: p.structured_formatting?.secondary_text || '',
            description: p.description,
          }))
        )
      }
    )
  })
}

// ─── Map preview (Google Maps, non-interactive) ──────────────────────
function MapPreview({ lat, lng }) {
  const [map, setMap] = useState(null)
  const position = useMemo(() => ({ lat, lng }), [lat, lng])

  useEffect(() => {
    if (map) map.panTo(position)
  }, [map, position])

  return (
    <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', marginTop: 10, border: '1px solid #D8D2C5' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={position}
        zoom={15}
        onLoad={setMap}
        options={{
          mapId: DEFAULT_MAP_ID,
          disableDefaultUI: true,
          gestureHandling: 'none',
          keyboardShortcuts: false,
          clickableIcons: false,
        }}
      >
        <AdvancedMarker map={map} position={position}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: '#4A6741',
            border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            transform: 'translate(-50%, -50%)',
          }} />
        </AdvancedMarker>
      </GoogleMap>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Adresse eingeben…',
  showMapPreview = false,
}) {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)

  const [inputVal, setInputVal] = useState(value?.shortName || value?.address || '')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [open, setOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selectedLoc, setSelectedLoc] = useState(value?.lat ? value : null)
  const [slowWarning, setSlowWarning] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const [resolving, setResolving] = useState(false)

  const inputRef = useRef(null)
  const slowRef = useRef(null)
  const sessionTokenRef = useRef(null)

  // Create/refresh a session token whenever Maps becomes ready (one token per search session).
  const newSessionToken = useCallback(() => {
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [])

  useEffect(() => {
    if (isLoaded) newSessionToken()
  }, [isLoaded, newSessionToken])

  // Keep input value in sync if the parent updates `value` externally
  useEffect(() => {
    if (value?.shortName && value.shortName !== inputVal && value.lat !== selectedLoc?.lat) {
      setInputVal(value.shortName)
      setSelectedLoc(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng])

  const doSearch = useMemo(
    () => debounce(async (q) => {
      clearTimeout(slowRef.current)
      slowRef.current = setTimeout(() => setSlowWarning(true), 3000)
      const results = await fetchSuggestions(q, sessionTokenRef.current)
      clearTimeout(slowRef.current)
      setSlowWarning(false)
      setSuggestions(results)
      setHasSearched(true)
      setLoadingSearch(false)
      if (results.length > 0) setOpen(true)
    }, 400),
    []
  )

  function calcDropdownStyle() {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropdownStyle({ top: r.bottom + 4, left: r.left, width: r.width })
  }

  function handleChange(e) {
    const v = e.target.value
    setInputVal(v)
    setActiveIdx(-1)
    calcDropdownStyle()
    if (!isLoaded) return
    if (v.length >= 3) {
      setLoadingSearch(true)
      setHasSearched(false)
      doSearch(v)
    } else {
      setSuggestions([])
      setOpen(false)
      setLoadingSearch(false)
    }
  }

  function handleFocus() {
    calcDropdownStyle()
    if (suggestions.length > 0) setOpen(true)
  }

  function handleBlur() {
    setTimeout(() => { setOpen(false); setActiveIdx(-1) }, 200)
  }

  async function select(s) {
    setInputVal(s.shortName)
    setSuggestions([])
    setOpen(false)
    setResolving(true)
    const details = await fetchPlaceDetails(s.placeId)
    setResolving(false)
    // Refresh session token: a place selection ends the autocomplete session
    newSessionToken()
    if (!details) return
    const merged = {
      ...details,
      shortName: s.shortName || details.shortName,
      subLine: s.subLine || details.subLine,
    }
    setSelectedLoc(merged)
    onChange(merged)
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]) }
    if (e.key === 'Escape') setOpen(false)
  }

  const showNoResults = open && hasSearched && !loadingSearch && suggestions.length === 0
  const showSpinner = loadingSearch || resolving

  return (
    <div style={{ position: 'relative' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#A1927F', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isLoaded ? placeholder : 'Karte wird geladen…'}
          autoComplete="off"
          disabled={!isLoaded}
          style={{
            width: '100%', padding: '11px 36px 11px 34px',
            borderRadius: 12, border: '1.5px solid #D8D2C5',
            backgroundColor: '#F7F3EC', fontFamily: 'Lora, serif',
            fontSize: 14, color: '#2C2416', boxSizing: 'border-box',
            opacity: isLoaded ? 1 : 0.7,
          }}
        />
        {showSpinner && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', border: '2px solid #D8D2C5', borderTopColor: '#4A6741', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      {slowWarning && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '4px 0 0' }}>
          Suche dauert länger als üblich…
        </p>
      )}

      {/* Dropdown – position:fixed to escape overflow:hidden/auto containers */}
      {((open && suggestions.length > 0) || showNoResults) && dropdownStyle && (
        <div style={{
          position: 'fixed',
          top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width,
          background: '#fff', borderRadius: 12,
          border: '1px solid #D8D2C5',
          boxShadow: '0 4px 16px rgba(58,46,36,0.14)',
          zIndex: 10000, overflow: 'hidden',
        }}>
          {suggestions.length > 0 ? suggestions.map((s, i) => (
            <button
              key={s.placeId}
              onMouseDown={() => select(s)}
              style={{
                width: '100%', padding: '10px 14px', border: 'none',
                background: i === activeIdx ? '#EBE5D9' : '#fff',
                textAlign: 'left', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F0EBE3' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>📍</span>
              <div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: '#2C2416', margin: 0 }}>
                  {s.shortName}
                </p>
                {s.subLine && (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '2px 0 0' }}>
                    {s.subLine}
                  </p>
                )}
              </div>
            </button>
          )) : (
            <p style={{ padding: '12px 14px', fontFamily: 'Lora, serif', fontSize: 13, color: '#A1927F', margin: 0 }}>
              Keine Adresse gefunden. Versuche eine genauere Eingabe.
            </p>
          )}
        </div>
      )}

      {/* Map preview (only after selection) */}
      {showMapPreview && isLoaded && selectedLoc?.lat && (
        <MapPreview lat={selectedLoc.lat} lng={selectedLoc.lng} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
