import { useCallback, useRef } from 'react'

// Läuft von touchTarget nach oben bis root und meldet true, sobald ein
// horizontal scrollbarer Container (Karussell, Filter-Chips, …) gekreuzt
// wird – dort soll das native Scrollen Vorrang vor der Swipe-Navigation haben.
function crossesHorizontalScroller(target, root) {
  let node = target
  while (node && node !== root && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 2) {
      const overflowX = window.getComputedStyle(node).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
    node = node.parentElement
  }
  return false
}

// Touch-Handler für seitliches Wischen zwischen zwei benachbarten Sub-Tabs
// innerhalb einer Seite (z.B. Aktuelles/Community auf Home, Gebete/Feed).
// Anders als useSwipeNav (Edge-Swipe zwischen den Haupt-Tabs) reagiert dieser
// Handler überall im Inhaltsbereich, ignoriert die Geste aber, wenn sie über
// einem horizontal scrollbaren Karussell beginnt.
export function useSwipeTabs({ onSwipeLeft, onSwipeRight, threshold = 60 } = {}) {
  const containerRef = useRef(null)
  const start = useRef(null)

  const onTouchStart = useCallback(e => {
    if (e.touches.length !== 1) { start.current = null; return }
    const t = e.touches[0]
    const blocked = crossesHorizontalScroller(e.target, containerRef.current)
    start.current = blocked ? null : { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback(e => {
    if (!start.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.3) return
    if (dx < 0) onSwipeLeft?.()
    else onSwipeRight?.()
  }, [onSwipeLeft, onSwipeRight, threshold])

  return { containerRef, onTouchStart, onTouchEnd }
}
