import { useState, useEffect, useRef } from 'react'
import { Camera, Play, MailWarning, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { COUNTRIES, countryToFlag } from '../lib/countries'
import AddressAutocomplete from '../components/common/AddressAutocomplete'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function validateUsername(val) {
  if (!val || val.trim().length < 3) return 'Mindestens 3 Zeichen'
  if (/\s/.test(val)) return 'Keine Leerzeichen erlaubt'
  if (!/^[a-zA-Z0-9_]+$/.test(val.trim())) return 'Nur Buchstaben, Zahlen und _ erlaubt'
  return null
}

// Format birthday date string (YYYY-MM-DD) → "15. März"
function formatBirthdayDisplay(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const d = new Date(2000, parseInt(month) - 1, parseInt(day))
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(58,46,36,0.15)' }}>
        <h3 style={modalTitle}>Bist du sicher?</h3>
        <p style={modalBody}>
          Dein Account und alle deine Daten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={cancelBtn}>Abbrechen</button>
          <button onClick={onConfirm} disabled={loading} style={deleteBtn}>
            {loading ? 'Lösche…' : 'Ja, löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileView() {
  const { profile, stats, loading, updateProfile, uploadAvatar, deleteAccount } = useProfile()
  const { user, resendVerificationEmail } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const [resendingVerification, setResendingVerification] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const emailNotVerified = profile && !profile.email_verified

  async function handleResendVerification() {
    setResendingVerification(true)
    try {
      await resendVerificationEmail()
      showToast('Bestätigungs-E-Mail gesendet ✓')
    } catch {
      showToast('Fehler beim Senden', 'error')
    } finally {
      setResendingVerification(false)
    }
  }

  const [form, setForm] = useState({
    full_name: '', username: '', bio: '',
    is_christian: true, gender: null,
    country: '', city: '',
    address_full: '', address_street: '', address_district: '',
    location_precision: 'city',
    latitude: null, longitude: null,
    church_name: '',
    birthday: '',
    show_birthday: true,
    show_last_active: true,
    show_on_world_map: false,
  })
  const [usernameError, setUsernameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [showLocationPrivacy, setShowLocationPrivacy] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        is_christian: profile.is_christian ?? true,
        gender: profile.gender || null,
        country: profile.country || '',
        city: profile.city || '',
        address_full: profile.address_full || '',
        address_street: profile.address_street || '',
        address_district: profile.address_district || '',
        location_precision: profile.location_precision || 'city',
        latitude: profile.latitude || null,
        longitude: profile.longitude || null,
        church_name: profile.church_name || '',
        birthday: profile.birthday ? profile.birthday.slice(0, 10) : '',
        show_birthday: profile.show_birthday ?? true,
        show_last_active: profile.show_last_active ?? true,
        show_on_world_map: profile.show_on_world_map ?? false,
      })
    }
  }, [profile])

  const isDirty = profile && (
    form.full_name !== (profile.full_name || '') ||
    form.username !== (profile.username || '') ||
    form.bio !== (profile.bio || '') ||
    form.is_christian !== (profile.is_christian ?? true) ||
    form.gender !== (profile.gender || null) ||
    form.country !== (profile.country || '') ||
    form.city !== (profile.city || '') ||
    form.address_full !== (profile.address_full || '') ||
    form.address_district !== (profile.address_district || '') ||
    form.location_precision !== (profile.location_precision || 'city') ||
    form.latitude !== (profile.latitude || null) ||
    form.longitude !== (profile.longitude || null) ||
    form.church_name !== (profile.church_name || '') ||
    form.birthday !== (profile.birthday ? profile.birthday.slice(0, 10) : '') ||
    form.show_birthday !== (profile.show_birthday ?? true) ||
    form.show_last_active !== (profile.show_last_active ?? true) ||
    form.show_on_world_map !== (profile.show_on_world_map ?? false)
  )

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'username') setUsernameError('')
  }

  async function handleSave() {
    const usernameErr = validateUsername(form.username)
    if (usernameErr) { setUsernameError(usernameErr); return }
    setSaving(true)
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim() || null,
        is_christian: form.is_christian,
        gender: form.gender,
        country: form.country || null,
        city: form.city.trim() || null,
        address_full: form.address_full || null,
        address_street: form.address_street || null,
        address_district: form.address_district || null,
        location_precision: form.location_precision,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        church_name: form.church_name.trim() || null,
        birthday: form.birthday || null,
        show_birthday: form.show_birthday,
        show_last_active: form.show_last_active,
        show_on_world_map: form.show_on_world_map,
      })
      showToast('Profil gespeichert ✓')
    } catch (err) {
      if (err.code === '23505') {
        setUsernameError('Dieser Username ist bereits vergeben')
      } else {
        showToast('Fehler beim Speichern', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
      showToast('Profilbild aktualisiert ✓')
    } catch {
      showToast('Fehler beim Hochladen', 'error')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    try {
      await deleteAccount()
    } catch {
      showToast('Fehler beim Löschen des Accounts', 'error')
      setDeletingAccount(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 80 }}>
        <div style={{ height: 240, background: 'linear-gradient(160deg, var(--color-warm-4), var(--color-paper))', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ height: 80, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 280, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    )
  }

  const countryObj = COUNTRIES.find(c => c.code === form.country)
  const flag = countryObj ? countryToFlag(countryObj.code) : ''

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">

      {/* Header */}
      <div className="bg-gradient-to-br from-warm-4 to-[var(--color-bg)] px-5 pt-4 pb-8 relative overflow-hidden shadow-sm">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-warm-3/30 pointer-events-none blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-warm-3/25 pointer-events-none blur-xl" />

        <div className="font-serif text-[13px] font-bold text-warm-1 tracking-widest mb-5 relative z-10">
          OIKOS
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-3.5">
            <div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-warm-1 flex items-center justify-center text-white font-serif text-[28px] font-bold shadow-xl shadow-warm-1/20 border-2 border-white overflow-hidden"
              style={{ position: 'relative' }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(profile?.full_name || profile?.username)
              )}
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  <Loader2 size={24} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 w-[26px] h-[26px] rounded-full bg-warm-1 border-2 border-white flex items-center justify-center cursor-pointer shadow-sm hover:scale-110 transition-transform"
            >
              <Camera size={12} color="white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <h2 className="font-serif text-[22px] font-bold text-dark mb-1 text-center tracking-tight">
            {profile?.full_name || profile?.username || '–'}
          </h2>
          <p className="font-serif text-[13px] text-dark-muted mb-1 opacity-90">
            @{profile?.username}
          </p>

          {/* Location + Church + Birthday */}
          {(profile?.city || profile?.country) && (
            <p className="font-serif text-[12px] text-dark-muted mt-1">
              {flag && <span>{flag} </span>}
              {profile.city ? `${profile.city}${profile.country && profile.city ? '' : ''}` : countryObj?.name}
              {profile.city && countryObj ? ` · ${countryObj.name}` : ''}
            </p>
          )}
          {profile?.church_name && (
            <p className="font-serif text-[12px] text-dark-muted">
              ⛪ {profile.church_name}
            </p>
          )}
          {profile?.birthday && profile?.show_birthday && (
            <p className="font-serif text-[12px] text-dark-muted">
              🎂 {formatBirthdayDisplay(profile.birthday)}
            </p>
          )}

          {profile?.bio ? (
            <p className="font-serif italic text-[14px] text-dark-muted text-center max-w-[260px] leading-relaxed mt-2">
              {profile.bio}
            </p>
          ) : (
            <p className="font-serif italic text-[13px] text-dark-muted/60 mt-1">
              „Noch keine Bio hinzugefügt"
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {emailNotVerified && (
          <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <MailWarning size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ ...serif, fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0, marginBottom: 4 }}>E-Mail noch nicht verifiziert</p>
              <p style={{ ...serif, fontSize: 12, color: '#b45309', margin: 0, marginBottom: 8, lineHeight: 1.5 }}>
                Bitte bestätige deine E-Mail-Adresse <strong>{user?.email}</strong> für mehr Sicherheit.
              </p>
              <button onClick={handleResendVerification} disabled={resendingVerification} style={{ border: 'none', background: 'none', padding: 0, ...serif, fontSize: 12, fontWeight: 700, color: 'var(--color-warm-1)', cursor: resendingVerification ? 'not-allowed' : 'pointer', opacity: resendingVerification ? 0.6 : 1, textDecoration: 'underline' }}>
                {resendingVerification ? 'Sende…' : 'Jetzt verifizieren →'}
              </button>
            </div>
          </div>
        )}

        {/* Statistiken */}
        <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, display: 'flex', marginBottom: 16, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
          {[
            { value: stats.peopleCount, label: 'Personen' },
            { value: stats.prayerCount, label: 'Gebete' },
            { value: stats.maxStage > 0 ? `${stats.maxStage}/6` : '–', label: 'Max. Stufe' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '16px 0', borderLeft: i > 0 ? '1px solid var(--color-warm-3)' : 'none' }}>
              <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: 'var(--color-warm-1)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ ...serif, fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profil bearbeiten */}
        <div style={card}>
          <h3 style={sectionTitle}>Profil bearbeiten</h3>

          <label style={lbl}>Vollständiger Name</label>
          <input type="text" value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="Dein Name" style={inp} />

          <label style={{ ...lbl, marginTop: 14 }}>Username</label>
          <input type="text" value={form.username} onChange={e => setField('username', e.target.value.toLowerCase())} placeholder="dein_username" style={{ ...inp, borderColor: usernameError ? '#C0392B' : 'var(--color-warm-3)' }} />
          {usernameError
            ? <p style={{ ...serif, fontSize: 12, color: '#C0392B', marginTop: 4, fontStyle: 'italic' }}>{usernameError}</p>
            : <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 4 }}>Wird von anderen gesucht</p>
          }

          <label style={{ ...lbl, marginTop: 14 }}>Bio</label>
          <div style={{ position: 'relative' }}>
            <textarea value={form.bio} onChange={e => setField('bio', e.target.value.slice(0, 160))} placeholder="Erzähl etwas über dich…" rows={3} style={{ ...inp, resize: 'vertical' }} />
            <span style={{ position: 'absolute', bottom: 8, right: 12, ...serif, fontSize: 11, color: form.bio.length > 140 ? 'var(--color-warm-1)' : 'var(--color-text-light)' }}>
              {form.bio.length}/160
            </span>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          {/* Geschlecht */}
          <div style={toggleRow}>
            <div>
              <span style={lbl}>Ich bin Christ/in</span>
              <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>Beeinflusst die Farbe deines Knotens auf der Map</p>
            </div>
            <button onClick={() => setField('is_christian', !form.is_christian)} style={toggleTrack(form.is_christian, 'accent')}>
              <div style={toggleThumb(form.is_christian)} />
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <span style={lbl}>Ich bin...</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[['brother', '🙋‍♂️ Bruder'], ['sister', '🙋‍♀️ Schwester']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setField('gender', form.gender === val ? null : val)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', ...serif, fontSize: 13, border: `1.5px solid ${form.gender === val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, backgroundColor: form.gender === val ? 'var(--color-warm-4)' : 'var(--color-bg)', color: form.gender === val ? 'var(--color-warm-1)' : 'var(--color-text-muted)', fontWeight: form.gender === val ? 600 : 400, transition: 'all 0.15s' }}
                >{label}</button>
              ))}
            </div>
            <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 6 }}>Wird auf deinem öffentlichen Profil angezeigt</p>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          {/* Standort */}
          <h4 style={{ ...serif, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>📍 Standort</h4>

          {(!form.address_full || editingAddress) ? (
            <AddressAutocomplete
              value={form.address_full ? { shortName: form.city || form.address_full, lat: form.latitude, lng: form.longitude } : null}
              onChange={(loc) => {
                if (!localStorage.getItem('oikos_location_privacy_seen')) setShowLocationPrivacy(true)
                setForm(f => ({
                  ...f,
                  address_full: loc.address,
                  address_street: loc.street || '',
                  address_district: loc.district || '',
                  city: loc.city || '',
                  country: loc.countryCode || '',
                  latitude: loc.lat,
                  longitude: loc.lng,
                }))
                setEditingAddress(false)
              }}
              placeholder="Adresse oder Stadt eingeben…"
              showMapPreview
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', marginBottom: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...serif, fontSize: 14, color: 'var(--color-text)', margin: 0, fontWeight: 500 }}>
                  {form.city || form.address_full.split(',')[0]}
                  {form.country ? `, ${form.country}` : ''}
                </p>
                <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {form.address_full}
                </p>
              </div>
              <button
                onClick={() => setEditingAddress(true)}
                style={{ ...serif, fontSize: 12, color: 'var(--color-warm-1)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >
                Ändern
              </button>
            </div>
          )}

          {(form.address_full || form.city) && (
            <div style={{ marginTop: 10 }}>
              <label style={lbl}>Wie genau soll dein Standort angezeigt werden?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { val: 'city', icon: '🌆', label: 'Nur Stadt' },
                  { val: 'district', icon: '🏘', label: 'Stadtteil' },
                  { val: 'exact', icon: '🏠', label: 'Exakt' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setField('location_precision', opt.val)}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${form.location_precision === opt.val ? '#4A6741' : 'var(--color-warm-3)'}`,
                      background: form.location_precision === opt.val ? '#EBE5D9' : 'var(--color-bg)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
                    <p style={{ ...serif, fontSize: 11, fontWeight: form.location_precision === opt.val ? 600 : 400, color: form.location_precision === opt.val ? '#4A6741' : 'var(--color-text-muted)', margin: 0 }}>
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          {/* Gemeinde */}
          <h4 style={{ ...serif, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>⛪ Gemeinde</h4>

          <label style={lbl}>In welcher Gemeinde bist du?</label>
          <input type="text" value={form.church_name} onChange={e => setField('church_name', e.target.value)} placeholder="z.B. Gemeinde Köln" style={inp} />
          <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 4 }}>Wird auf deinem Profil angezeigt</p>

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          {/* Geburtstag */}
          <h4 style={{ ...serif, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🎂 Geburtstag</h4>

          <label style={lbl}>Geburtstag</label>
          <input
            type="date"
            value={form.birthday}
            onChange={e => setField('birthday', e.target.value)}
            style={inp}
          />
          {form.birthday && (
            <p style={{ ...serif, fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Angezeigt wird: {formatBirthdayDisplay(form.birthday)} (Jahr wird nicht angezeigt)
            </p>
          )}

          <div style={{ ...toggleRow, marginTop: 14 }}>
            <div>
              <span style={lbl}>Geburtstag für Geschwister sichtbar</span>
              <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>Andere sehen nur Tag und Monat</p>
            </div>
            <button onClick={() => setField('show_birthday', !form.show_birthday)} style={toggleTrack(form.show_birthday, 'warm')}>
              <div style={toggleThumb(form.show_birthday)} />
            </button>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          {/* Datenschutz */}
          <h4 style={{ ...serif, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🔒 Datenschutz</h4>

          <div style={toggleRow}>
            <div>
              <span style={lbl}>Zuletzt aktiv anzeigen</span>
              <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>Andere sehen wann du zuletzt aktiv warst</p>
            </div>
            <button onClick={() => setField('show_last_active', !form.show_last_active)} style={toggleTrack(form.show_last_active, 'warm')}>
              <div style={toggleThumb(form.show_last_active)} />
            </button>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          {/* Weltkarte */}
          <h4 style={{ ...serif, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🌍 Weltkarte</h4>

          <div style={toggleRow}>
            <div>
              <span style={lbl}>Auf der Weltkarte sichtbar sein</span>
              <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>
                {form.show_on_world_map
                  ? 'Andere OIKOS-Nutzer sehen deinen ungefähren Standort auf der Weltkarte.'
                  : 'Dein Standort wird nicht auf der Weltkarte angezeigt.'}
              </p>
            </div>
            <button onClick={() => setField('show_on_world_map', !form.show_on_world_map)} style={toggleTrack(form.show_on_world_map, 'warm')}>
              <div style={toggleThumb(form.show_on_world_map)} />
            </button>
          </div>
          {form.show_on_world_map && (
            <p style={{ ...serif, fontSize: 11, color: 'var(--color-text-light)', marginTop: 8, fontStyle: 'italic' }}>
              Dein Standort wird auf ca. Stadt-Ebene angezeigt – keine genaue Adresse. Koordinaten werden automatisch aus deiner Stadt gesetzt.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20, cursor: isDirty && !saving ? 'pointer' : 'not-allowed', backgroundColor: isDirty ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-white)', ...serif, fontSize: 15, fontWeight: 600, transition: 'background-color 0.2s' }}
          >
            {saving ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </button>
        </div>

        {/* Account */}
        <div style={{ ...card, marginTop: 0 }}>
          <h3 style={sectionTitle}>Account</h3>

          <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', padding: '13px 0', borderRadius: 12, marginBottom: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', ...serif, fontSize: 15, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Ausloggen
          </button>

          <button onClick={() => window.dispatchEvent(new Event('show-tutorial'))} style={{ width: '100%', padding: '13px 0', borderRadius: 12, marginBottom: 10, backgroundColor: 'var(--color-warm-4)', border: '1.5px solid var(--color-warm-3)', ...serif, fontSize: 15, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 500 }}>
            <Play size={18} className="text-primary" />
            Tutorial erneut ansehen
          </button>

          <button onClick={() => setShowDeleteModal(true)} style={{ width: '100%', padding: '10px 0', border: 'none', background: 'none', ...serif, fontSize: 14, color: '#C0392B', cursor: 'pointer', opacity: 0.8 }}>
            Account löschen
          </button>
        </div>

      </div>

      {showDeleteModal && (
        <DeleteConfirmModal loading={deletingAccount} onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteModal(false)} />
      )}

      {showLocationPrivacy && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(44,36,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ backgroundColor: '#FBF8F3', borderRadius: 20, padding: '28px 20px', maxWidth: 360, width: '100%', boxShadow: '0 8px 32px rgba(44,36,22,0.2)' }}>
            <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 14 }}>🔒</div>
            <h3 style={{ ...serif, fontSize: 18, fontWeight: 700, color: '#2C2416', margin: '0 0 10px', textAlign: 'center' }}>
              Dein Standort bleibt privat
            </h3>
            <p style={{ ...serif, fontSize: 13, color: '#706351', lineHeight: 1.65, margin: '0 0 8px', textAlign: 'center' }}>
              Dein genauer Standort wird <strong>niemals</strong> weitergegeben.
            </p>
            <p style={{ ...serif, fontSize: 13, color: '#706351', lineHeight: 1.65, margin: '0 0 22px', textAlign: 'center' }}>
              Mit der Präzisions-Einstellung kannst du steuern, ob andere nur deine Stadt, deinen Stadtteil oder eine ungefähre Position sehen.
            </p>
            <button
              onClick={() => { localStorage.setItem('oikos_location_privacy_seen', '1'); setShowLocationPrivacy(false) }}
              style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', backgroundColor: '#4A6741', color: '#fff', ...serif, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Verstanden ✓
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const serif = { fontFamily: 'Lora, serif' }
const card = { backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '20px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }
const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block', boxSizing: 'border-box' }
const toggleRow = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }
const toggleTrack = (on, type) => ({
  width: 44, height: 25, borderRadius: 13, flexShrink: 0,
  backgroundColor: on ? (type === 'accent' ? 'var(--color-accent)' : 'var(--color-warm-1)') : 'var(--color-warm-3)',
  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
})
const toggleThumb = (on) => ({
  position: 'absolute', top: 2, left: on ? 21 : 2,
  width: 21, height: 21, borderRadius: '50%',
  backgroundColor: 'white', transition: 'left 0.2s',
})
const modalTitle = { fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }
const modalBody = { fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 24 }
const cancelBtn = { flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }
const deleteBtn = { flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
