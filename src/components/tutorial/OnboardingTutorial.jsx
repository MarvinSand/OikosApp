import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// ─── Steps ────────────────────────────────────────────────────
// selector:   CSS selector to spotlight + position card near
// scrollTo:   scroll this element into view before measuring
// placement:  'above' | 'below' | 'top' | 'bottom'
// action:     'createPerson'|'createPrayer'|'createStoryline'|'openPerson'
// onEnter:    'closePerson'|'openPerson'|'reopenPerson'
const STEPS = [
  {
    icon: '👋', title: 'Willkommen bei OIKOS!',
    body: 'Wir machen einen interaktiven Rundgang – mit echten Testdaten die du am Ende behalten oder löschen kannst.',
    placement: 'top', route: '/', onEnter: 'closePerson',
  },
  {
    icon: '🗺️', title: 'Deine OIKOS Map',
    body: 'Das ist das Herzstück der App. Hier erfasst du Menschen aus deinem Umfeld und begleitest sie im Gebet.',
    selector: '.tour-nav-map', placement: 'above', route: '/',
  },
  {
    icon: '👤', title: 'Person hinzufügen',
    body: 'Mit diesem Button fügst du Personen zu deiner Map hinzu. Wir legen jetzt Maria als Testperson an.',
    selector: '.tour-map-add', placement: 'below', route: '/',
    action: 'createPerson', actionLabel: '👤 Maria anlegen',
  },
  {
    icon: '🗺️', title: 'Maria ist auf der Map!',
    body: 'Maria erscheint jetzt auf deiner OIKOS Map. Tippe auf "Weiter" um ihr Profil zu öffnen.',
    placement: 'bottom', route: '/',
  },
  {
    icon: '👤', title: 'Marias Profil',
    body: 'Das ist Marias Profil. Hier findest du Gebetsanliegen, Story Line und Impact Map – scrolle durch das Profil um alles zu sehen.',
    placement: 'bottom', route: '/', onEnter: 'openPerson',
  },
  {
    icon: '🙏', title: 'Gebetsanliegen',
    body: 'Hier trägst du konkrete Gebetsanliegen ein – privat für dich oder mit Geschwistern geteilt. Wir legen ein Beispiel-Anliegen an.',
    selector: '.tour-person-prayer', scrollTo: '.tour-person-prayer', placement: 'above', route: '/',
    action: 'createPrayer', actionLabel: '🙏 Anliegen anlegen',
  },
  {
    icon: '✅', title: 'Anliegen gespeichert!',
    body: 'Das Gebetsanliegen erscheint jetzt in Marias Profil. Du kannst es als beantwortet markieren, bearbeiten oder löschen.',
    selector: '.tour-person-prayer', scrollTo: '.tour-person-prayer', placement: 'above', route: '/',
    onEnter: 'reopenPerson',
  },
  {
    icon: '📖', title: 'Story Line',
    body: 'Die Story Line hält wichtige Gespräche, Momente und Meilensteine mit Maria fest. Wir legen einen Beispiel-Eintrag an.',
    selector: '.tour-person-storyline', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
    action: 'createStoryline', actionLabel: '📖 Eintrag anlegen',
  },
  {
    icon: '✅', title: 'Eintrag gespeichert!',
    body: 'Der Eintrag erscheint in der Story Line. So dokumentierst du Marias Reise – Schritt für Schritt.',
    selector: '.tour-person-storyline', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
    onEnter: 'reopenPerson',
  },
  {
    icon: '🌱', title: 'Impact Map',
    body: 'Die Impact Map zeigt Marias geistliche Reise – von ersten Berührungspunkten bis zur Jesus-Nachfolge. Maria ist auf Stufe 2: Neugier auf den Glauben.',
    selector: '.tour-person-impact', scrollTo: '.tour-person-impact', placement: 'above', route: '/',
  },
  {
    icon: '🔗', title: 'Account verknüpfen',
    body: 'Hat Maria auch die OIKOS App? Verknüpfe ihren Account – dann siehst du ihre eigene Map in deiner und seid noch tiefer verbunden.',
    selector: '.tour-person-link', scrollTo: '.tour-person-link', placement: 'above', route: '/',
  },
  {
    icon: '🙏', title: 'Beten Tab',
    body: 'Hier findest du alle geteilten Gebete – deine eigenen und die deiner Geschwister. Du kannst mitbeten und Notizen hinterlassen.',
    selector: '.tour-nav-prayer', placement: 'above', route: '/prayer', onEnter: 'closePerson',
  },
  {
    icon: '👥', title: 'Geschwister & Chats',
    body: 'Finde andere Christen in der App, schreib ihnen, gründe Communities oder tritt bestehenden bei.',
    selector: '.tour-nav-friends', placement: 'above', route: '/friends',
  },
  {
    icon: '🔔', title: 'Aktivitäten',
    body: 'Alle Updates auf einen Blick: wenn jemand für dein Anliegen betet, dir schreibt oder eine Einladung schickt.',
    selector: '.tour-nav-notifications', placement: 'above', route: '/notifications',
  },
  {
    icon: '⚙️', title: 'Dein Profil',
    body: 'Passe dein Profil an, verwalte Benachrichtigungen und starte diesen Rundgang jederzeit neu – ganz unten im Profil.',
    selector: '.tour-nav-profile', placement: 'above', route: '/profile',
  },
  {
    icon: '🎉', title: 'Du bist startklar!',
    body: 'Marias Daten sind gespeichert. Du kannst sie als echte Person behalten oder die Testdaten löschen.',
    placement: 'top', route: '/profile', isLast: true,
  },
]

// ─── Supabase helpers ─────────────────────────────────────────
async function getOrCreateMap(userId) {
  const { data } = await supabase.from('oikos_maps').select('id').eq('user_id', userId).order('created_at').limit(1)
  if (data?.length > 0) return data[0].id
  const { data: m } = await supabase.from('oikos_maps')
    .insert({ user_id: userId, name: 'Mein OIKOS', visibility: 'private', visibility_user_ids: [], visibility_community_id: null })
    .select('id').single()
  return m.id
}

async function doAction(action, user, testData, setTestData) {
  if (action === 'createPerson') {
    const mapId = await getOrCreateMap(user.id)
    const { data: person } = await supabase.from('oikos_people')
      .insert({ map_id: mapId, user_id: user.id, name: 'Maria (Tutorial)', relationship_type: 'Freund/in', is_christian: false, impact_stage: 2, notes: 'Beispiel-Person für das Tutorial.' })
      .select().single()
    setTestData(d => ({ ...d, mapId, person }))
    window.dispatchEvent(new Event('tour-reload-map'))
    return { mapId, person }
  }
  if (action === 'createPrayer') {
    const { data: req } = await supabase.from('prayer_requests')
      .insert({ person_id: testData.person.id, owner_id: user.id, title: 'Marias Offenheit für den Glauben', description: 'Bitte bete, dass Maria offen wird für Gespräche über Gott.', is_public: false, is_answered: false })
      .select().single()
    setTestData(d => ({ ...d, prayerRequest: req }))
    return req
  }
  if (action === 'createStoryline') {
    const { data: entry } = await supabase.from('person_storyline')
      .insert({ person_id: testData.person.id, owner_id: user.id, text: 'Wir haben heute über den Sinn des Lebens gesprochen – Maria war sehr offen und stellte viele Fragen.', entry_date: new Date().toISOString().split('T')[0], is_public: false })
      .select().single()
    setTestData(d => ({ ...d, storylineEntry: entry }))
    return entry
  }
}

async function deleteTutorialData(testData) {
  if (testData.person?.id) await supabase.from('oikos_people').delete().eq('id', testData.person.id)
}

// ─── SVG Spotlight ────────────────────────────────────────────
function Spotlight({ rect }) {
  if (!rect) return <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(44,36,22,0.72)', zIndex: 9998 }} />
  const pad = 8, r = 12
  const x = rect.left - pad, y = rect.top - pad, w = rect.width + pad * 2, h = rect.height + pad * 2
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }}>
      <defs>
        <mask id="t-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(44,36,22,0.72)" mask="url(#t-mask)" />
      <rect x={x-2} y={y-2} width={w+4} height={h+4} rx={r+2} fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── Tutorial Card ────────────────────────────────────────────
const W = 248

function TutorialCard({ step, rect, stepNum, total, loading, onAction, onNext, onSkip, onKeep, onDelete }) {
  const isDone = step.isLast

  // Calculate position
  let style = { position: 'fixed', zIndex: 9999, width: W }

  if (rect && step.selector && step.placement !== 'top' && step.placement !== 'bottom') {
    const gap = 12
    const CARD_H = 200  // estimated
    const vw = window.innerWidth

    if (step.placement === 'above') {
      let top = rect.top - gap - CARD_H
      if (top < 60) top = rect.bottom + gap  // flip below if no space
      let left = rect.left + rect.width / 2 - W / 2
      left = Math.max(12, Math.min(left, vw - W - 12))
      style = { ...style, top, left }
    } else { // below
      let top = rect.bottom + gap
      let left = rect.left + rect.width / 2 - W / 2
      left = Math.max(12, Math.min(left, vw - W - 12))
      style = { ...style, top, left }
    }
  } else if (step.placement === 'bottom') {
    style = { ...style, bottom: 90, left: '50%', transform: 'translateX(-50%)' }
  } else {
    // top (default for no-element steps)
    style = { ...style, top: 16, left: '50%', transform: 'translateX(-50%)' }
  }

  // Arrow direction
  const arrowOnBottom = rect && step.placement === 'above' && style.top < rect.top
  const arrowOnTop    = rect && step.placement === 'below'

  return (
    <div style={style}>
      {/* Arrow pointing at element */}
      {arrowOnBottom && (
        <div style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid white' }} />
      )}
      {arrowOnTop && (
        <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid white' }} />
      )}

      <div style={{ backgroundColor: 'white', borderRadius: 18, padding: '16px 18px 14px', boxShadow: '0 12px 40px rgba(44,36,22,0.28)', fontFamily: 'Lora, serif' }}>
        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((stepNum + 1) / total) * 100}%`, backgroundColor: 'var(--color-accent)', borderRadius: 2, transition: 'width 0.4s' }} />
        </div>

        {step.icon && <div style={{ fontSize: 22, marginBottom: 6 }}>{step.icon}</div>}

        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.3 }}>{step.title}</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 14 }}>{step.body}</p>

        {isDone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button onClick={onKeep} style={btn('primary')}>✅ Daten behalten</button>
            <button onClick={onDelete} style={btn('danger')}>🗑️ Testdaten löschen</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={onSkip} style={{ ...btn('ghost'), flex: 1 }}>Überspringen</button>
            {step.action ? (
              <button onClick={onAction} disabled={loading} style={{ ...btn('primary'), flex: 2 }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Spin /><span>Anlegen…</span></span>
                  : (step.actionLabel || 'Anlegen →')}
              </button>
            ) : (
              <button onClick={onNext} style={{ ...btn('primary'), flex: 2 }}>Weiter →</button>
            )}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--color-text-light)', marginTop: 8 }}>{stepNum + 1} / {total}</p>
      </div>
    </div>
  )
}

const btn = (v) => {
  const base = { padding: '9px 0', borderRadius: 9, fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', width: '100%' }
  if (v === 'primary') return { ...base, backgroundColor: 'var(--color-warm-1)', color: 'white' }
  if (v === 'danger')  return { ...base, background: 'none', border: '1.5px solid #E8C0B8', color: '#C0392B' }
  return { ...base, background: 'none', border: '1.5px solid var(--color-warm-3)', color: 'var(--color-text-muted)' }
}

function Spin() {
  return <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', animation: 'tspin 0.7s linear infinite', flexShrink: 0 }} />
}

// ─── Scroll helper ────────────────────────────────────────────
function scrollToEl(selector, cb, delay = 700) {
  const el = document.querySelector(selector)
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  setTimeout(cb, delay)
}

// ─── Main ─────────────────────────────────────────────────────
export default function OnboardingTutorial() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [run, setRun]           = useState(false)
  const [idx, setIdx]           = useState(0)
  const [rect, setRect]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [testData, setTestData] = useState({})
  const mounted = useRef(true)
  const testDataRef = useRef(testData)

  useEffect(() => { testDataRef.current = testData }, [testData])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // First-login auto-show
  useEffect(() => {
    if (!user) return
    if (!localStorage.getItem(`oikos_tutorial_seen_${user.id}`)) {
      setTimeout(() => { if (mounted.current) setRun(true) }, 1200)
    }
  }, [user])

  // Manual trigger from Profile
  useEffect(() => {
    const h = () => {
      setIdx(0); setRect(null); setTestData({}); setRun(true)
      navigate('/')
      setTimeout(() => window.dispatchEvent(new Event('tour-close-person')), 100)
    }
    window.addEventListener('show-tutorial', h)
    return () => window.removeEventListener('show-tutorial', h)
  }, [navigate])

  // Run side-effects + measure when step changes
  const enterStep = useCallback((stepIndex) => {
    if (!mounted.current) return
    const step = STEPS[stepIndex]
    navigate(step.route)

    // onEnter side-effects
    if (step.onEnter === 'closePerson') {
      window.dispatchEvent(new Event('tour-close-person'))
    } else if (step.onEnter === 'openPerson') {
      const person = testDataRef.current.person
      if (person) setTimeout(() => window.dispatchEvent(new CustomEvent('tour-open-person', { detail: { person } })), 350)
    } else if (step.onEnter === 'reopenPerson') {
      const person = testDataRef.current.person
      if (person) {
        window.dispatchEvent(new Event('tour-close-person'))
        setTimeout(() => window.dispatchEvent(new CustomEvent('tour-open-person', { detail: { person } })), 500)
      }
    }

    setRect(null)
    if (!step.selector) return

    // Scroll into view first, then measure
    const measure = () => {
      if (!mounted.current) return
      const el = document.querySelector(step.selector)
      if (!el) { setTimeout(measure, 200); return }
      const r = el.getBoundingClientRect()
      if (r.width === 0) { setTimeout(measure, 200); return }
      setRect(r)
    }

    if (step.scrollTo) {
      scrollToEl(step.scrollTo, measure, 650)
    } else {
      setTimeout(measure, 300)
    }
  }, [navigate])

  useEffect(() => { if (run) enterStep(idx) }, [idx, run]) // eslint-disable-line

  const advance = useCallback(() => {
    if (!mounted.current) return
    setRect(null)
    setIdx(i => i + 1)
  }, [])

  const handleAction = useCallback(async () => {
    const step = STEPS[idx]
    if (!step.action) return
    setLoading(true)
    try {
      const result = await doAction(step.action, user, testDataRef.current, setTestData)
      // After createPerson: open person on NEXT step via onEnter, but update ref now
      if (step.action === 'createPerson' && result?.person) {
        testDataRef.current = { ...testDataRef.current, mapId: result.mapId, person: result.person }
      }
      if (mounted.current) advance()
    } catch (e) { console.error('Tutorial action error:', e) }
    finally { if (mounted.current) setLoading(false) }
  }, [idx, user, advance])

  const finish = useCallback((keep = true) => {
    setRun(false); setRect(null)
    window.dispatchEvent(new Event('tour-close-person'))
    if (user) localStorage.setItem(`oikos_tutorial_seen_${user.id}`, 'true')
    if (!keep) deleteTutorialData(testDataRef.current)
  }, [user])

  if (!run || !user) return <style>{`@keyframes tspin{to{transform:rotate(360deg)}}`}</style>

  const step = STEPS[idx]

  return (
    <>
      <style>{`@keyframes tspin{to{transform:rotate(360deg)}}`}</style>

      {/* Click-through blocker (advances on tap for non-action steps) */}
      {!step.action && !step.isLast && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={advance} />
      )}

      <Spotlight rect={step.selector && rect ? rect : null} />

      <TutorialCard
        step={step}
        rect={rect}
        stepNum={idx}
        total={STEPS.length}
        loading={loading}
        onAction={handleAction}
        onNext={advance}
        onSkip={() => finish(true)}
        onKeep={() => finish(true)}
        onDelete={() => finish(false)}
      />
    </>
  )
}
