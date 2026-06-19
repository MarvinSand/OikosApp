import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Navigation, MapPin } from 'lucide-react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { useToast } from '../../context/ToastContext'
import { useCommunities } from '../../hooks/useCommunities'
import {
  GOOGLE_MAPS_LOADER_OPTIONS,
  DEFAULT_MAP_ID,
  reverseGeocode,
} from '../../lib/googleMaps'
import AddressAutocomplete from '../common/AddressAutocomplete'
import AdvancedMarker from './AdvancedMarker'

const C = {
  accent: '#5AC8FA', accentDark: '#0A84FF', accentLight: '#E5F6FE',
  text: '#000000', textSec: '#6E6E73', textTer: '#AEAEB2',
  border: '#E5E5EA', bg: '#FFFFFF', bgSec: '#F5F5F7', error: '#FF3B30',
}

// Feste Event-Arten mit zugeordnetem Symbol – erscheinen so auf der Karte
const EVENT_CATEGORIES = [
  { key: 'evangelisieren', label: 'Evangelisieren', emoji: '📢' },
  { key: 'bibellesen',     label: 'Bibel lesen',    emoji: '📖' },
  { key: 'lobpreis',       label: 'Lobpreis',       emoji: '🎵' },
  { key: 'gemeinschaft',   label: 'Gemeinschaft',   emoji: '🤝' },
  { key: 'sonstiges',      label: 'Sonstiges',      emoji: null }, // eigenes Emoji
]

// Auswahl-Emojis für "Sonstiges"
const CUSTOM_EMOJIS = ['🎉', '☕', '🍽️', '🏃', '⚽', '🎸', '🎨', '🔥', '🌟', '🙏', '📚', '🎬', '🏕️', '🍕', '🧗', '🎲']

const VISIBILITY = [
  { key: 'public',      label: 'Öffentlich',        desc: 'Alle OIKOS-Nutzer',          emoji: '🌐' },
  { key: 'communities', label: 'Gemeinde',          desc: 'Ausgewählte Communities',    emoji: '⛪' },
  { key: 'siblings',    label: 'Meine Geschwister', desc: 'Nur verbundene Geschwister', emoji: '👥' },
]

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }
const inp = {
  width: '100%', padding: '12px 13px', borderRadius: 12,
  border: `1.5px solid ${C.border}`, backgroundColor: C.bgSec,
  fontSize: 14, color: C.text,
  display: 'block', boxSizing: 'border-box',
}

function MapPickerPinContent() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', background: C.accentDark,
      border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      transform: 'translate(-50%, -50%)',
    }} />
  )
}

export default function CreateActivitySheet({ myProfile, onClose, onSubmit }) {
  const { showToast } = useToast()
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)
  const { myCommunities } = useCommunities()

  // steps: 'visibility' → ('community') → 'category' → 'details'
  const [step, setStep] = useState('visibility')

  const [form, setForm] = useState({
    visibility_mode: null,
    community_ids: [],
    category: '',
    customEmoji: '🎉',
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

  function toggleCommunity(id) {
    setForm(f => ({
      ...f,
      community_ids: f.community_ids.includes(id)
        ? f.community_ids.filter(c => c !== id)
        : [...f.community_ids, id],
    }))
  }

  function applyLocation(lat, lng, label) {
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
    if (label) setLocationLabel(label)
  }

  const selectedCat = EVENT_CATEGORIES.find(c => c.key === form.category)
  const resolvedEmoji = form.category === 'sonstiges' ? form.customEmoji : (selectedCat?.emoji || '📍')

  const hasCommunityStep = form.visibility_mode === 'communities'
  const totalSteps = hasCommunityStep ? 4 : 3
  const stepIndex = step === 'visibility' ? 1
    : step === 'community' ? 2
    : step === 'category' ? (hasCommunityStep ? 3 : 2)
    : (hasCommunityStep ? 4 : 3)

  function selectVisibility(key) {
    set('visibility_mode', key)
    if (key === 'communities') {
      setStep('community')
    } else {
      setForm(f => ({ ...f, community_ids: [] }))
      setStep('category')
    }
  }

  // When location changes, pan the mini-map there
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
    if (!form.category) { showToast('Bitte Event-Art wählen', 'error'); return }
    if (form.category === 'sonstiges' && !form.customEmoji) { showToast('Bitte ein Symbol wählen', 'error'); return }
    if (!form.starts_at) { showToast('Bitte Startzeit angeben', 'error'); return }
    if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      showToast('Ende muss nach dem Start liegen', 'error'); return
    }
    if (!form.latitude || !form.longitude) { showToast('Bitte Standort setzen', 'error'); return }
    if (form.visibility_mode === 'communities' && form.community_ids.length === 0) {
      showToast('Bitte mindestens eine Gemeinde wählen', 'error'); return
    }

    setSubmitting(true)
    await onSubmit({
      title: selectedCat?.label || 'Event',
      activity_type: form.category,
      activity_emoji: resolvedEmoji,
      description: form.description.trim() || null,
      location_name: (form.location_name.trim() || locationLabel || null),
      latitude: form.latitude,
      longitude: form.longitude,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      visibility_mode: form.visibility_mode,
      community_ids: form.visibility_mode === 'communities' ? form.community_ids : [],
    })
    setSubmitting(false)
  }

  const canSubmit =
    form.category &&
    form.starts_at &&
    form.latitude &&
    !(form.visibility_mode === 'communities' && form.community_ids.length === 0) &&
    !submitting

  const tabStyle = (active) => ({
    flex: 1, padding: '9px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? '#fff' : 'transparent',
    color: active ? C.accentDark : C.textSec,
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s',
  })

  const backBtn = {
    fontSize: 13, color: C.textSec, background: 'none', border: 'none',
    cursor: 'pointer', padding: 0,
  }
  const nextBtn = (enabled) => ({
    flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
    background: enabled ? C.accent : C.border,
    color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: enabled ? 'pointer' : 'not-allowed',
  })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 72px',
        maxHeight: '94%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: C.text, margin: 0 }}>
            Event hosten
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Fortschrittsbalken */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: stepIndex > i ? C.accent : C.border }} />
          ))}
        </div>

        {/* ─── Schritt 1: Wer darf das Event sehen? ─── */}
        {step === 'visibility' && (
          <div>
            <label style={lbl}>Wer darf das Event sehen?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {VISIBILITY.map(v => {
                const active = form.visibility_mode === v.key
                return (
                  <button
                    key={v.key}
                    onClick={() => selectVisibility(v.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      background: active ? C.accentLight : '#fff',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{v.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{v.label}</p>
                      <p style={{ fontSize: 11, color: C.textSec, margin: '1px 0 0' }}>{v.desc}</p>
                    </div>
                    {(v.key === 'communities') && (
                      <span style={{ fontSize: 13, color: C.textTer }}>›</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Schritt 2 (nur Gemeinde): Communities auswählen ─── */}
        {step === 'community' && (
          <div>
            <label style={lbl}>Welche Gemeinde(n)?</label>
            {myCommunities.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textSec, textAlign: 'center', margin: '24px 0' }}>
                Du bist noch in keiner Community. Tritt zuerst einer Gemeinde bei.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myCommunities.map(c => {
                  const sel = form.community_ids.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCommunity(c.id)}
                      style={{
                        padding: '9px 15px', borderRadius: 16, cursor: 'pointer',
                        border: `1.5px solid ${sel ? C.accent : C.border}`,
                        background: sel ? C.accent : '#fff',
                        color: sel ? '#fff' : C.text,
                        fontSize: 13, fontWeight: sel ? 700 : 500,
                      }}
                    >
                      {sel ? '✓ ' : ''}{c.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
              <button style={backBtn} onClick={() => setStep('visibility')}>← Zurück</button>
              <button
                style={nextBtn(form.community_ids.length > 0)}
                disabled={form.community_ids.length === 0}
                onClick={() => setStep('category')}
              >
                Weiter ({form.community_ids.length})
              </button>
            </div>
          </div>
        )}

        {/* ─── Schritt: Was für ein Event? ─── */}
        {step === 'category' && (
          <div>
            <label style={lbl}>Was für ein Event?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {EVENT_CATEGORIES.map(cat => {
                const active = form.category === cat.key
                return (
                  <button
                    key={cat.key}
                    onClick={() => set('category', cat.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      background: active ? C.accentLight : '#fff',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{cat.key === 'sonstiges' ? (form.customEmoji || '✨') : cat.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: C.text }}>{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Eigenes Emoji bei "Sonstiges" */}
            {form.category === 'sonstiges' && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: C.textSec, margin: '0 0 8px' }}>Eigenes Symbol wählen:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CUSTOM_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => set('customEmoji', e)}
                      style={{
                        width: 42, height: 42, borderRadius: 10, fontSize: 20, cursor: 'pointer',
                        border: `2px solid ${form.customEmoji === e ? C.accent : C.border}`,
                        background: form.customEmoji === e ? C.accentLight : '#fff',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
              <button style={backBtn} onClick={() => setStep(hasCommunityStep ? 'community' : 'visibility')}>← Zurück</button>
              <button
                style={nextBtn(!!form.category)}
                disabled={!form.category}
                onClick={() => setStep('details')}
              >
                Weiter
              </button>
            </div>
          </div>
        )}

        {/* ─── Schritt: Infos, Zeit, Standort ─── */}
        {step === 'details' && (
          <div>
            {/* Freitext / Infos */}
            <label style={lbl}>Infos (optional)</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Was sollten andere wissen?"
              rows={3}
              style={{ ...inp, resize: 'vertical', marginBottom: 18 }}
            />

            {/* Zeit von – bis */}
            <label style={lbl}>Wann? (von – bis)</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: C.textSec, margin: '0 0 4px' }}>Start *</p>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => set('starts_at', e.target.value)}
                  style={inp}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: C.textSec, margin: '0 0 4px' }}>Ende</p>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  min={form.starts_at || undefined}
                  onChange={e => set('ends_at', e.target.value)}
                  style={inp}
                />
              </div>
            </div>

            {/* Standort */}
            <label style={{ ...lbl, marginTop: 18 }}>Standort *</label>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: C.bgSec, borderRadius: 12, marginBottom: 12 }}>
              <button style={tabStyle(locTab === 'gps')} onClick={() => setLocTab('gps')}>📡 Mein Standort</button>
              <button style={tabStyle(locTab === 'address')} onClick={() => setLocTab('address')}>🔎 Adresse</button>
              <button style={tabStyle(locTab === 'map')} onClick={() => setLocTab('map')}>🗺 Karte</button>
            </div>

            {/* GPS tab */}
            {locTab === 'gps' && (
              <div>
                <button
                  onClick={handleGetGPS}
                  disabled={locating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 12, width: '100%',
                    border: `1.5px solid ${form.latitude ? C.accent : C.border}`,
                    background: form.latitude ? C.accentLight : '#fff',
                    fontSize: 14, fontWeight: 600,
                    color: form.latitude ? C.accentDark : C.text,
                    cursor: 'pointer', opacity: locating ? 0.7 : 1,
                    justifyContent: 'center',
                  }}
                >
                  <Navigation size={16} />
                  {locating ? 'Ermittle Standort…' : form.latitude ? 'Aktueller Standort gesetzt ✓' : 'Aktuellen Standort verwenden'}
                </button>
                {myProfile?.latitude && (
                  <button
                    onClick={() => applyLocation(myProfile.latitude, myProfile.longitude, myProfile.city || '')}
                    style={{
                      marginTop: 8, padding: '9px 12px', borderRadius: 10,
                      border: `1.5px solid ${C.border}`, background: '#fff',
                      fontSize: 12, color: C.textSec, fontWeight: 500,
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
                onChange={(loc) => applyLocation(loc.lat, loc.lng, loc.shortName)}
                placeholder="Adresse oder Ort suchen…"
              />
            )}

            {/* Map tab */}
            {locTab === 'map' && (
              <div>
                <p style={{ fontSize: 11, color: C.textSec, margin: '0 0 8px' }}>
                  Tippe auf die Karte, um den Standort zu setzen.
                </p>
                <div style={{ height: 220, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
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
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgSec }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location status */}
            {form.latitude && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <MapPin size={14} color={C.accentDark} />
                <p style={{ fontSize: 12, color: C.accentDark, margin: 0, fontWeight: 600 }}>
                  {reverseLoading ? 'Adresse wird ermittelt…' : (locationLabel || 'Standort gesetzt')}
                </p>
              </div>
            )}
            {!form.latitude && (
              <p style={{ fontSize: 11, color: C.error, marginTop: 8 }}>
                Bitte Standort setzen
              </p>
            )}

            {/* Zurück + Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
              <button style={backBtn} onClick={() => setStep('category')}>← Zurück</button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 1, padding: '15px 0', borderRadius: 14, border: 'none',
                  background: canSubmit ? C.accent : C.border,
                  color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: submitting ? 0.7 : 1, transition: 'all 0.15s',
                }}
              >
                {submitting ? 'Wird gehostet…' : 'Event hosten 📍'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
