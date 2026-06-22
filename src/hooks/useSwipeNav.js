import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Reihenfolge der Haupt-Tabs (identisch zur BottomNav)
const NAV_ORDER = [
  { path: '/',                 match: ['/'] },
  { path: '/friends?tab=feed', match: ['/friends', '/prayer', '/prayers'] },
  { path: '/worldmap',         match: ['/worldmap'] },
  { path: '/discipleship',     match: ['/discipleship'] },
  { path: '/profile',          match: ['/profile'] },
]

function currentTabIndex(pathname) {
  return NAV_ORDER.findIndex(t =>
    t.match.some(m =>
      m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(m + '/')
    )
  )
}

/**
 * Edge-Swipe-Navigation für Mobile (wie bei Instagram / iOS).
 * - Swipe vom linken Rand nach rechts → vorheriger Tab
 * - Swipe vom rechten Rand nach links → nächster Tab
 * Wird nur ausgelöst, wenn die Geste am Bildschirmrand beginnt,
 * damit es nicht mit der Weltkarte oder horizontalen Listen kollidiert.
 */
export function useSwipeNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const start = useRef(null)

  useEffect(() => {
    const EDGE = 40          // px ab Rand, wo die Geste starten muss
    const THRESHOLD = 60     // px Mindest-Strecke horizontal

    function onTouchStart(e) {
      if (e.touches.length !== 1) { start.current = null; return }
      const t = e.touches[0]
      const w = window.innerWidth
      const fromLeft = t.clientX <= EDGE
      const fromRight = t.clientX >= w - EDGE
      if (!fromLeft && !fromRight) { start.current = null; return }
      start.current = { x: t.clientX, y: t.clientY, fromLeft, fromRight }
    }

    function onTouchEnd(e) {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return

      const idx = currentTabIndex(location.pathname)
      if (idx === -1) return

      // Vom rechten Rand nach links → nächster Tab
      if (s.fromRight && dx < 0 && idx < NAV_ORDER.length - 1) {
        navigate(NAV_ORDER[idx + 1].path)
      }
      // Vom linken Rand nach rechts → vorheriger Tab
      else if (s.fromLeft && dx > 0 && idx > 0) {
        navigate(NAV_ORDER[idx - 1].path)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [location.pathname, navigate])
}
