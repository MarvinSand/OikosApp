import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Navigation, MapPin } from 'lucide-react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { useToast } from '../../context/ToastContext'
import {
  GOOGLE_MAPS_LOADER_OPTIONS,
  DEFAULT_MAP_ID,
  reverseGeocode,
} from '../../lib/googleMaps'
import AddressAutocomplete from '../common/AddressAutocomplete'
import AdvancedMarker from './AdvancedMarker'

const EMOJIS = ['📍', '📖', '🙏', '📢', '🏠', '⛪', '🎵', '🏃', '☕', '🌍', '✝️']
const TYPE_CHIPS = ['Bibelstudie', 'Evangelisation', 'Gebetstreffen', 'Hauskreis', 'Gottesdienst', 'Sport', 'Sonstiges']

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: '#706351', marginBottom: 6 }
const inp = {
  width: '100%', padding: '11px 13px', borderRadius: 12,
  border: '1.5px solid #D8D2C5', backgroundColor: '#F7F3EC',
  fontFamily: 'Lora, serif', fontSize: 14, color: '#2C2416',
  display: 'block', boxSizing: 'border-box',
}

function MapPickerPinContent() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', background: '#4A6741',
      border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      transform: 'translate(-50%, -50%)',
    }} />
  )
}

export default function CreateActivitySheet({ myProfile, onClose, onSubmit }) {
  const { showToast } = useToast()
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)

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
  const [miniMap, setMiniMap] = useState(null)

  const defaultCenter = myProfile?.latitude
    ? { lat: myProfile.latitude, lng: myProfile.longitude }
    : { lat: 48.137, lng: 11.576 }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function applyLocation(lat, lng, label) {
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
    if (label) setLocationLabel(label)
  }

  // When location changes (from autocomplete, GPS, or click), pan the mini-map there
  useEffect(() => {
    if (miniMap && form.latitude != null && form.longitude != null) {
      miniMap.panTo({ lat: form.latitude, lng: form.longitude })
      if (miniMap.getZoom() < 14) miniMap.setZoom(15)
    }
  }, [miniMap, form.latitude, form.longitude])

  function handleGetGPS() {
    if (!navigator.geolocation) { showToast('Geolocation nicht unterstützt', 'error'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        applyLocation(latitude, longitude)
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

  async function handleMapClick(e) {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    applyLocation(lat, lng)
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

        {/* Location — two tabs (GPS / Karte+Adresse) */}
        <label style={{ ...lbl, marginTop: 14 }}>Standort der Aktivität *</label>

        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#EBE5D9', borderRadius: 12, marginBottom: 12 }}>
          <button style={tabStyle(locTab === 'gps')} onClick={() => setLocTab('gps')}>
            📡 GPS
          </button>
          <button style={tabStyle(locTab === 'map')} onClick={() => setLocTab('map')}>
            🗺 Karte + Adresse
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
                  applyLocation(myProfile.latitude, myProfile.longitude, myProfile.city || '')
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

        {/* Karte + Adresse tab (merged) */}
        {locTab === 'map' && (
          <div>
            <AddressAutocomplete
              value={form.latitude ? { shortName: locationLabel, lat: form.latitude, lng: form.longitude } : null}
              onChange={(loc) => {
                applyLocation(loc.lat, loc.lng, loc.shortName)
              }}
              placeholder="Adresse oder Ort suchen…"
            />

            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '10px 0 6px' }}>
              … oder tippe direkt auf die Karte, um den Ort zu setzen.
            </p>

            <div style={{ height: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid #D8D2C5' }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={form.latitude ? { lat: form.latitude, lng: form.longitude } : defaultCenter}
                  zoom={form.latitude ? 15 : 13}
                  onLoad={setMiniMap}
                  onUnmount={() => setMiniMap(null)}
                  onClick={handleMapClick}
                  options={{
                    mapId: DEFAULT_MAP_ID,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'cooperative',
                    clickableIcons: false,
                  }}
                >
                  {form.latitude != null && form.longitude != null && (
                    <AdvancedMarker map={miniMap} position={{ lat: form.latitude, lng: form.longitude }}>
                      <MapPickerPinContent />
                    </AdvancedMarker>
                  )}
                </GoogleMap>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EC' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #D8D2C5', borderTopColor: '#4A6741', animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
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
