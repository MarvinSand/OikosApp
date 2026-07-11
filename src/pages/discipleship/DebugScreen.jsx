import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { fetchDiscipleshipProfile, upsertDiscipleshipProfile } from '../../lib/pilgerweg'

const FIELDS = [
  {
    key: 'glaubensstand', label: 'Glaubensstand',
    options: [
      ['noch_nicht_glaeubig', 'noch nicht gläubig'],
      ['neu_im_glauben', 'neu im Glauben'],
      ['gefestigt', 'gefestigt'],
      ['reif', 'reif'],
    ],
  },
  {
    key: 'taufe', label: 'Taufe',
    options: [['ungetauft', 'ungetauft'], ['getauft', 'getauft']],
  },
  {
    key: 'evangelisation_erfahrung', label: 'Evangelisation-Erfahrung',
    options: [['keine', 'keine'], ['wenig', 'wenig'], ['erfahren', 'erfahren']],
  },
  {
    key: 'path_choice', label: 'Fork-Entscheidung',
    options: [['none', 'noch keine'], ['schmaler_weg', 'schmaler Weg']],
  },
]

const selectStyle = {
  width: '100%', padding: '11px 12px', borderRadius: 10,
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)', fontSize: 14,
}

export default function DebugScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchDiscipleshipProfile(user.id).then(p => {
      if (cancelled) return
      setProfile(p || { glaubensstand: 'noch_nicht_glaeubig', taufe: 'ungetauft', evangelisation_erfahrung: 'keine', path_choice: 'none' })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user.id])

  async function update(key, value) {
    setProfile(prev => ({ ...prev, [key]: value }))
    try {
      await upsertDiscipleshipProfile(user.id, { [key]: value })
    } catch (err) {
      showToast?.(err.message || 'Konnte nicht gespeichert werden', 'error')
    }
  }

  if (loading || !profile) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Zurück" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Debug: Profil-Tags</h1>
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginBottom: 20, lineHeight: 1.5 }}>
          Temporärer Schalter für Phase 1 – ersetzt später das Quiz. Änderungen wirken sich sofort auf den Pilgerweg aus.
        </p>
        {FIELDS.map(field => (
          <div key={field.key} style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {field.label}
            </label>
            <select style={selectStyle} value={profile[field.key]} onChange={e => update(field.key, e.target.value)}>
              {field.options.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        ))}
        <button
          onClick={() => navigate('/discipleship')}
          style={{
            width: '100%', marginTop: 8, padding: '13px 18px', borderRadius: 999, border: 'none',
            backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Zum Pilgerweg
        </button>
      </div>
    </div>
  )
}
