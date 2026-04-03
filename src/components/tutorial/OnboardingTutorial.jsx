import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// ─── Step Definitions ─────────────────────────────────────────
const STEPS = [
  {
    type: 'center',
    icon: '🗺️',
    title: 'Willkommen bei OIKOS!',
    body: 'Lass uns gemeinsam einen kurzen Rundgang durch die App machen. Du kannst jederzeit überspringen.',
    route: '/',
    onEnter: () => window.dispatchEvent(new Event('tour-close-person')),
  },
  {
    type: 'element',
    selector: '.tour-nav-map',
    placement: 'above',
    title: 'Deine OIKOS Map',
    body: 'Hier ist dein persönliches Netzwerk. Du stehst im Mittelpunkt – alle Menschen um dich herum kannst du hier erfassen und begleiten.',
    route: '/',
    onEnter: () => window.dispatchEvent(new Event('tour-close-person')),
  },
  {
    type: 'element',
    selector: '.tour-map-add',
    placement: 'below',
    title: 'Personen hinzufügen',
    body: 'Tippe hier, um eine Person zu deiner OIKOS Map hinzuzufügen – Familie, Freunde, Kollegen oder Nachbarn.',
    route: '/',
  },
  {
    type: 'center',
    icon: '🙏',
    title: 'Gebetsanliegen',
    body: 'Wenn du auf eine Person tippst, öffnet sich ihr Profil. Dort kannst du konkrete Gebetsanliegen erfassen – privat oder mit anderen geteilt.',
    route: '/',
    onEnter: () => window.dispatchEvent(new Event('tour-open-person')),
  },
  {
    type: 'center',
    icon: '➕',
    title: 'Anliegen erstellen',
    body: 'Tippe auf „+ Anliegen" um ein neues Gebet hinzuzufügen. Du kannst einen Titel und eine Beschreibung eingeben und festlegen, ob andere es sehen sollen.',
    route: '/',
  },
  {
    type: 'center',
    icon: '📖',
    title: 'Story Line',
    body: 'Weiter unten im Profil findest du die Story Line. Halte hier besondere Momente, Gespräche oder Meilensteine mit dieser Person fest.',
    route: '/',
  },
  {
    type: 'center',
    icon: '🌱',
    title: 'Impact Map',
    body: 'Die Impact Map zeigt die geistliche Reise der Person – von ersten Berührungspunkten mit dem Glauben bis zur Jesus-Nachfolge. Du begleitest sie auf dem Weg.',
    route: '/',
  },
  {
    type: 'center',
    icon: '🔗',
    title: 'Account verknüpfen',
    body: 'Hat diese Person auch die OIKOS App? Verknüpfe ihren Account, um ihre eigene Map in deiner anzuzeigen und noch tiefer verbunden zu sein.',
    route: '/',
    onLeave: () => window.dispatchEvent(new Event('tour-close-person')),
  },
  {
    type: 'element',
    selector: '.tour-nav-prayer',
    placement: 'above',
    title: 'Beten Tab',
    body: 'Hier findest du alle geteilten Gebetsanliegen – deine eigenen und die deiner Geschwister und Community. Bete mit, hinterlasse Notizen.',
    route: '/prayer',
  },
  {
    type: 'element',
    selector: '.tour-nav-friends',
    placement: 'above',
    title: 'Geschwister & Chats',
    body: 'Finde andere Christen in der App, vernetze dich, schreib Nachrichten und gründe oder tritt Communities bei.',
    route: '/friends',
  },
  {
    type: 'element',
    selector: '.tour-nav-notifications',
    placement: 'above',
    title: 'Aktivitäten',
    body: 'Hier siehst du alles auf einem Blick: wenn jemand für dein Anliegen betet, dir schreibt oder du eine Einladung erhältst.',
    route: '/notifications',
  },
  {
    type: 'element',
    selector: '.tour-nav-profile',
    placement: 'above',
    title: 'Dein Profil',
    body: 'Passe dein Profil an, verwalte Benachrichtigungen und starte diesen Rundgang jederzeit neu – ganz unten im Profil.',
    route: '/profile',
  },
  {
    type: 'center',
    icon: '🎉',
    title: 'Du bist startklar!',
    body: 'Jetzt kennst du alle wichtigen Funktionen von OIKOS. Füge deine ersten Personen hinzu und begleite sie im Gebet. Gott segne dich auf dem Weg!',
    route: '/profile',
    isLast: true,
  },
]

// ─── SVG Spotlight Overlay ────────────────────────────────────
function SpotlightOverlay({ rect }) {
  if (!rect) return <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(44,36,22,0.78)', zIndex: 9998 }} />
  const pad = 10
  const x = rect.left - pad
  const y = rect.top - pad
  const w = rect.width + pad * 2
  const h = rect.height + pad * 2
  const r = 14
  return (
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="oikos-spotlight">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(44,36,22,0.78)" mask="url(#oikos-spotlight)" />
      {/* Glow ring */}
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={r + 2}
        fill="none" stroke="var(--color-accent)" strokeWidth="2.5" opacity="0.9" />
    </svg>
  )
}

// ─── Arrow indicator ──────────────────────────────────────────
function Arrow({ placement }) {
  const isAbove = placement === 'above'
  return (
    <div style={{
      position: 'absolute',
      [isAbove ? 'bottom' : 'top']: -10,
      left: '50%', transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: '10px solid transparent',
      borderRight: '10px solid transparent',
      [isAbove ? 'borderTop' : 'borderBottom']: '10px solid white',
    }} />
  )
}

// ─── Progress dots ─────────────────────────────────────────────
function ProgressDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 6, height: 6,
          borderRadius: 3, transition: 'all 0.3s',
          backgroundColor: i === current ? 'var(--color-accent)' : 'var(--color-warm-3)',
        }} />
      ))}
    </div>
  )
}

// ─── Tooltip Card ─────────────────────────────────────────────
function TooltipCard({ step, rect, stepNum, total, onNext, onSkip }) {
  const isCenter = step.type === 'center'
  const CARD_WIDTH = 300
  const PAD = 16
  const ARROW_H = 12

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: '22px 22px 18px',
    width: CARD_WIDTH,
    boxShadow: '0 12px 40px rgba(44,36,22,0.25)',
    fontFamily: 'Lora, serif',
    position: 'relative',
  }

  // Position tooltip relative to element
  let wrapStyle = {}
  if (!isCenter && rect) {
    const isAbove = step.placement === 'above'
    let top = isAbove ? rect.top - PAD - ARROW_H : rect.bottom + PAD + ARROW_H
    let left = rect.left + rect.width / 2 - CARD_WIDTH / 2

    // Clamp horizontally
    left = Math.max(12, Math.min(left, window.innerWidth - CARD_WIDTH - 12))
    // Clamp vertically
    if (isAbove) top = Math.max(12, top - 180) // rough card height
    else top = Math.min(top, window.innerHeight - 220)

    wrapStyle = { position: 'fixed', top, left, zIndex: 9999, width: CARD_WIDTH }
  } else {
    wrapStyle = {
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', pointerEvents: 'none',
    }
  }

  const inner = (
    <div style={{ ...cardStyle, pointerEvents: 'all' }}>
      {!isCenter && rect && <Arrow placement={step.placement} />}

      <ProgressDots total={total} current={stepNum} />

      {step.icon && (
        <div style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>{step.icon}</div>
      )}

      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, lineHeight: 1.3 }}>
        {step.title}
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
        {step.body}
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={onSkip}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer' }}
        >
          Überspringen
        </button>
        <button
          onClick={onNext}
          style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {step.isLast ? '🎉 Los geht\'s!' : 'Weiter →'}
        </button>
      </div>
    </div>
  )

  if (!isCenter && rect) return <div style={wrapStyle}>{inner}</div>
  return <div style={wrapStyle}>{inner}</div>
}

// ─── Main Tutorial Component ───────────────────────────────────
export default function OnboardingTutorial() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Auto-show on first login
  useEffect(() => {
    if (!user) return
    const key = `oikos_tutorial_seen_${user.id}`
    if (!localStorage.getItem(key)) {
      setTimeout(() => { if (mountedRef.current) setRun(true) }, 1200)
    }
  }, [user])

  // Listen for manual trigger from ProfileView
  useEffect(() => {
    const handler = () => {
      setStepIndex(0)
      setTargetRect(null)
      setRun(true)
      navigate('/')
      setTimeout(() => window.dispatchEvent(new Event('tour-close-person')), 100)
    }
    window.addEventListener('show-tutorial', handler)
    return () => window.removeEventListener('show-tutorial', handler)
  }, [navigate])

  // Measure target element when step changes
  useEffect(() => {
    if (!run) return
    const step = STEPS[stepIndex]

    // Fire onEnter side-effect
    if (step.onEnter) step.onEnter()

    // Navigate to correct route
    navigate(step.route)

    if (step.type !== 'element') {
      setTargetRect(null)
      return
    }

    // Poll for element (may need time to render after navigate)
    let attempts = 0
    const maxAttempts = 15

    const measure = () => {
      if (!mountedRef.current) return
      const el = document.querySelector(step.selector)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0) {
          setTargetRect(rect)
          return
        }
      }
      attempts++
      if (attempts < maxAttempts) setTimeout(measure, 150)
    }

    setTimeout(measure, 200)
  }, [stepIndex, run, navigate])

  const finish = useCallback(() => {
    setRun(false)
    setTargetRect(null)
    window.dispatchEvent(new Event('tour-close-person'))
    if (user) localStorage.setItem(`oikos_tutorial_seen_${user.id}`, 'true')
  }, [user])

  const handleNext = useCallback(() => {
    const step = STEPS[stepIndex]
    if (step.onLeave) step.onLeave()

    if (stepIndex >= STEPS.length - 1) {
      finish()
      return
    }
    setTargetRect(null)
    setStepIndex(i => i + 1)
  }, [stepIndex, finish])

  const handleSkip = useCallback(() => {
    finish()
  }, [finish])

  if (!run || !user) return null

  const step = STEPS[stepIndex]
  const showSpotlight = step.type === 'element'

  return (
    <>
      {/* Click-blocker overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9997, cursor: 'default' }}
        onClick={handleNext}
      />

      {/* Spotlight */}
      <SpotlightOverlay rect={showSpotlight ? targetRect : null} />

      {/* Tooltip */}
      <TooltipCard
        step={step}
        rect={showSpotlight ? targetRect : null}
        stepNum={stepIndex}
        total={STEPS.length}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </>
  )
}
