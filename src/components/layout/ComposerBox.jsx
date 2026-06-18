import { useAuth } from '../../hooks/useAuth'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

/**
 * Twitter-style compose entry point. Shows the user's avatar next to a
 * placeholder "input" that, when clicked, opens the real compose sheet.
 */
export default function ComposerBox({ placeholder = 'Was möchtest du teilen?', avatarUrl, onClick }) {
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email || '?'
  const initials = getInitials(name)

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          flexShrink: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          border: '1px solid var(--color-border)',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </div>
      <span style={{ flex: 1, fontSize: 15, color: 'var(--color-text-tertiary)' }}>
        {placeholder}
      </span>
    </button>
  )
}
