import { useState, useMemo, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Search } from 'lucide-react'

const NOM_HEADERS = { 'User-Agent': 'OIKOS-App/1.0', 'Accept-Language': 'de' }

async function nominatimSearch(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: NOM_HEADERS }
    )
    if (!res.ok) return []
    const items = await res.json()
    return items.map(item => {
      const addr = item.address || {}
      const road = [addr.road, addr.house_number].filter(Boolean).join(' ')
      const city = addr.city || addr.town || addr.village || addr.county || ''
      const state = addr.state || ''
      const shortName = [road || city, road && city ? city : state].filter(Boolean).join(', ')
        || item.display_name.split(',').slice(0, 2).join(',').trim()
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        shortName,
        subLine: [state, addr.country].filter(Boolean).join(', '),
        city,
        country: addr.country || '',
        countryCode: (addr.country_code || '').toUpperCase(),
        district: addr.suburb || addr.neighbourhood || addr.quarter || '',
        street: road,
        postcode: addr.postcode || '',
      }
    })
  } catch {
    return []
  }
}

function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// ─── Map Preview (static, non-interactive) ───────────────
const previewPin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#4A6741;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function MapInvalidator() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [map])
  return null
}

function MapPreview({ lat, lng }) {
  return (
    <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', marginTop: 10, border: '1px solid #D8D2C5' }}>
      <MapContainer
        key={`${lat.toFixed(5)},${lng.toFixed(5)}`}
        center={[lat, lng]}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={previewPin} />
        <MapInvalidator />
      </MapContainer>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────
export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Adresse eingeben…',
  showMapPreview = false,
}) {
  const [inputVal, setInputVal] = useState(value?.shortName || value?.address || '')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [open, setOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selectedLoc, setSelectedLoc] = useState(value?.lat ? value : null)
  const [slowWarning, setSlowWarning] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState(null)

  const inputRef = useRef(null)
  const slowRef = useRef(null)

  const doSearch = useMemo(
    () => debounce(async (q) => {
      clearTimeout(slowRef.current)
      slowRef.current = setTimeout(() => setSlowWarning(true), 3000)
      const results = await nominatimSearch(q)
      clearTimeout(slowRef.current)
      setSlowWarning(false)
      setSuggestions(results)
      setHasSearched(true)
      setLoadingSearch(false)
      if (results.length > 0) setOpen(true)
    }, 500),
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

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]) }
    if (e.key === 'Escape') setOpen(false)
  }

  function select(s) {
    setInputVal(s.shortName)
    setSelectedLoc(s)
    setSuggestions([])
    setOpen(false)
    onChange(s)
  }

  const showNoResults = open && hasSearched && !loadingSearch && suggestions.length === 0

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
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: '100%', padding: '11px 36px 11px 34px',
            borderRadius: 12, border: '1.5px solid #D8D2C5',
            backgroundColor: '#F7F3EC', fontFamily: 'Lora, serif',
            fontSize: 14, color: '#2C2416', boxSizing: 'border-box',
          }}
        />
        {loadingSearch && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', border: '2px solid #D8D2C5', borderTopColor: '#4A6741', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      {slowWarning && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '4px 0 0' }}>
          Suche dauert länger als üblich…
        </p>
      )}

      {/* Dropdown – position:fixed to escape overflow:hidden/auto containers */}
      {(open && suggestions.length > 0 || showNoResults) && dropdownStyle && (
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
              key={i}
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
      {showMapPreview && selectedLoc?.lat && (
        <MapPreview lat={selectedLoc.lat} lng={selectedLoc.lng} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
