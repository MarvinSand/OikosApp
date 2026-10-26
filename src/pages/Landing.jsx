import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Eye, Globe, HandHeart,
  Home, Monitor, MessageCircle, Network, Newspaper, ScrollText, ShieldCheck,
  Smartphone, Sprout, Users, Check,
} from 'lucide-react'
import { PLAY_STORE_URL, APP_STORE_URL } from '../lib/stores'

// Weltkugel + Länderdaten (~20 kB gzip) als eigener Chunk: Text und Buttons
// erscheinen sofort, die Kugel blendet danach ein.
const NetworkGlobe = lazy(() => import('../components/landing/NetworkGlobe'))

// Öffentliche Startseite der Domain (nur Web, ausgeloggt). Erklärt Idee und
// Vision von Oikos Connect und führt zu Web-App, Google Play und App Store.
// Bewusst ohne Datenabfragen: rendert sofort, auch im Kaltstart des Backends.

const SCREENS = [
  { src: '01-oikos-map', title: 'Deine Oikos Map', alt: 'Oikos Map: Menschen aus Familie, Freunden und Kollegen als farbige Kreise um dich herum' },
  { src: '03-gebete', title: 'Gemeinsam beten', alt: 'Gebete-Übersicht mit Gebetslisten, Gebetsmodus und einem geteilten Anliegen' },
  { src: '05-menschen-begleiten', title: 'Menschen begleiten', alt: 'Profil einer Person mit Gebetsanliegen, Story-Line und Impact-Stufen' },
  { src: '02-weltkarte', title: 'Die Weltkarte', alt: 'Weltkarte mit Geschwistern, Gemeinden und Events in der Nähe' },
  { src: '06-communities', title: 'Deine Communities', alt: 'Liste von Hauskreisen, Gemeinden und Gebetskreisen' },
  { src: '04-feed', title: 'Glauben teilen', alt: 'Feed mit Zeugnissen, Bibelversen und Ermutigung' },
  { src: '07-bekenntnisse', title: 'Wahrheit bekennen', alt: 'Glaubensbekenntnis mit eingeblendeter Bibelstelle' },
  { src: '08-bibel', title: 'Die Bibel lesen', alt: 'Bibelleser mit farbig markierten Versen' },
  { src: '09-chats', title: 'Chats & Aktivitäten', alt: 'Chats mit Geschwistern und Gruppen' },
  { src: '10-startseite', title: 'Täglich ermutigt', alt: 'Startseite mit Tagesvers und Gebetsimpuls' },
]
const screen = (key) => SCREENS.find(s => s.src === key)
const IMG_W = 560
const IMG_H = 1217

const STAGES = [
  {
    label: 'Dein Oikos', title: 'Es beginnt bei dir',
    text: 'Familie, Freunde, Kollegen, Nachbarn: Menschen, die Gott dir ganz persönlich anvertraut hat. Auf deiner Oikos Map hältst du sie im Blick und betest gezielt für sie.',
  },
  {
    label: 'Gemeinde', title: 'Aus Kreisen wird Gemeinschaft',
    text: 'Hauskreise, Gebetsgruppen und Gemeinden finden zusammen, mit eigenem Chat, gemeinsamen Anliegen und Mitgliederübersicht.',
  },
  {
    label: 'Netzwerk', title: 'Geschwister, die du noch nicht kennst',
    text: 'Entdecke Christen und Events in deiner Nähe und bete füreinander, über Stadt- und Ländergrenzen hinweg.',
  },
  {
    label: 'Weltweit', title: 'Eine Familie, überall auf der Erde',
    text: 'Ein Gebet in Frankfurt, ein Zeugnis in Nairobi, ein Hauskreis in Seoul: Wir gehören zusammen. Genau das wollen wir sichtbar machen, damit Menschen Menschen zu Jesus führen.',
  },
]

// Ebenen wie in der App-Weltkarte: Geschwister · Events · Gemeinden
const LAYERS = [
  { key: 'sibling', icon: Users, label: 'Geschwister' },
  { key: 'event', icon: CalendarDays, label: 'Events' },
  { key: 'gemeinde', icon: Home, label: 'Gemeinden' },
]

const PILLARS = [
  { icon: MessageCircle, label: 'Austausch' },
  { icon: HandHeart, label: 'Gebet' },
  { icon: BookOpen, label: 'Bibel' },
  { icon: CalendarDays, label: 'Events' },
  { icon: Users, label: 'Community' },
  { icon: Sprout, label: 'Wachsen' },
]

const STEPS = [
  {
    icon: Eye, title: 'Sehen', screen: '01-oikos-map',
    text: 'Zeichne deine Oikos Map: Familie, Freunde, Kollegen, Nachbarn. Verbinde Menschen mit Orten wie Arbeit, Verein oder Gemeinde und erkenne, wo Gott dich hingestellt hat.',
  },
  {
    icon: HandHeart, title: 'Beten', screen: '03-gebete',
    text: 'Halte Anliegen fest und bete gezielt. Der Gebetsmodus führt dich Person für Person durch deine Listen, Erhörungen bleiben als Zeugnis erhalten.',
  },
  {
    icon: Users, title: 'Begleiten', screen: '05-menschen-begleiten',
    text: 'Eine Story-Line für wichtige Momente und sechs Impact-Stufen zeigen, wie ein Mensch Schritt für Schritt Jesus näherkommt.',
  },
  {
    icon: Globe, title: 'Verbinden', screen: '02-weltkarte',
    text: 'Finde Geschwister, Gemeinden und Events in deiner Nähe, gründe Hauskreise und geht den Weg gemeinsam. Deinen Standort steuerst du selbst.',
  },
]

const FEATURES = [
  { icon: Network, title: 'Oikos Map', text: 'Dein Umfeld auf einen Blick, mit Farben, Orten und Verbindungen.' },
  { icon: HandHeart, title: 'Gebete', text: 'Anliegen teilen, mitbeten, kommentieren, Listen und Gebetsziele.' },
  { icon: Globe, title: 'Weltkarte', text: 'Geschwister, Gemeinden und Events in deiner Nähe entdecken.' },
  { icon: Newspaper, title: 'Feed', text: 'Zeugnisse, Bibelverse und Ermutigung teilen und speichern.' },
  { icon: Users, title: 'Communities', text: 'Hauskreise und Gebetskreise mit Chat, Anliegen und Mitgliedern.' },
  { icon: ScrollText, title: 'Bekenntnisse', text: 'Eigene Glaubensbekenntnisse mit Bibelstellen regelmäßig aussprechen.' },
  { icon: BookOpen, title: 'Bibel', text: 'Mehrere Übersetzungen, Verse markieren, Notizen und Teilen.' },
  { icon: MessageCircle, title: 'Chats', text: 'Direkt oder in Gruppen für Bibelstudium, Evangelisation und mehr.' },
]

const TRUST = [
  'Du bestimmst bei jedem Inhalt, wer ihn sehen darf.',
  'Melden und Blockieren sind überall verfügbar.',
  'Kostenlos und ohne Werbung.',
  'Dein Konto lässt sich jederzeit vollständig löschen.',
]

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (shown || !ref.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.12 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown])

  return (
    <div
      ref={ref}
      className={`l-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

function Shot({ id, priority = false, className = '' }) {
  const s = screen(id)
  return (
    <img
      src={`/landing/${s.src}.webp`}
      alt={s.alt}
      width={IMG_W}
      height={IMG_H}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`l-shot ${className}`}
    />
  )
}

function SectionHead({ id, eyebrow, title, children }) {
  return (
    <Reveal className="max-w-2xl mx-auto text-center">
      <p className="l-eyebrow">{eyebrow}</p>
      <h2 id={id} className="l-h2">{title}</h2>
      {children && <p className="l-lead mt-4">{children}</p>}
    </Reveal>
  )
}

function StoreCard({ icon: Icon, title, text, children }) {
  return (
    <div className="l-card flex flex-col h-full p-6">
      <span className="l-icon-chip"><Icon size={22} aria-hidden="true" /></span>
      <h3 className="font-serif text-xl font-semibold mt-4">{title}</h3>
      <p className="text-warm-2 text-[15px] leading-relaxed mt-1.5 flex-1">{text}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export default function Landing() {
  const galleryRef = useRef(null)
  const stepRefs = useRef([])
  const [stage, setStage] = useState(0)
  const [kinds, setKinds] = useState({ sibling: true, event: true, gemeinde: true })

  // Welche Vision-Stufe steht gerade mittig im Bild? → Weltkugel blendet das Netz auf
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setStage(3); return }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setStage(Number(e.target.dataset.stage)) })
    }, { rootMargin: '-58% 0px -41% 0px' })
    stepRefs.current.forEach(el => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Oikos Connect – Verbunden im Glauben, rund um die Welt'
    return () => { document.title = prevTitle }
  }, [])

  function scrollToId(id) {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  function scrollGallery(dir) {
    const el = galleryRef.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className="landing h-full w-full overflow-y-auto overflow-x-hidden bg-bg text-dark">
      <a href="#main" className="l-skip" onClick={(e) => { e.preventDefault(); scrollToId('main') }}>
        Zum Inhalt springen
      </a>

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="l-dark l-header">
        <div className="l-container flex items-center justify-between h-16">
          <Link to="/welcome" className="flex items-center gap-2.5 no-anim" aria-label="Oikos Connect – Startseite">
            <img src="/landing/icon.webp" alt="" width="36" height="36" className="rounded-[10px]" />
            <span className="font-semibold text-[17px] tracking-tight">Oikos Connect</span>
          </Link>
          <nav aria-label="Hauptnavigation" className="hidden md:flex items-center gap-1">
            {[['vision', 'Vision'], ['so-funktioniert-es', 'So funktioniert’s'], ['funktionen', 'Funktionen'], ['download', 'Download']].map(([id, label]) => (
              <button key={id} type="button" className="l-navlink" onClick={() => scrollToId(id)}>{label}</button>
            ))}
          </nav>
          <Link to="/auth" className="l-btn l-btn-ghost !min-h-[44px] !px-4 text-[15px]">Anmelden</Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* ── Hero: Nachthimmel + Weltkugel ────────────────────── */}
        <section className="l-dark l-hero2" aria-labelledby="hero-title">
          <div className="l-stars" aria-hidden="true" />
          <div className="l-glow-warm" aria-hidden="true" />
          <div className="l-container relative z-10 pt-9 sm:pt-12 text-center">
            <p className="l-chip"><span aria-hidden="true" className="l-chip-dot" /> One Family · One Mission · One Oikos</p>
            <h1 id="hero-title" className="l-h1 l-h1-xl mt-6">
              Verbunden im Glauben.<br />
              <span className="l-gold-text">Rund um die Welt.</span>
            </h1>
            <p className="l-lead mt-5 max-w-2xl mx-auto">
              Oikos Connect verbindet Christen: Bete gezielt für dein persönliches Umfeld, finde
              Geschwister und Gemeinden und erlebt gemeinsam, was Gott tut.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth?mode=register" className="l-btn l-btn-primary">
                Kostenlos starten <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <button type="button" className="l-btn l-btn-ghost" onClick={() => scrollToId('vision')}>
                Die Vision entdecken
              </button>
            </div>
          </div>

          <div className="l-container relative pb-14 sm:pb-20">
            <div className="relative">
              <div className="relative">
                <Suspense fallback={<div className="l-globe-box" />}>
                  <NetworkGlobe className="l-globe-box" kinds={kinds} />
                </Suspense>
                {/* Ebenen-Schalter wie in der Weltkarte der App */}
                <div className="l-layers" role="group" aria-label="Ebenen der Weltkarte">
                  {LAYERS.map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={kinds[key]}
                      className={`l-layer ${kinds[key] ? 'is-on' : ''}`}
                      onClick={() => setKinds(k => ({ ...k, [key]: !k[key] }))}
                    >
                      <Icon size={15} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="l-hand l-hand-left" aria-hidden="true">Eine App.<br />Eine globale<br />Community.</p>
              <p className="l-hand l-hand-right" aria-hidden="true">Menschen.<br />Glaube.<br />Echte Verbindungen.</p>
              <ul className="l-pillars" aria-label="Das erwartet dich">
                {PILLARS.map(({ icon: Icon, label }) => (
                  <li key={label}><Icon size={18} aria-hidden="true" /> {label}</li>
                ))}
              </ul>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 justify-center text-sm text-warm-2" aria-label="Verfügbar auf">
              <li className="flex items-center gap-1.5"><Monitor size={16} aria-hidden="true" /> Web-App</li>
              <li className="flex items-center gap-1.5"><Smartphone size={16} aria-hidden="true" /> iPhone</li>
              <li className="flex items-center gap-1.5"><Smartphone size={16} aria-hidden="true" /> Android</li>
              <li className="flex items-center gap-1.5"><Check size={16} aria-hidden="true" /> Kostenlos &amp; werbefrei</li>
            </ul>

            <p className="text-center text-xs text-warm-2 mt-4 opacity-80">
              Symbolische Darstellung: Orte und Aktivitäten dienen der Illustration.
            </p>
          </div>
        </section>

        {/* ── Vision: das Netz wächst mit ──────────────────────── */}
        <section id="vision" className="l-dark l-vision scroll-mt-16" aria-labelledby="vision-title">
          <div className="l-stars l-stars-soft" aria-hidden="true" />
          <div className="l-container relative">
            <SectionHead id="vision-title" eyebrow="Unsere Vision" title="Aus einem Umfeld wird eine weltweite Familie">
              Jesus begegnet Menschen meist nicht auf einer Bühne, sondern am Küchentisch, im Büro
              und auf dem Spielplatz. Genau dort setzt Oikos an und lässt das Netz Schritt für Schritt wachsen.
            </SectionHead>

            <div className="l-story">
              <div className="l-story-globe">
                <Suspense fallback={<div className="w-full h-full" />}>
                  <NetworkGlobe stage={stage} fit="box" className="l-story-canvas w-full h-full" />
                </Suspense>
                <div className="l-stage-label" aria-hidden="true">
                  <span className="l-stage-dots">
                    {STAGES.map((st, i) => <i key={st.label} className={i <= stage ? 'on' : ''} />)}
                  </span>
                  {STAGES[stage].label}
                </div>
              </div>
              <ol className="l-story-steps">
                {STAGES.map((st, i) => (
                  <li
                    key={st.label}
                    ref={el => { stepRefs.current[i] = el }}
                    data-stage={i}
                    className={`l-step ${i === stage ? 'is-active' : ''}`}
                  >
                    <div>
                      <p className="l-eyebrow">Stufe {i + 1} · {st.label}</p>
                      <h3 className="font-serif text-2xl sm:text-3xl font-semibold mt-1.5">{st.title}</h3>
                      <p className="l-lead mt-3">{st.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Reveal className="max-w-2xl mx-auto pt-6 pb-4 text-center">
              <figure>
                <blockquote className="font-serif italic text-xl sm:text-2xl leading-snug">
                  „Glaube an den Herrn Jesus, und du wirst errettet werden, du und dein Haus!“
                </blockquote>
                <figcaption className="mt-3 text-sm text-warm-2">Apostelgeschichte 16,31 (Elberfelder 1871)</figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ── So funktioniert's ────────────────────────────────── */}
        <section id="so-funktioniert-es" className="l-section scroll-mt-16" aria-labelledby="steps-title">
          <div className="l-container">
            <SectionHead id="steps-title" eyebrow="So funktioniert’s" title="Vom Sehen zum Verbinden">
              Vier einfache Schritte, die aus guten Vorsätzen eine tägliche Gewohnheit machen.
            </SectionHead>

            <div className="mt-14 space-y-16 sm:space-y-24">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                const flip = i % 2 === 1
                return (
                  <Reveal key={step.title}>
                    <div className={`grid md:grid-cols-2 gap-8 md:gap-14 items-center ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
                      <div className="flex justify-center">
                        <Shot id={step.screen} className="w-[220px] sm:w-[260px]" />
                      </div>
                      <div className="text-center md:text-left">
                        <span className="l-icon-chip mx-auto md:mx-0"><Icon size={22} aria-hidden="true" /></span>
                        <p className="l-eyebrow mt-4">Schritt {i + 1}</p>
                        <h3 className="font-serif text-3xl sm:text-4xl font-semibold mt-1">{step.title}</h3>
                        <p className="l-lead mt-3 max-w-md mx-auto md:mx-0">{step.text}</p>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Funktionen ───────────────────────────────────────── */}
        <section id="funktionen" className="l-section l-section-alt scroll-mt-16" aria-labelledby="features-title">
          <div className="l-container">
            <SectionHead id="features-title" eyebrow="Funktionen" title="Alles, was ein Glaubensalltag braucht">
              Eine App statt zehn: von der Bibel bis zum Hauskreis-Chat.
            </SectionHead>
            <ul className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              {FEATURES.map(({ icon: Icon, title, text }, i) => (
                <li key={title}>
                  <Reveal delay={(i % 4) * 60} className="h-full">
                    <div className="l-card p-5 h-full">
                      <span className="l-icon-chip"><Icon size={22} aria-hidden="true" /></span>
                      <h3 className="font-semibold text-[17px] mt-3.5">{title}</h3>
                      <p className="text-warm-2 text-[15px] leading-relaxed mt-1">{text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Screens ──────────────────────────────────────────── */}
        <section id="screens" className="l-section overflow-hidden scroll-mt-16" aria-labelledby="screens-title">
          <div className="l-container">
            <SectionHead id="screens-title" eyebrow="Einblicke" title="So sieht Oikos Connect aus" />
            <div className="hidden sm:flex justify-end gap-2 mt-8">
              <button type="button" className="l-iconbtn" onClick={() => scrollGallery(-1)} aria-label="Vorherige Screens">
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" className="l-iconbtn" onClick={() => scrollGallery(1)} aria-label="Nächste Screens">
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div
            ref={galleryRef}
            className="l-gallery mt-6 sm:mt-4"
            role="region"
            aria-label="Screenshots der App"
            tabIndex={0}
          >
            {SCREENS.map(s => (
              <figure key={s.src} className="l-gallery-item">
                <Shot id={s.src} className="w-full" />
                <figcaption className="sr-only">{s.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Vertrauen ────────────────────────────────────────── */}
        <section className="l-section l-section-alt" aria-labelledby="trust-title">
          <div className="l-container">
            <Reveal>
              <div className="l-card p-6 sm:p-10 grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center max-w-4xl mx-auto">
                <span className="l-icon-chip !w-14 !h-14 mx-auto md:mx-0"><ShieldCheck size={28} aria-hidden="true" /></span>
                <div>
                  <h2 id="trust-title" className="font-serif text-2xl sm:text-3xl font-semibold text-center md:text-left">
                    Ein geschützter Raum für echten Austausch
                  </h2>
                  <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {TRUST.map(t => (
                      <li key={t} className="flex gap-2.5 text-[15px] leading-snug">
                        <Check size={18} className="shrink-0 mt-0.5 l-accent" aria-hidden="true" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Download ─────────────────────────────────────────── */}
        <section id="download" className="l-section scroll-mt-16" aria-labelledby="download-title">
          <div className="l-container">
            <SectionHead id="download-title" eyebrow="Loslegen" title="Nutze Oikos Connect, wo du willst">
              Dein Konto und deine Oikos Map sind überall dieselben: im Browser, auf dem iPhone und
              auf Android.
            </SectionHead>

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-12 max-w-5xl mx-auto">
              <Reveal>
                <StoreCard icon={Monitor} title="Web-App" text="Direkt im Browser, ohne Installation. Ideal am Laptop oder zum Ausprobieren.">
                  <Link to="/auth?mode=register" className="l-btn l-btn-primary w-full">
                    Im Browser öffnen <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </StoreCard>
              </Reveal>
              <Reveal delay={80}>
                <StoreCard icon={Smartphone} title="Android" text="Für Smartphones und Tablets, bei Google Play.">
                  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="l-btn l-btn-ghost w-full">
                    Bei Google Play laden
                    <span className="sr-only"> (öffnet in neuem Tab)</span>
                  </a>
                </StoreCard>
              </Reveal>
              <Reveal delay={160}>
                <StoreCard icon={Smartphone} title="iPhone" text="Für iPhone und iPad, im App Store.">
                  {APP_STORE_URL ? (
                    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="l-btn l-btn-ghost w-full">
                      Im App Store laden
                      <span className="sr-only"> (öffnet in neuem Tab)</span>
                    </a>
                  ) : (
                    <span className="l-btn l-btn-ghost w-full opacity-60 cursor-default" aria-disabled="true">
                      Bald im App Store
                    </span>
                  )}
                </StoreCard>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* ── Abschluss + Footer ───────────────────────────────── */}
      <div className="l-dark l-final">
        <div className="l-stars l-stars-soft" aria-hidden="true" />
        <div className="l-glow-warm" aria-hidden="true" />
        <div className="l-container relative text-center pt-20 sm:pt-28 pb-16">
          <Reveal>
            <p className="l-hand l-hand-static" aria-hidden="true">One Family. One Mission. One Oikos.</p>
            <figure className="max-w-2xl mx-auto mt-8">
              <blockquote className="font-serif italic text-xl sm:text-2xl leading-snug">
                „Denn wo zwei oder drei versammelt sind in meinem Namen, da bin ich mitten unter ihnen.“
              </blockquote>
              <figcaption className="mt-3 text-sm text-warm-2">Matthäus 18,20 (Lutherbibel)</figcaption>
            </figure>
            <h2 className="l-h2 !mt-10">Werde Teil der Familie</h2>
            <p className="l-lead mt-3 max-w-lg mx-auto">Kostenlos, werbefrei und in wenigen Minuten startklar.</p>
            <div className="mt-7 flex justify-center">
              <Link to="/auth?mode=register" className="l-btn l-btn-primary">
                Kostenlos starten <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>

        <footer className="relative border-t border-warm-3 py-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="l-container flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <Home size={18} className="text-warm-2" aria-hidden="true" />
              <span className="text-sm text-warm-2">© {new Date().getFullYear()} Oikos Connect</span>
            </div>
            <nav aria-label="Rechtliches" className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
              <Link to="/privacy" className="l-footlink">Datenschutz</Link>
              <Link to="/terms" className="l-footlink">Nutzungsbedingungen</Link>
              <Link to="/support" className="l-footlink">Support</Link>
              <Link to="/auth" className="l-footlink">Anmelden</Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  )
}
