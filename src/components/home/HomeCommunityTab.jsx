import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight, Plus, Globe, ArrowRight, Hash } from 'lucide-react'
import { useCommunities } from '../../hooks/useCommunities'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const sectionLabel = {
  fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px',
}

// Community-Tab auf Home: eigene Communities, öffentliche zum Beitreten,
// und ein Sprung zum Geschwister-Tab.
export default function HomeCommunityTab() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { myCommunities, loading } = useCommunities()
  const [publicCommunities, setPublicCommunities] = useState([])
  const [loadingPublic, setLoadingPublic] = useState(true)
  const [joining, setJoining] = useState(null)

  useEffect(() => {
    loadPublic()
  }, [myCommunities]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPublic() {
    setLoadingPublic(true)
    const myIds = myCommunities.map(c => c.id)
    const { data } = await supabase
      .from('communities')
      .select('id, name, description')
      .eq('is_public', true)
      .limit(20)
    setPublicCommunities((data || []).filter(c => !myIds.includes(c.id)).slice(0, 6))
    setLoadingPublic(false)
  }

  async function handleJoin(communityId, communityName) {
    setJoining(communityId)
    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: user.id, role: 'member' })
    setJoining(null)
    if (!error) {
      showToast(`Willkommen in ${communityName}!`)
      navigate(`/community/${communityId}`)
    } else {
      showToast('Fehler beim Beitreten', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Zu den Geschwistern */}
      <button
        onClick={() => navigate('/friends?tab=friends')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
          borderRadius: 16, border: '1px solid var(--color-accent)', cursor: 'pointer', textAlign: 'left',
          background: 'linear-gradient(135deg, var(--color-accent-light) 0%, var(--color-bg) 90%)',
          boxShadow: '0 4px 14px rgba(58,46,36,0.06)',
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={22} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>
            Geschwister finden
          </p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Vernetze dich mit anderen Christen & chatte
          </p>
        </div>
        <ArrowRight size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
      </button>

      {/* Meine Communities */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={sectionLabel}>Meine Communities</p>
          <button onClick={() => navigate('/friends?tab=communities')} style={{ display: 'flex', alignItems: 'center', gap: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600 }}>
            Alle ansehen <ChevronRight size={14} />
          </button>
        </div>

        {loading && (
          <div style={{ height: 72, borderRadius: 14, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loading && myCommunities.length === 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/friends?tab=communities')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={15} /> Erstellen
            </button>
            <button
              onClick={() => navigate('/friends?tab=communities')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'none', color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Hash size={15} /> Per Code
            </button>
          </div>
        )}

        {!loading && myCommunities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myCommunities.slice(0, 4).map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/community/${c.id}`)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-white)',
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

      {/* Öffentliche Communities */}
      <div>
        <p style={sectionLabel}>
          <Globe size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Öffentliche Communities
        </p>

        {loadingPublic && (
          <div style={{ height: 64, borderRadius: 14, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loadingPublic && publicCommunities.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0', margin: 0 }}>
            Aktuell keine öffentlichen Communities verfügbar.
          </p>
        )}

        {!loadingPublic && publicCommunities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {publicCommunities.map(c => (
              <div
                key={c.id}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-white)',
                  boxShadow: '0 1px 6px rgba(58,46,36,0.05)',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-secondary)', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700 }}>
                  {getInitials(c.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </p>
                  {c.description && (
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleJoin(c.id, c.name)}
                  disabled={joining === c.id}
                  style={{
                    padding: '8px 14px', borderRadius: 10, flexShrink: 0,
                    border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
                    fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700,
                    cursor: joining === c.id ? 'default' : 'pointer', opacity: joining === c.id ? 0.6 : 1,
                  }}
                >
                  {joining === c.id ? '…' : 'Beitreten'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
