import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommunities } from '../../hooks/useCommunities'
import { useToast } from '../../context/ToastContext'
import AddressAutocomplete from '../common/AddressAutocomplete'

// Community erstellen/beitreten – aus FriendsView.jsx ausgelagert, weil
// HomeCommunityTab (statisch von der eagerly geladenen Home-Seite
// importiert) diese beiden Sheets braucht. Als Teil von FriendsView.jsx
// zog das die komplette ~85 kB/2200-Zeilen-Datei (inkl. Feed, Chats,
// AddressAutocomplete/Google-Maps-Loader) in Homes kritischen Ladepfad –
// bei jedem App-Start, unabhängig vom aktiven Tab. Eigene, kleine Datei
// statt eines Re-Exports, damit der Import-Graph wirklich getrennt bleibt.

const overlay = { position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(58,46,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }
const modal = { backgroundColor: 'var(--color-white)', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(58,46,36,0.15)' }
const sheetHandle = { width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }
const sheetTitleStyle = { fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }

// ─── CreateCommunitySheet ────────────────────────────────────
export function CreateCommunitySheet({ onClose }) {
  const navigate = useNavigate()
  const { createCommunity } = useCommunities()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [communityType, setCommunityType] = useState('group')
  const [location, setLocation] = useState(null)
  const [meetingInfo, setMeetingInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const isGemeinde = communityType === 'gemeinde'

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const community = await createCommunity({
        name: name.trim(),
        description: description.trim() || null,
        is_public: isGemeinde ? true : isPublic,
        community_type: communityType,
        address: isGemeinde ? (location?.address || null) : null,
        latitude: isGemeinde ? (location?.lat ?? null) : null,
        longitude: isGemeinde ? (location?.lng ?? null) : null,
        meeting_info: isGemeinde ? (meetingInfo.trim() || null) : null,
      })
      showToast(isGemeinde ? 'Gemeinde erstellt ✓' : 'Community erstellt ✓')
      onClose()
      navigate(`/community/${community.id}`)
    } catch (e) {
      showToast(e?.message || 'Fehler beim Erstellen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-dark/40 backdrop-blur-[2px] z-40 transition-opacity" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface rounded-t-[32px] z-50 pt-4 px-6 max-h-[90vh] overflow-y-auto shadow-glass animate-[sheetSlideUp_0.3s_ease-out]" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={sheetHandle} />
        <h3 style={sheetTitleStyle}>{isGemeinde ? 'Gemeinde erstellen' : 'Community erstellen'}</h3>

        {/* Typ-Auswahl */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {[{ key: 'group', label: 'Community' }, { key: 'gemeinde', label: 'Gemeinde/Hausgemeinde' }].map(opt => (
            <button
              key={opt.key}
              onClick={() => setCommunityType(opt.key)}
              style={{
                flex: 1, padding: '9px 6px', borderRadius: 12,
                border: communityType === opt.key ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-warm-3)',
                backgroundColor: communityType === opt.key ? 'var(--color-warm-4)' : 'transparent',
                fontFamily: 'Lora, serif', fontSize: 12.5, fontWeight: 600,
                color: communityType === opt.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label style={lbl}>Name *</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={isGemeinde ? 'z.B. Hausgemeinde Mitte' : 'z.B. Gebetsgruppe Nord'} style={inp} />

        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} placeholder="Worum geht es in eurer Community?" rows={3} style={{ ...inp, resize: 'none' }} />
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', marginTop: 2 }}>{description.length}/200</p>

        {isGemeinde ? (
          <>
            <label style={{ ...lbl, marginTop: 14 }}>Standort *</label>
            <AddressAutocomplete value={location} onChange={setLocation} placeholder="Adresse der Gemeinde…" showMapPreview />

            <label style={{ ...lbl, marginTop: 14 }}>Treffzeit (optional)</label>
            <input type="text" value={meetingInfo} onChange={e => setMeetingInfo(e.target.value.slice(0, 120))} placeholder="z.B. Wöchentlich, Mittwoch 19 Uhr" style={inp} />

            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10 }}>
              Gemeinden sind immer öffentlich und erscheinen als Pin auf der Karte, damit sie gefunden werden können.
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
            <div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>Öffentlich</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Für alle sichtbar und beitrittsfähig</p>
            </div>
            <button
              onClick={() => setIsPublic(v => !v)}
              style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: isPublic ? 'var(--color-accent)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: isPublic ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving || (isGemeinde && !location?.lat)}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20, backgroundColor: (name.trim() && !(isGemeinde && !location?.lat)) ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: (name.trim() && !(isGemeinde && !location?.lat)) ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Erstelle…' : isGemeinde ? 'Gemeinde erstellen' : 'Community erstellen'}
        </button>
      </div>
    </>
  )
}

// ─── JoinCommunityModal ──────────────────────────────────────
export function JoinCommunityModal({ onClose }) {
  const { joinByCode } = useCommunities()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const community = await joinByCode(code.trim())
      showToast(`Willkommen in ${community.name}!`)
      onClose()
      navigate(`/community/${community.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={sheetTitleStyle}>Community beitreten</h3>
        <label style={lbl}>Einladungscode</label>
        <input autoFocus type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} placeholder="z.B. 550E8400" onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ ...inp, letterSpacing: 2, textTransform: 'uppercase' }} />
        {error && <p style={{ color: '#C0392B', fontFamily: 'Lora, serif', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Abbrechen</button>
          <button onClick={handleJoin} disabled={!code.trim() || loading} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: code.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Beitrete…' : 'Beitreten'}
          </button>
        </div>
      </div>
    </div>
  )
}
