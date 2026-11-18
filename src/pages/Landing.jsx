import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Globe,
  HandHeart, HeartHandshake, Home, MessageCircle, Monitor, Network, Newspaper, Route,
  ScrollText, ShieldCheck, Smartphone, Sparkles, Users,
} from 'lucide-react'
import { PLAY_STORE_URL, APP_STORE_URL } from '../lib/stores'
import Phone3D from '../components/landing/Phone3D'
import Tilt from '../components/landing/Tilt'
import './landing.css'

// Öffentliche Startseite der Domain (nur Web, ausgeloggt). Erzählt die Vision
// von Oikos Connect als cineastische Geschichte: vom eigenen Umfeld über das
// gezielte Gebet bis zur weltweiten Familie. Bilder/Videos: mit Higgsfield
// generiert (public/landing/img, /video), App-Screens: echte Screenshots
// (public/landing/app). Keine Datenabfragen.

// Schwere Teile (Weltkugel mit Länderdaten, Gebets-Animation) als eigene Chunks
const NetworkGlobe = lazy(() => import('../components/landing/NetworkGlobe'))
const PrayerField = lazy(() => import('../components/landing/PrayerField'))

const IMG = '/landing/img/'
const APP = '/landing/app/'
const VID = '/landing/video/'

const HERO_SCREENS = ['01-oikos-map', '03-gebete', '02-weltkarte', '06-communities', '08-bibel'].map((s, i) => ({
  src: `${APP}${s}.webp`,
  alt: ['Oikos Map der App', 'Gebete in der App', 'Weltkarte der App', 'Communities in der App', 'Bibel in der App'][i],
}))

// Schwebende Karten um das Hero-Handy: passend zur gerade gezeigten App-Ansicht
// (gleiche Reihenfolge wie HERO_SCREENS). Je 3 Pin-Karten + 1 Avatar-Karte.
const HERO_CARDS = [
  { pins: [['🧑‍🤝‍🧑', 'Dein Umfeld', '12 Menschen im Blick'], ['🔗', 'Verbindungen', 'Familie · Freunde'], ['🙏', 'Gebetsmodus', 'Für alle beten']], avs: [['L', '#FFD2B8'], ['B', '#BDF0DC'], ['M', '#D9C8FF']], avTitle: 'Lisa, Ben, Mama', avSub: 'heute im Gebet' },
  { pins: [['🙏', 'Gebetsmodus', 'Person für Person'], ['✅', 'Gebet erhört', 'Für Lisa'], ['📋', 'Gebetslisten', 'Familie · Freunde']], avs: [['A', '#BDF0DC'], ['K', '#D9C8FF'], ['S', '#FFE08A']], avTitle: '9 Personen', avSub: 'beten mit dir' },
  { pins: [['🎵', 'Lobpreisabend', 'Heute · 19:30'], ['🏠', 'Hausgemeinde', 'in deiner Nähe'], ['📖', 'Bibelstudium', 'Do · 20:00']], avs: [['B', '#FFD2B8'], ['A', '#BDF0DC'], ['K', '#D9C8FF']], avTitle: 'Geschwister', avSub: 'in deiner Nähe' },
  { pins: [['🏠', 'Hauskreis', 'Frankfurt-Bornheim'], ['💬', 'Gruppenchat', '3 neue Nachrichten'], ['📅', 'Treffen', 'Jeden Mittwoch']], avs: [['J', '#FFE08A'], ['N', '#FFC9D6'], ['T', '#BFE3FF']], avTitle: '12 Mitglieder', avSub: 'in deiner Community' },
  { pins: [['📖', 'Psalm 23', 'Vers markiert'], ['📝', 'Meine Notiz', 'Ein Gedanke dazu'], ['📤', 'Teilen', 'Im Feed oder Chat']], avs: [['E', '#BDF0DC'], ['D', '#FFD2B8'], ['R', '#D9C8FF']], avTitle: 'Gemeinsam lesen', avSub: '5 Freunde dabei' },
]
const HERO_SLOTS = ['lp-fc-a', 'lp-fc-b', 'lp-fc-c']
const HERO_DEPTH = [90, 70, 120]
const heroCards = (i) => {
  const c = HERO_CARDS[i]
  const out = c.pins.map(([emoji, title, sub], k) => ({
    id: `${i}-${k}`, className: HERO_SLOTS[k], depth: HERO_DEPTH[k], decorative: true, index: k,
    children: (<div className="lp-chipcard"><Pin emoji={emoji} pulse={k === 0} /><span><b>{title}</b><i>{sub}</i></span></div>),
  }))
  out.push({
    id: `${i}-d`, className: 'lp-fc-d', depth: 55, decorative: true, index: 3,
    children: (
      <div className="lp-chipcard lp-chipcard-avatars">
        <span className="lp-avs">{c.avs.map(([l, bg]) => <u key={l} style={{ background: bg }}>{l}</u>)}</span>
        <span><b>{c.avTitle}</b><i>{c.avSub}</i></span>
      </div>
    ),
  })
  return out
}

const MARQUEE = [
  ['📍', 'Die Weltkarte'], ['📖', 'Bibelstudium'], ['🏠', 'Hausgemeinde'],
  ['🤝', 'Outreach & Evangelisation'], ['🎵', 'Lobpreis'], ['🙏', 'Gebetskreise'],
]

const TOPICS = [
  { img: 'weltkarte', emoji: '📍', title: 'Die Weltkarte', text: 'Finde Geschwister, Hausgemeinden und Events in deiner Nähe. Deinen Standort steuerst du selbst.', alt: 'Eine Hand hält ein Smartphone mit der Weltkarte der App, goldene Lichtlinien führen über eine Stadt bei Nacht' },
  { img: 'bibel', emoji: '📖', title: 'Bibelstudium', kind: 'event', text: 'Lest gemeinsam, markiert Verse, tauscht Gedanken aus und startet Bibelstudien mit Freunden.', alt: 'Fünf Freunde im Bibelkreis, eine Person zeigt die Bibel-Ansicht der App auf dem Smartphone' },
  { img: 'haus', emoji: '🏠', title: 'Hausgemeinde', kind: 'gemeinde', text: 'Gründe oder finde Hauskreise: mit eigenem Chat, gemeinsamen Anliegen und Mitgliederübersicht.', alt: 'Hausgemeinde im Wohnzimmer, ein Mann zeigt die Community-Liste der App' },
  { img: 'outreach', emoji: '🤝', title: 'Outreach & Evangelisation', kind: 'event', text: 'Plant Einsätze in eurer Stadt und teilt euren Glauben ganz natürlich: Zeugnisse, Bibelverse, Gespräche. So erreicht ihr Menschen dort, wo sie leben.', alt: 'Freiwillige sprechen in einer Fußgängerzone mit Passanten, eine Person zeigt die Karten-Ansicht der App' },
  { img: 'lobpreis', emoji: '🎵', title: 'Lobpreis & Events', kind: 'event', text: 'Lobpreisabende, Gebetsabende, Sport und mehr: Erstelle Events und lade andere ein.', alt: 'Lobpreisabend im Freien unter Lichterketten, eine Person hält die App hoch' },
  { img: 'gebet', emoji: '🙏', title: 'Gebet & Gebetskreise', kind: 'sibling', text: 'Teile Anliegen, bete mit, setzt euch Gebetsziele. Erhörte Gebete bleiben als Zeugnis erhalten.', alt: 'Eine Frau betet im Morgenlicht mit dem Smartphone an der Brust' },
]

const PILLARS = [
  {
    icon: Network, title: 'Besser merken, wer zu dir gehört',
    text: 'Auf deiner Oikos Map hältst du alle Menschen aus deinem Umfeld fest, mit Namen, Anliegen und ihrer Geschichte. Nichts geht im Alltag unter, und du siehst sofort, für wen du lange nicht gebetet hast.',
  },
  {
    icon: HandHeart, title: 'Gezielt für sie beten',
    text: 'Statt „irgendwie an alle zu denken“ betest du mit Namen und konkretem Anliegen: für Lisa, für Ben, für den Nachbarn von nebenan. Der Gebetsmodus führt dich Person für Person durch deine Liste.',
  },
  {
    icon: Sparkles, title: 'Und in der geistlichen Welt etwas bewegen',
    text: 'Gebet ist keine Floskel. Es öffnet Türen, die kein Argument öffnen kann. Wer für Menschen einsteht, bewegt etwas in der unsichtbaren Welt, lange bevor man es sieht.',
  },
]

const FEATURES = [
  { icon: Network, title: 'Oikos Map', text: 'Dein Umfeld auf einen Blick: Menschen, Orte und Verbindungen, farbig geordnet.', screen: '01-oikos-map' },
  { icon: HandHeart, title: 'Gebete', text: 'Anliegen teilen, mitbeten, Gebetslisten und der geführte Gebetsmodus.', screen: '03-gebete' },
  { icon: Route, title: 'Menschen begleiten', text: 'Anliegen, Story-Line und Impact-Stufen für jede Person.', screen: '05-menschen-begleiten' },
  { icon: Globe, title: 'Weltkarte', text: 'Geschwister, Gemeinden und Events in deiner Nähe entdecken.', screen: '02-weltkarte' },
  { icon: Users, title: 'Communities', text: 'Hauskreise und Gemeinden mit Chat, Anliegen und Mitgliedern.', screen: '06-communities' },
  { icon: Newspaper, title: 'Feed', text: 'Zeugnisse, Bibelverse und Ermutigung teilen.', screen: '04-feed' },
  { icon: ScrollText, title: 'Bekenntnisse', text: 'Gottes Wahrheit mit Bibelstellen regelmäßig aussprechen.', screen: '07-bekenntnisse' },
  { icon: BookOpen, title: 'Bibel', text: 'Lesen, Verse markieren, Notizen machen und teilen.', screen: '08-bibel' },
  { icon: MessageCircle, title: 'Chats', text: 'Direkt, in Communities oder in Gruppen für Aktivitäten.', screen: '09-chats' },
]

const VALUES = [
  { icon: ShieldCheck, title: 'Du entscheidest', text: 'Bei jedem Gebet, Beitrag und Standort bestimmst du selbst, wer ihn sehen darf.' },
  { icon: HeartHandshake, title: 'Ein geschützter Raum', text: 'Respektvoller Umgang mit klaren Regeln. Melden und Blockieren sind überall möglich.' },
  { icon: Sparkles, title: 'Kostenlos & werbefrei', text: 'Keine Werbung, kein Verkauf deiner Daten. Dein Konto lässt sich jederzeit löschen.' },
]

const LAYERS = [
  { key: 'sibling', icon: Users, label: 'Geschwister' },
  { key: 'event', icon: CalendarDays, label: 'Events' },
  { key: 'gemeinde', icon: Home, label: 'Gemeinden' },
]

const MANIFEST = 'Stell dir vor, *niemand* in deinem Umfeld wird vergessen. Jeder Mensch, den Gott dir anvertraut hat, ist von *Gebet* umgeben. Und wo immer du bist, gibt es *Geschwister,* die mit dir glauben, beten und hoffen.'

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (shown || !ref.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.15 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

// Hintergrund-Video: nur auf breiten Bildschirmen, ohne Bewegungsreduktion und
// Datensparmodus; spielt nur, solange es sichtbar ist. Darunter liegt das Standbild.
function BgVideo({ name, className = '' }) {
  const ref = useRef(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const wide = window.matchMedia?.('(min-width: 768px)').matches
    if (wide && !reduceMotion() && !navigator.connection?.saveData) setOk(true)
  }, [])
  useEffect(() => {
    const v = ref.current
    if (!ok || !v) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.15 })
    io.observe(v)
    return () => io.disconnect()
  }, [ok])

  if (!ok) return null
  return (
    <video
      ref={ref}
      className={`lp-bgvideo ${className}`}
      src={`${VID}${name}.mp4`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onError={() => setOk(false)}
    />
  )
}

function Photo({ name, alt, ratio = 'p', sizes = '(min-width: 900px) 360px, 80vw', eager = false }) {
  return (
    <img
      src={`${IMG}${name}-1000.webp`}
      srcSet={`${IMG}${name}-600.webp 600w, ${IMG}${name}-1000.webp 1000w`}
      sizes={sizes}
      width={ratio === 'p' ? 1000 : 1600}
      height={ratio === 'p' ? 1250 : 900}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

// Event-Pin im Look der App (babyblaues Quadrat, weißer Rand, Radar-Ringe)
function Pin({ emoji, pulse = false }) {
  return (
    <span className={`lp-pin ${pulse ? 'is-pulse' : ''}`} aria-hidden="true">
      <span>{emoji}</span>
    </span>
  )
}

export default function Landing() {
  const rootRef = useRef(null)
  const manifestRef = useRef(null)
  const showcaseRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [kinds, setKinds] = useState({ sibling: true, event: true, gemeinde: true })
  const [focusKind, setFocusKind] = useState(null)
  const [heroScreen, setHeroScreen] = useState(0)
  const [feature, setFeature] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Oikos Connect – Verbunden im Glauben, rund um die Welt'
    return () => { document.title = prevTitle }
  }, [])

  // Scroll: Header-Glas, Fortschrittsbalken, Parallax-Variable, Manifest-Wörter
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const words = manifestRef.current ? [...manifestRef.current.querySelectorAll('.w')] : []
    const still = reduceMotion()
    let raf = 0
    const update = () => {
      raf = 0
      const st = root.scrollTop
      const max = Math.max(1, root.scrollHeight - root.clientHeight)
      setScrolled(prev => (prev !== st > 24 ? st > 24 : prev))
      root.style.setProperty('--prog', (st / max).toFixed(4))
      if (!still) root.style.setProperty('--sy', String(Math.round(st)))
      if (!words.length || still) return
      const r = manifestRef.current.getBoundingClientRect()
      const vh = root.clientHeight
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.25)))
      const lit = p * words.length * 1.15
      words.forEach((w, i) => { w.style.opacity = String(Math.min(1, Math.max(0.18, lit - i + 0.4))) })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    root.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => { root.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Hero-Handy blättert durch die App
  useEffect(() => {
    if (reduceMotion()) return
    const t = setInterval(() => setHeroScreen(s => (s + 1) % HERO_SCREENS.length), 3600)
    return () => clearInterval(t)
  }, [])

  // App-Showcase blättert von selbst weiter, solange niemand selbst wählt
  useEffect(() => {
    if (!autoplay || reduceMotion() || !showcaseRef.current) return
    let timer = 0
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer)
      if (e.isIntersecting) timer = setInterval(() => setFeature(f => (f + 1) % FEATURES.length), 4200)
    }, { threshold: 0.35 })
    io.observe(showcaseRef.current)
    return () => { io.disconnect(); clearInterval(timer) }
  }, [autoplay])

  const scrollToId = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [])
  const pickFeature = (i) => { setAutoplay(false); setFeature(i) }

  // Magnetische Buttons (nur mit Maus)
  const magnet = (e) => {
    if (e.pointerType === 'touch' || reduceMotion()) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`)
  }
  const unmagnet = (e) => { e.currentTarget.style.setProperty('--mx', '0px'); e.currentTarget.style.setProperty('--my', '0px') }

  return (
    <div ref={rootRef} className="lp h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="lp-progress" aria-hidden="true" />
      <div className="lp-grain" aria-hidden="true" />
      <a href="#main" className="lp-skip" onClick={(e) => { e.preventDefault(); scrollToId('main') }}>
        Zum Inhalt springen
      </a>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className={`lp-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-wrap h-full flex items-center justify-between gap-4">
          <Link to="/welcome" className="lp-brand no-anim" aria-label="Oikos Connect – Startseite">
            <img src="/landing/icon.webp" alt="" width="38" height="38" />
            <span>Oikos Connect</span>
          </Link>
          <nav aria-label="Hauptnavigation" className="hidden lg:flex items-center gap-1">
            {[['oikos', 'Was ist Oikos?'], ['themen', 'Themen'], ['weltweit', 'Weltweit'], ['app', 'Die App'], ['download', 'Download']].map(([id, label]) => (
              <button key={id} type="button" className="lp-navlink" onClick={() => scrollToId(id)}>{label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="lp-btn lp-btn-glass lp-btn-sm">Anmelden</Link>
            <Link to="/auth?mode=register" className="lp-btn lp-btn-primary lp-btn-sm lp-only-sm-up">Kostenlos starten</Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* ── Hero: Sonnenaufgang + 3D-Handy ─────────────────── */}
        <section className="lp-hero" aria-labelledby="hero-title">
          <picture className="lp-hero-media">
            <source media="(max-aspect-ratio: 4/5)" srcSet={`${IMG}hero-tall-1080.webp`} />
            <img
              src={`${IMG}hero-2400.webp`}
              srcSet={`${IMG}hero-1400.webp 1400w, ${IMG}hero-2400.webp 2400w`}
              sizes="100vw"
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="lp-aurora" aria-hidden="true"><i /><i /><i /></div>
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow lp-rise">One Family · One Mission · One Oikos</p>
              <h1 id="hero-title" className="lp-display mt-6 lp-rise" style={{ animationDelay: '120ms' }}>
                Glaube, der <span className="lp-gold">verbindet.</span>
              </h1>
              <p className="lp-lead lp-rise" style={{ animationDelay: '260ms' }}>
                Merke dir die Menschen, die Gott dir anvertraut hat, bete gezielt für sie, finde
                Geschwister in deiner Nähe und erlebe, wie aus deinem Umfeld eine weltweite Familie wird.
              </p>
              <div className="lp-cta lp-rise" style={{ animationDelay: '400ms' }}>
                <Link to="/auth?mode=register" className="lp-btn lp-btn-primary lp-magnet" onPointerMove={magnet} onPointerLeave={unmagnet}>
                  Kostenlos starten <ArrowRight size={18} className="lp-arrow" aria-hidden="true" />
                </Link>
                <button type="button" className="lp-btn lp-btn-glass" onClick={() => scrollToId('oikos')}>
                  Die Vision entdecken
                </button>
              </div>
              <ul className="lp-avail lp-rise" style={{ animationDelay: '520ms' }} aria-label="Verfügbar auf">
                <li><Monitor size={16} aria-hidden="true" /> Web-App</li>
                <li><Smartphone size={16} aria-hidden="true" /> iPhone</li>
                <li><Smartphone size={16} aria-hidden="true" /> Android</li>
                <li><Check size={16} aria-hidden="true" /> Kostenlos &amp; werbefrei</li>
              </ul>
            </div>

            <div className="lp-hero-phone lp-rise" style={{ animationDelay: '300ms' }}>
              <Phone3D
                screens={HERO_SCREENS}
                active={heroScreen}
                cards={heroCards(heroScreen)}
              />
            </div>
          </div>
          <button type="button" className="lp-scroll" onClick={() => scrollToId('themen-band')} aria-label="Weiter nach unten">
            <ChevronDown size={20} aria-hidden="true" />
          </button>
        </section>

        {/* ── Themen-Band ────────────────────────────────────── */}
        <div id="themen-band" className="lp-marquee" aria-label="Themen von Oikos Connect">
          <div className="lp-marquee-track">
            {[0, 1].map(k => (
              <div key={k} className="lp-marquee-row" aria-hidden={k === 1}>
                {MARQUEE.map(([e, t]) => (
                  <span key={t} className="lp-mq-item"><Pin emoji={e} />{t}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Manifest ──────────────────────────────────────── */}
        <section id="manifest" className="lp-section lp-manifest scroll-mt-16" aria-label="Unsere Hoffnung">
          <div className="lp-wrap text-center">
            <p className="lp-eyebrow center">Unsere Hoffnung</p>
            <p ref={manifestRef} className="lp-manifest-text">
              {MANIFEST.split(' ').map((word, i) => {
                const gold = word.startsWith('*')
                const clean = word.replaceAll('*', '')
                return (
                  <span key={i}>
                    <span className={`w ${gold ? 'lp-gold' : ''}`}>{clean}</span>{' '}
                  </span>
                )
              })}
            </p>
          </div>
        </section>

        {/* ── Was ist Oikos? + Gebet vermehrt sich (direkt unter „Unsere Hoffnung“) ── */}
        <section id="oikos" className="lp-section lp-prayer scroll-mt-16" aria-labelledby="oikos-title" style={{ paddingTop: 24 }}>
          <picture className="lp-prayer-media" aria-hidden="true">
            <img src={`${IMG}beams-1400.webp`} srcSet={`${IMG}beams-1400.webp 1400w, ${IMG}beams-2400.webp 2400w`} sizes="100vw" alt="" loading="lazy" decoding="async" />
          </picture>
          <BgVideo name="beams" className="lp-prayer-video" />
          <div className="lp-bigword" aria-hidden="true" style={{ transform: 'translate3d(calc(var(--sy, 0) * -0.12px), 0, 0)' }}>OIKOS · οἶκος · OIKOS</div>
          <div className="lp-wrap relative">
            <Reveal className="lp-prayer-head">
              <p className="lp-eyebrow center">Was ist Oikos?</p>
              <h2 id="oikos-title" className="lp-h2 mt-5">
                Dein Umfeld. <span className="lp-gold">Dein Gebet.</span> Echte Wirkung.
              </h2>
              <p className="lp-lead mt-6">
                „Oikos“ ist das griechische Wort für „Haus“: die Menschen, die zu deinem Leben gehören.
                Familie, Freunde, Kollegen, Nachbarn. Menschen, die Gott dir ganz bewusst anvertraut hat.
                Tippe auf eine Person und sieh, was geschieht: Wer zu Jesus findet, hat selbst ein Umfeld,
                für das er betet. So wird aus einem Gebet eine Bewegung.
              </p>
            </Reveal>

            <Reveal delay={100} className="mt-10">
              <Suspense fallback={<div className="lp-prayer-stage" />}>
                <PrayerField className="lp-prayer-field" />
              </Suspense>
            </Reveal>

            <div className="lp-oikos-grid">
              <Reveal className="lp-oikos-visual">
                <Tilt className="lp-photo-card" max={7}>
                  <Photo name="oikos" alt="Ein junger Mann sitzt im Café, vor ihm ein Notizbuch mit Namen, und blickt auf die Oikos Map in der App" sizes="(min-width: 1024px) 440px, 90vw" />
                  <span className="lp-photo-tag"><Network size={15} aria-hidden="true" /> Deine Oikos Map</span>
                </Tilt>
              </Reveal>
              <ol className="lp-pillars">
                {PILLARS.map(({ icon: Icon, title, text }, i) => (
                  <Reveal as="li" key={title} delay={i * 110} className="lp-pillar">
                    <span className="lp-pillar-num" aria-hidden="true">0{i + 1}</span>
                    <span className="lp-card-icon"><Icon size={22} aria-hidden="true" /></span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>

            <Reveal delay={60}>
              <div className="lp-verses">
                <figure className="lp-verse">
                  <blockquote>„Des Gerechten Gebet vermag viel, wenn es ernstlich ist.“</blockquote>
                  <figcaption>Jakobus 5,16 (Lutherbibel)</figcaption>
                </figure>
                <figure className="lp-verse">
                  <blockquote>„Und was du von mir gehört hast, das befiehl treuen Menschen an, die tüchtig sind, auch andere zu lehren.“</blockquote>
                  <figcaption>2. Timotheus 2,2 (Lutherbibel)</figcaption>
                </figure>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Weltweit ─────────────────────────────────────── */}
        <section id="weltweit" className="lp-world-sec scroll-mt-16" aria-labelledby="world-title">
          <div className="lp-band lp-band-earth">
            <picture className="lp-band-media">
              <img src={`${IMG}earth-2200.webp`} srcSet={`${IMG}earth-1200.webp 1200w, ${IMG}earth-2200.webp 2200w`} sizes="100vw" alt="" loading="lazy" decoding="async" />
            </picture>
            <BgVideo name="earth" className="lp-band-video" />
            <div className="lp-wrap">
              <Reveal className="max-w-2xl">
                <p className="lp-eyebrow">Weltweit verbunden</p>
                <h2 id="world-title" className="lp-h2 mt-5">
                  Eine Familie <span className="lp-gold">über alle Grenzen.</span>
                </h2>
                <p className="lp-lead mt-6">
                  Ein Gebet in Frankfurt, ein Lobpreisabend in Nairobi, ein Morgengebet in Seoul.
                  Überall auf der Welt glauben Menschen wie du. Oikos Connect macht sichtbar,
                  dass wir zusammengehören.
                </p>
              </Reveal>
            </div>
          </div>

          <div id="themen" className="lp-section lp-discover scroll-mt-16" aria-labelledby="discover-title">
            <div className="lp-wrap">
              <Reveal className="max-w-3xl">
                <p className="lp-eyebrow">Alles, was Reich Gottes bewegt</p>
                <h2 id="discover-title" className="lp-h2 mt-5">
                  Entdecke, wer in deiner Nähe glaubt. <span className="lp-gold">Sechs Wege, Menschen zu verbinden.</span>
                </h2>
                <p className="lp-lead mt-6">
                  Auf der Weltkarte findest du Geschwister, Hausgemeinden und Events. Wie genau dein eigener
                  Standort sichtbar ist, bestimmst du selbst. Fahre über ein Thema und sieh, wo es auf der Karte lebt.
                </p>
              </Reveal>

              <div className="lp-discover-grid">
                <Reveal delay={80} className="lp-discover-map">
                  <div className="lp-globe">
                    <div className="lp-globe-glow" aria-hidden="true" />
                    <Suspense fallback={<div className="w-full h-full" />}>
                      <NetworkGlobe fit="box" className="relative w-full h-full" kinds={focusKind ? { sibling: false, event: false, gemeinde: false, [focusKind]: true } : kinds} />
                    </Suspense>
                    <div className="lp-layers" role="group" aria-label="Ebenen der Weltkarte">
                      {LAYERS.map(({ key, icon: Icon, label }) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={kinds[key]}
                          className={`lp-layer ${kinds[key] ? 'is-on' : ''}`}
                          onClick={() => setKinds(k => ({ ...k, [key]: !k[key] }))}
                        >
                          <Icon size={15} aria-hidden="true" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
                    Symbolische Darstellung. Orte, Personen und Aktivitäten dienen der Illustration.
                  </p>
                </Reveal>

                <div className="lp-topics" role="list" aria-label="Sechs Wege, Menschen zu verbinden">
                  {TOPICS.map((t) => (
                    <Tilt
                      as="article"
                      key={t.title}
                      role="listitem"
                      tabIndex={0}
                      className="lp-topic"
                      max={7}
                      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setFocusKind(t.kind || null) }}
                      onPointerLeave={() => setFocusKind(null)}
                      onFocus={() => setFocusKind(t.kind || null)}
                      onBlur={() => setFocusKind(null)}
                    >
                      <Photo name={t.img} alt={t.alt} sizes="(min-width: 1024px) 270px, 72vw" />
                      <div className="lp-topic-shade" aria-hidden="true" />
                      <div className="lp-topic-body">
                        <Pin emoji={t.emoji} pulse />
                        <h3>{t.title}</h3>
                        <p>{t.text}</p>
                      </div>
                    </Tilt>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── App-Showcase mit 3D-Handy ────────────────────── */}
        <section id="app" ref={showcaseRef} className="lp-section lp-showcase scroll-mt-16" aria-labelledby="app-title">
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <p className="lp-eyebrow">Die App</p>
              <h2 id="app-title" className="lp-h2 mt-5">Alles, was dein Glaubensalltag braucht. <span className="lp-gold">In einer App.</span></h2>
            </Reveal>
            <div className="lp-app mt-12 lg:mt-16">
              <div className="min-w-0">
                <div className="lp-tabs" role="tablist" aria-label="Funktionen">
                  {FEATURES.map((f, i) => {
                    const Icon = f.icon
                    return (
                      <button
                        key={f.title}
                        type="button"
                        role="tab"
                        id={`tab-${i}`}
                        aria-selected={feature === i}
                        aria-controls="app-screen"
                        className={`lp-tab ${feature === i ? 'is-active' : ''}`}
                        onClick={() => pickFeature(i)}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>
                          <span className="lp-tab-title">{f.title}</span>
                          <span className="lp-tab-text">{f.text}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="lp-body lp-tab-mobile-text" aria-live="polite">{FEATURES[feature].text}</p>
              </div>
              <div id="app-screen" role="tabpanel" aria-labelledby={`tab-${feature}`}>
                <Phone3D
                  tiltMax={16}
                  screens={FEATURES.map(f => ({ src: `${APP}${f.screen}.webp`, alt: `App-Ansicht: ${f.title}` }))}
                  active={feature}
                  cards={[
                    { id: 'f', className: 'lp-fc-e', depth: 90, decorative: true, children: (<div className="lp-chipcard"><Pin emoji="✨" pulse /><span><b>{FEATURES[feature].title}</b><i>in Oikos Connect</i></span></div>) },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Werte ────────────────────────────────────────── */}
        <section className="lp-section" aria-labelledby="values-title" style={{ paddingTop: 40 }}>
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <p className="lp-eyebrow">Worauf du dich verlassen kannst</p>
              <h2 id="values-title" className="lp-h2 mt-5">Ein Ort, an dem du <span className="lp-gold">aufatmen</span> kannst.</h2>
            </Reveal>
            <div className="lp-values">
              {VALUES.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <Tilt className="lp-card" max={5}>
                    <span className="lp-card-icon"><Icon size={22} aria-hidden="true" /></span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </Tilt>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Download ─────────────────────────────────────── */}
        <section id="download" className="lp-section scroll-mt-16" aria-labelledby="download-title" style={{ paddingTop: 40 }}>
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <p className="lp-eyebrow">Loslegen</p>
              <h2 id="download-title" className="lp-h2 mt-5">Überall dabei. Im Browser, auf dem iPhone und auf Android.</h2>
              <p className="lp-lead mt-6">Ein Konto, eine Oikos Map, auf allen Geräten.</p>
            </Reveal>
            <div className="lp-dl">
              <Reveal>
                <div className="lp-card is-main">
                  <span className="lp-card-icon"><Monitor size={22} aria-hidden="true" /></span>
                  <h3>Web-App</h3>
                  <p className="flex-1">Direkt im Browser, ohne Installation. Ideal am Laptop oder zum Ausprobieren.</p>
                  <Link to="/auth?mode=register" className="lp-btn lp-btn-primary">
                    Jetzt starten <ArrowRight size={18} className="lp-arrow" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={90}>
                <div className="lp-card">
                  <span className="lp-card-icon"><Smartphone size={22} aria-hidden="true" /></span>
                  <h3>Android</h3>
                  <p className="flex-1">Für Smartphones und Tablets, bei Google Play.</p>
                  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-glass">
                    Bei Google Play laden<span className="sr-only"> (öffnet in neuem Tab)</span>
                  </a>
                </div>
              </Reveal>
              <Reveal delay={180}>
                <div className="lp-card">
                  <span className="lp-card-icon"><Smartphone size={22} aria-hidden="true" /></span>
                  <h3>iPhone</h3>
                  <p className="flex-1">Für iPhone und iPad, im App Store.</p>
                  {APP_STORE_URL ? (
                    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-glass">
                      Im App Store laden<span className="sr-only"> (öffnet in neuem Tab)</span>
                    </a>
                  ) : (
                    <span className="lp-btn lp-btn-glass lp-soon" aria-disabled="true">Bald im App Store</span>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Abschluss ────────────────────────────────────── */}
        <section className="lp-band lp-final" aria-labelledby="final-title">
          <picture className="lp-band-media">
            <source media="(max-aspect-ratio: 4/5)" srcSet={`${IMG}final-tall-1080.webp`} />
            <img src={`${IMG}final-2400.webp`} srcSet={`${IMG}final-1400.webp 1400w, ${IMG}final-2400.webp 2400w`} sizes="100vw" alt="" loading="lazy" decoding="async" />
          </picture>
          <div className="lp-wrap lp-final-inner">
            <Reveal>
              <p className="lp-hand" aria-hidden="true">One Family. One Mission. One Oikos.</p>
              <h2 id="final-title" className="lp-display mt-5" style={{ fontSize: 'clamp(2.5rem, 7vw, 5.25rem)' }}>
                Werde Teil der <span className="lp-gold">Familie.</span>
              </h2>
              <blockquote className="lp-quote">
                „Denn wo zwei oder drei versammelt sind in meinem Namen, da bin ich mitten unter ihnen.“
                <footer className="mt-3 text-sm not-italic" style={{ fontFamily: 'var(--sans)', color: 'rgba(240,244,252,0.8)' }}>
                  Matthäus 18,20 (Lutherbibel)
                </footer>
              </blockquote>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/auth?mode=register" className="lp-btn lp-btn-primary lp-magnet" onPointerMove={magnet} onPointerLeave={unmagnet}>
                  Kostenlos starten <ArrowRight size={18} className="lp-arrow" aria-hidden="true" />
                </Link>
                <Link to="/auth" className="lp-btn lp-btn-glass">Ich habe schon ein Konto</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-footer" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="lp-wrap py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/landing/icon.webp" alt="" width="28" height="28" className="rounded-lg" />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} Oikos Connect · Kostenlos &amp; werbefrei</span>
          </div>
          <nav aria-label="Rechtliches" className="flex flex-wrap justify-center gap-x-6">
            <Link to="/privacy" className="lp-footlink">Datenschutz</Link>
            <Link to="/terms" className="lp-footlink">Nutzungsbedingungen</Link>
            <Link to="/support" className="lp-footlink">Support</Link>
            <Link to="/auth" className="lp-footlink">Anmelden</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
