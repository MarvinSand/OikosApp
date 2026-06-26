import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MailWarning, Play, User, ShieldCheck, ChevronRight,
  Moon, Globe, Navigation,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import AddressAutocomplete from '../components/common/AddressAutocomplete'

function validateUsername(val) {
  if (!val || val.trim().length < 3) return 'Mindestens 3 Zeichen'
  if (/\s/.test(val)) return 'Keine Leerzeichen erlaubt'
  if (!/^[a-zA-Z0-9_]+$/.test(val.trim())) return 'Nur Buchstaben, Zahlen und _ erlaubt'
  return null
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background-color 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 22, height: 22, borderRadius: '50%', backgroundColor: 'white',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: 'var(--color-text-secondary)', marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginTop: 4 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// Größere Toggle-Zeile mit Icon + Beschreibung (für Datenschutz/Darstellung)
function SettingToggle({ icon: Icon, title, desc, checked, onChange }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 14,
        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
        marginBottom: 10,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-accent)',
      }}>
        <Icon size={19} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// Menü-Eintrag im Einstellungs-Hub
function MenuRow({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        padding: '16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
        marginBottom: 10,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-accent)',
      }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{title}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{desc}</p>}
      </div>
      <ChevronRight size={18} color="var(--color-text-tertiary)" />
    </button>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
  fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
}

function DeleteModal({ onCancel, onConfirm, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ backgroundColor: 'var(--color-bg)', borderRadius: 14, padding: 24, maxWidth: 380, width: '100%' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>
          Bist du sicher?
        </h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
          Dein Account und alle deine Daten werden unwiderruflich gelöscht.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--color-border)', background: 'none', fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-error)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Lösche…' : 'Ja, löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsView() {
  const navigate = useNavigate()
  const { profile, updateProfile, deleteAccount, loading: profileLoading } = useProfile()
  const { user, resendVerificationEmail } = useAuth()
  const { showToast } = useToast()
  const { theme, toggleTheme } = useTheme()

  // 'hub' | 'profile' | 'privacy'
  const [section, setSection] = useState('hub')

  const [form, setForm] = useState({
    full_name: '', username: '',
    birthday: '', is_christian: null, gender: null,
    city: '', show_city: true,
    church_name: '', show_church: true,
    bio_text: '', show_bio: true,
  })
  const [usernameError, setUsernameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resending, setResending] = useState(false)

  // Datenschutz-Toggles
  const [showOnMap, setShowOnMap] = useState(false)
  const [allowLocation, setAllowLocation] = useState(true)
  const [locValue, setLocValue] = useState(null)
  const [savingLoc, setSavingLoc] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name || '',
      username: profile.username || '',
      birthday: profile.birthday || '',
      is_christian: profile.is_christian ?? null,
      gender: profile.gender || null,
      city: profile.city || '',
      show_city: profile.show_city ?? true,
      church_name: profile.church_name || '',
      show_church: profile.show_church ?? true,
      bio_text: profile.bio_text || '',
      show_bio: profile.show_bio ?? true,
    })
    setShowOnMap(profile.show_on_world_map ?? false)
    setAllowLocation(profile.allow_location ?? true)
    setLocValue(
      profile.latitude != null && profile.longitude != null
        ? { shortName: profile.city || 'Mein Standort', lat: profile.latitude, lng: profile.longitude }
        : null
    )
  }, [profile])

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'username') setUsernameError('')
  }

  async function handleSave() {
    const err = validateUsername(form.username)
    if (err) { setUsernameError(err); return }
    setSaving(true)
    try {
      await updateProfile({
        full_name: form.full_name.trim() || null,
        username: form.username.trim(),
        birthday: form.birthday || null,
        is_christian: form.is_christian,
        gender: form.gender,
        city: form.city.trim() || null,
        show_city: form.show_city,
        church_name: form.church_name.trim() || null,
        show_church: form.show_church,
        bio_text: form.bio_text.trim() || null,
        show_bio: form.show_bio,
      })
      showToast('Profil gespeichert ✓')
    } catch (e) {
      if (e.code === '23505') setUsernameError('Dieser Username ist bereits vergeben')
      else showToast('Fehler beim Speichern', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMap() {
    const next = !showOnMap
    setShowOnMap(next)
    try {
      await updateProfile({ show_on_world_map: next })
      showToast(next ? 'Auf der Weltkarte sichtbar ✓' : 'Nicht mehr auf der Weltkarte')
    } catch {
      setShowOnMap(!next)
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleToggleLocation() {
    const next = !allowLocation
    setAllowLocation(next)
    try {
      await updateProfile({ allow_location: next })
      showToast(next ? 'Standort erlaubt ✓' : 'Standort deaktiviert')
    } catch {
      setAllowLocation(!next)
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleSelectLocation(loc) {
    if (!loc?.lat || !loc?.lng) return
    setLocValue({ shortName: loc.shortName, lat: loc.lat, lng: loc.lng })
    setSavingLoc(true)
    try {
      await updateProfile({ latitude: loc.lat, longitude: loc.lng })
      showToast('Standort aktualisiert ✓')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    } finally {
      setSavingLoc(false)
    }
  }

  async function handleResendVerification() {
    setResending(true)
    try {
      await resendVerificationEmail()
      showToast('Bestätigungs-E-Mail gesendet ✓')
    } catch {
      showToast('Fehler beim Senden', 'error')
    } finally {
      setResending(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteAccount()
    } catch {
      showToast('Fehler beim Löschen', 'error')
      setDeleting(false)
      setShowDelete(false)
    }
  }

  if (profileLoading) {
    return <div style={{ padding: 24, color: 'var(--color-text-tertiary)' }}>Lade…</div>
  }

  const emailNotVerified = profile && !profile.email_verified
  const title = section === 'profile' ? 'Profil bearbeiten'
    : section === 'privacy' ? 'Ansicht & Datenschutz'
    : 'Einstellungen'

  function handleBack() {
    if (section !== 'hub') setSection('hub')
    else navigate(-1)
  }

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-2"
        style={{
          height: 52, borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)', position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        <button
          onClick={handleBack}
          aria-label="Zurück"
          style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{title}</h2>
      </header>

      {/* ─── HUB ─── */}
      {section === 'hub' && (
        <>
          {emailNotVerified && (
            <div style={{ margin: '16px 16px 0', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MailWarning size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-secondary)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                  E-Mail noch nicht verifiziert
                </p>
                <p style={{ fontSize: 12, margin: '4px 0 8px', color: 'var(--color-text-secondary)' }}>
                  Bitte bestätige <strong>{user?.email}</strong>.
                </p>
                <button onClick={handleResendVerification} disabled={resending} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', cursor: 'pointer' }}>
                  {resending ? 'Sende…' : 'Jetzt verifizieren →'}
                </button>
              </div>
            </div>
          )}

          <div style={{ padding: '20px 16px' }}>
            <MenuRow
              icon={User}
              title="Profil bearbeiten"
              onClick={() => setSection('profile')}
            />
            <MenuRow
              icon={ShieldCheck}
              title="Ansicht & Datenschutz"
              onClick={() => setSection('privacy')}
            />
          </div>

          {/* Account */}
          <div style={{ padding: '0 16px 32px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>
              Account
            </h3>
            <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--color-border)', background: 'none', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer', marginBottom: 10 }}>
              Ausloggen
            </button>
            <button onClick={() => window.dispatchEvent(new Event('show-tutorial'))} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--color-border)', background: 'none', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Play size={16} /> Tutorial erneut ansehen
            </button>
            <button onClick={() => setShowDelete(true)} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: 'none', fontSize: 14, color: 'var(--color-error)', cursor: 'pointer' }}>
              Account löschen
            </button>
          </div>
        </>
      )}

      {/* ─── PROFIL BEARBEITEN ─── */}
      {section === 'profile' && (
        <div style={{ padding: '20px 16px' }}>

          {/* ── Basis ── */}
          <FieldRow label="Name">
            <input type="text" value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="Dein Name" style={inputStyle} />
          </FieldRow>

          <FieldRow label="Username">
            <input
              type="text"
              value={form.username}
              onChange={e => setField('username', e.target.value.toLowerCase())}
              placeholder="dein_username"
              style={{ ...inputStyle, borderColor: usernameError ? 'var(--color-error)' : 'var(--color-border)' }}
            />
            {usernameError && <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 4 }}>{usernameError}</p>}
          </FieldRow>

          {/* ── Optionale Infos ── */}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 16px' }}>
            Optionale Infos
          </h3>

          <FieldRow label="Geburtstag">
            <input
              type="date"
              value={form.birthday}
              onChange={e => setField('birthday', e.target.value)}
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="Ich bin Christ/in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Ich bin Christ/in</span>
              <Toggle checked={form.is_christian === true} onChange={() => setField('is_christian', form.is_christian === true ? null : true)} />
            </div>
          </FieldRow>

          <FieldRow label="Ich bin…">
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ key: 'brother', label: '🧑 Bruder' }, { key: 'sister', label: '👧 Schwester' }].map(opt => {
                const active = form.gender === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setField('gender', active ? null : opt.key)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: active ? 'var(--color-accent-light)' : 'var(--color-bg)',
                      fontSize: 14, fontWeight: active ? 700 : 500,
                      color: active ? 'var(--color-accent-dark)' : 'var(--color-text)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </FieldRow>

          {/* ── Öffentliches Profil ── */}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 16px' }}>
            Öffentliches Profil
          </h3>

          <FieldRow label="Wohnort">
            <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="z. B. München" style={inputStyle} />
            <ToggleRow label="Öffentlich anzeigen" checked={form.show_city} onChange={() => setField('show_city', !form.show_city)} />
          </FieldRow>

          <FieldRow label="Gemeinde">
            <input type="text" value={form.church_name} onChange={e => setField('church_name', e.target.value)} placeholder="z. B. Gemeinde Köln" style={inputStyle} />
            <ToggleRow label="Öffentlich anzeigen" checked={form.show_church} onChange={() => setField('show_church', !form.show_church)} />
          </FieldRow>

          <FieldRow label="Über mich">
            <textarea
              value={form.bio_text}
              onChange={e => setField('bio_text', e.target.value.slice(0, 150))}
              placeholder="Erzähl etwas über dich…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, textAlign: 'right' }}>
              {form.bio_text.length}/150
            </p>
            <ToggleRow label="Öffentlich anzeigen" checked={form.show_bio} onChange={() => setField('show_bio', !form.show_bio)} />
          </FieldRow>

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', marginTop: 8, backgroundColor: 'var(--color-accent)', color: 'white', fontSize: 15, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </button>
        </div>
      )}

      {/* ─── ANSICHT & DATENSCHUTZ ─── */}
      {section === 'privacy' && (
        <div style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Weltkarte & Standort
          </h3>
          <SettingToggle
            icon={Globe}
            title="Auf der Weltkarte sichtbar"
            checked={showOnMap}
            onChange={handleToggleMap}
          />

          {/* Standort-Adresse für die Weltkarte */}
          <div style={{ padding: '12px 4px 4px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
              Mein Standort auf der Weltkarte
            </label>
            <AddressAutocomplete
              value={locValue}
              onChange={handleSelectLocation}
              placeholder="Adresse oder Ort suchen…"
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 2px 0', lineHeight: 1.5 }}>
              {locValue
                ? (savingLoc ? 'Wird gespeichert…' : 'Dieser Ort wird anderen auf der Weltkarte angezeigt, wenn „Auf der Weltkarte sichtbar" aktiv ist.')
                : 'Lege fest, wo du auf der Weltkarte erscheinst.'}
            </p>
          </div>

          <SettingToggle
            icon={Navigation}
            title="Standort erlauben"
            checked={allowLocation}
            onChange={handleToggleLocation}
          />

          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '24px 0 12px' }}>
            Darstellung
          </h3>
          <SettingToggle
            icon={Moon}
            title="Dark Mode"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
        </div>
      )}

      {showDelete && (
        <DeleteModal loading={deleting} onCancel={() => setShowDelete(false)} onConfirm={handleDelete} />
      )}
    </div>
  )
}
