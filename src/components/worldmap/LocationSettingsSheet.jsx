import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import AddressAutocomplete from '../common/AddressAutocomplete'
import { useToast } from '../../context/ToastContext'

const C = {
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  text: 'var(--color-text)',
  textSec: 'var(--color-text-secondary)',
  textTer: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
  bgSec: 'var(--color-bg-secondary)',
}

const PRECISION_OPTIONS = [
  { value: 'hidden', icon: '🚫', label: 'Nicht anzeigen' },
  { value: 'city', icon: '🏙️', label: 'Nur Ort / Stadt' },
  { value: 'district', icon: '🗺️', label: 'Stadtteil' },
  { value: 'exact', icon: '📍', label: 'Genaue Adresse' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: checked ? C.accent : C.border,
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background-color 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

function PrecisionGroup({ title, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 20, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PRECISION_OPTIONS.map(opt => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${active ? C.accent : C.border}`,
                background: active ? C.bgSec : C.bg,
                fontSize: 14, textAlign: 'left',
                color: active ? C.accentDark : C.text,
                fontWeight: active ? 700 : 400,
              }}
            >
              <span>{opt.icon}</span>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {active && <span style={{ fontSize: 12, color: C.accent }}>●</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function LocationSettingsSheet({ myProfile, updateLocationSettings, updateLocationVisibility, onClose }) {
  const { showToast } = useToast()
  const [savingAddr, setSavingAddr] = useState(false)

  const showOnMap = myProfile?.show_on_world_map ?? false
  const precisionPublic = myProfile?.location_precision_public || 'city'
  const precisionFriends = myProfile?.location_precision_friends || 'exact'

  const addrValue = myProfile?.latitude != null && myProfile?.longitude != null
    ? {
        shortName: myProfile.address_full || myProfile.city || 'Mein Standort',
        lat: myProfile.latitude,
        lng: myProfile.longitude,
      }
    : null

  async function handleSelectAddress(loc) {
    if (!loc?.lat || !loc?.lng) return
    setSavingAddr(true)
    const ok = await updateLocationSettings({
      latitude: loc.lat,
      longitude: loc.lng,
      address_full: loc.address || null,
      address_street: loc.street || null,
      address_district: loc.district || null,
      city: loc.city || loc.shortName || null,
      country: loc.country || null,
    })
    setSavingAddr(false)
    showToast(ok ? 'Adresse gespeichert ✓' : 'Fehler beim Speichern', ok ? 'success' : 'error')
  }

  async function handleToggleMap() {
    const ok = await updateLocationVisibility(!showOnMap)
    showToast(ok ? (!showOnMap ? 'Auf der Weltkarte sichtbar ✓' : 'Nicht mehr auf der Weltkarte') : 'Fehler beim Speichern', ok ? 'success' : 'error')
  }

  async function handlePrecisionChange(audience, value) {
    const key = audience === 'public' ? 'location_precision_public' : 'location_precision_friends'
    const ok = await updateLocationSettings({ [key]: value })
    showToast(ok ? 'Sichtbarkeit aktualisiert ✓' : 'Fehler beim Speichern', ok ? 'success' : 'error')
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px',
        maxHeight: '85%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
          Standort-Einstellungen
        </h3>
        <p style={{ fontSize: 12, color: C.textTer, margin: '0 0 20px', lineHeight: 1.5 }}>
          Lege deine Adresse fest und bestimme, wer wie genau sieht, wo du bist.
        </p>

        {/* Adresse */}
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Deine Adresse</p>
        <AddressAutocomplete
          value={addrValue}
          onChange={handleSelectAddress}
          placeholder="Straße und Hausnummer eingeben…"
        />
        <p style={{ fontSize: 11, color: C.textTer, margin: '6px 2px 20px', lineHeight: 1.5 }}>
          {savingAddr ? 'Wird gespeichert…' : 'Wird per Google-Suche automatisch erkannt und gespeichert.'}
        </p>

        {/* Master-Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 14,
          border: `1px solid ${C.border}`, background: C.bg,
          marginBottom: 20,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Auf der Weltkarte sichtbar</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSec, lineHeight: 1.4 }}>
              Grundschalter – bei „Aus" siehst du niemanden auf der Karte und wirst selbst für niemanden angezeigt.
            </p>
          </div>
          <Toggle checked={showOnMap} onChange={handleToggleMap} />
        </div>

        {/* Präzision pro Zielgruppe */}
        <PrecisionGroup
          title="Sichtbar für alle Nutzer"
          value={precisionPublic}
          onChange={(v) => handlePrecisionChange('public', v)}
          disabled={!showOnMap}
        />
        <PrecisionGroup
          title="Sichtbar für Freunde"
          value={precisionFriends}
          onChange={(v) => handlePrecisionChange('friends', v)}
          disabled={!showOnMap}
        />

        <p style={{ fontSize: 11, color: C.textTer, margin: '4px 2px 0', lineHeight: 1.5 }}>
          Änderungen werden sofort gespeichert. Freunde können unabhängig von der öffentlichen Stufe eine genauere Ansicht bekommen.
        </p>
      </div>
    </div>,
    document.body
  )
}
