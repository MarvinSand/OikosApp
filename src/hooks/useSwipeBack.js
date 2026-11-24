import { useEffect } from 'react'

// Horizontales Wischen (links oder rechts) schließt ein Overlay – wie der
// Zurück-Pfeil. Startet die Geste in einem Eingabefeld oder einer horizontal
// scrollbaren Leiste (Filter-Chips), wird sie ignoriert.
export function useSwipeBack(ref, onBack, { minDistance = 80 } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start = null

    const blocked = (target) => {
      for (let n = target; n && n !== el; n = n.parentElement) {
        if (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') return true
        if (n.scrollWidth > n.clientWidth + 1) {
          const ox = getComputedStyle(n).overflowX
          if (ox === 'auto' || ox === 'scroll') return true
        }
      }
      return false
    }

    const onStart = (e) => {
      if (e.touches.length !== 1 || blocked(e.target)) { start = null; return }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onEnd = (e) => {
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      start = null
      if (Math.abs(dx) >= minDistance && Math.abs(dx) > Math.abs(dy) * 1.5) onBack()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [ref, onBack, minDistance])
}
