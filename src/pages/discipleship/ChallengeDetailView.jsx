import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Users, MessageCircle, Map, Share2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'

export default function ChallengeDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [challenge, setChallenge] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [reflection, setReflection] = useState('')
  const [showReflection, setShowReflection] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shared, setShared] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: challengeData }, { data: participationData }] = await Promise.all([
      supabase.from('challenges').select('id, title, description, type, goal_type, goal_value, is_official, station_id').eq('id', id).maybeSingle(),
      supabase.from('challenge_participants').select('status, progress_value, reflection').eq('user_id', user.id).eq('challenge_id', id).maybeSingle(),
    ])
    setChallenge(challengeData)
    setParticipation(participationData)
    setReflection(participationData?.reflection || '')

    if (challengeData?.type === 'social') {
      const { data: rows } = await supabase.from('challenge_participants_public').select('user_id').eq('challenge_id', id).eq('status', 'active')
      const userIds = (rows || []).map(r => r.user_id).filter(uid => uid !== user.id)
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
        setParticipants(profiles || [])
      } else {
        setParticipants([])
      }
    }
    setLoading(false)
  }, [id, user?.id])

  useEffect(() => { if (user) load() }, [load, user?.id])

  async function start() {
    setBusy(true)
    await supabase.from('challenge_participants').upsert({
      user_id: user.id, challenge_id: id, status: 'active', progress_value: 0,
    }, { onConflict: 'user_id,challenge_id' })
    setBusy(false)
    load()
  }

  async function bumpProgress() {
    const nextValue = (participation?.progress_value || 0) + 1
    const reachedGoal = nextValue >= (challenge.goal_value || 0)
    if (reachedGoal) {
      setShowReflection(true)
      setParticipation(p => ({ ...p, progress_value: nextValue }))
      return
    }
    setBusy(true)
    await supabase.from('challenge_participants')
      .update({ progress_value: nextValue })
      .eq('user_id', user.id).eq('challenge_id', id)
    setBusy(false)
    load()
  }

  async function complete() {
    setBusy(true)
    await supabase.from('challenge_participants').upsert({
      user_id: user.id, challenge_id: id, status: 'completed',
      progress_value: challenge.goal_type === 'once' ? 0 : (challenge.goal_value || participation?.progress_value || 0),
      reflection: reflection.trim() || null, completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,challenge_id' })
    setBusy(false)
    setShowReflection(false)
    showToast('Challenge abgeschlossen ✓')
    load()
  }

  async function shareAsPost() {
    setBusy(true)
    await supabase.from('feed_posts').insert({
      author_id: user.id, type: 'text', category: 'challenge_abgeschlossen',
      title: challenge.title, body: reflection.trim() || challenge.description || challenge.title,
      is_public: true, visibility_mode: 'public', visibility_user_ids: [], excluded_user_ids: [],
    })
    setBusy(false)
    setShared(true)
    showToast('Im Feed geteilt ✓')
  }

  async function messageParticipant(participantId) {
    try {
      const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: participantId })
      if (error) throw error
      navigate(`/chat/${convId}`)
    } catch {
      showToast('Fehler beim Öffnen des Chats', 'error')
    }
  }

  if (loading) return <p className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>
  if (!challenge) {
    return (
      <div className="px-6 py-16 text-center">
        <p style={{ color: 'var(--color-text-secondary)' }}>Challenge nicht gefunden.</p>
        <button onClick={() => navigate('/juengerschaft/challenges')} className="mt-4 font-medium" style={{ color: 'var(--color-accent)' }}>Zurück</button>
      </div>
    )
  }

  const status = participation?.status
  const progressValue = participation?.progress_value || 0

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-2" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate('/juengerschaft/challenges')} className="p-1 -ml-1">
          <ChevronLeft size={22} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
        <h1 className="font-bold truncate flex-1" style={{ color: 'var(--color-text)' }}>{challenge.title}</h1>
      </div>

      <div className="px-4 py-4" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {challenge.description && (
          <p className="mb-4" style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{challenge.description}</p>
        )}

        {!status && (
          <button onClick={start} disabled={busy} className="w-full py-3.5 rounded-xl font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
            Challenge starten
          </button>
        )}

        {status === 'active' && !showReflection && challenge.goal_type !== 'once' && (
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <p className="mb-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              Fortschritt: {progressValue} / {challenge.goal_value} {challenge.goal_type === 'days' ? 'Tage' : ''}
            </p>
            <div className="w-full h-2 rounded-full mb-3" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (progressValue / challenge.goal_value) * 100)}%`, backgroundColor: 'var(--color-accent)' }} />
            </div>
            <button onClick={bumpProgress} disabled={busy} className="w-full py-2.5 rounded-xl font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
              + 1 {challenge.goal_type === 'days' ? 'Tag' : ''}
            </button>
          </div>
        )}

        {status === 'active' && !showReflection && challenge.goal_type === 'once' && (
          <button onClick={() => setShowReflection(true)} className="w-full py-3.5 rounded-xl font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
            Abschließen
          </button>
        )}

        {showReflection && (
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <p className="mb-2" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Kurze Reflexion (optional)</p>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              rows={3}
              placeholder="Was hast du erlebt?"
              className="w-full px-3 py-2.5 rounded-xl text-sm mb-3"
              style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', resize: 'vertical' }}
            />
            <button onClick={complete} disabled={busy} className="w-full py-2.5 rounded-xl font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
              Challenge abschließen
            </button>
          </div>
        )}

        {status === 'completed' && (
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <p className="mb-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>Abgeschlossen ✓</p>
            {participation?.reflection && (
              <p className="mb-3" style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5 }}>{participation.reflection}</p>
            )}
            <button
              onClick={shareAsPost}
              disabled={busy || shared}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-medium"
              style={{ backgroundColor: shared ? 'var(--color-bg)' : 'var(--color-accent)', color: shared ? 'var(--color-text-tertiary)' : '#fff' }}
            >
              <Share2 size={15} /> {shared ? 'Im Feed geteilt' : 'Als Feed-Post teilen'}
            </button>
          </div>
        )}

        {challenge.type === 'social' && (
          <div className="mt-6">
            <div className="flex items-center gap-1.5 mb-3">
              <Users size={15} style={{ color: 'var(--color-text-tertiary)' }} />
              <h2 className="font-bold" style={{ fontSize: 15, color: 'var(--color-text)' }}>Aktive Teilnehmer</h2>
            </div>
            {participants.length === 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--color-text-tertiary)' }}>Noch niemand aktiv - sei die erste Person!</p>
            )}
            <div className="space-y-2 mb-3">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full flex-shrink-0" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                      {(p.full_name || p.username || '?')[0]}
                    </div>
                  )}
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, color: 'var(--color-text)' }}>{p.full_name || p.username}</span>
                  <button onClick={() => messageParticipant(p.id)} className="p-2 flex-shrink-0">
                    <MessageCircle size={17} style={{ color: 'var(--color-accent)' }} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/worldmap')} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
              <Map size={15} /> Auf der Weltkarte ansehen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
