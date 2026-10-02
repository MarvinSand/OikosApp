import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, HandHeart, Globe, BookOpen, User } from 'lucide-react'

// Instagram-artige Tab-Leiste: nur Icons, halbtransparentes „Glas" über dem
// Inhalt und ein Slider, der dem aktiven Tab federnd hinterhergleitet.
// Labels stehen weiterhin als aria-label für VoiceOver bereit.
const tabs = [
  { path: '/',         icon: Home,      label: 'Home',      match: ['/'] },
  { path: '/prayers',  icon: HandHeart, label: 'For You',   match: ['/friends', '/prayer', '/prayers'] },
  { path: '/worldmap', icon: Globe,     label: 'Weltkarte', match: ['/worldmap'] },
  { path: '/bible',    icon: BookOpen,  label: 'Bibel',     match: ['/bible'] },
  { path: '/profile',  icon: User,      label: 'Profil',    match: ['/profile'] },
]

function isPathActive(currentPath, match) {
  return match.some(m =>
    m === '/'
      ? currentPath === '/'
      : currentPath === m || currentPath.startsWith(m + '/')
  )
}

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef(null)

  // Echte Nav-Höhe (inkl. Home-Indicator) als --bottom-nav-h bereitstellen –
  // Weltkarten-Sheet, FABs und Chat-Leisten richten sich danach. In der
  // iOS-App kann env(safe-area-inset-bottom) beim allerersten Layout noch 0
  // sein, deshalb zusätzlich verzögert nachmessen.
  useLayoutEffect(() => {
    const el = navRef.current
    if (!el) return
    const setVar = () => document.documentElement.style.setProperty('--bottom-nav-h', el.offsetHeight + 'px')
    setVar()
    const raf = requestAnimationFrame(() => requestAnimationFrame(setVar))
    const timeout = setTimeout(setVar, 300)
    const ro = new ResizeObserver(setVar)
    // border-box: die Safe-Area steckt im padding-bottom. Standardmäßig
    // meldet ResizeObserver nur Änderungen der Content-Box – wenn die
    // Safe-Area in der iOS-App verspätet greift, blieb --bottom-nav-h
    // dadurch dauerhaft ~34px zu klein (Weltkarten-Leiste über der Nav).
    ro.observe(el, { box: 'border-box' })
    window.addEventListener('resize', setVar)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', setVar)
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
  }, [])

  const activeIndex = tabs.findIndex(t => isPathActive(location.pathname, t.match))

  return (
    <nav
      ref={navRef}
      aria-label="Hauptnavigation"
      className="bottom-nav md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40"
    >
      <div className="bottom-nav-row">
        {/* Slider: gleitet per transform zum aktiven Tab (GPU, kein Layout) */}
        <span
          aria-hidden="true"
          className="bottom-nav-slider"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex < 0 ? 0 : 1,
          }}
        >
          <span className="bottom-nav-slider-pill" />
        </span>

        {tabs.map(({ path, icon: Icon, label, match }) => {
          const isActive = isPathActive(location.pathname, match)
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`bottom-nav-item${isActive ? ' is-active' : ''}`}
            >
              <Icon size={25} strokeWidth={isActive ? 2.3 : 1.7} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
