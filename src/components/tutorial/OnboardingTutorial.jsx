import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// ─── Step Definitions ─────────────────────────────────────────
// type: 'center' | 'element'
// action: 'createPerson' | 'createPrayer' | 'createStoryline' (runs when "Weiter" clicked)
// onEnter: 'openPerson' | 'reopenPerson' | 'closePerson' (runs on step enter)
const STEPS = [
  {
    type: 'center', icon: '👋',
    title: 'Willkommen bei OIKOS!',
    body: 'Wir machen einen interaktiven Rundgang – mit echten Testdaten, die du am Ende behalten oder löschen kannst.',
    route: '/', onEnter: 'closePerson',
  },
  {
    type: 'element', selector: '.tour-nav-map',
    placement: 'above',
    title: 'Deine OIKOS Map',
    body: 'Das ist das Herzstück der App. Hier erfasst du Menschen aus deinem Umfeld und begleitest sie im Gebet.',
    route: '/',
  },
  {
    type: 'center', icon: '👤',
    title: 'Testperson anlegen',
    body: 'Wir fügen jetzt „Maria" als Beispiel-Person zu deiner Map hinzu – genau so, wie du es später für echte Personen machst.',
    route: '/', action: 'createPerson',
    actionLabel: '👤 Maria anlegen',
  },
  {
    type: 'center', icon: '🗺️',
    title: 'Maria ist auf deiner Map!',
    body: 'Maria erscheint jetzt auf deiner OIKOS Map. Wenn du auf eine Person tippst, öffnet sich ihr Profil – genau das passiert jetzt.',
    route: '/', onEnter: 'openPerson',
  },
  {
    type: 'center', icon: '🙏',
    title: 'Gebetsanliegen',
    body: 'Im Profil einer Person kannst du konkrete Gebetsanliegen erfassen – privat für dich oder mit Geschwistern geteilt. Wir legen ein Beispiel-Anliegen für Maria an.',
    route: '/', action: 'createPrayer',
    actionLabel: '🙏 Anliegen anlegen',
  },
  {
    type: 'center', icon: '✅',
    title: 'Anliegen gespeichert!',
    body: 'Das Gebetsanliegen wurde gespeichert und erscheint in Marias Profil. Du kannst es als beantwortet markieren, bearbeiten oder löschen.',
    route: '/', onEnter: 'reopenPerson',
  },
  {
    type: 'center', icon: '📖',
    title: 'Story Line',
    body: 'Weiter unten im Profil findest du die Story Line. Halte besondere Gespräche, Momente oder Meilensteine fest. Wir tragen ein Beispiel ein.',
    route: '/', action: 'createStoryline',
    actionLabel: '📖 Eintrag anlegen',
  },
  {
    type: 'center', icon: '✅',
    title: 'Eintrag gespeichert!',
    body: 'Der Story-Line-Eintrag ist gespeichert. So dokumentierst du Marias Reise – Schritt für Schritt.',
    route: '/', onEnter: 'reopenPerson',
  },
  {
    type: 'center', icon: '🌱',
    title: 'Impact Map',
    body: 'Die Impact Map zeigt die geistliche Reise einer Person – von „Noch kein Kontakt" bis zur „Jesus-Nachfolge". Maria ist auf Stufe 2: Neugier auf den Glauben.',
    route: '/',
  },
  {
    type: 'center', icon: '🔗',
    title: 'Account verknüpfen',
    body: 'Hat Maria auch die OIKOS App? Dann kannst du ihren Account verknüpfen – so siehst du ihre eigene Map in deiner und bleibt noch tiefer verbunden.',
    route: '/', onEnter: 'closePerson',
  },
  {
    type: 'element', selector: '.tour-nav-prayer',
    placement: 'above',
    title: 'Beten Tab',
    body: 'Hier findest du alle geteilten Gebetsanliegen – deine eigenen und die deiner Geschwister. Du kannst für Anliegen beten und Notizen hinterlassen.',
    route: '/prayer',
  },
  {
    type: 'element', selector: '.tour-nav-friends',
    placement: 'above',
    title: 'Geschwister & Chats',
    body: 'Finde andere Christen in der App, schreib ihnen Nachrichten, gründe Communities oder tritt bestehenden bei.',
    route: '/friends',
  },
  {
    type: 'element', selector: '.tour-nav-notifications',
    placement: 'above',
    title: 'Aktivitäten',
    body: 'Hier siehst du alle Updates: wenn jemand für dein Anliegen betet, eine Anfrage schickt oder du eingeladen wirst.',
    route: '/notifications',
  },
  {
    type: 'element', selector: '.tour-nav-profile',
    placement: 'above',
    title: 'Dein Profil',
    body: 'Passe dein Profil an, verwalte Benachrichtigungen und starte diesen Rundgang jederzeit neu – ganz unten im Profil.',
    route: '/profile',
  },
  {
    type: 'done', icon: '🎉',
    title: 'Du bist startklar!',
    body: 'Marias Testdaten sind gespeichert. Du kannst sie als echte Person behalten oder löschen.',
    route: '/profile', isLast: true,
  },
]

// ─── Supabase helpers ─────────────────────────────────────────
async function getOrCreateMap(userId) {
  const { data: maps } = await supabase
    .from('oikos_maps')
    .select('id')
    .eq('user_id', userId)
    .order('created_at')
    .limit(1)
  if (maps?.length > 0) return maps[0].id
  const { data: newMap, error } = await supabase
    .from('oikos_maps')
    .insert({ user_id: userId, name: 'Mein OIKOS', visibility: 'private', visibility_user_ids: [], visibility_community_id: null })
    .select('id').single()
  if (error) throw error
  return newMap.id
}

async function runAction(action, user, testData, setTestData) {
  if (action === 'createPerson') {
    const mapId = await getOrCreateMap(user.id)
    const { data: person, error } = await supabase
      .from('oikos_people')
      .insert({
        map_id: mapId, user_id: user.id,
        name: 'Maria (Tutorial)',
        relationship_type: 'Freund/in',
        is_christian: false,
        impact_stage: 2,
        notes: 'Diese Person wurde für das Tutorial erstellt.',
      })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, mapId, person }))
    return { mapId, person }
  }

  if (action === 'createPrayer') {
    const { data: req, error } = await supabase
      .from('prayer_requests')
      .insert({
        person_id: testData.person.id,
        owner_id: user.id,
        title: 'Marias Offenheit für den Glauben',
        description: 'Bitte bete, dass Maria offen wird für Gespräche über Gott und den Glauben.',
        is_public: false,
        is_answered: false,
      })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, prayerRequest: req }))
    return req
  }

  if (action === 'createStoryline') {
    const today = new Date().toISOString().split('T')[0]
    const { data: entry, error } = await supabase
      .from('person_storyline')
      .insert({
        person_id: testData.person.id,
        owner_id: user.id,
        text: 'Wir haben heute über den Sinn des Lebens gesprochen. Maria war sehr offen und stellte viele Fragen.',
        entry_date: today,
        is_public: false,
      })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, storylineEntry: entry }))
    return entry
  }
}

async function deleteTestData(testData) {
  if (!testData.person?.id) return
  // Deleting the person cascades to prayer_requests and person_storyline
  await supabase.from('oikos_people').delete().eq('id', testData.person.id)
}

// ─── SVG Spotlight ────────────────────────────────────────────
function SpotlightOverlay({ rect }) {
  if (!rect) {
    return <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(44,36,22,0.78)', zIndex: 9998 }} />
  }
  const pad = 10
  const x = rect.left - pad, y = rect.top - pad
  const w = rect.width + pad * 2, h = rect.height + pad * 2
  const r = 14
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }}>
      <defs>
        <mask id="oikos-spot">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(44,36,22,0.78)" mask="url(#oikos-spot)" />
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={r + 2}
        fill="none" stroke="var(--color-accent)" strokeWidth="2.5" opacity="0.9" />
    </svg>
  )
}

// ─── Progress bar ─────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', marginBottom: 18, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${((current + 1) / total) * 100}%`, backgroundColor: 'var(--color-accent)', borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ─── Tooltip / Card ───────────────────────────────────────────
function Card({ step, rect, stepNum, total, onAction, onNext, onSkip, onKeep, onDelete, loading }) {
  const isCenter = step.type === 'center' || step.type === 'done' || !rect
  const isDone = step.type === 'done'
  const CARD_W = 300

  const cardContent = (
    <div style={{
      backgroundColor: 'white', borderRadius: 20, padding: '22px 22px 18px',
      boxShadow: '0 16px 48px rgba(44,36,22,0.28)', fontFamily: 'Lora, serif',
      width: CARD_W, position: 'relative',
    }}>
      {/* Arrow for element steps */}
      {!isCenter && rect && (
        <div style={{
          position: 'absolute',
          [step.placement === 'above' ? 'bottom' : 'top']: -10,
          left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
          [step.placement === 'above' ? 'borderTop' : 'borderBottom']: '10px solid white',
        }} />
      )}

      <ProgressBar current={stepNum} total={total} />

      {step.icon && <div style={{ fontSize: 30, textAlign: 'center', marginBottom: 10 }}>{step.icon}</div>}

      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, lineHeight: 1.3 }}>
        {step.title}
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: 18 }}>
        {step.body}
      </p>

      {/* Done step: keep / delete */}
      {isDone ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onKeep} style={btnStyle('primary')}>
            ✅ Marias Daten behalten
          </button>
          <button onClick={onDelete} style={btnStyle('danger')}>
            🗑️ Testdaten löschen
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSkip} style={{ ...btnStyle('ghost'), flex: 1 }}>
            Überspringen
          </button>
          {step.action ? (
            <button onClick={onAction} disabled={loading} style={{ ...btnStyle('primary'), flex: 2 }}>
              {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Spinner /> Anlegen…</span> : step.actionLabel || 'Anlegen →'}
            </button>
          ) : (
            <button onClick={onNext} style={{ ...btnStyle('primary'), flex: 2 }}>
              Weiter →
            </button>
          )}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-light)', marginTop: 10 }}>
        {stepNum + 1} / {total}
      </p>
    </div>
  )

  // Position for element steps
  if (!isCenter && rect) {
    const isAbove = step.placement === 'above'
    let top = isAbove ? rect.top - 12 - 240 : rect.bottom + 12
    let left = rect.left + rect.width / 2 - CARD_W / 2
    left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12))
    top = Math.max(12, Math.min(top, window.innerHeight - 260))
    return <div style={{ position: 'fixed', top, left, zIndex: 9999, width: CARD_W }}>{cardContent}</div>
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'all', width: CARD_W }}>{cardContent}</div>
    </div>
  )
}

function btnStyle(variant) {
  const base = { padding: '11px 0', borderRadius: 10, fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', width: '100%' }
  if (variant === 'primary') return { ...base, backgroundColor: 'var(--color-warm-1)', color: 'white' }
  if (variant === 'danger')  return { ...base, backgroundColor: 'transparent', border: '1.5px solid #E8C0B8', color: '#C0392B' }
  return { ...base, backgroundColor: 'transparent', border: '1.5px solid var(--color-warm-3)', color: 'var(--color-text-muted)' }
}

function Spinner() {
  return (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'tutorialSpin 0.7s linear infinite' }} />
  )
}

// ─── Main Component ────────────────────────────────────────────
export default function OnboardingTutorial() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testData, setTestData] = useState({})
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // First login auto-show
  useEffect(() => {
    if (!user) return
    const key = `oikos_tutorial_seen_${user.id}`
    if (!localStorage.getItem(key)) {
      setTimeout(() => { if (mounted.current) setRun(true) }, 1200)
    }
  }, [user])

  // Manual trigger from Profile
  useEffect(() => {
    const handler = () => {
      setStepIndex(0)
      setTargetRect(null)
      setTestData({})
      setRun(true)
      navigate('/')
      setTimeout(() => window.dispatchEvent(new Event('tour-close-person')), 100)
    }
    window.addEventListener('show-tutorial', handler)
    return () => window.removeEventListener('show-tutorial', handler)
  }, [navigate])

  // Run onEnter side-effects and measure element when step changes
  useEffect(() => {
    if (!run) return
    const step = STEPS[stepIndex]

    navigate(step.route)

    // Side effects on step enter
    if (step.onEnter === 'closePerson') {
      window.dispatchEvent(new Event('tour-close-person'))
    } else if (step.onEnter === 'openPerson' && testData.person) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('tour-open-person', { detail: { person: testData.person } }))
      }, 300)
    } else if (step.onEnter === 'reopenPerson' && testData.person) {
      window.dispatchEvent(new Event('tour-close-person'))
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('tour-open-person', { detail: { person: testData.person } }))
      }, 500)
    }

    // Measure target element
    if (step.type !== 'element') { setTargetRect(null); return }
    let tries = 0
    const poll = () => {
      if (!mounted.current) return
      const el = document.querySelector(step.selector)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0) { setTargetRect(r); return }
      }
      if (++tries < 15) setTimeout(poll, 150)
    }
    setTimeout(poll, 250)
  }, [stepIndex, run]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (!mounted.current) return
    setTargetRect(null)
    setStepIndex(i => i + 1)
  }, [])

  const handleAction = useCallback(async () => {
    const step = STEPS[stepIndex]
    if (!step.action) return
    setLoading(true)
    try {
      const result = await runAction(step.action, user, testData, setTestData)
      // After createPerson: open the sheet with the new person
      if (step.action === 'createPerson' && result?.person) {
        window.dispatchEvent(new CustomEvent('tour-open-person', { detail: { person: result.person } }))
      }
      advance()
    } catch (err) {
      console.error('Tutorial action error:', err)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [stepIndex, user, testData, advance])

  const finish = useCallback((keepData = true) => {
    setRun(false)
    setTargetRect(null)
    window.dispatchEvent(new Event('tour-close-person'))
    if (user) localStorage.setItem(`oikos_tutorial_seen_${user.id}`, 'true')
    if (!keepData) deleteTestData(testData)
  }, [user, testData])

  const handleSkip = useCallback(() => {
    finish(true) // keep any data created so far
  }, [finish])

  if (!run || !user) return (
    <style>{`@keyframes tutorialSpin { to { transform: rotate(360deg); } }`}</style>
  )

  const step = STEPS[stepIndex]
  const showSpotlight = step.type === 'element' && targetRect

  return (
    <>
      <style>{`@keyframes tutorialSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Background click → next (for non-action steps) */}
      {!step.action && step.type !== 'done' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={advance} />
      )}

      <SpotlightOverlay rect={showSpotlight ? targetRect : null} />

      <Card
        step={step}
        rect={showSpotlight ? targetRect : null}
        stepNum={stepIndex}
        total={STEPS.length}
        loading={loading}
        onAction={handleAction}
        onNext={advance}
        onSkip={handleSkip}
        onKeep={() => finish(true)}
        onDelete={() => finish(false)}
      />
    </>
  )
}
