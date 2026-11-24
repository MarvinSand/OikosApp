import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, MapPin, CalendarDays, HandHeart, Megaphone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useIsAppAdmin } from '../../hooks/useIsAppAdmin'
import { useHomeHighlights } from '../../hooks/useHomeHighlights'
import { useT, getLang } from '../../i18n'
import HighlightComposerSheet from './HighlightComposerSheet'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(getLang() === 'en' ? 'en-US' : 'de-DE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const kindLabel = { fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }
const titleStyle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '0 24px 4px 0', lineHeight: 1.35 }
const textStyle = { fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }
const ctaStyle = { marginTop: 12, width: '100%', padding: '10px 0', border: 'none', borderRadius: 12, cursor: 'pointer', backgroundColor: 'var(--color-accent)', color: '#000', fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 700 }

// „Aktuelles aus OIKOS“: Updates/Infos, hervorgehobene Events und Gebete –
// gesetzt von Moderatoren. Moderatoren sehen zusätzlich „+ Hinzufügen“.
export default function HomeHighlights() {
  const { t } = useT()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isAppAdmin } = useIsAppAdmin()
  const { items, reload } = useHomeHighlights()
  const [showComposer, setShowComposer] = useState(false)

  if (!isAppAdmin && items.length === 0) return null

  async function remove(item) {
    if (!window.confirm(t('Diesen Eintrag aus „Aktuelles“ entfernen?'))) return
    const { error } = await supabase.from('home_highlights').delete().eq('id', item.id)
    if (error) { showToast(t('Fehler beim Entfernen'), 'error'); return }
    showToast(t('Eintrag entfernt'))
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          {t('Aktuelles aus OIKOS')}
        </p>
        {isAppAdmin && (
          <button
            onClick={() => setShowComposer(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 20, backgroundColor: 'var(--color-accent-light)', color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600 }}
          >
            <Plus size={13} /> {t('Hinzufügen')}
          </button>
        )}
      </div>

      {items.length === 0 && isAppAdmin && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
          {t('Noch nichts hervorgehoben. Tippe auf „Hinzufügen“, um ein Update, ein Event oder ein Gebet anzuzeigen.')}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <HighlightCard key={item.id} item={item} isAdmin={isAppAdmin} onRemove={() => remove(item)} navigate={navigate} />
        ))}
      </div>

      {showComposer && (
        <HighlightComposerSheet onClose={() => setShowComposer(false)} onCreated={() => { setShowComposer(false); reload() }} />
      )}
    </div>
  )
}

function HighlightCard({ item, isAdmin, onRemove, navigate }) {
  const { t } = useT()
  const important = item.is_important
  const base = {
    position: 'relative',
    borderRadius: 16,
    padding: '14px 16px',
    border: important ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
    backgroundColor: important ? 'var(--color-accent-light)' : 'var(--color-white)',
  }

  const removeBtn = isAdmin && (
    <button onClick={onRemove} aria-label={t('Entfernen')} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4, display: 'flex' }}>
      <X size={15} />
    </button>
  )

  if (item.kind === 'update') {
    return (
      <div style={base}>
        {removeBtn}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--color-accent-dark)' }}>
          <Megaphone size={13} />
          <span style={kindLabel}>{important ? t('Wichtig') : t('Update')}</span>
        </div>
        <p style={titleStyle}>{item.title}</p>
        {item.body && <p style={{ ...textStyle, margin: 0 }}>{item.body}</p>}
      </div>
    )
  }

  if (item.kind === 'event') {
    return (
      <div style={base}>
        {removeBtn}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--color-accent-dark)' }}>
          <CalendarDays size={13} />
          <span style={kindLabel}>{t('Event')}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, backgroundColor: 'var(--color-accent-light)', border: '1.5px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {item.emoji || '📅'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ ...titleStyle, marginBottom: 2 }}>{item.title}</p>
            {item.starts_at && <p style={{ fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-secondary)', margin: 0 }}>{fmtDate(item.starts_at)}</p>}
            {item.location_name && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {item.location_name}
              </p>
            )}
          </div>
        </div>
        {item.note && <p style={{ ...textStyle, margin: '10px 0 0' }}>{item.note}</p>}
        <button onClick={() => navigate(`/worldmap?activity=${item.activity_id}`)} style={ctaStyle}>
          {t('Auf der Weltkarte ansehen')}
        </button>
      </div>
    )
  }

  return (
    <div style={base}>
      {removeBtn}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--color-accent-dark)' }}>
        <HandHeart size={13} />
        <span style={kindLabel}>{t('Gebet im Fokus')}</span>
      </div>
      <p style={titleStyle}>{item.title}</p>
      {item.description && (
        <p style={{ ...textStyle, margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
      )}
      {item.author_name && <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>{item.author_name}</p>}
      {item.note && <p style={{ ...textStyle, margin: '8px 0 0' }}>{item.note}</p>}
      <button onClick={() => navigate(`/prayers?focus=${item.prayer_id}`)} style={ctaStyle}>
        {t('Ansehen & mitbeten')}
      </button>
    </div>
  )
}
