import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePrayerSession } from '../../hooks/usePrayerSession'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const TIMER_OPTIONS = [
  { label: '30 Sek', seconds: 30 },
  { label: '1 Min', seconds: 60 },
  { label: '2 Min', seconds: 120 },
  { label: '3 Min', seconds: 180 },
  { label: 'Kein Timer', seconds: 0 },
]

const SESSION_GOAL_OPTIONS = [
  { label: 'Kein Ziel', minutes: 0 },
  { label: '5 Min', minutes: 5 },
  { label: '10 Min', minutes: 10 },
  { label: '15 Min', minutes: 15 },
]

const CIRCUMFERENCE = 2 * Math.PI * 54

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── SVG Timer Circle ─────────────────────────────────────────
function TimerCircle({ timeLeft, timerDuration, expired }) {
  if (!timerDuration) return null
  const progress = timerDuration > 0 ? timeLeft / timerDuration : 0
  const dashoffset = CIRCUMFERENCE * (1 - progress)
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const label = `${mins}:${String(secs).padStart(2, '0')}`
  const ringColor = expired ? '#E67E22' : '#D4A853'

  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={ringColor} strokeWidth="6"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: ringColor, lineHeight: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>⏱</span>
      </div>
    </div>
  )
}

// ─── Ampel Dot ────────────────────────────────────────────────
function AmpelDot({ ampel }) {
  if (!ampel || ampel.status === 'green' || ampel.status === 'never') return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ampel.color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: ampel.color }}>
        {ampel.label}
      </span>
    </span>
  )
}

// ─── Prayer Card ──────────────────────────────────────────────
function PrayerCard({ item, swipeDelta }) {
  if (!item) return null
  const { type, request, ampel } = item
  const ownerName = request?.profiles?.full_name || request?.profiles?.username || 'Unbekannt'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 20, padding: '24px 20px',
      position: 'relative',
      transform: `translateX(${swipeDelta * 0.3}px) rotate(${swipeDelta * 0.02}deg)`,
      opacity: Math.max(0.4, 1 - Math.abs(swipeDelta) / 280),
      transition: swipeDelta !== 0 ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
    }}>
      {/* Ampel */}
      {ampel && ampel.status !== 'green' && (
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <AmpelDot ampel={ampel} />
        </div>
      )}

      {/* Avatar / Icon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
        {type === 'personal' || type === 'topic' ? (
          <div style={{ fontSize: 54, lineHeight: 1, marginBottom: 8 }}>{request?.icon || '🙏'}</div>
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%', backgroundColor: '#D4A853',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1A1208', fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700,
            marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {getInitials(ownerName)}
          </div>
        )}
        {type === 'oikos' && (
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
            color: 'rgba(240,237,230,0.7)', margin: 0, textAlign: 'center',
          }}>
            {ownerName}
          </p>
        )}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700,
        color: '#F0EDE6', textAlign: 'center', margin: '0 0 12px', lineHeight: 1.4,
      }}>
        {request?.title || 'Anliegen'}
      </h2>

      {/* Description */}
      {request?.description && (
        <p style={{
          fontFamily: 'Lora, serif', fontSize: 14,
          color: 'rgba(240,237,230,0.65)', textAlign: 'center',
          lineHeight: 1.65, fontStyle: 'italic', margin: 0,
        }}>
          „{request.description}"
        </p>
      )}

      {/* Swipe hint overlay */}
      {Math.abs(swipeDelta) > 40 && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: swipeDelta > 0 ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.15)',
          border: `2px solid ${swipeDelta > 0 ? 'rgba(39,174,96,0.4)' : 'rgba(231,76,60,0.3)'}`,
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 40 }}>{swipeDelta > 0 ? '🙏' : '→'}</span>
        </div>
      )}
    </div>
  )
}

// ─── Background Orbs ─────────────────────────────────────────
function BgOrbs() {
  return (
    <>
      <div style={{
        position: 'absolute', top: '5%', right: '-15%', width: '60vw', height: '60vw',
        maxWidth: 320, maxHeight: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,83,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '-20%', width: '50vw', height: '50vw',
        maxWidth: 280, maxHeight: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(74,103,65,0.09) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </>
  )
}

const darkBg = 'linear-gradient(160deg, #1A1208 0%, #251608 50%, #1A1208 100%)'

// ─── Setup Screen ─────────────────────────────────────────────
function SetupScreen({ items, onStart, onClose }) {
  const [selectedSeconds, setSelectedSeconds] = useState(60)
  const [goalMinutes, setGoalMinutes] = useState(0)
  const estimatedMinutes = selectedSeconds > 0 ? Math.max(1, Math.ceil((items.length * selectedSeconds) / 60)) : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: darkBg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <BgOrbs />

      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          backgroundColor: 'rgba(255,255,255,0.1)', color: '#F0EDE6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          zIndex: 1,
        }}
      >
        <X size={18} />
      </button>

      <div style={{ textAlign: 'center', marginBottom: 32, zIndex: 1 }}>
        <div style={{ fontSize: 56, marginBottom: 14, lineHeight: 1 }}>🕊</div>
        <h1 style={{
          fontFamily: 'Lora, serif', fontSize: 26, fontWeight: 700,
          color: '#F0EDE6', margin: '0 0 8px',
        }}>
          Gebetszeit starten
        </h1>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'rgba(240,237,230,0.55)', margin: 0 }}>
          {items.length} {items.length === 1 ? 'Anliegen' : 'Anliegen'}
          {estimatedMinutes ? ` · ca. ${estimatedMinutes} ${estimatedMinutes === 1 ? 'Minute' : 'Minuten'}` : ''}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 340, marginBottom: 36, zIndex: 1 }}>
        <p style={{
          fontFamily: 'Lora, serif', fontSize: 11, color: 'rgba(240,237,230,0.4)',
          textTransform: 'uppercase', letterSpacing: '0.7px', textAlign: 'center', marginBottom: 14,
        }}>
          ⏱ Zeit pro Anliegen
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {TIMER_OPTIONS.map(opt => (
            <button
              key={opt.seconds}
              onClick={() => setSelectedSeconds(opt.seconds)}
              style={{
                padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${selectedSeconds === opt.seconds ? '#D4A853' : 'rgba(255,255,255,0.12)'}`,
                backgroundColor: selectedSeconds === opt.seconds ? 'rgba(212,168,83,0.18)' : 'transparent',
                fontFamily: 'Lora, serif', fontSize: 13,
                color: selectedSeconds === opt.seconds ? '#D4A853' : 'rgba(240,237,230,0.55)',
                fontWeight: selectedSeconds === opt.seconds ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Session-Ziel: Gesamtzeit */}
        <p style={{
          fontFamily: 'Lora, serif', fontSize: 11, color: 'rgba(240,237,230,0.4)',
          textTransform: 'uppercase', letterSpacing: '0.7px', textAlign: 'center', margin: '24px 0 14px',
        }}>
          🎯 Mein Gebetsziel
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {SESSION_GOAL_OPTIONS.map(opt => (
            <button
              key={opt.minutes}
              onClick={() => setGoalMinutes(opt.minutes)}
              style={{
                padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${goalMinutes === opt.minutes ? '#D4A853' : 'rgba(255,255,255,0.12)'}`,
                backgroundColor: goalMinutes === opt.minutes ? 'rgba(212,168,83,0.18)' : 'transparent',
                fontFamily: 'Lora, serif', fontSize: 13,
                color: goalMinutes === opt.minutes ? '#D4A853' : 'rgba(240,237,230,0.55)',
                fontWeight: goalMinutes === opt.minutes ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart(selectedSeconds, goalMinutes)}
        style={{
          padding: '16px 52px', borderRadius: 50, border: 'none',
          backgroundColor: '#D4A853', color: '#1A1208',
          fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', zIndex: 1,
          boxShadow: '0 6px 24px rgba(212,168,83,0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        Gebetszeit beginnen
      </button>
    </div>
  )
}

// ─── Session Screen ───────────────────────────────────────────
function SessionScreen({ session, sessionGoalMinutes = 0, onClose }) {
  const { currentCard, cardIndex, totalCards, timerDuration, timeLeft, timerExpired, markPrayed, skipCard, goBack } = session
  const swipeStartX = useRef(null)
  const [swipeDelta, setSwipeDelta] = useState(0)
  const [cardKey, setCardKey] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    setCardKey(k => k + 1)
    setSwipeDelta(0)
  }, [cardIndex])

  // Verstrichene Gesamtzeit für das Session-Ziel
  useEffect(() => {
    if (sessionGoalMinutes <= 0) return
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [sessionGoalMinutes])

  const goalPct = sessionGoalMinutes > 0 ? Math.min(100, Math.round((elapsedSec / (sessionGoalMinutes * 60)) * 100)) : 0
  const elapsedMin = Math.floor(elapsedSec / 60)
  const elapsedRest = elapsedSec % 60

  function handleTouchStart(e) { swipeStartX.current = e.touches[0].clientX }

  function handleTouchMove(e) {
    if (swipeStartX.current === null) return
    setSwipeDelta(e.touches[0].clientX - swipeStartX.current)
  }

  async function handleTouchEnd(e) {
    if (swipeStartX.current === null) return
    const diff = e.changedTouches[0].clientX - swipeStartX.current
    setSwipeDelta(0)
    swipeStartX.current = null
    if (Math.abs(diff) > 50) {
      if (diff > 0) await markPrayed()
      else skipCard()
    }
  }

  const progress = totalCards > 0 ? cardIndex / totalCards : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: darkBg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <BgOrbs />

      {/* Header */}
      <div style={{ padding: '16px 20px 0', zIndex: 1, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)', color: '#F0EDE6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'rgba(240,237,230,0.45)' }}>
            {cardIndex + 1} / {totalCards}
          </span>
          <div style={{ width: 36 }} />
        </div>
        {/* Progress */}
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, backgroundColor: '#D4A853',
            width: `${progress * 100}%`, transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Session-Ziel (dezent) */}
        {sessionGoalMinutes > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'rgba(240,237,230,0.4)' }}>
              🎯 {elapsedMin}:{String(elapsedRest).padStart(2, '0')} / {sessionGoalMinutes} Min
            </span>
            {goalPct >= 100 && (
              <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#D4A853' }}>· erreicht ✓</span>
            )}
          </div>
        )}
      </div>

      {/* Card + Timer */}
      <div
        style={{ flex: 1, padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1, overflowY: 'auto' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <PrayerCard key={cardKey} item={currentCard} swipeDelta={swipeDelta} />

        {timerDuration > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24, gap: 6 }}>
            <TimerCircle timeLeft={timeLeft} timerDuration={timerDuration} expired={timerExpired} />
            {timerExpired && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'rgba(230,126,34,0.8)', textAlign: 'center', margin: 0 }}>
                Zeit abgelaufen – bete noch so lange du möchtest
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        padding: '12px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', gap: 10, flexShrink: 0, zIndex: 1,
      }}>
        <button
          onClick={goBack}
          disabled={cardIndex === 0}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 50,
            border: '1.5px solid rgba(255,255,255,0.12)',
            backgroundColor: 'transparent',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
            color: cardIndex === 0 ? 'rgba(240,237,230,0.25)' : 'rgba(240,237,230,0.6)',
            cursor: cardIndex === 0 ? 'default' : 'pointer',
          }}
        >
          ← Zurück
        </button>

        <button
          onClick={markPrayed}
          style={{
            flex: 2, padding: '14px 0', borderRadius: 50, border: 'none',
            backgroundColor: '#D4A853', color: '#1A1208',
            fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 18px rgba(212,168,83,0.3)',
          }}
        >
          🙏 Gebetet
        </button>

        <button
          onClick={skipCard}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 50,
            border: '1.5px solid rgba(255,255,255,0.12)',
            backgroundColor: 'transparent',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
            color: 'rgba(240,237,230,0.6)', cursor: 'pointer',
          }}
        >
          Weiter →
        </button>
      </div>
    </div>
  )
}

// ─── Summary Screen ───────────────────────────────────────────
function SummaryScreen({ summary, onClose, onRestart }) {
  const durationMinutes = summary ? Math.max(1, Math.round(summary.duration / 60)) : 0

  if (!summary) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: darkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(212,168,83,0.3)', borderTopColor: '#D4A853', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: darkBg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center', overflowY: 'auto',
    }}>
      <BgOrbs />
      <div style={{ zIndex: 1, width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>🙏</div>

        <h1 style={{
          fontFamily: 'Lora, serif', fontSize: 26, fontWeight: 700,
          color: '#F0EDE6', margin: '0 0 8px',
        }}>
          Gut gemacht!
        </h1>
        <p style={{
          fontFamily: 'Lora, serif', fontSize: 16, color: 'rgba(240,237,230,0.65)',
          margin: '0 0 32px', lineHeight: 1.5,
        }}>
          Du hast für{' '}
          <span style={{ color: '#D4A853', fontWeight: 700 }}>
            {summary.prayedCount} {summary.prayedCount === 1 ? 'Anliegen' : 'Anliegen'}
          </span>{' '}
          gebetet.
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 32, justifyContent: 'center',
        }}>
          {[
            { emoji: '⏱', value: `${durationMinutes} Min`, label: 'Gebetszeit' },
            { emoji: '🙏', value: summary.prayedCount, label: 'Gebetet' },
            ...(summary.streak > 0 ? [{ emoji: '🔥', value: summary.streak, label: 'Streak' }] : []),
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              borderRadius: 16, padding: '14px 8px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.emoji}</div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: '#D4A853', margin: '0 0 2px' }}>
                {stat.value}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'rgba(240,237,230,0.35)', margin: 0 }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {summary.goalContribution > 0 && (
          <div style={{
            marginBottom: 24, padding: '12px 16px', borderRadius: 14,
            background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.25)',
          }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#D4A853', margin: 0 }}>
              ✨ Du hast <strong>{summary.goalContribution} Min</strong> zu einem gemeinsamen Gebetsziel beigetragen.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '16px 0', borderRadius: 50, border: 'none',
              backgroundColor: '#D4A853', color: '#1A1208',
              fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 6px 22px rgba(212,168,83,0.3)',
            }}
          >
            Fertig
          </button>
          <button
            onClick={onRestart}
            style={{
              padding: '14px 0', borderRadius: 50,
              border: '1.5px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent',
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
              color: 'rgba(240,237,230,0.6)', cursor: 'pointer',
            }}
          >
            Nochmal beten
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Continue Screen (Weiterbeten für andere) ─────────────────
function ContinueScreen({ excludeIds, onContinue, onSkip }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState(null) // null = lädt

  useEffect(() => {
    let active = true
    async function load() {
      // Ohne eingeloggten User keinen Query absetzen → sonst hängt der Ladescreen ewig.
      if (!user) { if (active) setRequests([]); return }
      try {
        // RLS sorgt dafür, dass nur sichtbare Anliegen geladen werden
        const { data } = await supabase
          .from('prayer_requests')
          .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
          .neq('owner_id', user.id)
          .eq('is_answered', false)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(40)
        if (!active) return
        const pool = (data || []).filter(r => !excludeIds.includes(r.id))
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
        setRequests(shuffled)
      } catch {
        // Bei Fehler trotzdem einen Terminal-Screen zeigen statt endlosem Spinner.
        if (active) setRequests([])
      }
    }
    load()
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleYes() {
    const cards = (requests || []).map(r => ({ type: 'oikos', request: r, ampel: null }))
    onContinue(cards)
  }

  if (requests === null) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: darkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(212,168,83,0.3)', borderTopColor: '#D4A853', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <BgOrbs />
        <div style={{ zIndex: 1, width: '100%', maxWidth: 360 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🕊</div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: '#F0EDE6', margin: '0 0 28px' }}>
            Gut gemacht!
          </h1>
          <button onClick={onSkip} style={{ width: '100%', padding: '16px 0', borderRadius: 50, border: 'none', backgroundColor: '#D4A853', color: '#1A1208', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Weiter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      <BgOrbs />
      <div style={{ zIndex: 1, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 23, fontWeight: 700, color: '#F0EDE6', margin: '0 0 6px' }}>
            Möchtest du noch für andere beten?
          </h1>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'rgba(240,237,230,0.55)', margin: 0 }}>
            Diese Geschwister freuen sich über dein Gebet.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {requests.map(r => {
            const name = r.profiles?.full_name || r.profiles?.username || 'Unbekannt'
            return (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: '#F0EDE6', margin: '0 0 2px' }}>
                  {r.title}
                </p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'rgba(240,237,230,0.5)', margin: 0 }}>
                  von {name}
                </p>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleYes} style={{ width: '100%', padding: '16px 0', borderRadius: 50, border: 'none', backgroundColor: '#D4A853', color: '#1A1208', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 22px rgba(212,168,83,0.3)' }}>
            🙏 Ja, weiterbeten
          </button>
          <button onClick={onSkip} style={{ width: '100%', padding: '14px 0', borderRadius: 50, border: '1.5px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'rgba(240,237,230,0.6)', cursor: 'pointer' }}>
            Nein, fertig
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main: GuidedPrayerMode ───────────────────────────────────
export default function GuidedPrayerMode({ items, listId, listName, goalId, dailyPrayerId, onClose }) {
  const [phase, setPhase] = useState('setup')
  const [goalMinutes, setGoalMinutes] = useState(0)
  const [excludeIds, setExcludeIds] = useState(() => (items || []).map(c => c?.request?.id).filter(Boolean))
  const lastTimerRef = useRef(60)
  const session = usePrayerSession()

  useEffect(() => {
    if (session.isFinished && phase === 'session') {
      setPhase('continue')
    }
  }, [session.isFinished]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart(timerSeconds, sessionGoalMinutes) {
    lastTimerRef.current = timerSeconds
    setGoalMinutes(sessionGoalMinutes || 0)
    session.startSession(items, listId, timerSeconds, { goalId, dailyPrayerId })
    setPhase('session')
  }

  function handleClose() {
    session.resetSession()
    onClose()
  }

  function handleRestart() {
    session.resetSession()
    setPhase('setup')
  }

  function handleSessionClose() {
    if (session.prayedCount > 0) {
      session.endSession()
      // isFinished → useEffect → setPhase('continue')
    } else {
      handleClose()
    }
  }

  // "Ja, weiterbeten" → neue Session mit zufälligen Anliegen anderer (ohne Ziel-Bindung)
  function handleContinue(extraCards) {
    setExcludeIds(prev => [...prev, ...extraCards.map(c => c?.request?.id).filter(Boolean)])
    setGoalMinutes(0)
    session.resetSession()
    session.startSession(extraCards, null, lastTimerRef.current, {})
    setPhase('session')
  }

  function handleSkipContinue() {
    setPhase('finished')
  }

  if (phase === 'setup') {
    return <SetupScreen items={items} onStart={handleStart} onClose={handleClose} />
  }
  if (phase === 'session') {
    return <SessionScreen session={session} sessionGoalMinutes={goalMinutes} onClose={handleSessionClose} />
  }
  if (phase === 'continue') {
    return <ContinueScreen excludeIds={excludeIds} onContinue={handleContinue} onSkip={handleSkipContinue} />
  }
  return <SummaryScreen summary={session.sessionSummary} onClose={handleClose} onRestart={handleRestart} />
}
