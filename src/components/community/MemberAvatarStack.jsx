import { getInitials } from '../../lib/communityTheme'

// Überlappende Mitglieder-Avatare (echte avatar_url oder Initialen-Fallback) + „+N".
// members: [{ avatar_url, full_name }] · count: Gesamtzahl Mitglieder.
export default function MemberAvatarStack({ members = [], count = 0, size = 26, max = 4, onLight = false }) {
  const shown = members.slice(0, max)
  const extra = Math.max(0, count - shown.length)
  const ring = onLight ? '#fff' : 'var(--color-white)'

  if (shown.length === 0 && count === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((m, i) => (
        <div
          key={i}
          style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            marginLeft: i === 0 ? 0 : -size * 0.32,
            border: `2px solid ${ring}`, overflow: 'hidden',
            backgroundColor: 'var(--color-warm-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: size * 0.4, fontWeight: 700,
            zIndex: max - i,
          }}
        >
          {m?.avatar_url
            ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : getInitials(m?.full_name)}
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            height: size, minWidth: size, padding: '0 7px', borderRadius: size / 2, flexShrink: 0,
            marginLeft: shown.length ? -size * 0.32 : 0,
            border: `2px solid ${ring}`,
            backgroundColor: 'var(--color-bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-secondary)', fontFamily: 'Lora, serif', fontSize: size * 0.38, fontWeight: 700,
            zIndex: 0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
