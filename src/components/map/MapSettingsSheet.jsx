import { useState } from 'react'
import { X, Trash2, Check } from 'lucide-react'
import { useFriendships } from '../../hooks/useFriendships'
import { useCommunities } from '../../hooks/useCommunities'
import { useToast } from '../../context/ToastContext'
import { useT } from '../../i18n'
import { MapBackgroundControls, isDark } from './MapBackgroundSheet'

const VISIBILITY_OPTIONS = [
  { value: 'private',          icon: '🔒', label: 'Nur ich' },
  { value: 'all_siblings',     icon: '👥', label: 'Alle meine Geschwister' },
  { value: 'specific_include', icon: '✅', label: 'Nur bestimmte Geschwister' },
  { value: 'specific_exclude', icon: '🚫', label: 'Alle außer...' },
  { value: 'community',        icon: '🏘', label: 'Nur eine Community' },
]

// Mitte der Map: Name (statt Nutzername) und Farbe – wird sofort gespeichert
const CENTER_SWATCHES = [
  '#000000', '#2B3A4F', '#3A5F8A', '#5AC8FA', '#34A853',
  '#F5A623', '#E8574B', '#E8618C', '#9B59B6', '#FFFFFF',
]

function CenterControls({ map, updateMap }) {
  const { t } = useT()
  const { showToast } = useToast()
  const [centerName, setCenterName] = useState(map.center_name || '')

  async function save(updates) {
    try { await updateMap(map.id, updates) } catch { showToast(t('Fehler beim Speichern'), 'error') }
  }
  function commitName() {
    const next = centerName.trim() || null
    if (next !== (map.center_name || null)) save({ center_name: next })
  }
  const hasCustom = !!(map.center_name || map.center_color)

  return (
    <div>
      <label style={lbl}>{t('Name in der Mitte')}</label>
      <input
        type="text"
        value={centerName}
        maxLength={40}
        onChange={e => setCenterName(e.target.value)}
        onBlur={commitName}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        placeholder={t('Standard: dein Name')}
        style={inp}
      />
      <label style={{ ...lbl, marginTop: 14 }}>{t('Farbe der Mitte')}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {CENTER_SWATCHES.map(c => {
          const active = map.center_color?.toLowerCase() === c.toLowerCase()
          return (
            <button
              key={c}
              onClick={() => save({ center_color: c })}
              aria-label={c}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', padding: 0, backgroundColor: c,
                border: active ? '3px solid var(--color-accent)' : '1.5px solid rgba(128,128,128,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {active && <Check size={16} color={isDark(c) ? '#fff' : '#111'} />}
            </button>
          )
        })}
        <label
          style={{
            width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', position: 'relative',
            border: '1.5px solid rgba(128,128,128,0.4)',
            background: 'conic-gradient(#f66, #fc6, #6f6, #6cf, #96f, #f6c, #f66)',
          }}
          title={t('Eigene Farbe')}
        >
          <input
            type="color"
            value={map.center_color || '#000000'}
            onChange={e => save({ center_color: e.target.value.toUpperCase() })}
            style={{ position: 'absolute', inset: -8, width: 60, height: 60, opacity: 0, cursor: 'pointer' }}
          />
        </label>
      </div>
      {hasCustom && (
        <button
          onClick={() => { setCenterName(''); save({ center_name: null, center_color: null }) }}
          style={{ border: '1.5px solid var(--color-warm-3)', background: 'none', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', color: 'var(--color-text-muted)', fontFamily: 'Lora, serif', fontSize: 13 }}
        >
          {t('Auf Standard zurücksetzen')}
        </button>
      )}
    </div>
  )
}

export default function MapSettingsSheet({ map, updateMap, deleteMap, onClose }) {
  const { t } = useT()
  const { showToast } = useToast()
  const { friends } = useFriendships()
  const { myCommunities } = useCommunities()

  const [name, setName] = useState(map.name || '')
  const [visibility, setVisibility] = useState(map.visibility || 'private')
  const [selectedIds, setSelectedIds] = useState(map.visibility_user_ids || [])
  const [communityId, setCommunityId] = useState(map.visibility_community_id || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function toggleId(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateMap(map.id, {
        name: name.trim(),
        visibility,
        visibility_user_ids: ['specific_include', 'specific_exclude'].includes(visibility) ? selectedIds : [],
        visibility_community_id: visibility === 'community' ? (communityId || null) : null,
      })
      showToast(t('Einstellungen gespeichert ✓'))
      onClose()
    } catch {
      showToast(t('Fehler beim Speichern'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteMap) return
    setDeleting(true)
    try {
      await deleteMap(map.id)
      showToast(t('Map gelöscht'))
      onClose()
    } catch {
      showToast(t('Fehler beim Löschen'), 'error')
      setDeleting(false)
    }
  }

  const showFriendsList = visibility === 'specific_include' || visibility === 'specific_exclude'
  const showCommunityPicker = visibility === 'community'
  const isDirty = name.trim() !== (map.name || '').trim()
    || visibility !== (map.visibility || 'private')
    || JSON.stringify(selectedIds.sort()) !== JSON.stringify((map.visibility_user_ids || []).sort())
    || communityId !== (map.visibility_community_id || '')

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px 16px',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
            {t('Map-Einstellungen')}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <p style={sectionLabel}>{t('Allgemein')}</p>
        <label style={lbl}>{t('Map-Name')}</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inp}
        />

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '20px 0' }} />

        {/* Sichtbarkeit */}
        <p style={sectionLabel}>{t('Sichtbarkeit')}</p>
        <label style={lbl}>{t('Wer kann diese Map sehen?')}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {VISIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: visibility === opt.value ? 'var(--color-warm-4)' : 'var(--color-bg)',
                fontFamily: 'Lora, serif', fontSize: 14, textAlign: 'left',
                color: visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-text)',
                fontWeight: visibility === opt.value ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span>{opt.icon}</span>
              <span style={{ flex: 1 }}>{t(opt.label)}</span>
              {visibility === opt.value && <span style={{ fontSize: 12 }}>●</span>}
            </button>
          ))}
        </div>

        {/* Geschwister-Liste */}
        {showFriendsList && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...lbl, marginBottom: 8 }}>
              {visibility === 'specific_include' ? t('Sichtbar für:') : t('Ausgenommen:')}
            </label>
            {friends.length === 0 ? (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {t('Noch keine verbundenen Geschwister.')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {friends.map(f => {
                  const uid = f.otherUser?.id
                  const checked = selectedIds.includes(uid)
                  return (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(uid)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-warm-1)', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', flex: 1 }}>
                        {f.otherUser?.full_name || f.otherUser?.username}
                      </span>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        @{f.otherUser?.username}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Community-Auswahl */}
        {showCommunityPicker && (
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>{t('Community auswählen')}</label>
            {myCommunities.length === 0 ? (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {t('Du bist noch in keiner Community.')}
              </p>
            ) : (
              <select
                value={communityId}
                onChange={e => setCommunityId(e.target.value)}
                style={{ ...inp, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23888\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="">{t('— Auswählen —')}</option>
                {myCommunities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving || !isDirty}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 8,
            cursor: (!name.trim() || saving || !isDirty) ? 'not-allowed' : 'pointer',
            backgroundColor: isDirty && name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
            color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
          }}
        >
          {saving ? t('Speichere…') : t('Speichern')}
        </button>

        {/* Mitte (wird sofort gespeichert, unabhängig vom Speichern-Knopf) */}
        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '24px 0 16px' }} />
        <p style={sectionLabel}>{t('Mitte der Map')}</p>
        <CenterControls map={map} updateMap={updateMap} />

        {/* Hintergrund (wird sofort gespeichert, unabhängig vom Speichern-Knopf) */}
        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '24px 0 16px' }} />
        <p style={sectionLabel}>{t('Hintergrund')}</p>
        <MapBackgroundControls map={map} updateMap={updateMap} />

        {/* Danger Zone – Map löschen */}
        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', margin: '24px 0 16px' }} />
        <p style={{ ...sectionLabel, color: '#C0392B', marginBottom: 10 }}>{t('Gefahrenzone')}</p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8C0B8',
              background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14,
              color: '#C0392B', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Trash2 size={15} /> {t('Map löschen')}
          </button>
        ) : (
          <div style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #FECACA' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#991B1B', fontWeight: 600, marginBottom: 4 }}>
              {t('Map wirklich löschen?')}
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#B91C1C', marginBottom: 14, lineHeight: 1.5 }}>
              {t('Alle Personen, Verbindungen und Gebetsanliegen auf dieser Map werden unwiderruflich gelöscht.')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #FECACA', background: 'white', fontFamily: 'Lora, serif', fontSize: 13, color: '#991B1B', cursor: 'pointer' }}
              >
                {t('Abbrechen')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: '#DC2626', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? t('Lösche…') : t('Ja, endgültig löschen')}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>
    </>
  )
}

const sectionLabel = { fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
