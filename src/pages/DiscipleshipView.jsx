import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, Lock, Check,
  Anchor, Star, Heart, Flame, ChevronRight, BookMarked,
} from 'lucide-react'
import { useState } from 'react'
import { useDiscipleship } from '../hooks/useDiscipleship'
import Confetti from '../components/ui/Confetti'

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGE_CONFIG = [
  {
    num: 0,
    label: '00 – Connect & Start',
    icon: Anchor,
    colorClass: 'text-warm-1',
    bgClass: 'bg-warm-1/10',
    borderClass: 'border-warm-1/30',
    description: 'Der erste Schritt. Du bist Teil der OIKOS-Gemeinschaft geworden und hast begonnen, dein Umfeld bewusster wahrzunehmen. Hier fängt alles an.',
  },
  {
    num: 1,
    label: '01 – Identität entdecken',
    icon: Star,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    description: 'Wer bist du in Christus? Diese Stufe lädt dich ein, deine Identität als Kind Gottes tiefer zu entdecken.',
  },
  {
    num: 2,
    label: '02 – Jüngerschaft leben',
    icon: Heart,
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-accent/30',
    description: 'Jüngerschaft lebt in Beziehung. Du wirst von einem erfahrenen Geschwister begleitet – oder begleitest selbst jemanden.',
  },
  {
    num: 3,
    label: '03 – Leiter befähigen',
    icon: Flame,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    description: 'Du hast eine etablierte Gruppe und möchtest andere befähigen dasselbe zu tun. Multiplikatoren werden.',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Avatar({ profile, size = 10 }) {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.username?.[0]?.toUpperCase() || '?')
  return (
    <div
      className="rounded-full bg-warm-1/20 flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden"
      style={{ width: size * 4, height: size * 4, minWidth: size * 4 }}
    >
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
        : <span className="text-xs text-warm-1">{initials}</span>}
    </div>
  )
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function SkeletonLoader() {
  return (
    <div className="px-4 py-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="h-8 bg-warm-3/50 rounded w-44 mb-2" />
          <div className="h-3 bg-warm-3/40 rounded w-28" />
        </div>
        <div className="w-11 h-11 rounded-full bg-warm-3/40" />
      </div>
      <div className="flex justify-between py-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="w-11 h-11 rounded-full bg-warm-3/40" />)}
      </div>
      {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-white/60 rounded-2xl border border-warm-3/30" />)}
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────
export default function DiscipleshipView() {
  const navigate  = useNavigate()
  const {
    myStage, pairs, peopleCount, registeredAt, loading,
  } = useDiscipleship()

  const [stage00Open, setStage00Open] = useState(false)
  const [showConfetti] = useState(false)
  const stageRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const isCompleted = (num) => num === 0 || myStage > num
  const isActive    = (num) => num !== 0 && myStage === num
  const stageStatus = (num) => isCompleted(num) ? 'completed' : isActive(num) ? 'active' : 'future'

  const scrollToStage = (num) => {
    stageRefs[num]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <SkeletonLoader />

  return (
    <div className="min-h-screen bg-bg pb-6">
      <Confetti show={showConfetti} />

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5 bg-gradient-to-b from-warm-4/70 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold text-dark leading-tight">Jüngerschaft</h1>
            <p className="text-dark-muted text-sm italic mt-0.5">Dein Wachstumsweg</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-warm-1/20 flex items-center justify-center">
              <BookMarked size={20} className="text-warm-1" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-white leading-none whitespace-nowrap">
              Stufe {String(myStage).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stage progress circles ── */}
      <div className="px-5 pb-6">
        <div className="relative flex items-start justify-between">
          <div
            className="absolute left-[22px] right-[22px] top-[22px] flex items-center pointer-events-none"
            aria-hidden="true"
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`flex-1 h-0.5 transition-colors duration-500 ${
                  isCompleted(i) && (isCompleted(i + 1) || isActive(i + 1)) ? 'bg-accent' : 'bg-warm-3'
                }`}
              />
            ))}
          </div>

          {STAGE_CONFIG.map(({ num }) => {
            const status = stageStatus(num)
            return (
              <button
                key={num}
                onClick={() => num === 0 ? scrollToStage(0) : navigate(`/discipleship/stage/${num}`)}
                className="flex flex-col items-center gap-1.5 z-10 min-w-[44px]"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  status === 'completed' ? 'bg-accent border-accent text-white shadow-md' :
                  status === 'active'    ? 'bg-white border-warm-1 text-warm-1 shadow-lg ring-4 ring-warm-1/20 animate-pulse' :
                                          'bg-warm-3/30 border-warm-3 text-dark-light'
                }`}>
                  {status === 'completed' ? <Check size={16} strokeWidth={3} /> : String(num).padStart(2, '0')}
                </div>
                <span className={`text-[9px] font-semibold leading-none ${status === 'future' ? 'text-dark-light' : 'text-dark-muted'}`}>
                  {String(num).padStart(2, '0')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Stage cards ── */}
      <div className="px-4 space-y-3">

        {/* Stage 00 – always completed, inline toggle */}
        <div
          ref={stageRefs[0]}
          className="rounded-2xl border border-warm-1/30 bg-white/70 overflow-hidden"
        >
          <button
            onClick={() => setStage00Open(p => !p)}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-warm-1/10 flex items-center justify-center flex-shrink-0">
              <Check size={17} className="text-warm-1" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-dark">{STAGE_CONFIG[0].label}</p>
              {!stage00Open && (
                <p className="text-xs text-dark-muted line-clamp-1 mt-0.5">{STAGE_CONFIG[0].description}</p>
              )}
            </div>
            {stage00Open
              ? <ChevronUp size={17} className="text-dark-light flex-shrink-0" />
              : <ChevronDown size={17} className="text-dark-light flex-shrink-0" />}
          </button>

          {stage00Open && (
            <div className="px-4 pb-5">
              <p className="text-sm text-dark-muted leading-relaxed mb-3">{STAGE_CONFIG[0].description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-1/15 text-warm-1 text-xs font-semibold">
                  <Check size={12} strokeWidth={3} /> Abgeschlossen
                </span>
                {registeredAt && (
                  <span className="text-xs text-dark-light">{formatDate(registeredAt)}</span>
                )}
              </div>
              <p className="text-sm text-dark-muted mt-3">
                Du hast deine OIKOS Map gestartet und{' '}
                <strong className="text-dark">{peopleCount}</strong>{' '}
                {peopleCount === 1 ? 'Person' : 'Personen'} hinzugefügt.
              </p>
            </div>
          )}
        </div>

        {/* Stages 01-03 – navigation tiles */}
        {STAGE_CONFIG.slice(1).map(({ num, label, description, icon: Icon, colorClass, bgClass, borderClass }) => {
          const status = stageStatus(num)
          const accessible = status !== 'future'

          return (
            <div
              key={num}
              ref={stageRefs[num]}
              className={`rounded-2xl border overflow-hidden transition-all duration-200 ${borderClass} bg-white/70 ${
                status === 'future' ? 'opacity-55' : ''
              }`}
            >
              <button
                onClick={() => accessible && navigate(`/discipleship/stage/${num}`)}
                disabled={!accessible}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
                  {status === 'future'
                    ? <Lock size={17} className="text-dark-light" />
                    : status === 'completed'
                    ? <Check size={17} className="text-warm-1" strokeWidth={3} />
                    : <Icon size={17} className={colorClass} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm ${status === 'future' ? 'text-dark-light' : 'text-dark'}`}>
                      {label}
                    </p>
                    {status === 'active' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-warm-1/15 text-warm-1 text-[9px] font-bold uppercase tracking-wide">
                        Aktiv
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-warm-3/30 text-dark-light text-[9px] font-bold uppercase tracking-wide">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark-muted line-clamp-1 mt-0.5">{description}</p>
                </div>

                {accessible && <ChevronRight size={17} className="text-dark-light flex-shrink-0" />}
              </button>
            </div>
          )
        })}

        {/* ── My Pairings ── */}
        {(pairs.mentor || pairs.mentees.length > 0) ? (
          <div className="bg-white/70 rounded-2xl p-5 border border-warm-3/30 mt-2">
            <h3 className="font-semibold text-dark mb-4">Meine Begleitungen</h3>

            {pairs.mentor && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-dark-light uppercase tracking-wide mb-2">Wer begleitet mich</p>
                <button
                  onClick={() => navigate(`/user/${pairs.mentor.id}`)}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-warm-3/20 transition-colors text-left"
                >
                  <Avatar profile={pairs.mentor} size={10} />
                  <div>
                    <p className="font-medium text-dark text-sm">{pairs.mentor.full_name}</p>
                    <p className="text-xs text-dark-muted">@{pairs.mentor.username}</p>
                  </div>
                </button>
              </div>
            )}

            {pairs.mentees.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-dark-light uppercase tracking-wide mb-2">Wen begleite ich</p>
                <div className="space-y-1">
                  {pairs.mentees.map(m => (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/user/${m.id}`)}
                      className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-warm-3/20 transition-colors text-left"
                    >
                      <Avatar profile={m} size={10} />
                      <div>
                        <p className="font-medium text-dark text-sm">{m.full_name}</p>
                        <p className="text-xs text-dark-muted">@{m.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/70 rounded-2xl p-5 border border-warm-3/30 text-center mt-2">
            <h3 className="font-semibold text-dark mb-2">Meine Begleitungen</h3>
            <p className="text-sm text-dark-muted mb-3 leading-relaxed">
              Jüngerschaft lebt in Beziehung. Finde jemanden der dich begleitet oder beginne selbst jemanden zu begleiten.
            </p>
            <button
              onClick={() => navigate('/friends')}
              className="px-4 py-2 rounded-xl bg-warm-1/10 text-warm-1 text-sm font-semibold"
            >
              Geschwister entdecken
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
