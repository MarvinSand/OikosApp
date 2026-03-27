import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { user } = useAuth()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'dort'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px 80px',
      textAlign: 'center',
    }}>
      <h2 style={{
        fontFamily: 'Lora, Georgia, serif',
        fontSize: 28,
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: 12,
      }}>
        Willkommen, {firstName}! 👋
      </h2>
      <p style={{
        fontFamily: 'Lora, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 14,
        color: 'var(--color-text-muted)',
      }}>
        Die Oikos Map kommt in Phase 2.
      </p>
    </div>
  )
}
