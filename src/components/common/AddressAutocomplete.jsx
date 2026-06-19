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

async function fetchSuggestions(query, sessionToken) {
  if (!window.google?.maps?.places?.AutocompleteService) return []
  const service = new window.google.maps.places.AutocompleteService()
  return new Promise((resolve) => {
    service.getPlacePredictions(
      { input: query, sessionToken, language: 'de' },
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

function MapPreview({ lat, lng }) {
  const [map, setMap] = useState(null)
  const position = useMemo(() => ({ lat, lng }), [lat, lng])

  useEffect(() => {
    if (map) map.panTo(position)
  }, [map, position])

  return (
    <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', marginTop: 10, border: '1px solid var(--color-border)' }}>
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
            width: 22, height: 22, borderRadius: '50%', background: 'var(--color-accent)',
            border: '3px solid var(--color-bg)', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            transform: 'translate(-50%, -50%)',
          }} />
        </AdvancedMarker>
      </GoogleMap>
    </div>
  )
}

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

  const newSessionToken = useCallback(() => {
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [])

  useEffect(() => {
    if (isLoaded) newSessionToken()
  }, [isLoaded, newSessionToken])

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
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
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
            borderRadius: 12, border: '1.5px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            fontSize: 14, color: 'var(--color-text)', boxSizing: 'border-box',
            opacity: isLoaded ? 1 : 0.7,
          }}
        />
        {showSpinner && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      {slowWarning && (
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Suche dauert länger als üblich…
        </p>
      )}

      {((open && suggestions.length > 0) || showNoResults) && dropdownStyle && (
        <div style={{
          position: 'fixed',
          top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width,
          background: 'var(--color-bg)', borderRadius: 12,
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          zIndex: 10000, overflow: 'hidden',
        }}>
          {suggestions.length > 0 ? suggestions.map((s, i) => (
            <button
              key={s.placeId}
              onMouseDown={() => select(s)}
              style={{
                width: '100%', padding: '10px 14px', border: 'none',
                background: i === activeIdx ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                textAlign: 'left', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>📍</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {s.shortName}
                </p>
                {s.subLine && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                    {s.subLine}
                  </p>
                )}
              </div>
            </button>
          )) : (
            <p style={{ padding: '12px 14px', fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              Keine Adresse gefunden. Versuche eine genauere Eingabe.
            </p>
          )}
        </div>
      )}

      {showMapPreview && isLoaded && selectedLoc?.lat && (
        <MapPreview lat={selectedLoc.lat} lng={selectedLoc.lng} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
