import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, ExternalLink, ChevronDown, ChevronUp,
  Check, Play, MessageSquare, Plus, X, HandHeart,
  Heart, Users, Trophy, Anchor, Star, Flame, UserPlus,
} from 'lucide-react'
import { useDiscipleshipStage } from '../hooks/useDiscipleshipStage'
import { useDiscipleship } from '../hooks/useDiscipleship'
import { useMentorNotes } from '../hooks/useMentorNotes'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import Confetti from '../components/ui/Confetti'

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGE_CONFIG = {
  1: { label: '01 – Identität entdecken', icon: Star,   colorClass: 'text-blue-600', bgClass: 'bg-blue-500/10', accentColor: '#3B82F6' },
  2: { label: '02 – Jüngerschaft leben',  icon: Heart,  colorClass: 'text-accent',   bgClass: 'bg-accent/10',   accentColor: 'var(--color-accent)' },
  3: { label: '03 – Leiter befähigen',    icon: Flame,  colorClass: 'text-red-600',  bgClass: 'bg-red-500/10',  accentColor: '#EF4444' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function AvatarCircle({ profile, size = 40 }) {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.username?.[0]?.toUpperCase() || '?')
  return (
    <div
      className="rounded-full bg-warm-1/20 flex items-center justify-center font-semibold overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, minWidth: size }}
    >
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
        : <span style={{ fontSize: size * 0.33, color: 'var(--color-warm-1)' }}>{initials}</span>}
    </div>
  )
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function getDaysUntil(isoStr) {
  const now   = new Date()
  const target = new Date(isoStr)
  const diff   = target - now
  const days   = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return `heute um ${formatTime(isoStr)} Uhr`
  if (days === 1) return 'morgen'
  return `in ${days} Tagen`
}

function SectionTitle({ icon: Icon, title, iconClass = 'text-warm-1' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={17} className={iconClass} />
      <h2 className="font-semibold text-dark text-base">{title}</h2>
    </div>
  )
}

// ─── Mini embedded chat ───────────────────────────────────────────────────────
function MiniChat({ conversationId, memberCount }) {
  const { user } = useAuth()
  const { messages, loading, sendMessage } = useChat(conversationId)
  const [draft, setDraft]   = useState('')
  const bottomRef           = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const t = draft.trim()
    if (!t) return
    sendMessage(t)
    setDraft('')
  }

  function formatMsgTime(iso) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white/70 rounded-2xl border border-warm-3/30 overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-3/20">
        <MessageSquare size={15} className="text-warm-1" />
        <span className="text-sm font-semibold text-dark">Stufen-Chat</span>
        <span className="ml-auto text-xs text-dark-light">{memberCount} Mitglieder</span>
      </div>

      {/* Messages */}
      <div className="h-[280px] overflow-y-auto px-4 py-3 space-y-2 hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-warm-3 border-t-warm-1 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <MessageSquare size={28} className="text-warm-3" />
            <p className="text-sm text-dark-light">Noch keine Nachrichten. Starte das Gespräch!</p>
          </div>
        ) : (
          messages.map(msg => {
            if (msg.is_deleted) return null
            const isOwn   = msg.sender_id === user?.id
            const name    = msg.profiles?.full_name || msg.profiles?.username || '…'
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-[10px] text-dark-light mb-0.5 ml-1">{name}</span>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                  isOwn ? 'bg-warm-1 text-white rounded-tr-sm' : 'bg-warm-3/30 text-dark rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-dark-light mt-0.5 mx-1">{formatMsgTime(msg.created_at)}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-warm-3/20">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Nachricht schreiben…"
          className="flex-1 px-3 py-2 rounded-xl bg-warm-3/20 text-sm text-dark placeholder:text-dark-light border border-transparent focus:outline-none focus:border-warm-1/30 focus:bg-white/80 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="w-9 h-9 rounded-xl bg-warm-1 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Mentor notes (per mentee) ─────────────────────────────────────────────
function MentorNoteField({ menteeId, menteeName }) {
  const { noteText, handleChange, lastSaved, saving } = useMentorNotes(menteeId)
  return (
    <div>
      <p className="text-xs font-semibold text-dark-light mb-1.5">
        Notizen zu {menteeName}
        {saving && <span className="ml-2 text-dark-light/60">Speichert…</span>}
        {!saving && lastSaved && (
          <span className="ml-2 text-warm-1/70">
            ✓ Gespeichert{' '}
            {lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </p>
      <textarea
        value={noteText}
        onChange={e => handleChange(e.target.value)}
        placeholder="Private Notizen (nur du siehst diese)…"
        rows={3}
        className="w-full px-3 py-2.5 rounded-xl border border-warm-3/30 bg-white/70 text-sm text-dark placeholder:text-dark-light resize-none focus:outline-none focus:border-warm-1/40 focus:ring-2 focus:ring-warm-1/10 transition-all"
      />
    </div>
  )
}

// ─── Add testimony sheet ─────────────────────────────────────────────────────
function AddTestimonySheet({ onClose, onSubmit }) {
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [isPublic, setPublic] = useState(true)
  const [saving, setSaving]   = useState(false)

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    await onSubmit({ title: title.trim(), body: body.trim(), isPublic })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-dark">Mein Zeugnis teilen</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-warm-3/30 flex items-center justify-center">
            <X size={16} className="text-dark-muted" />
          </button>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel *"
          className="w-full px-4 py-3 rounded-xl border border-warm-3/40 bg-warm-3/10 text-sm text-dark placeholder:text-dark-light focus:outline-none focus:border-warm-1/40 transition-all"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Was hat Gott in dir und durch dich gewirkt? *"
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-warm-3/40 bg-warm-3/10 text-sm text-dark placeholder:text-dark-light resize-none focus:outline-none focus:border-warm-1/40 transition-all"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPublic(p => !p)}
            className={`w-10 h-6 rounded-full transition-all flex-shrink-0 ${isPublic ? 'bg-warm-1' : 'bg-warm-3'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all mx-1 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-dark-muted">{isPublic ? 'Öffentlich sichtbar' : 'Nur für mich'}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !body.trim() || saving}
          className="w-full py-3.5 rounded-2xl bg-warm-1 text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
        >
          {saving ? '…' : 'Zeugnis teilen'}
        </button>
      </div>
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────
export default function DiscipleshipStageView() {
  const { stage: stageParam } = useParams()
  const stage   = parseInt(stageParam)
  const navigate = useNavigate()
  const { user } = useAuth()
  const config   = STAGE_CONFIG[stage]
  const Icon     = config?.icon || Star

  const {
    modules, completedLessons, weeklyImpulse, testimonies, stagePrayers,
    nextCall, stageConversationId, stageMemberCount, stageProgress, certificate,
    stageCommunity, isCommunityMember, joiningCommunity,
    loading, isLessonDone, moduleProgress, completeLesson,
    addTestimony, reactToTestimony, joinStageCommunity,
  } = useDiscipleshipStage(stage)

  const { myStage, pairs } = useDiscipleship()

  // Certificate handling
  const certKey = `oikos_cert_seen_${user?.id}_${stage}`
  const [showCertConfetti, setShowCertConfetti] = useState(false)
  const [showCertModal, setShowCertModal]       = useState(false)
  const [showTestimonySheet, setTestimonySheet] = useState(false)
  const [expandedModules, setExpandedModules]   = useState({})

  useEffect(() => {
    if (certificate && !localStorage.getItem(certKey)) {
      setShowCertConfetti(true)
      setShowCertModal(true)
      localStorage.setItem(certKey, '1')
    }
  }, [certificate])

  if (!config) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-dark-muted italic">Stufe nicht gefunden.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg animate-pulse">
        <div className="px-4 pt-12 pb-5">
          <div className="h-8 bg-warm-3/40 rounded w-3/4 mb-2" />
          <div className="h-4 bg-warm-3/30 rounded w-1/2" />
        </div>
        <div className="px-4 space-y-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-white/60 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const stageName = config.label.split(' – ')[1] || config.label

  return (
    <div className="min-h-screen bg-bg pb-8">
      <Confetti show={showCertConfetti} />

      {/* Certificate modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Trophy size={28} className="text-accent" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-dark mb-2">
              Stufe {String(stage).padStart(2, '0')} abgeschlossen!
            </h3>
            <p className="text-dark-muted text-sm mb-6 leading-relaxed">
              Du hast alle Lektionen von „{stageName}" abgeschlossen.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setShowCertModal(false)}
                className="w-full py-3 rounded-xl bg-warm-3/30 text-dark font-medium text-sm"
              >
                Zertifikat auf Profil zeigen
              </button>
              {stage < 3 && (
                <button
                  onClick={() => { setShowCertModal(false); navigate(`/discipleship/stage/${stage + 1}`) }}
                  className="w-full py-3 rounded-xl bg-warm-1 text-white font-semibold text-sm"
                >
                  Weiter zu Stufe {String(stage + 1).padStart(2, '0')} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Testimony sheet */}
      {showTestimonySheet && (
        <AddTestimonySheet
          onClose={() => setTestimonySheet(false)}
          onSubmit={addTestimony}
        />
      )}

      {/* ── Header ── */}
      <div className={`px-4 pt-12 pb-6 ${config.bgClass}`}>
        <button
          onClick={() => navigate('/discipleship')}
          className="w-9 h-9 rounded-xl bg-white/70 border border-white/50 flex items-center justify-center mb-4"
        >
          <ArrowLeft size={18} className="text-dark" />
        </button>
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl ${config.bgClass} border border-white/50 flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} className={config.colorClass} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-dark-light uppercase tracking-wide mb-0.5">
              Stufe {String(stage).padStart(2, '0')}
            </p>
            <h1 className="font-serif text-2xl font-bold text-dark leading-tight">{stageName}</h1>
          </div>
        </div>

        {/* Overall progress */}
        {modules.length > 0 && (
          <div className="mt-5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-dark-muted">Kursfortschritt</span>
              <span className="text-xs font-bold" style={{ color: config.accentColor }}>{stageProgress}%</span>
            </div>
            <div className="h-2 bg-white/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${stageProgress}%`, backgroundColor: config.accentColor }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Stage Community Banner ── */}
      {stageCommunity && (
        <div className="mx-4 mt-4 rounded-2xl border border-warm-1/30 bg-warm-1/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warm-1/15 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-warm-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-dark leading-snug truncate">{stageCommunity.name}</p>
            <p className="text-xs text-dark-muted">{stageCommunity.memberCount} Mitglieder</p>
          </div>
          {isCommunityMember ? (
            <button
              onClick={() => navigate(`/community/${stageCommunity.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-3/30 text-dark-muted text-xs font-semibold flex-shrink-0"
            >
              Zur Community
            </button>
          ) : (
            <button
              onClick={joinStageCommunity}
              disabled={joiningCommunity}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-1 text-white text-xs font-semibold flex-shrink-0 disabled:opacity-60 transition-opacity"
            >
              <UserPlus size={13} />
              {joiningCommunity ? '…' : 'Beitreten'}
            </button>
          )}
        </div>
      )}

      <div className="px-4 space-y-4 mt-4">

        {/* ── Call reminder ── */}
        {nextCall && (
          <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dark">Nächster Call {getDaysUntil(nextCall.scheduled_at)}</p>
              <p className="text-xs text-dark-muted truncate">
                {nextCall.title} · {formatDate(nextCall.scheduled_at)} {formatTime(nextCall.scheduled_at)} Uhr
              </p>
            </div>
            {nextCall.link && (
              <a
                href={nextCall.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold flex-shrink-0"
              >
                <ExternalLink size={12} /> Link
              </a>
            )}
          </div>
        )}

        {/* ── Weekly impulse ── */}
        <div className="border-l-4 border-accent rounded-r-2xl bg-accent/5 pl-4 pr-4 py-4">
          <p className="text-[10px] font-bold text-accent uppercase tracking-wide mb-2">Impuls diese Woche</p>
          {weeklyImpulse ? (
            <>
              <p className="font-semibold text-dark text-sm mb-1">{weeklyImpulse.title}</p>
              <p className="text-sm text-dark-muted leading-relaxed mb-2">{weeklyImpulse.body}</p>
              {weeklyImpulse.bible_verse && (
                <p className="text-xs italic text-dark-muted">{weeklyImpulse.bible_verse}</p>
              )}
              {weeklyImpulse.bible_reference && (
                <p className="text-xs font-semibold text-accent mt-0.5">{weeklyImpulse.bible_reference}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-dark-light italic">
              Der Impuls für diese Woche wird bald veröffentlicht.
            </p>
          )}
        </div>

        {/* ── Course modules ── */}
        {modules.length > 0 && (
          <div>
            <SectionTitle icon={Play} title="Kurs" iconClass={config.colorClass} />
            <div className="space-y-2">
              {modules.map(mod => {
                const { done, total } = moduleProgress(mod.id)
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const isExpanded = expandedModules[mod.id] !== false && (expandedModules[mod.id] === true || pct < 100)

                return (
                  <div key={mod.id} className="bg-white/70 rounded-2xl border border-warm-3/30 overflow-hidden">
                    <button
                      onClick={() => setExpandedModules(p => ({ ...p, [mod.id]: !isExpanded }))}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgClass}`}>
                        {pct === 100
                          ? <Check size={15} className="text-warm-1" strokeWidth={3} />
                          : <Play size={15} className={config.colorClass} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-dark truncate">{mod.title}</p>
                        <p className="text-xs text-dark-muted mt-0.5">{done} von {total} Lektionen</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-dark-muted">{pct}%</span>
                        {isExpanded
                          ? <ChevronUp size={16} className="text-dark-light" />
                          : <ChevronDown size={16} className="text-dark-light" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-warm-3/20">
                        {mod.description && (
                          <p className="px-4 pt-3 pb-1 text-xs text-dark-muted italic">{mod.description}</p>
                        )}
                        <div className="px-4 pb-3 pt-2">
                          {/* Module progress bar */}
                          <div className="h-1.5 bg-warm-3/30 rounded-full mb-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: config.accentColor }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            {(mod.course_lessons || []).map((lesson, idx) => {
                              const done = isLessonDone(lesson.id)
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => navigate(`/discipleship/lesson/${lesson.id}`)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                    done ? 'bg-warm-1/5 opacity-70' : 'bg-warm-3/10 hover:bg-warm-3/20'
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    done ? 'bg-warm-1 border-warm-1' : 'border-warm-3'
                                  }`}>
                                    {done
                                      ? <Check size={12} strokeWidth={3} className="text-white" />
                                      : <span className="text-[9px] font-bold text-dark-light">{idx + 1}</span>}
                                  </div>
                                  <span className={`text-sm flex-1 truncate ${done ? 'line-through text-dark-light' : 'text-dark'}`}>
                                    {lesson.title}
                                  </span>
                                  {lesson.duration_minutes && (
                                    <span className="text-[10px] text-dark-light flex-shrink-0">{lesson.duration_minutes} min</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Stage chat ── */}
        {stageConversationId && (
          <div>
            <SectionTitle icon={MessageSquare} title="Stufen-Chat" iconClass={config.colorClass} />
            <MiniChat conversationId={stageConversationId} memberCount={stageMemberCount} />
          </div>
        )}

        {/* ── Testimonies ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={17} className={config.colorClass} />
              <h2 className="font-semibold text-dark text-base">Zeugnisse</h2>
            </div>
            <button
              onClick={() => setTestimonySheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-1/10 text-warm-1 text-xs font-semibold"
            >
              <Plus size={13} /> Teilen
            </button>
          </div>

          {testimonies.length === 0 ? (
            <div className="text-center py-8 bg-white/50 rounded-2xl border border-warm-3/20">
              <p className="text-sm text-dark-muted leading-relaxed">
                Noch keine Zeugnisse. Sei der Erste der teilt was Gott in dieser Stufe gewirkt hat.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {testimonies.map(t => {
                const prayerCount = (t.reactions || []).filter(r => r.type === 'prayer').length
                const heartCount  = (t.reactions || []).filter(r => r.type === 'heart').length
                const myPrayer    = (t.reactions || []).some(r => r.user_id === user?.id && r.type === 'prayer')
                const myHeart     = (t.reactions || []).some(r => r.user_id === user?.id && r.type === 'heart')

                return (
                  <div key={t.id} className="bg-white/70 rounded-2xl border border-warm-3/30 p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <AvatarCircle profile={t.profiles} size={36} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">
                          {t.profiles?.full_name || t.profiles?.username || 'Anonym'}
                        </p>
                        <p className="text-[10px] text-dark-light">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-dark mb-1">{t.title}</p>
                    <TestimonyBody text={t.body} />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => !t._optimistic && reactToTestimony(t.id, 'prayer')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          myPrayer ? 'bg-warm-1 text-white' : 'bg-warm-3/20 text-dark-muted hover:bg-warm-3/30'
                        }`}
                      >
                        🙏 {prayerCount > 0 ? prayerCount : ''} Beten
                      </button>
                      <button
                        onClick={() => !t._optimistic && reactToTestimony(t.id, 'heart')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          myHeart ? 'bg-red-500 text-white' : 'bg-warm-3/20 text-dark-muted hover:bg-warm-3/30'
                        }`}
                      >
                        ❤️ {heartCount > 0 ? heartCount : ''} Herz
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Stage prayers ── */}
        <div>
          <SectionTitle icon={HandHeart} title="Füreinander beten" iconClass={config.colorClass} />
          <p className="text-xs text-dark-muted mb-3">
            Du siehst Anliegen von Geschwistern auf Stufe {String(stage).padStart(2, '0')}. Betet gemeinsam.
          </p>

          {stagePrayers.length === 0 ? (
            <div className="text-center py-6 bg-white/50 rounded-2xl border border-warm-3/20">
              <p className="text-sm text-dark-muted italic">
                Noch keine öffentlichen Anliegen auf dieser Stufe.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stagePrayers.map(prayer => (
                <div key={prayer.id} className="bg-white/70 rounded-2xl border border-warm-3/30 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AvatarCircle profile={prayer.profiles} size={28} />
                    <span className="text-xs font-semibold text-dark-muted">
                      {prayer.profiles?.full_name || prayer.profiles?.username || 'Anonym'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-dark">{prayer.title}</p>
                  {prayer.description && (
                    <p className="text-xs text-dark-muted mt-0.5 line-clamp-2">{prayer.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Mentor area ── */}
        {(pairs.mentor || pairs.mentees.length > 0) && (
          <div>
            <SectionTitle icon={Users} title="Begleitung" iconClass={config.colorClass} />

            {/* Mentee view: show my mentor */}
            {pairs.mentor && (
              <div className="bg-white/70 rounded-2xl border border-warm-3/30 p-4 mb-3">
                <p className="text-[11px] font-bold text-dark-light uppercase tracking-wide mb-3">Mein Begleiter</p>
                <div className="flex items-center gap-3">
                  <AvatarCircle profile={pairs.mentor} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark">{pairs.mentor.full_name}</p>
                    <p className="text-xs text-dark-muted">@{pairs.mentor.username}</p>
                    {pairs.mentor.startedAt && (
                      <p className="text-[10px] text-dark-light mt-0.5">seit {formatDate(pairs.mentor.startedAt)}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/user/${pairs.mentor.id}`)}
                    className="flex-1 py-2.5 rounded-xl bg-accent/10 text-accent text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={14} /> Nachricht
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-warm-3/20 text-dark-muted text-sm font-semibold flex items-center justify-center gap-1.5">
                    <Calendar size={14} /> Call planen
                  </button>
                </div>
              </div>
            )}

            {/* Mentor view: show mentees + notes */}
            {pairs.mentees.length > 0 && (
              <div className="bg-white/70 rounded-2xl border border-warm-3/30 p-4">
                <p className="text-[11px] font-bold text-dark-light uppercase tracking-wide mb-3">Meine Begleitungen</p>
                {pairs.mentees.map(m => (
                  <div key={m.id} className="mb-5 last:mb-0">
                    <div className="flex items-center gap-2.5 mb-3">
                      <AvatarCircle profile={m} size={36} />
                      <div>
                        <p className="font-semibold text-dark text-sm">{m.full_name}</p>
                        <p className="text-xs text-dark-muted">@{m.username}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/user/${m.id}`)}
                        className="ml-auto px-3 py-1.5 rounded-xl bg-warm-3/20 text-dark-muted text-xs font-semibold"
                      >
                        Profil
                      </button>
                    </div>
                    <MentorNoteField menteeId={m.id} menteeName={m.full_name?.split(' ')[0] || m.username} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Testimony body with "Mehr lesen" ─────────────────────────────────────────
function TestimonyBody({ text }) {
  const [expanded, setExpanded] = useState(false)
  const MAX = 200
  const long = text.length > MAX

  return (
    <div>
      <p className="text-sm text-dark-muted leading-relaxed">
        {expanded || !long ? text : `${text.slice(0, MAX)}…`}
      </p>
      {long && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="text-xs font-semibold text-warm-1 mt-1"
        >
          {expanded ? 'Weniger' : 'Mehr lesen'}
        </button>
      )}
    </div>
  )
}
