import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, HandHeart, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCommunities } from '../../hooks/useCommunities'
import { useToast } from '../../context/ToastContext'
import BodyPortal from '../common/BodyPortal'
import { useT } from '../../i18n'
const AddressAutocomplete = lazy(() => import('../common/AddressAutocomplete'))

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

// ─── Zugang: Öffentlich / Mit Anfrage / Privat ───────────────
function AccessPicker({ value, onChange, allowPrivate = true }) {
  const { t } = useT()
  const opts = [
    { key: 'open', label: t('Öffentlich'), hint: t('Jeder kann direkt beitreten'), Icon: Globe },
    { key: 'request', label: t('Mit Anfrage'), hint: t('Beitritt braucht Freigabe der Admins'), Icon: HandHeart },
    ...(allowPrivate ? [{ key: 'private', label: t('Privat'), hint: t('Nur per Einladungscode'), Icon: Lock }] : []),
  ]
  return (
    <div style={{ marginTop: 14 }}>
      <label style={lbl}>{t('Zugang')}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.map(o => {
          const active = value === o.key
          return (
            <button key={o.key} onClick={() => onChange(o.key)} style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '10px 13px', borderRadius: 12, cursor: 'pointer',
              border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-warm-3)',
              backgroundColor: active ? 'var(--color-warm-4)' : 'transparent',
            }}>
              <o.Icon size={18} color={active ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>{o.label}</span>
                <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>{o.hint}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Beitrittsanfrage senden (optionaler Text) ────────────────
export function RequestJoinSheet({ community, onClose, onSent }) {
  const { t } = useT()
  const { showToast } = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    setSending(true)
    const { error } = await supabase.rpc('request_to_join_community', {
      p_community_id: community.id, p_message: message.trim() || null,
    })
    setSending(false)
    if (error) { showToast(error.message || t('Fehler beim Senden'), 'error'); return }
    showToast(t('Beitrittsanfrage gesendet ✓'))
    onSent?.(community.id)
    onClose()
  }

  return (
    <BodyPortal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface rounded-t-[32px] z-50 pt-4 px-6 shadow-glass animate-[sheetSlideUp_0.3s_ease-out]" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={sheetHandle} />
        <h3 style={sheetTitleStyle}>{t('Beitritt anfragen')}</h3>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '-8px 0 14px' }}>{t('Deine Anfrage geht an die Admins von „{name}“.', { name: community.name })}</p>
        <label style={lbl}>{t('Nachricht (optional)')}</label>
        <textarea autoFocus value={message} onChange={e => setMessage(e.target.value.slice(0, 500))} rows={3} placeholder={t('Wer bist du, warum möchtest du beitreten?')} style={{ ...inp, resize: 'none' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>{t('Abbrechen')}</button>
          <button onClick={handleSend} disabled={sending} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {sending ? t('Sende…') : t('Anfrage senden')}
          </button>
        </div>
      </div>
    </BodyPortal>
  )
}

// ─── CreateCommunitySheet ────────────────────────────────────
export function CreateCommunitySheet({ onClose }) {
  const { t } = useT()
  const navigate = useNavigate()
  const { createCommunity } = useCommunities()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // Zugang: 'private' (nur Code) | 'open' (öffentlich) | 'request' (öffentlich, mit Anfrage)
  const [access, setAccess] = useState('private')
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
        is_public: isGemeinde ? true : access !== 'private',
        join_mode: access === 'private' ? 'open' : access,
        community_type: communityType,
        address: isGemeinde ? (location?.address || null) : null,
        latitude: isGemeinde ? (location?.lat ?? null) : null,
        longitude: isGemeinde ? (location?.lng ?? null) : null,
        meeting_info: isGemeinde ? (meetingInfo.trim() || null) : null,
      })
      showToast(isGemeinde ? t('Gemeinde erstellt ✓') : t('Community erstellt ✓'))
      onClose()
      navigate(`/community/${community.id}`)
    } catch (e) {
      showToast(e?.message || t('Fehler beim Erstellen'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // BodyPortal: wird auch aus dem Home-SwipePager geöffnet (transformierter
  // Track → `position: fixed` säße sonst halb außerhalb des Bildschirms).
  return (
    <BodyPortal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface rounded-t-[32px] z-50 pt-4 px-6 max-h-[90vh] overflow-y-auto shadow-glass animate-[sheetSlideUp_0.3s_ease-out]" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={sheetHandle} />
        <h3 style={sheetTitleStyle}>{isGemeinde ? t('Gemeinde erstellen') : t('Community erstellen')}</h3>

        {/* Typ-Auswahl */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {[{ key: 'group', label: t('Community') }, { key: 'gemeinde', label: t('Gemeinde/Hausgemeinde') }].map(opt => (
            <button
              key={opt.key}
              onClick={() => { setCommunityType(opt.key); setAccess(a => opt.key === 'gemeinde' ? (a === 'private' ? 'request' : a) : a) }}
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

        <label style={lbl}>{t('Name *')}</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={isGemeinde ? t('z.B. Hausgemeinde Mitte') : t('z.B. Gebetsgruppe Nord')} style={inp} />

        <label style={{ ...lbl, marginTop: 14 }}>{t('Beschreibung')}</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} placeholder={t('Worum geht es in eurer Community?')} rows={3} style={{ ...inp, resize: 'none' }} />
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', textAlign: 'right', marginTop: 2 }}>{description.length}/200</p>

        {isGemeinde ? (
          <>
            <label style={{ ...lbl, marginTop: 14 }}>{t('Standort *')}</label>
            <Suspense fallback={null}><AddressAutocomplete value={location} onChange={setLocation} placeholder={t('Adresse der Gemeinde…')} showMapPreview /></Suspense>

            <label style={{ ...lbl, marginTop: 14 }}>{t('Treffzeit (optional)')}</label>
            <input type="text" value={meetingInfo} onChange={e => setMeetingInfo(e.target.value.slice(0, 120))} placeholder={t('z.B. Wöchentlich, Mittwoch 19 Uhr')} style={inp} />

            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10 }}>{t('Gemeinden erscheinen als Pin auf der Karte, damit sie gefunden werden können.')}</p>
          </>
        ) : null}

        <AccessPicker value={access} onChange={setAccess} allowPrivate={!isGemeinde} />

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving || (isGemeinde && !location?.lat)}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 20, backgroundColor: (name.trim() && !(isGemeinde && !location?.lat)) ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: (name.trim() && !(isGemeinde && !location?.lat)) ? 'pointer' : 'not-allowed' }}
        >
          {saving ? t('Erstelle…') : isGemeinde ? t('Gemeinde erstellen') : t('Community erstellen')}
        </button>
      </div>
    </BodyPortal>
  )
}

// ─── JoinCommunityModal ──────────────────────────────────────
export function JoinCommunityModal({ onClose }) {
  const { t } = useT()
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
      showToast(t('Willkommen in {name}!', { name: community.name }))
      onClose()
      navigate(`/community/${community.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BodyPortal>
    <div style={overlay}>
      <div style={modal}>
        <h3 style={sheetTitleStyle}>{t('Community beitreten')}</h3>
        <label style={lbl}>{t('Einladungscode')}</label>
        <input autoFocus type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} placeholder={t('z.B. 550E8400')} onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ ...inp, letterSpacing: 2, textTransform: 'uppercase' }} />
        {error && <p style={{ color: '#C0392B', fontFamily: 'Lora, serif', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>{t('Abbrechen')}</button>
          <button onClick={handleJoin} disabled={!code.trim() || loading} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: code.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? t('Beitrete…') : t('Beitreten')}
          </button>
        </div>
      </div>
    </div>
    </BodyPortal>
  )
}
