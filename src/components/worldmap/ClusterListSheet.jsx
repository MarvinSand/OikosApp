import { createPortal } from 'react-dom'
import { X, ChevronRight } from 'lucide-react'
import { useT } from '../../i18n'

const C = {
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  text: 'var(--color-text)',
  textSec: 'var(--color-text-secondary)',
  textTer: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
}

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Beschriftung + Bild je Pin-Art
function describe(item, t) {
  const d = item.data
  switch (item.type) {
    case 'activity':
      return {
        title: d.title || t('Event'),
        subtitle: t('Event'),
        emoji: d.activity_emoji || '📅',
      }
    case 'gemeinde':
      return {
        title: d.name,
        subtitle: t('Gemeinde'),
        image: d.avatar_url,
        initials: getInitials(d.name),
        square: true,
      }
    case 'oikos-person':
      return {
        title: d.name,
        subtitle: t('Aus deinem Oikos'),
        initials: getInitials(d.name),
      }
    default: {
      const name = d.full_name || d.username
      return {
        title: name,
        subtitle: d.username ? `@${d.username}` : [d.city, d.country].filter(Boolean).join(', '),
        image: d.avatar_url,
        initials: getInitials(name),
      }
    }
  }
}

export default function ClusterListSheet({ items, onClose, onSelect }) {
  const { t } = useT()

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px',
        maxHeight: '75%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>

        <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
          {t('Hier sind {n} Einträge', { n: items.length })}
        </p>
        <p style={{ fontSize: 12, color: C.textTer, margin: '0 0 14px' }}>
          {t('Sie liegen am selben Ort oder direkt nebeneinander.')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((item, i) => {
            const v = describe(item, t)
            return (
              <button
                key={`${item.type}-${item.data.id ?? i}`}
                onClick={() => onSelect(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                }}
              >
                <div style={{
                  width: 44, height: 44, flexShrink: 0, overflow: 'hidden',
                  borderRadius: v.square ? 12 : '50%',
                  background: v.image ? 'transparent' : C.accentDark,
                  border: `2px solid ${C.accent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {v.image
                    ? <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : v.emoji
                      ? <span style={{ fontSize: 22 }}>{v.emoji}</span>
                      : <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{v.initials}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                  {v.subtitle && (
                    <p style={{ fontSize: 12, color: C.textTer, margin: '2px 0 0' }}>{v.subtitle}</p>
                  )}
                </div>
                <ChevronRight size={18} color="var(--color-text-tertiary)" />
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
