import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// ─── Steps ────────────────────────────────────────────────────
// selector:     CSS selector to spotlight + position card near
// scrollTo:     scroll this element into view before measuring
// placement:    'above' | 'below' | 'top' | 'bottom'
// action:       key for doAction()
// actionLabel:  label on the action button
// onEnter:      side-effect when step is entered
const STEPS = [
  // 0 – Welcome (replaces old first step with the full intro text)
  {
    icon: '🌱', title: 'Willkommen bei OIKOS!',
    body: 'Schön, dass du hier bist!\n\nOIKOS hilft dir, dein Umfeld mit neuen Augen zu sehen. Die Menschen, die Gott dir anvertraut hat, bewusster wahrzunehmen und sie im Gebet vor ihn zu bringen.\n\nSchritt für Schritt begleitet dich die App dabei, Personen in deinem Leben, die Jesus noch nicht kennen, näher zu ihm zu führen. Ganz natürlich, in deinem Alltag.\n\nGleichzeitig verbindet OIKOS dich mit deinen Glaubensgeschwistern. Auch über Entfernungen hinweg. Du siehst, wie und wo Gott in ihrem Umfeld wirkt, kennst ihre Gebetsanliegen und kannst sie geistlich mittragen. So unterstützt ihr euch gegenseitig. Verbunden im Gebet, egal wo ihr gerade seid.\n\nLass uns gemeinsam erleben, was Gott tut. 🙏',
    placement: 'top', route: '/', onEnter: 'closePerson',
  },
  // 1 – Map tab
  {
    icon: '🗺️', title: 'Die OIKOS Map',
    body: 'Das ist das Herzstück der App. Hier erfasst du Menschen aus deinem Umfeld und begleitest sie im Gebet.',
    selector: '.tour-nav-map', placement: 'above', route: '/',
  },
  // 2 – Open new map modal
  {
    icon: '➕', title: 'Erstelle deine eigene Map',
    body: 'Du kannst so viele Maps anlegen, wie du möchtest – zum Beispiel eine für deine Familie, eine für Kollegen oder eine für deine Hausgemeinde.\n\nTippe einfach oben auf den Namen deiner aktuellen Map, um das Menü zu öffnen. Dort kannst du bestehende Maps verwalten oder neue erstellen.',
    selector: '.tour-map-header', placement: 'below', route: '/',
    action: 'openNewMapModal', actionLabel: '🗺️ Neue Map öffnen',
  },
  // 3 – Explain NewMapModal (modal is open, noOverlay so it stays fully visible)
  {
    icon: '🗺️', title: 'Neue Map',
    body: 'Oben gibst du deiner Map einen Namen.\nUnten wählst du, wer sie sehen kann.\n\nWir erstellen sie jetzt für dich.',
    placement: 'bottom', route: '/',
    action: 'createTutorialMap', actionLabel: '✅ Map erstellen',
    noOverlay: true,
  },
  // 4 – + Person button → create Maria
  {
    icon: '👤', title: 'Person hinzufügen',
    body: 'Mit diesem Button fügst du Personen zu deiner Map hinzu. Wir legen jetzt "Maria" als Testperson an.',
    selector: '.tour-map-add', placement: 'below', route: '/',
    action: 'createPerson', actionLabel: '👤 Maria anlegen',
  },
  // 5 – Maria on map canvas (profile must be closed here)
  {
    icon: '🗺️', title: 'Maria ist auf der Map!',
    body: 'Du siehst jetzt Maria auf deiner OIKOS Map. Tippe auf ihren Namen um ihr Profil zu öffnen.',
    placement: 'bottom', route: '/',
    action: 'openPersonProfile', actionLabel: '👤 Profil öffnen',
    selectorFn: 'mariaNode', onEnter: 'closePerson',
  },
  // 6 – Maria's profile open (noOverlay so user can actually see the sheet)
  {
    icon: '👤', title: 'Marias Profil',
    body: 'Das ist Marias Profil. Hier findest du Gebetsanliegen, Story Line, Impact Map und mehr.\n\n💡 Tippe auf "–" um das Tutorial zu minimieren und das Profil frei zu erkunden.',
    placement: 'bottom', route: '/', onEnter: 'openPerson', noOverlay: true,
  },
  // 7 – Scroll to prayer section, click + Anliegen
  {
    icon: '🙏', title: 'Gebetsanliegen',
    body: 'Hier trägst du konkrete Gebetsanliegen für Maria ein. Wir klicken jetzt auf "+ Hinzufügen".',
    selector: '.tour-prayer-add', scrollTo: '.tour-person-prayer', placement: 'above', route: '/',
    action: 'openPrayerForm', actionLabel: '🙏 Formular öffnen',
  },
  // 8 – Prayer form explanation
  {
    icon: '🙏', title: 'Das Gebetsanliegen-Formular',
    body: 'Trage einen Titel und optional eine Beschreibung ein. Mit dem 🔒/🌐-Symbol wählst du ob das Anliegen geteilt oder nur privat für dich ist. Wir legen ein Beispiel an.',
    selector: '.tour-prayer-form', scrollTo: '.tour-prayer-form', placement: 'above', route: '/',
    action: 'createPrayer', actionLabel: '✅ Anliegen anlegen',
  },
  // 9 – Prayer saved
  {
    icon: '✅', title: 'Anliegen gespeichert!',
    body: 'Das Gebetsanliegen erscheint jetzt in Marias Profil. Du kannst es als beantwortet markieren, bearbeiten oder löschen.',
    selector: '.tour-person-prayer', scrollTo: '.tour-person-prayer', placement: 'above', route: '/',
    onEnter: 'reopenPerson',
  },
  // 10 – Storyline: click + Eintrag
  {
    icon: '📖', title: 'Story Line – Eintrag',
    body: 'Die Story Line hält wichtige Gespräche und Momente fest. Wir klicken jetzt auf "+ Eintrag".',
    selector: '.tour-storyline-add', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
    action: 'openStorylineForm', actionLabel: '📖 Formular öffnen',
  },
  // 11 – Explain date field
  {
    icon: '📅', title: 'Das Datum',
    body: 'Hier trägst du ein, wann diese Begegnung oder Erfahrung stattgefunden hat.',
    selector: '.tour-storyline-date', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
  },
  // 12 – Explain text field
  {
    icon: '✍️', title: 'Die Geschichte',
    body: 'Schreibe hier, was du erlebt, gehört oder beobachtet hast. Diese Notizen helfen dir, Marias Reise im Blick zu behalten.',
    selector: '.tour-storyline-text', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
  },
  // 13 – Explain visibility + create
  {
    icon: '🔓', title: 'Öffentlich oder Privat?',
    body: '🌐 Öffentlich – alle Geschwister mit Zugang zu dieser Map sehen den Eintrag.\n🔒 Privat – nur du siehst ihn.\n\nWir legen den Eintrag jetzt an.',
    selector: '.tour-storyline-visibility', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
    action: 'createStoryline', actionLabel: '✅ Eintrag anlegen',
  },
  // 14 – Storyline saved
  {
    icon: '✅', title: 'Eintrag gespeichert!',
    body: 'Der Eintrag erscheint jetzt in der Story Line. So dokumentierst du Marias Reise Schritt für Schritt.',
    selector: '.tour-person-storyline', scrollTo: '.tour-person-storyline', placement: 'above', route: '/',
    onEnter: 'reopenPerson',
  },
  // 15 – Impact Map
  {
    icon: '🌱', title: 'Impact Map',
    body: 'Sechs Schritte, die dich dabei begleiten, Maria bewusst im Gebet und im Alltag näher zu Jesus zu führen. Jede Stufe stellt dir eine Frage und gibt dir Raum für deine Gedanken.',
    selector: '.tour-person-impact', scrollTo: '.tour-person-impact', placement: 'above', route: '/',
  },
  // 16 – Link account
  {
    icon: '🔗', title: 'Account verknüpfen',
    body: 'Hat Maria auch die OIKOS App? Verknüpfe ihren Account – dann siehst du ihre eigene Map als Overlay auf deiner.',
    selector: '.tour-person-link', scrollTo: '.tour-person-link', placement: 'above', route: '/',
  },
  // 17 – Prayer tab
  {
    icon: '🙏', title: 'Beten Tab',
    body: 'Hier findest du alle geteilten Gebete – deine eigenen und die deiner Geschwister. Du kannst mitbeten und Notizen hinterlassen.',
    selector: '.tour-nav-prayer', placement: 'above', route: '/prayer', onEnter: 'closePerson',
  },
  // 18 – Friends
  {
    icon: '👥', title: 'Geschwister & Chats',
    body: 'Finde andere Christen in der App, schreib ihnen, gründe Communities oder tritt bestehenden bei.',
    selector: '.tour-nav-friends', placement: 'above', route: '/friends',
  },
  // 19 – Notifications
  {
    icon: '🔔', title: 'Aktivitäten',
    body: 'Alle Updates auf einen Blick: wenn jemand für dein Anliegen betet, dir schreibt oder eine Einladung schickt.',
    selector: '.tour-nav-notifications', placement: 'above', route: '/notifications',
  },
  // 20 – Profile
  {
    icon: '⚙️', title: 'Dein Profil',
    body: 'Passe dein Profil an, verwalte Benachrichtigungen und starte diesen Rundgang jederzeit neu – ganz unten im Profil.',
    selector: '.tour-nav-profile', placement: 'above', route: '/profile',
  },
  // 21 – Done
  {
    icon: '🎉', title: 'Du bist startklar!',
    body: 'Marias Daten sind gespeichert. Du kannst sie als echte Person behalten oder die Testdaten löschen.',
    placement: 'top', route: '/profile', isLast: true,
  },
]

// ─── Supabase helpers ─────────────────────────────────────────
async function doAction(action, user, testData, setTestData) {
  if (action === 'openNewMapModal') {
    window.dispatchEvent(new Event('tour-open-new-map'))
    return {}
  }

  if (action === 'createTutorialMap') {
    // If we already created it, just close the modal
    if (testData.tutorialMapId) {
      window.dispatchEvent(new Event('tour-close-new-map'))
      return {}
    }
    const { data: m, error } = await supabase.from('oikos_maps')
      .insert({ user_id: user.id, name: 'Meine OIKOS Map (Tutorial)', visibility: 'private', visibility_user_ids: [], visibility_community_id: null })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, tutorialMapId: m.id }))
    window.dispatchEvent(new CustomEvent('tour-map-created', { detail: { map: m } }))
    window.dispatchEvent(new Event('tour-close-new-map'))
    return { tutorialMapId: m.id }
  }

  if (action === 'createPerson') {
    if (testData.person) return {}
    const mapId = testData.tutorialMapId || await (async () => {
      const { data } = await supabase.from('oikos_maps').select('id').eq('user_id', user.id).order('created_at').limit(1)
      return data?.[0]?.id
    })()
    if (!mapId) throw new Error('Keine Map vorhanden')
    const { data: person, error } = await supabase.from('oikos_people')
      .insert({ map_id: mapId, user_id: user.id, name: 'Maria (Tutorial)', relationship_type: 'Freund/in', is_christian: false, impact_stage: 2, notes: 'Beispiel-Person für das Tutorial.' })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, mapId, person }))
    window.dispatchEvent(new Event('tour-reload-map'))
    return { person }
  }

  if (action === 'openPersonProfile') {
    // person should already be set via testDataRef
    return {}
  }

  if (action === 'openPrayerForm') {
    window.dispatchEvent(new Event('tour-open-prayer-form'))
    return {}
  }

  if (action === 'createPrayer') {
    if (testData.prayerRequest) { window.dispatchEvent(new Event('tour-close-prayer-form')); return {} }
    const { data: req, error } = await supabase.from('prayer_requests')
      .insert({ person_id: testData.person.id, owner_id: user.id, title: 'Marias Offenheit für den Glauben', description: 'Bitte bete, dass Maria offen wird für Gespräche über Gott.', is_public: false, is_answered: false })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, prayerRequest: req }))
    window.dispatchEvent(new Event('tour-close-prayer-form'))
    return { prayerRequest: req }
  }

  if (action === 'openStorylineForm') {
    const btn = document.querySelector('.tour-storyline-add')
    if (btn) btn.click()
    return {}
  }

  if (action === 'createStoryline') {
    if (testData.storylineEntry) {
      window.dispatchEvent(new Event('tour-close-storyline-form'))
      window.dispatchEvent(new Event('tour-reload-storyline'))
      return {}
    }
    const { data: entry, error } = await supabase.from('person_storyline')
      .insert({ person_id: testData.person.id, owner_id: user.id, text: 'Wir haben heute über den Sinn des Lebens gesprochen – Maria war sehr offen und stellte viele Fragen.', entry_date: new Date().toISOString().split('T')[0], is_public: false })
      .select().single()
    if (error) throw error
    setTestData(d => ({ ...d, storylineEntry: entry }))
    window.dispatchEvent(new Event('tour-close-storyline-form'))
    window.dispatchEvent(new Event('tour-reload-storyline'))
    return { storylineEntry: entry }
  }
}

async function deleteTutorialData(testData) {
  if (testData.person?.id) {
    await supabase.from('oikos_people').delete().eq('id', testData.person.id)
  }
  if (testData.tutorialMapId) {
    await supabase.from('oikos_maps').delete().eq('id', testData.tutorialMapId)
  }
}

// ─── SVG Spotlight ────────────────────────────────────────────
function Spotlight({ rect }) {
  if (!rect) {
    return <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(44,36,22,0.72)', zIndex: 9998, pointerEvents: 'none' }} />
  }
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
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={r + 2} fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── Tutorial Card ────────────────────────────────────────────
const W = 256

function TutorialCard({ step, rect, stepNum, total, loading, canGoBack, onAction, onNext, onBack, onSkip, onKeep, onDelete, onMinimize }) {
  const isDone = step.isLast

  // Body with newlines rendered as <br>
  const bodyLines = (step.body || '').split('\n')

  // Calculate position
  let style = { position: 'fixed', zIndex: 9999, width: W }

  if (rect && (step.selector || step.selectorFn) && step.placement !== 'top' && step.placement !== 'bottom') {
    const gap = 12
    const CARD_H = 220
    const vw = window.innerWidth

    if (step.placement === 'above') {
      let top = rect.top - gap - CARD_H
      if (top < 60) top = rect.bottom + gap
      let left = rect.left + rect.width / 2 - W / 2
      left = Math.max(12, Math.min(left, vw - W - 12))
      style = { ...style, top, left }
    } else {
      let top = rect.bottom + gap
      let left = rect.left + rect.width / 2 - W / 2
      left = Math.max(12, Math.min(left, vw - W - 12))
      style = { ...style, top, left }
    }
  } else if (step.placement === 'bottom') {
    style = { ...style, bottom: 90, left: '50%', transform: 'translateX(-50%)' }
  } else {
    style = { ...style, top: 16, left: '50%', transform: 'translateX(-50%)' }
  }

  const hasTarget = !!(step.selector || step.selectorFn)
  const arrowOnBottom = rect && hasTarget && step.placement === 'above' && style.top < rect.top
  const arrowOnTop    = rect && hasTarget && step.placement === 'below'

  return (
    <div style={style}>
      {arrowOnBottom && (
        <div style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid white' }} />
      )}
      {arrowOnTop && (
        <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid white' }} />
      )}

      <div style={{ backgroundColor: 'white', borderRadius: 18, padding: '14px 16px 12px', boxShadow: '0 12px 40px rgba(44,36,22,0.28)', fontFamily: 'Lora, serif', maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Top row: progress + minimize */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((stepNum + 1) / total) * 100}%`, backgroundColor: 'var(--color-accent)', borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
          <button
            onClick={onMinimize}
            title="Tutorial minimieren"
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
          >
            –
          </button>
        </div>

        {step.icon && <div style={{ fontSize: 20, marginBottom: 5 }}>{step.icon}</div>}
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 5, lineHeight: 1.3 }}>{step.title}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
          {bodyLines.map((line, i) => (
            <span key={i}>{line}{i < bodyLines.length - 1 && <br />}</span>
          ))}
        </p>

        {isDone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={onKeep} style={btn('primary')}>✅ Daten behalten</button>
            <button onClick={onDelete} style={btn('danger')}>🗑️ Testdaten löschen</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {canGoBack ? (
              <button onClick={onBack} style={{ ...btn('ghost'), flex: 1 }}>← Zurück</button>
            ) : (
              <button onClick={onSkip} style={{ ...btn('ghost'), flex: 1 }}>Überspr.</button>
            )}
            {step.action ? (
              <button onClick={onAction} disabled={loading} style={{ ...btn('primary'), flex: 2 }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Spin /><span>Moment…</span></span>
                  : (step.actionLabel || 'Ausführen →')}
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
  const base = { padding: '8px 0', borderRadius: 9, fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', width: '100%' }
  if (v === 'primary') return { ...base, backgroundColor: 'var(--color-warm-1)', color: 'white' }
  if (v === 'danger')  return { ...base, background: 'none', border: '1.5px solid #E8C0B8', color: '#C0392B' }
  return { ...base, background: 'none', border: '1.5px solid var(--color-warm-3)', color: 'var(--color-text-muted)' }
}

function Spin() {
  return <div style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', animation: 'tspin 0.7s linear infinite', flexShrink: 0 }} />
}

// ─── Minimized Pill ───────────────────────────────────────────
function MinimizedPill({ stepNum, total, onExpand, onSkip }) {
  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 16, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 8,
      backgroundColor: 'white', borderRadius: 50,
      padding: '8px 14px',
      boxShadow: '0 4px 20px rgba(44,36,22,0.22)',
      fontFamily: 'Lora, serif',
    }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tutorial {stepNum + 1}/{total}</span>
      <button
        onClick={onExpand}
        style={{ padding: '5px 10px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      >
        Fortsetzen ↑
      </button>
      <button
        onClick={onSkip}
        style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Scroll helper ────────────────────────────────────────────
function scrollToEl(selector, cb, delay = 700) {
  const el = document.querySelector(selector)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(cb, delay)
}

// ─── Main ─────────────────────────────────────────────────────
export default function OnboardingTutorial() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [run, setRun]             = useState(false)
  const [idx, setIdx]             = useState(0)
  const [rect, setRect]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [testData, setTestData]   = useState({})
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
      setIdx(0); setRect(null); setTestData({}); setMinimized(false); setRun(true)
      navigate('/')
      setTimeout(() => window.dispatchEvent(new Event('tour-close-person')), 100)
    }
    window.addEventListener('show-tutorial', h)
    return () => window.removeEventListener('show-tutorial', h)
  }, [navigate])

  // Resolve dynamic selector (e.g. Maria's canvas node)
  const resolveSelector = useCallback((step) => {
    if (step.selectorFn === 'mariaNode') {
      const person = testDataRef.current.person
      if (person) return `[data-person-id="${person.id}"]`
      return null
    }
    return step.selector || null
  }, [])

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
    const selector = step.selector || (step.selectorFn ? resolveSelector(step) : null)
    if (!selector) return

    const measure = () => {
      if (!mounted.current) return
      const resolvedSel = step.selectorFn ? resolveSelector(step) : selector
      if (!resolvedSel) { setTimeout(measure, 200); return }
      const el = document.querySelector(resolvedSel)
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
  }, [navigate, resolveSelector])

  useEffect(() => { if (run) enterStep(idx) }, [idx, run]) // eslint-disable-line

  const advance = useCallback(() => {
    if (!mounted.current) return
    setRect(null)
    setMinimized(false)
    setIdx(i => i + 1)
  }, [])

  const goBack = useCallback(() => {
    if (!mounted.current || idx === 0) return
    setRect(null)
    setMinimized(false)
    setIdx(i => i - 1)
  }, [idx])

  const handleAction = useCallback(async () => {
    const step = STEPS[idx]
    if (!step.action) return

    // openPersonProfile: dispatch open event then advance
    if (step.action === 'openPersonProfile') {
      const person = testDataRef.current.person
      if (person) window.dispatchEvent(new CustomEvent('tour-open-person', { detail: { person } }))
      advance()
      return
    }

    setLoading(true)
    try {
      const result = await doAction(step.action, user, testDataRef.current, setTestData)
      if (result?.person) testDataRef.current = { ...testDataRef.current, ...result }
      if (result?.tutorialMapId) testDataRef.current = { ...testDataRef.current, ...result }
      if (mounted.current) advance()
    } catch (e) {
      console.error('Tutorial action error:', e)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [idx, user, advance])

  const finish = useCallback((keep = true) => {
    setRun(false); setRect(null); setMinimized(false)
    window.dispatchEvent(new Event('tour-close-person'))
    if (user) localStorage.setItem(`oikos_tutorial_seen_${user.id}`, 'true')
    if (!keep) deleteTutorialData(testDataRef.current)
  }, [user])

  if (!run || !user) return <style>{`@keyframes tspin{to{transform:rotate(360deg)}}`}</style>

  const step = STEPS[idx]

  if (minimized) {
    return (
      <>
        <style>{`@keyframes tspin{to{transform:rotate(360deg)}}`}</style>
        <MinimizedPill
          stepNum={idx}
          total={STEPS.length}
          onExpand={() => { setMinimized(false); enterStep(idx) }}
          onSkip={() => finish(true)}
        />
      </>
    )
  }

  return (
    <>
      <style>{`@keyframes tspin{to{transform:rotate(360deg)}}`}</style>

      {/* Click-through blocker for non-action, non-last steps (not for noOverlay steps) */}
      {!step.action && !step.isLast && !step.noOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={advance} />
      )}

      {/* Dark overlay + spotlight hole (skip for noOverlay steps so the app is visible) */}
      {!step.noOverlay && (
        <Spotlight rect={step.selector || step.selectorFn ? rect : null} />
      )}

      <TutorialCard
        step={step}
        rect={rect}
        stepNum={idx}
        total={STEPS.length}
        loading={loading}
        canGoBack={idx > 0}
        onAction={handleAction}
        onNext={advance}
        onBack={goBack}
        onSkip={() => finish(true)}
        onKeep={() => finish(true)}
        onDelete={() => finish(false)}
        onMinimize={() => setMinimized(true)}
      />
    </>
  )
}
