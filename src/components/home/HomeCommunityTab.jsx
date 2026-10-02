import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Compass, Hash } from 'lucide-react'
import { useCommunities } from '../../hooks/useCommunities'
import { useCommunityMembersPreview } from '../../hooks/useCommunityMembersPreview'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import CommunityCard from '../community/CommunityCard'
import PeopleYouMayKnow from './PeopleYouMayKnow'

// Lazy: CreateCommunitySheet zieht AddressAutocomplete (Google-Maps-Loader)
// mit – soll erst laden, wenn der Nutzer tatsächlich "Erstellen" tippt.
const CreateCommunitySheet = lazy(() => import('../community/CommunitySheets').then(m => ({ default: m.CreateCommunitySheet })))
const JoinCommunityModal = lazy(() => import('../community/CommunitySheets').then(m => ({ default: m.JoinCommunityModal })))

const sectionLabel = {
  fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0,
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
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const previews = useCommunityMembersPreview([
    ...myCommunities.map(c => c.id),
    ...publicCommunities.map(c => c.id),
  ])

  useEffect(() => {
    loadPublic()
  }, [myCommunities]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPublic() {
    setLoadingPublic(true)
    const myIds = myCommunities.map(c => c.id)
    const { data } = await supabase
      .from('communities')
      .select('id, name, description, is_public')
      .eq('is_public', true)
      .limit(20)
    setPublicCommunities((data || []).filter(c => !myIds.includes(c.id)).slice(0, 6))
    setLoadingPublic(false)
  }

  async function handleJoin(community) {
    setJoining(community.id)
    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: community.id, user_id: user.id, role: 'member' })
    setJoining(null)
    if (!error) {
      showToast(`Willkommen in ${community.name}!`)
      navigate(`/community/${community.id}`)
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
          display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
          backgroundColor: 'var(--color-accent)', color: '#fff',
          fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(58,46,36,0.1)',
        }}
      >
        <Users size={17} /> Geschwister
      </button>

      {/* Neue Geschwister, die man vielleicht kennt */}
      <PeopleYouMayKnow />

      {/* Erstellen / Beitreten */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={15} /> Erstellen
        </button>
        <button
          onClick={() => setShowJoin(true)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <Hash size={15} /> Beitreten
        </button>
      </div>

      {/* Meine Communities */}
      <div>
        <p style={{ ...sectionLabel, marginBottom: 12 }}>Meine Communities</p>

        {loading && (
          <div style={{ height: 150, borderRadius: 18, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loading && myCommunities.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0 4px', margin: 0 }}>
            Du bist noch in keiner Community – erstelle eine oder tritt per Code bei.
          </p>
        )}

        {!loading && myCommunities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myCommunities.map(c => (
              <CommunityCard
                key={c.id}
                community={c}
                members={previews[c.id] || []}
                variant="member"
                onOpen={() => navigate(`/community/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Entdecken */}
      <div>
        <p style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
          <Compass size={12} /> Entdecken
        </p>

        {loadingPublic && (
          <div style={{ height: 150, borderRadius: 18, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loadingPublic && publicCommunities.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0', margin: 0 }}>
            Aktuell keine öffentlichen Communities verfügbar.
          </p>
        )}

        {!loadingPublic && publicCommunities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {publicCommunities.map(c => (
              <CommunityCard
                key={c.id}
                community={c}
                members={previews[c.id] || []}
                variant="discover"
                onJoin={handleJoin}
                joining={joining === c.id}
              />
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {showCreate && <CreateCommunitySheet onClose={() => setShowCreate(false)} />}
        {showJoin && <JoinCommunityModal onClose={() => setShowJoin(false)} />}
      </Suspense>
    </div>
  )
}
