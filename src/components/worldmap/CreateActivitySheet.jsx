import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Navigation, MapPin } from 'lucide-react'
import { GoogleMap } from '@react-google-maps/api'
import { useToast } from '../../context/ToastContext'
import { useCommunities } from '../../hooks/useCommunities'
import { DEFAULT_MAP_ID, reverseGeocode } from '../../lib/googleMaps'
import AddressAutocomplete from '../common/AddressAutocomplete'
import AdvancedMarker from './AdvancedMarker'

// ─── Farbpalette: Schwarz/Weiß mit babyblauen Akzenten ───
const INK = '#1A1A1A'
const INK_MUTED = '#6B7280'
const LINE = '#E5E7EB'
const WHITE = '#FFFFFF'
const SOFT = '#F7F7F8'
const ACCENT = '#7FBEE8'
const ACCENT_DARK = '#3E92CC'
const ACCENT_SOFT = '#EAF4FB'

// Event-Arten mit festen Symbolen (Sonstiges = eigenes Emoji)
const EVENT_TYPES = [
  { key: 'Evangelisieren', emoji: '📢' },
  { key: 'Bibel lesen', emoji: '📖' },
  { key: 'Lobpreis', emoji: '🎵' },
  { key: 'Gemeinschaft', emoji: '🤝' },
  { key: 'Sonstiges', emoji: null },
]

const CUSTOM_EMOJI_SUGGESTIONS = ['📍', '⛪', '☕', '🍽️', '🏃', '🎸', '🙏', '✝️', '🌍', '🎉', '💬', '🔥']

const VISIBILITY_OPTIONS = [
  { val: 'public', label: 'Öffentlich', desc: 'Für alle OIKOS-Nutzer sichtbar', icon: '🌐' },
  { val: 'friends', label: 'Meine Geschwister', desc: 'Nur deine bestätigten Geschwister', icon: '👥' },
  { val: 'community', label: 'Gemeinde', desc: 'Nur Mitglieder einer Gemeinde', icon: '⛪' },
]

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: INK_MUTED, marginBottom: 8 }
const inp = {
  width: '100%', padding: '11px 13px', borderRadius: 12,
  border: `1.5px solid ${LINE}`, backgroundColor: SOFT,
  fontFamily: 'Lora, serif', fontSize: 14, color: INK,
  display: 'block', boxSizing: 'border-box',
}

function MapPickerPinContent() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', background: ACCENT_DARK,
      border: `3px solid ${WHITE}`, boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      transform: 'translate(-50%, -50%)',
    }} />
  )
}

export default function CreateActivitySheet({ myProfile, onClose, onSubmit }) {
  const { showToast } = useToast()
  const { myCommunities } = useCommunities()
  // Google Maps is already loaded by WorldMapView – just check window.google
  const isLoaded = typeof window !== 'undefined' && !!window.google?.maps

  const [form, setForm] = useState({
    visibility: 'public',
    community_id: '',
    type: '',
    customEmoji: '',
    description: '',
    location_name: '',
    latitude: null,
    longitude: null,
    starts_at: '',
    ends_at: '',
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

  const selectedType = EVENT_TYPES.find(t => t.key === form.type)
  const isCustom = form.type === 'Sonstiges'
  const resolvedEmoji = isCustom ? (form.customEmoji || '📍') : (selectedType?.emoji || '📍')

  async function handleSubmit() {
    if (!form.type) { showToast('Bitte Event-Art wählen', 'error'); return }
    if (isCustom && !form.customEmoji) { showToast('Bitte ein Emoji für Sonstiges wählen', 'error'); return }
    if (form.visibility === 'community' && !form.community_id) { showToast('Bitte Gemeinde wählen', 'error'); return }
    if (!form.starts_at) { showToast('Bitte Startzeit angeben', 'error'); return }
    if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      showToast('Endzeit muss nach der Startzeit liegen', 'error'); return
    }
    if (!form.latitude || !form.longitude) { showToast('Bitte Standort setzen', 'error'); return }
    setSubmitting(true)
    await onSubmit({
      title: form.type,
      activity_type: form.type,
      activity_emoji: resolvedEmoji,
      description: form.description.trim() || null,
      location_name: (form.location_name.trim() || locationLabel || null),
      latitude: form.latitude,
      longitude: form.longitude,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      visibility: form.visibility,
      community_id: form.community_id || null,
    })
    setSubmitting(false)
  }

  const canSubmit =
    form.type &&
    (!isCustom || form.customEmoji) &&
    (form.visibility !== 'community' || form.community_id) &&
    form.starts_at &&
    form.latitude &&
    !submitting

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'Lora, serif', fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? ACCENT_DARK : 'transparent',
    color: active ? WHITE : INK_MUTED,
    transition: 'all 0.15s',
  })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: WHITE,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 72px',
        maxHeight: '92%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: LINE, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: INK, margin: 0 }}>
            Event hosten
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: INK_MUTED, padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* 1. Sichtbarkeit – zuerst */}
        <label style={lbl}>Wer darf das Event sehen?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: form.visibility === 'community' ? 10 : 18 }}>
          {VISIBILITY_OPTIONS.map(opt => {
            const active = form.visibility === opt.val
            return (
              <button
                key={opt.val}
                onClick={() => set('visibility', opt.val)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  padding: '11px 13px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${active ? ACCENT_DARK : LINE}`,
                  background: active ? ACCENT_SOFT : WHITE,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: INK }}>{opt.label}</span>
                  <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 11, color: INK_MUTED, marginTop: 1 }}>{opt.desc}</span>
                </span>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? ACCENT_DARK : LINE}`,
                  background: active ? ACCENT_DARK : WHITE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: WHITE }} />}
                </span>
              </button>
            )
          })}
        </div>

        {/* Gemeinde-Auswahl */}
        {form.visibility === 'community' && (
          <div style={{ marginBottom: 18 }}>
            {myCommunities && myCommunities.length > 0 ? (
              <select
                value={form.community_id}
                onChange={e => set('community_id', e.target.value)}
                style={{ ...inp, appearance: 'auto' }}
              >
                <option value="">Gemeinde wählen…</option>
                {myCommunities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#C0392B', margin: 0 }}>
                Du bist noch in keiner Gemeinde. Tritt erst einer Gemeinde bei.
              </p>
            )}
          </div>
        )}

        {/* 2. Event-Art mit festen Symbolen */}
        <label style={lbl}>Was für ein Event?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isCustom ? 10 : 18 }}>
          {EVENT_TYPES.map(t => {
            const active = form.type === t.key
            return (
              <button
                key={t.key}
                onClick={() => set('type', t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 14px', borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${active ? ACCENT_DARK : LINE}`,
                  background: active ? ACCENT_SOFT : WHITE,
                  fontFamily: 'Lora, serif', fontSize: 13,
                  color: active ? ACCENT_DARK : INK,
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span style={{ fontSize: 17 }}>{t.emoji || '✨'}</span>
                {t.key}
              </button>
            )
          })}
        </div>

        {/* Eigenes Emoji für Sonstiges */}
        {isCustom && (
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Eigenes Symbol wählen</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {CUSTOM_EMOJI_SUGGESTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => set('customEmoji', e)}
                  style={{
                    width: 42, height: 42, borderRadius: 10, fontSize: 20, cursor: 'pointer',
                    border: `2px solid ${form.customEmoji === e ? ACCENT_DARK : LINE}`,
                    background: form.customEmoji === e ? ACCENT_SOFT : WHITE,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.customEmoji}
              onChange={e => set('customEmoji', [...e.target.value].slice(-1).join(''))}
              placeholder="…oder eigenes Emoji eingeben"
              style={inp}
            />
          </div>
        )}

        {/* 3. Freitext-Infos */}
        <label style={lbl}>Infos (optional)</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Worum geht es? Was sollen die Teilnehmer wissen?"
          rows={3}
          style={{ ...inp, resize: 'vertical', marginBottom: 18 }}
        />

        {/* 4. Zeit von – bis */}
        <label style={lbl}>Wann? (von – bis)</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: INK_MUTED, display: 'block', marginBottom: 4 }}>Von *</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={e => set('starts_at', e.target.value)}
              style={inp}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: INK_MUTED, display: 'block', marginBottom: 4 }}>Bis</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              min={form.starts_at || undefined}
              onChange={e => set('ends_at', e.target.value)}
              style={inp}
            />
          </div>
        </div>

        {/* 5. Standort */}
        <label style={lbl}>Standort *</label>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: SOFT, borderRadius: 12, marginBottom: 12, border: `1px solid ${LINE}` }}>
          <button style={tabStyle(locTab === 'gps')} onClick={() => setLocTab('gps')}>📡 Mein Standort</button>
          <button style={tabStyle(locTab === 'address')} onClick={() => setLocTab('address')}>🔍 Adresse</button>
          <button style={tabStyle(locTab === 'map')} onClick={() => setLocTab('map')}>🗺 Karte</button>
        </div>

        {/* GPS */}
        {locTab === 'gps' && (
          <div>
            <button
              onClick={handleGetGPS}
              disabled={locating}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 16px', borderRadius: 12, width: '100%',
                border: `1.5px solid ${form.latitude ? ACCENT_DARK : LINE}`,
                background: form.latitude ? ACCENT_SOFT : WHITE,
                fontFamily: 'Lora, serif', fontSize: 14,
                color: form.latitude ? ACCENT_DARK : INK,
                cursor: 'pointer', opacity: locating ? 0.7 : 1,
                justifyContent: 'center',
              }}
            >
              <Navigation size={16} />
              {locating ? 'Ermittle Standort…' : form.latitude ? 'Mein aktueller Standort ✓' : 'Mein aktueller Standort'}
            </button>
            {myProfile?.latitude && (
              <button
                onClick={() => applyLocation(myProfile.latitude, myProfile.longitude, myProfile.city || '')}
                style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 10,
                  border: `1.5px solid ${LINE}`, background: WHITE,
                  fontFamily: 'Lora, serif', fontSize: 12, color: INK_MUTED,
                  cursor: 'pointer', width: '100%',
                }}
              >
                📍 Meinen Profilstandort verwenden
              </button>
            )}
          </div>
        )}

        {/* Adresse */}
        {locTab === 'address' && (
          <AddressAutocomplete
            value={form.latitude ? { shortName: locationLabel, lat: form.latitude, lng: form.longitude } : null}
            onChange={(loc) => applyLocation(loc.lat, loc.lng, loc.shortName)}
            placeholder="Adresse oder Ort suchen…"
          />
        )}

        {/* Karte */}
        {locTab === 'map' && (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: INK_MUTED, margin: '0 0 6px' }}>
              Tippe auf die Karte, um den Ort zu setzen.
            </p>
            <div style={{ height: 220, borderRadius: 12, overflow: 'hidden', border: `1px solid ${LINE}` }}>
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
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SOFT }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${LINE}`, borderTopColor: ACCENT_DARK, animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standort-Status */}
        {form.latitude && (
          <div style={{ marginTop: 10 }}>
            {locationLabel && !reverseLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={13} color={ACCENT_DARK} />
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: ACCENT_DARK, margin: 0, fontWeight: 600 }}>
                  {locationLabel}
                </p>
              </div>
            )}
            {reverseLoading && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: INK_MUTED, margin: 0 }}>
                Adresse wird ermittelt…
              </p>
            )}
          </div>
        )}
        {!form.latitude && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#C0392B', marginTop: 8 }}>
            Bitte Standort setzen
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
            background: canSubmit ? ACCENT_DARK : LINE,
            color: canSubmit ? WHITE : INK_MUTED, fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            marginTop: 22, opacity: submitting ? 0.7 : 1, transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 17 }}>{resolvedEmoji}</span>
          {submitting ? 'Wird gehostet…' : 'Event hosten'}
        </button>
      </div>
    </div>,
    document.body
  )
}
