import { useState, useEffect } from 'react'
import { Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useToast } from '../context/ToastContext'

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

function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(58,46,36,0.15)' }}>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
          Bist du sicher?
        </h3>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Dein Account und alle deine Daten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Lösche…' : 'Ja, löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileView() {
  const { profile, stats, loading, updateProfile, deleteAccount } = useProfile()
  const { showToast } = useToast()

  const [form, setForm] = useState({ full_name: '', username: '', bio: '', is_christian: true, gender: null })
  const [usernameError, setUsernameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        is_christian: profile.is_christian ?? true,
        gender: profile.gender || null,
      })
    }
  }, [profile])

  const isDirty = profile && (
    form.full_name !== (profile.full_name || '') ||
    form.username !== (profile.username || '') ||
    form.bio !== (profile.bio || '') ||
    form.is_christian !== (profile.is_christian ?? true) ||
    form.gender !== (profile.gender || null)
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

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 90 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, var(--color-warm-4) 0%, var(--color-paper) 100%)',
        padding: '16px 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dekorative Kreise */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', backgroundColor: 'var(--color-warm-3)', opacity: 0.3, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: '50%', backgroundColor: 'var(--color-warm-3)', opacity: 0.25, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-warm-1)', letterSpacing: 3, marginBottom: 20, position: 'relative', zIndex: 1 }}>
          OIKOS
        </div>

        {/* Avatar + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-gold), var(--color-warm-1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Lora, serif', fontSize: 28, fontWeight: 700,
              boxShadow: '0 4px 16px rgba(200, 149, 106, 0.3)',
            }}>
              {getInitials(profile?.full_name || profile?.username)}
            </div>
            <button
              onClick={() => showToast('Profilfoto hochladen kommt bald!', 'info')}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                backgroundColor: 'var(--color-warm-1)',
                border: '2px solid var(--color-paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={12} color="white" />
            </button>
          </div>

          <h2 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, textAlign: 'center' }}>
            {profile?.full_name || profile?.username || '–'}
          </h2>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: profile?.bio ? 10 : 0 }}>
            @{profile?.username}
          </p>
          {profile?.bio ? (
            <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          ) : (
            <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-light)' }}>
              „Noch keine Bio hinzugefügt"
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Statistiken */}
        <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, display: 'flex', marginBottom: 16, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
          {[
            { value: stats.peopleCount, label: 'Personen' },
            { value: stats.prayerCount, label: 'Gebete' },
            { value: stats.maxStage > 0 ? `${stats.maxStage}/6` : '–', label: 'Max. Stufe' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '16px 0', borderLeft: i > 0 ? '1px solid var(--color-warm-3)' : 'none' }}>
              <div style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: 'var(--color-warm-1)', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Profil bearbeiten */}
        <div style={card}>
          <h3 style={sectionTitle}>Profil bearbeiten</h3>

          <label style={lbl}>Vollständiger Name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => setField('full_name', e.target.value)}
            placeholder="Dein Name"
            style={inp}
          />

          <label style={{ ...lbl, marginTop: 14 }}>Username</label>
          <input
            type="text"
            value={form.username}
            onChange={e => setField('username', e.target.value.toLowerCase())}
            placeholder="dein_username"
            style={{ ...inp, borderColor: usernameError ? '#C0392B' : 'var(--color-warm-3)' }}
          />
          {usernameError ? (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#C0392B', marginTop: 4, fontStyle: 'italic' }}>{usernameError}</p>
          ) : (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', marginTop: 4 }}>Wird von anderen gesucht</p>
          )}

          <label style={{ ...lbl, marginTop: 14 }}>Bio</label>
          <div style={{ position: 'relative' }}>
            <textarea
              value={form.bio}
              onChange={e => setField('bio', e.target.value.slice(0, 160))}
              placeholder="Erzähl etwas über dich…"
              rows={3}
              style={{ ...inp, resize: 'vertical' }}
            />
            <span style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: 'Lora, serif', fontSize: 11, color: form.bio.length > 140 ? 'var(--color-warm-1)' : 'var(--color-text-light)' }}>
              {form.bio.length}/160
            </span>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '18px 0' }} />

          <div style={toggleRow}>
            <div>
              <span style={lbl}>Ich bin Christ/in</span>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>Beeinflusst die Farbe deines Knotens auf der Map</p>
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
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'Lora, serif', fontSize: 13, border: 'none',
                    border: `1.5px solid ${form.gender === val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                    backgroundColor: form.gender === val ? 'var(--color-warm-4)' : 'var(--color-bg)',
                    color: form.gender === val ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                    fontWeight: form.gender === val ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', marginTop: 6 }}>Wird auf deinem öffentlichen Profil angezeigt</p>
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20,
              cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
              backgroundColor: isDirty ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
              color: 'var(--color-white)',
              fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
              transition: 'background-color 0.2s',
            }}
          >
            {saving ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </button>
        </div>

        {/* Account */}
        <div style={{ ...card, marginTop: 0 }}>
          <h3 style={sectionTitle}>Account</h3>

          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, marginBottom: 10,
              border: '1.5px solid var(--color-warm-3)', background: 'none',
              fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            Ausloggen
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ width: '100%', padding: '10px 0', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer', opacity: 0.8 }}
          >
            Account löschen
          </button>
        </div>

      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          loading={deletingAccount}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}

const card = { backgroundColor: 'var(--color-white)', borderRadius: 16, padding: '20px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }
const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
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
