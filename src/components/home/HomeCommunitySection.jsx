import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight, Plus } from 'lucide-react'
import { useCommunities } from '../../hooks/useCommunities'

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Macht den Community-Bereich auf Home sichtbar.
export default function HomeCommunitySection() {
  const navigate = useNavigate()
  const { myCommunities, loading } = useCommunities()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          Deine Community
        </p>
        <button onClick={() => navigate('/friends?tab=communities')} style={{ display: 'flex', alignItems: 'center', gap: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-warm-1)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600 }}>
          Alle ansehen <ChevronRight size={14} />
        </button>
      </div>

      {loading && (
        <div style={{ height: 72, borderRadius: 14, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      )}

      {!loading && myCommunities.length === 0 && (
        <button
          onClick={() => navigate('/friends?tab=communities')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
            borderRadius: 14, border: '2px dashed var(--color-warm-3)', background: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>
              Community beitreten
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
              Finde Geschwister und betet gemeinsam
            </p>
          </div>
          <Plus size={18} color="var(--color-warm-1)" />
        </button>
      )}

      {!loading && myCommunities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myCommunities.slice(0, 3).map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/community/${c.id}`)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 14, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)',
                cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 6px rgba(58,46,36,0.05)',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700 }}>
                {getInitials(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                  {c.memberCount} {c.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                </p>
              </div>
              <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
