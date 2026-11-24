import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Compass, Hash } from 'lucide-react'
import { useCommunities } from '../../hooks/useCommunities'
import { useCommunityMembersPreview } from '../../hooks/useCommunityMembersPreview'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { readCache, writeCache } from '../../lib/swrCache'
import CommunityCard from '../community/CommunityCard'
import PeopleYouMayKnow from './PeopleYouMayKnow'
import { useT } from '../../i18n'

// Lazy: CreateCommunitySheet zieht AddressAutocomplete (Google-Maps-Loader)
// mit – soll erst laden, wenn der Nutzer tatsächlich "Erstellen" tippt.
const CreateCommunitySheet = lazy(() => import('../community/CommunitySheets').then(m => ({ default: m.CreateCommunitySheet })))
const JoinCommunityModal = lazy(() => import('../community/CommunitySheets').then(m => ({ default: m.JoinCommunityModal })))
const RequestJoinSheet = lazy(() => import('../community/CommunitySheets').then(m => ({ default: m.RequestJoinSheet })))

const sectionLabel = {
  fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0,
}

// Community-Tab auf Home: eigene Communities, öffentliche zum Beitreten,
// und ein Sprung zum Geschwister-Tab.
export default function HomeCommunityTab() {
  const { t } = useT()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { myCommunities, loading } = useCommunities()
  // Öffentliche Communities: sofort aus dem Cache, parallel zu den eigenen
  // laden (früher erst NACH useCommunities, dann noch ein zweiter Request).
  const [cachedPublic] = useState(() => readCache(user?.id, 'homePublicCommunitiesFull'))
  const [allPublic, setAllPublic] = useState(cachedPublic ?? [])
  const [loadingPublic, setLoadingPublic] = useState(!cachedPublic)
  const [joining, setJoining] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [requestTarget, setRequestTarget] = useState(null)
  const [requestedIds, setRequestedIds] = useState(new Set())

  const myIds = new Set(myCommunities.map(c => c.id))
  const publicCommunities = allPublic.filter(c => !myIds.has(c.id)).slice(0, 6)

  const previews = useCommunityMembersPreview([
    ...myCommunities.map(c => c.id),
    ...publicCommunities.map(c => c.id),
  ])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_public_communities_full', { p_limit: 20 })
      if (cancelled) return
      if (!error) {
        const list = (data || []).map(({ member_count, ...c }) => ({ ...c, memberCount: Number(member_count) }))
        setAllPublic(list)
        writeCache(user?.id, 'homePublicCommunitiesFull', list)
      }
      setLoadingPublic(false)
    })()
    return () => { cancelled = true }
  }, [user?.id])

  // Eigene offene Anfragen → Button zeigt „Angefragt“ (auch nach Neustart).
  const requestIdsKey = publicCommunities.filter(c => c.join_mode === 'request').map(c => c.id).join(',')
  useEffect(() => {
    if (!user || !requestIdsKey) return
    supabase
      .from('community_join_requests')
      .select('community_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .in('community_id', requestIdsKey.split(','))
      .then(({ data }) => { if (data) setRequestedIds(new Set(data.map(r => r.community_id))) })
  }, [user?.id, requestIdsKey])

  async function handleJoin(community) {
    // „Mit Anfrage“-Communities: nie direkt eintragen (RLS lehnt das ab),
    // sondern Anfrage an die Admins schicken.
    if (community.join_mode === 'request') {
      setRequestTarget(community)
      return
    }
    setJoining(community.id)
    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: community.id, user_id: user.id, role: 'member' })
    setJoining(null)
    if (!error) {
      showToast(t('Willkommen in {name}!', { name: community.name }))
      navigate(`/community/${community.id}`)
    } else {
      showToast(t('Fehler beim Beitreten'), 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0, maxWidth: '100%' }}>
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
        <Users size={17} />{' '}{t('Geschwister')}</button>

      {/* Neue Geschwister, die man vielleicht kennt */}
      <PeopleYouMayKnow />

      {/* Erstellen / Beitreten */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={15} />{' '}{t('Erstellen')}</button>
        <button
          onClick={() => setShowJoin(true)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <Hash size={15} />{' '}{t('Beitreten')}</button>
      </div>

      {/* Meine Communities */}
      <div>
        <p style={{ ...sectionLabel, marginBottom: 12 }}>{t('Meine Communities')}</p>

        {loading && (
          <div style={{ height: 150, borderRadius: 18, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loading && myCommunities.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0 4px', margin: 0 }}>{t('Du bist noch in keiner Community – erstelle eine oder tritt per Code bei.')}</p>
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
          <Compass size={12} />{' '}{t('Entdecken')}</p>

        {loadingPublic && (
          <div style={{ height: 150, borderRadius: 18, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loadingPublic && publicCommunities.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0', margin: 0 }}>{t('Aktuell keine öffentlichen Communities verfügbar.')}</p>
        )}

        {!loadingPublic && publicCommunities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {publicCommunities.map(c => (
              <CommunityCard
                key={c.id}
                community={c}
                members={previews[c.id] || []}
                variant="discover"
                onOpen={() => navigate(`/community/${c.id}`)}
                onJoin={handleJoin}
                joining={joining === c.id}
                requested={requestedIds.has(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {showCreate && <CreateCommunitySheet onClose={() => setShowCreate(false)} />}
        {showJoin && <JoinCommunityModal onClose={() => setShowJoin(false)} />}
        {requestTarget && (
          <RequestJoinSheet
            community={requestTarget}
            onClose={() => setRequestTarget(null)}
            onSent={(id) => setRequestedIds(prev => new Set(prev).add(id))}
          />
        )}
      </Suspense>
    </div>
  )
}
