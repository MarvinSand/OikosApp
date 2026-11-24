import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, Megaphone, CalendarDays, HandHeart, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useT, getLang } from '../../i18n'
import { isRecurring, nextOccurrence } from '../../lib/recurrence'

// Kleines Moderator-Fenster für den Aktuelles-Tab: „Was möchte ich anzeigen?“
// → Update/Info, Weltkarten-Event hervorheben oder Gebet hervorheben.

const EXPIRY = [
  { key: '1', days: 1, label: '1 Tag' },
  { key: '3', days: 3, label: '3 Tage' },
  { key: '7', days: 7, label: '7 Tage' },
  { key: '30', days: 30, label: '30 Tage' },
  { key: '0', days: 0, label: 'Dauerhaft' },
]

function expiresAtFor(key) {
  const opt = EXPIRY.find(e => e.key === key)
  if (!opt || !opt.days) return null
  return new Date(Date.now() + opt.days * 86400000).toISOString()
}

const fieldStyle = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', margin: '14px 0 6px' }

export default function HighlightComposerSheet({ onClose, onCreated, preset = null }) {
  const { t } = useT()
  const { user } = useAuth()
  const { showToast } = useToast()
  // choose | update | event | prayer | post | community_post (mit preset direkt der Zielschritt)
  const [step, setStep] = useState(preset?.kind || 'choose')
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [important, setImportant] = useState(false)
  const [expiry, setExpiry] = useState('7')
  const [options, setOptions] = useState(null) // Events / Gebete zur Auswahl
  const [selected, setSelected] = useState(preset?.refId || null)

  // Auswahl-Listen laden, sobald der Schritt gewählt ist
  useEffect(() => {
    if (preset || (step !== 'event' && step !== 'prayer')) return
    let cancelled = false
    setOptions(null)
    setSelected(null)
    ;(async () => {
      let rows = []
      if (step === 'event') {
        const { data } = await supabase
          .from('world_map_activities')
          .select('id, title, activity_emoji, location_name, starts_at, recurrence_freq, recurrence_interval, recurrence_weekdays, recurrence_end_date, recurrence_dates')
          .eq('is_public', true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('starts_at', { ascending: true, nullsFirst: false })
          .limit(40)
        rows = (data || [])
          // beendete Serien weglassen, bei Serien den nächsten Termin zeigen
          .filter(a => !isRecurring(a) || nextOccurrence(a))
          .map(a => {
            const when = isRecurring(a) ? nextOccurrence(a) : (a.starts_at ? new Date(a.starts_at) : null)
            return {
              id: a.id, emoji: a.activity_emoji || '📅', title: a.title,
              sub: [when ? when.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'de-DE', { day: 'numeric', month: 'short' }) : null, a.location_name].filter(Boolean).join(' · '),
            }
          })
      } else {
        const { data } = await supabase
          .from('personal_prayer_requests')
          .select('id, title, created_at, profiles!owner_id(full_name, username)')
          .eq('visibility', 'public')
          .is('moderation_hidden_at', null)
          .order('created_at', { ascending: false })
          .limit(40)
        rows = (data || []).map(p => ({
          id: p.id, emoji: '🙏', title: p.title,
          sub: p.profiles?.full_name || p.profiles?.username || '',
        }))
      }
      if (!cancelled) setOptions(rows)
    })()
    return () => { cancelled = true }
  }, [step])

  const canSave = step === 'update' ? title.trim().length > 0 : !!selected

  async function save() {
    if (!canSave || saving) return
    setSaving(true)
    const row = {
      kind: step,
      body: body.trim() || null,
      is_important: step === 'update' && important,
      expires_at: expiresAtFor(expiry),
      created_by: user.id,
    }
    if (step === 'update') row.title = title.trim()
    if (step === 'event') row.activity_id = selected
    if (step === 'prayer') row.prayer_id = selected
    if (step === 'post') row.post_id = selected
    if (step === 'community_post') row.community_post_id = selected
    const { error } = await supabase.from('home_highlights').insert(row)
    setSaving(false)
    if (error) {
      console.error('[HighlightComposer]', error)
      showToast(t('Fehler beim Speichern'), 'error')
      return
    }
    showToast(t('In „Aktuelles“ angezeigt ✓'))
    onCreated?.()
  }

  const choices = [
    { key: 'update', icon: Megaphone, label: 'Update / wichtige Info', hint: 'Eigener Text für alle' },
    { key: 'event', icon: CalendarDays, label: 'Event hervorheben', hint: 'Ein Event von der Weltkarte' },
    { key: 'prayer', icon: HandHeart, label: 'Gebet hervorheben', hint: 'Ein öffentliches Gebetsanliegen' },
  ]

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: 'var(--color-bg)',
        borderRadius: '20px 20px 0 0', padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '88%', overflowY: 'auto', animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {step !== 'choose' && !preset && (
            <button onClick={() => setStep('choose')} aria-label={t('Zurück')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2, display: 'flex' }}>
              <ChevronLeft size={20} />
            </button>
          )}
          <h3 style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {step === 'choose' ? t('Was möchtest du anzeigen?') : preset ? t('In „Aktuelles“ anzeigen') : t(choices.find(c => c.key === step).label)}
          </h3>
          <button onClick={onClose} aria-label={t('Schließen')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {choices.map(c => (
              <button
                key={c.key}
                onClick={() => setStep(c.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--color-border)', background: 'var(--color-white)', cursor: 'pointer' }}
              >
                <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent-dark)' }}>
                  <c.icon size={20} />
                </span>
                <span>
                  <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t(c.label)}</span>
                  <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{t(c.hint)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 'update' && (
          <>
            <label style={{ ...labelStyle, marginTop: 0 }}>{t('Titel')}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder={t('z. B. Neues Update ist da')} style={fieldStyle} />
            <label style={labelStyle}>{t('Text (optional)')}</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={2000} style={{ ...fieldStyle, resize: 'vertical' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)' }}>
              <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--color-accent)' }} />
              {t('Als wichtig markieren (steht ganz oben, farbig)')}
            </label>
          </>
        )}

        {preset && (
          <>
            <div style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--color-accent)', background: 'var(--color-accent-light)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {preset.label}
            </div>
            <label style={labelStyle}>{t('Hinweis dazu (optional)')}</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} maxLength={500} style={{ ...fieldStyle, resize: 'vertical' }} />
          </>
        )}

        {!preset && (step === 'event' || step === 'prayer') && (
          <>
            {options === null && <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>{t('Lädt…')}</p>}
            {options && options.length === 0 && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {step === 'event' ? t('Keine öffentlichen Events gefunden.') : t('Keine öffentlichen Gebete gefunden.')}
              </p>
            )}
            {options && options.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {options.map(o => {
                  const active = selected === o.id
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelected(o.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: active ? 'var(--color-accent-light)' : 'var(--color-white)',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{o.emoji}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                        {o.sub && <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.sub}</span>}
                      </span>
                      {active && <Check size={16} color="var(--color-accent-dark)" />}
                    </button>
                  )
                })}
              </div>
            )}
            <label style={labelStyle}>{t('Hinweis dazu (optional)')}</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} maxLength={500} style={{ ...fieldStyle, resize: 'vertical' }} />
          </>
        )}

        {step !== 'choose' && (
          <>
            <label style={labelStyle}>{t('Wie lange anzeigen?')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXPIRY.map(e => (
                <button
                  key={e.key}
                  onClick={() => setExpiry(e.key)}
                  style={{
                    padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: expiry === e.key ? 700 : 500,
                    border: `1.5px solid ${expiry === e.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: expiry === e.key ? 'var(--color-accent-light)' : 'var(--color-white)',
                    color: 'var(--color-text)',
                  }}
                >
                  {t(e.label)}
                </button>
              ))}
            </div>
            <button
              onClick={save}
              disabled={!canSave || saving}
              style={{
                width: '100%', marginTop: 20, padding: '14px 0', border: 'none', borderRadius: 14,
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                backgroundColor: canSave ? 'var(--color-accent)' : 'var(--color-border)',
                color: canSave ? '#000' : 'var(--color-text-muted)',
                fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
              }}
            >
              {saving ? t('Speichere…') : t('In „Aktuelles“ anzeigen')}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
