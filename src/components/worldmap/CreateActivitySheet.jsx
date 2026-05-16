import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Navigation, MapPin } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useToast } from '../../context/ToastContext'
import AddressAutocomplete from '../common/AddressAutocomplete'

const EMOJIS = ['📍', '📖', '🙏', '📢', '🏠', '⛪', '🎵', '🏃', '☕', '🌍', '✝️']
const TYPE_CHIPS = ['Bibelstudie', 'Evangelisation', 'Gebetstreffen', 'Hauskreis', 'Gottesdienst', 'Sport', 'Sonstiges']

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: '#706351', marginBottom: 6 }
const inp = {
  width: '100%', padding: '11px 13px', borderRadius: 12,
  border: '1.5px solid #D8D2C5', backgroundColor: '#F7F3EC',
  fontFamily: 'Lora, serif', fontSize: 14, color: '#2C2416',
  display: 'block', boxSizing: 'border-box',
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'OIKOS-App/1.0', 'Accept-Language': 'de' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address || {}
    const road = [addr.road, addr.house_number].filter(Boolean).join(' ')
    const city = addr.city || addr.town || addr.village || addr.county || ''
    return [road || city, road && city ? city : ''].filter(Boolean).join(', ')
      || data.display_name.split(',').slice(0, 2).join(', ').trim()
  } catch {
    return null
  }
}

const mapPin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#4A6741;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function MapClickHandler({ onPick }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function MapCenterSync({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    if (lat && lng) map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 0.5 })
  }, [lat, lng, map])
  return null
}

export default function CreateActivitySheet({ myProfile, onClose, onSubmit }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    emoji: '📍',
    title: '',
    activity_type: '',
    description: '',
    location_name: '',
    latitude: null,
    longitude: null,
    starts_at: '',
    max_participants: '',
    is_public: true,
  })
  const [locTab, setLocTab] = useState('gps')
  const [locationLabel, setLocationLabel] = useState('')
  const [locating, setLocating] = useState(false)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const defaultCenter = myProfile?.latitude
    ? [myProfile.latitude, myProfile.longitude]
    : [48.137, 11.576]

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function applyLocation(lat, lng, label) {
    set('latitude', lat)
    set('longitude', lng)
    if (label) setLocationLabel(label)
  }

  function handleGetGPS() {
    if (!navigator.geolocation) { showToast('Geolocation nicht unterstützt', 'error'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        set('latitude', latitude)
        set('longitude', longitude)
        setLocating(false)
        setReverseLoading(true)
        const label = await reverseGeocode(latitude, longitude)
        setReverseLoading(false)
        if (label) setLocationLabel(label)
        showToast('Standort ermittelt ✓')
      },
      () => {
        showToast('Standort konnte nicht ermittelt werden', 'error')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  async function handleMapClick(lat, lng) {
    set('latitude', lat)
    set('longitude', lng)
    setReverseLoading(true)
    const label = await reverseGeocode(lat, lng)
    setReverseLoading(false)
    if (label) setLocationLabel(label)
  }

  async function handleSubmit() {
    if (!form.title.trim()) { showToast('Bitte Titel eingeben', 'error'); return }
    if (!form.activity_type.trim()) { showToast('Bitte Aktivitäts-Art wählen', 'error'); return }
    if (!form.latitude || !form.longitude) { showToast('Bitte Standort setzen', 'error'); return }
    setSubmitting(true)
    await onSubmit({
      title: form.title.trim(),
      activity_type: form.activity_type.trim(),
      activity_emoji: form.emoji,
      description: form.description.trim() || null,
      location_name: (form.location_name.trim() || locationLabel || null),
      latitude: form.latitude,
      longitude: form.longitude,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_public: form.is_public,
    })
    setSubmitting(false)
  }

  const canSubmit = form.title.trim() && form.activity_type.trim() && form.latitude && !submitting

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'Lora, serif', fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? '#4A6741' : 'transparent',
    color: active ? '#fff' : '#706351',
    transition: 'all 0.15s',
  })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#FBF8F3',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 72px',
        maxHeight: '92%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D8D2C5', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: '#2C2416', margin: 0 }}>
            Aktivität erstellen
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A1927F', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Emoji */}
        <label style={lbl}>Emoji</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => set('emoji', e)}
              style={{
                width: 42, height: 42, borderRadius: 10, fontSize: 20, cursor: 'pointer',
                border: `2px solid ${form.emoji === e ? '#4A6741' : '#D8D2C5'}`,
                background: form.emoji === e ? '#EBE5D9' : '#fff',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Title */}
        <label style={lbl}>Titel *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Was machst du?"
          style={inp}
        />

        {/* Activity type */}
        <label style={{ ...lbl, marginTop: 14 }}>Aktivitäts-Art *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {TYPE_CHIPS.map(t => (
            <button
              key={t}
              onClick={() => set('activity_type', t)}
              style={{
                padding: '5px 12px', borderRadius: 16, cursor: 'pointer',
                border: `1.5px solid ${form.activity_type === t ? '#4A6741' : '#D8D2C5'}`,
                background: form.activity_type === t ? '#EBE5D9' : '#fff',
                fontFamily: 'Lora, serif', fontSize: 12,
                color: form.activity_type === t ? '#4A6741' : '#706351',
                fontWeight: form.activity_type === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={form.activity_type}
          onChange={e => set('activity_type', e.target.value)}
          placeholder="Oder selbst eingeben…"
          style={inp}
        />

        {/* Description */}
        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung (optional)</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Worum geht es?"
          rows={3}
          style={{ ...inp, resize: 'vertical' }}
        />

        {/* Location — three tabs */}
        <label style={{ ...lbl, marginTop: 14 }}>Standort der Aktivität *</label>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#EBE5D9', borderRadius: 12, marginBottom: 12 }}>
          <button style={tabStyle(locTab === 'gps')} onClick={() => setLocTab('gps')}>
            📡 GPS
          </button>
          <button style={tabStyle(locTab === 'address')} onClick={() => setLocTab('address')}>
            🔍 Adresse
          </button>
          <button style={tabStyle(locTab === 'map')} onClick={() => setLocTab('map')}>
            🗺 Karte
          </button>
        </div>

        {/* GPS tab */}
        {locTab === 'gps' && (
          <div>
            <button
              onClick={handleGetGPS}
              disabled={locating}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 16px', borderRadius: 12, width: '100%',
                border: `1.5px solid ${form.latitude ? '#4A6741' : '#D8D2C5'}`,
                background: form.latitude ? '#EBE5D9' : '#fff',
                fontFamily: 'Lora, serif', fontSize: 14,
                color: form.latitude ? '#4A6741' : '#706351',
                cursor: 'pointer', opacity: locating ? 0.7 : 1,
                justifyContent: 'center',
              }}
            >
              <Navigation size={16} />
              {locating ? 'Ermittle Standort…' : form.latitude ? 'GPS-Standort gesetzt ✓' : 'Aktuellen Standort ermitteln'}
            </button>
            {!form.latitude && myProfile?.latitude && (
              <button
                onClick={() => {
                  set('latitude', myProfile.latitude)
                  set('longitude', myProfile.longitude)
                  setLocationLabel(myProfile.city || '')
                }}
                style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 10,
                  border: '1.5px solid #D8D2C5', background: '#fff',
                  fontFamily: 'Lora, serif', fontSize: 12, color: '#706351',
                  cursor: 'pointer', width: '100%',
                }}
              >
                📍 Meinen Profilstandort verwenden
              </button>
            )}
          </div>
        )}

        {/* Address tab */}
        {locTab === 'address' && (
          <AddressAutocomplete
            value={form.latitude ? { shortName: locationLabel, lat: form.latitude, lng: form.longitude } : null}
            onChange={(loc) => {
              applyLocation(loc.lat, loc.lng, loc.shortName)
            }}
            placeholder="Adresse oder Ort suchen…"
          />
        )}

        {/* Map tab */}
        {locTab === 'map' && (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#A1927F', margin: '0 0 8px' }}>
              Tippe auf die Karte, um den Aktivitätsort zu setzen.
            </p>
            <div style={{ height: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid #D8D2C5' }}>
              <MapContainer
                center={form.latitude ? [form.latitude, form.longitude] : defaultCenter}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                scrollWheelZoom={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {form.latitude && <Marker position={[form.latitude, form.longitude]} icon={mapPin} />}
                <MapClickHandler onPick={handleMapClick} />
                <MapCenterSync lat={form.latitude} lng={form.longitude} />
              </MapContainer>
            </div>
            {reverseLoading && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '6px 0 0' }}>
                Adresse wird ermittelt…
              </p>
            )}
          </div>
        )}

        {/* Location status + name override */}
        {form.latitude && (
          <div style={{ marginTop: 10 }}>
            {locationLabel && !reverseLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MapPin size={13} color="#4A6741" />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#4A6741', margin: 0, fontWeight: 600 }}>
                  {locationLabel}
                </p>
              </div>
            )}
            <label style={lbl}>Ortsname für andere (optional)</label>
            <input
              type="text"
              value={form.location_name}
              onChange={e => set('location_name', e.target.value)}
              placeholder={locationLabel || 'z.B. Café Einstein, München'}
              style={inp}
            />
          </div>
        )}

        {!form.latitude && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#C0392B', marginTop: 8 }}>
            Bitte Standort setzen
          </p>
        )}

        {/* Start time */}
        <label style={{ ...lbl, marginTop: 14 }}>Wann? (optional)</label>
        <input
          type="datetime-local"
          value={form.starts_at}
          onChange={e => set('starts_at', e.target.value)}
          style={inp}
        />

        {/* Max participants */}
        <label style={{ ...lbl, marginTop: 14 }}>Max. Teilnehmer (optional)</label>
        <input
          type="number"
          value={form.max_participants}
          onChange={e => set('max_participants', e.target.value)}
          placeholder="z.B. 10"
          min="1"
          style={inp}
        />

        {/* Visibility */}
        <div style={{ marginTop: 16 }}>
          <label style={lbl}>Sichtbarkeit</label>
          {[
            { val: true, label: '🌐 Alle OIKOS-Nutzer' },
            { val: false, label: '👥 Nur meine Geschwister' },
          ].map(opt => (
            <label key={String(opt.val)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                checked={form.is_public === opt.val}
                onChange={() => set('is_public', opt.val)}
                style={{ accentColor: '#4A6741', width: 16, height: 16 }}
              />
              <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#2C2416' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            background: canSubmit ? '#4A6741' : '#D8D2C5',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            marginTop: 20, opacity: submitting ? 0.7 : 1, transition: 'all 0.15s',
          }}
        >
          {submitting ? 'Wird gepostet…' : 'Aktivität posten 📍'}
        </button>
      </div>
    </div>,
    document.body
  )
}
