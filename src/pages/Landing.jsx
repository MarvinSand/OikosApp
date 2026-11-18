import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Globe, HandHeart, HeartHandshake,
  Home, MapPin, MessageCircle, Monitor, Network, Newspaper, Route, ScrollText, ShieldCheck,
  Smartphone, Sparkles, TrendingUp, Users,
} from 'lucide-react'
import { PLAY_STORE_URL, APP_STORE_URL } from '../lib/stores'
import './landing.css'

// Öffentliche Startseite der Domain (nur Web, ausgeloggt). Erzählt die Vision
// von Oikos Connect als cineastische Geschichte: vom eigenen Umfeld bis zur
// weltweiten Familie. Bilder: mit Higgsfield generierte Szenen (public/landing/img)
// und echte App-Screens (public/landing/app). Keine Datenabfragen.

// Weltkugel + Länderdaten als eigener Chunk: Text und Bilder erscheinen sofort.
const NetworkGlobe = lazy(() => import('../components/landing/NetworkGlobe'))

const IMG = '/landing/img/'
const APP = '/landing/app/'

const CHAPTERS = [
  {
    img: 'ch1', label: 'Sehen', tag: 'Oikos Map', tagIcon: Network,
    title: <>Es beginnt mit den Menschen <span className="lp-gold">um dich herum.</span></>,
    text: 'Familie, Freunde, Kollegen, Nachbarn: Gott hat dir Menschen anvertraut. Auf deiner Oikos Map siehst du sie alle auf einen Blick, mit Orten, Farben und Verbindungen. Niemand gerät mehr in Vergessenheit.',
    chips: [[Network, 'Oikos Map'], [MapPin, 'Orte & Verbindungen']],
    alt: 'Junge Frau steht im Morgenlicht am Fenster und blickt nachdenklich über die Dächer der Stadt',
  },
  {
    img: 'ch2', label: 'Beten', tag: 'Gebetsmodus', tagIcon: HandHeart,
    title: <>Gebet, das <span className="lp-gold">trägt.</span></>,
    text: 'Halte Anliegen fest, bete gezielt und erlebe, wie andere mit dir beten. Der Gebetsmodus führt dich Person für Person durch deine Listen, und erhörte Gebete bleiben als Zeugnis erhalten.',
    chips: [[HandHeart, 'Gemeinsam beten'], [Sparkles, 'Erhörte Gebete']],
    alt: 'Vier Freunde beten gemeinsam an einem Küchentisch bei warmem Kerzenlicht, eine offene Bibel liegt vor ihnen',
  },
  {
    img: 'ch3', label: 'Begleiten', tag: 'Story-Line', tagIcon: Route,
    title: <>Menschen auf ihrem Weg <span className="lp-gold">begleiten.</span></>,
    text: 'Eine Story-Line für wichtige Momente und sechs Impact-Stufen zeigen dir, wo jemand gerade steht und wie Gott Schritt für Schritt wirkt. So wird aus Fürsorge echte Begleitung.',
    chips: [[Route, 'Story-Line'], [TrendingUp, 'Impact-Stufen']],
    alt: 'Zwei junge Männer im Gespräch auf einer Parkbank im Abendlicht, einer legt dem anderen ermutigend die Hand auf die Schulter',
  },
  {
    img: 'ch4', label: 'Gemeinschaft', tag: 'Hauskreise & Events', tagIcon: Users,
    title: <>Gemeinsam statt <span className="lp-gold">allein.</span></>,
    text: 'Gründe Hauskreise, finde Gemeinden und Events in deiner Nähe, teile Zeugnisse im Feed und schreib direkt mit Geschwistern. Glaube wird lebendig, wenn wir ihn miteinander teilen.',
    chips: [[Users, 'Communities'], [CalendarDays, 'Events'], [MessageCircle, 'Chats']],
    alt: 'Hauskreis auf einer Terrasse unter Lichterketten am Abend, ein junger Mann spielt Gitarre, die anderen singen',
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

function Photo({ name, alt, sizes = '(min-width: 900px) 560px, 92vw', children, eager = false }) {
  return (
    <div className="lp-photo">
      <img
        src={`${IMG}${name}-1000.webp`}
        srcSet={`${IMG}${name}-600.webp 600w, ${IMG}${name}-1000.webp 1000w`}
        sizes={sizes}
        width="1000"
        height="1250"
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      {children}
    </div>
  )
}

export default function Landing() {
  const rootRef = useRef(null)
  const manifestRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [kinds, setKinds] = useState({ sibling: true, event: true, gemeinde: true })
  const [feature, setFeature] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const showcaseRef = useRef(null)

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Oikos Connect – Verbunden im Glauben, rund um die Welt'
    return () => { document.title = prevTitle }
  }, [])

  // Header-Glas + Manifest-Wörter, die sich beim Scrollen aufhellen
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const words = manifestRef.current ? [...manifestRef.current.querySelectorAll('.w')] : []
    const still = reduceMotion()
    let raf = 0
    const update = () => {
      raf = 0
      setScrolled(root.scrollTop > 24)
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

  return (
    <div ref={rootRef} className="lp h-full w-full overflow-y-auto overflow-x-hidden">
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
            {[['vision', 'Vision'], ['weltweit', 'Weltweit'], ['app', 'Die App'], ['download', 'Download']].map(([id, label]) => (
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
        {/* ── Hero ──────────────────────────────────────────── */}
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
          <div className="lp-wrap lp-hero-inner">
            <p className="lp-eyebrow center lp-rise">One Family · One Mission · One Oikos</p>
            <h1 id="hero-title" className="lp-display mt-6 lp-rise" style={{ animationDelay: '120ms' }}>
              Glaube, der <span className="lp-gold">verbindet.</span>
            </h1>
            <p className="lp-lead lp-rise" style={{ animationDelay: '260ms' }}>
              Oikos Connect bringt Christen zusammen. Bete für die Menschen, die Gott dir anvertraut hat,
              finde Geschwister in deiner Nähe und erlebe, wie aus deinem Umfeld eine weltweite Familie wird.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lp-rise" style={{ animationDelay: '400ms' }}>
              <Link to="/auth?mode=register" className="lp-btn lp-btn-primary">
                Kostenlos starten <ArrowRight size={18} className="lp-arrow" aria-hidden="true" />
              </Link>
              <button type="button" className="lp-btn lp-btn-glass" onClick={() => scrollToId('vision')}>
                Die Vision entdecken
              </button>
            </div>
          </div>
          <div className="lp-wrap lp-hero-foot lp-rise" style={{ animationDelay: '600ms' }}>
            <ul className="lp-avail" aria-label="Verfügbar auf">
              <li><Monitor size={16} aria-hidden="true" /> Web-App</li>
              <li><Smartphone size={16} aria-hidden="true" /> iPhone</li>
              <li><Smartphone size={16} aria-hidden="true" /> Android</li>
              <li><Check size={16} aria-hidden="true" /> Kostenlos &amp; werbefrei</li>
            </ul>
            <button type="button" className="lp-scroll" onClick={() => scrollToId('manifest')} aria-label="Weiter nach unten">
              <ChevronDown size={20} aria-hidden="true" />
            </button>
          </div>
        </section>

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
            <Reveal className="lp-define">
              <b>οἶκος · oikos</b>
              <span>griechisch für „Haus“: die Menschen, die zu deinem Leben gehören.</span>
            </Reveal>
          </div>
        </section>

        {/* ── Vision in vier Kapiteln ───────────────────────── */}
        <section id="vision" className="lp-section scroll-mt-16" aria-labelledby="vision-title" style={{ paddingTop: 24, paddingBottom: 72 }}>
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <p className="lp-eyebrow">Die Vision</p>
              <h2 id="vision-title" className="lp-h2 mt-5">Vier Schritte, die alles verändern können.</h2>
            </Reveal>

            <div className="mt-16 lg:mt-24">
              {CHAPTERS.map((c, i) => {
                const TagIcon = c.tagIcon
                return (
                  <Reveal key={c.img} className={`lp-chapter ${i % 2 ? 'flip' : ''}`}>
                    <Photo name={c.img} alt={c.alt}>
                      <span className="lp-photo-tag"><TagIcon size={15} aria-hidden="true" /> {c.tag}</span>
                    </Photo>
                    <div>
                      <div className="flex items-end gap-5">
                        <span className="lp-num" aria-hidden="true">0{i + 1}</span>
                        <p className="lp-eyebrow pb-2">{c.label}</p>
                      </div>
                      <h3 className="lp-h3 mt-6">{c.title}</h3>
                      <p className="lp-body mt-5 max-w-xl">{c.text}</p>
                      <ul className="lp-chips" aria-label="In der App">
                        {c.chips.map(([Icon, label]) => (
                          <li key={label} className="lp-chip"><Icon size={16} aria-hidden="true" /> {label}</li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Weltweit ─────────────────────────────────────── */}
        <section id="weltweit" className="scroll-mt-16" aria-labelledby="world-title">
          <div className="lp-band lp-band-earth">
            <picture className="lp-band-media">
              <img
                src={`${IMG}earth-2200.webp`}
                srcSet={`${IMG}earth-1200.webp 1200w, ${IMG}earth-2200.webp 2200w`}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </picture>
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

          <div className="lp-section" style={{ paddingTop: 40, paddingBottom: 48 }}>
            <div className="lp-wrap lp-world">
              <Reveal>
                <h3 className="lp-h3">Entdecke, wer in deiner Nähe glaubt.</h3>
                <p className="lp-body mt-5 max-w-xl">
                  Auf der Weltkarte findest du Geschwister, Hausgemeinden und Events wie Bibelstudium,
                  Lobpreis oder Gebetsabende. Wie genau dein eigener Standort sichtbar ist, bestimmst du selbst.
                </p>
                <div className="lp-moments">
                  <figure className="lp-moment">
                    <Photo name="world-nairobi" alt="Lobpreis unter freiem Himmel in einem Dorf in Ostafrika bei Sonnenuntergang" sizes="(min-width: 1024px) 260px, 45vw" />
                    <figcaption><b>Lobpreisabend</b>Ostafrika</figcaption>
                  </figure>
                  <figure className="lp-moment">
                    <Photo name="world-seoul" alt="Junge Menschen beten am frühen Morgen gemeinsam in einem Raum mit Blick auf Seoul" sizes="(min-width: 1024px) 260px, 45vw" />
                    <figcaption><b>Morgengebet</b>Seoul</figcaption>
                  </figure>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="lp-globe">
                  <div className="lp-globe-glow" aria-hidden="true" />
                  <Suspense fallback={<div className="w-full h-full" />}>
                    <NetworkGlobe fit="box" className="relative w-full h-full" kinds={kinds} />
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
            </div>
          </div>
        </section>

        {/* ── App-Showcase ─────────────────────────────────── */}
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
              <div className="relative" style={{ isolation: 'isolate' }}>
                <div className="lp-phone-halo" aria-hidden="true" />
                <div className="lp-phone">
                  <div id="app-screen" role="tabpanel" aria-labelledby={`tab-${feature}`} className="lp-phone-screen">
                    {FEATURES.map((f, i) => (
                      <img
                        key={f.screen}
                        src={`${APP}${f.screen}.webp`}
                        alt={i === feature ? `App-Ansicht: ${f.title}` : ''}
                        aria-hidden={i !== feature}
                        className={i === feature ? 'is-active' : ''}
                        loading="lazy"
                        decoding="async"
                        width="720"
                        height="1657"
                      />
                    ))}
                  </div>
                </div>
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
                  <div className="lp-card">
                    <span className="lp-card-icon"><Icon size={22} aria-hidden="true" /></span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
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
            <img
              src={`${IMG}final-2400.webp`}
              srcSet={`${IMG}final-1400.webp 1400w, ${IMG}final-2400.webp 2400w`}
              sizes="100vw"
              alt=""
              loading="lazy"
              decoding="async"
            />
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
                <Link to="/auth?mode=register" className="lp-btn lp-btn-primary">
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
