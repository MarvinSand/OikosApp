import { useEffect, useLayoutEffect, useRef } from 'react'

// Wischen = Zurück-Pfeil. Das Element folgt dem Finger (links oder rechts),
// gleitet beim Loslassen sauber aus dem Bild und ruft dann `onBack` auf –
// zu kurz/zu langsam gewischt: federt zurück.
//
// Ignoriert wird eine Geste, die in einem Eingabefeld, einer horizontal
// scrollbaren Leiste (Filter-Chips), in einem `position: fixed`-Sheet innerhalb
// des Elements oder in `[data-no-swipe-back]` beginnt.
//
// `transform` liegt nur WÄHREND Geste/Animation auf dem Element (sonst wäre es
// Bezugsrahmen für `position: fixed`-Nachfahren, siehe SwipePager).
//
// Optionen:
//   enabled   – false schaltet die Geste ab (z. B. auf Tab-Seiten ohne Zurück-Pfeil)
//   resetKey  – ändert sich der Wert (z. B. location.key), wird der Zustand ohne
//               Animation zurückgesetzt; so bleibt die alte Seite bis zum
//               Routenwechsel „draußen“ und blitzt nicht kurz wieder auf.
export function useSwipeBack(ref, onBack, { enabled = true, resetKey, minDistance = 0.3 } = {}) {
  const backRef = useRef(onBack)
  const enabledRef = useRef(enabled)
  backRef.current = onBack
  enabledRef.current = enabled
  const resetRef = useRef(() => {})

  useLayoutEffect(() => { resetRef.current() }, [resetKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let s = null
    let timer = null

    const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    function reset() {
      clearTimeout(timer)
      el.style.transition = 'none'
      el.style.transform = ''
      el.style.willChange = ''
      el.style.boxShadow = ''
    }
    resetRef.current = reset

    function animateTo(x, done) {
      if (reduced()) { done?.(); return }
      el.style.transition = 'transform 0.24s cubic-bezier(0.22, 0.8, 0.25, 1)'
      el.style.transform = `translate3d(${x}px, 0, 0)`
      clearTimeout(timer)
      timer = setTimeout(() => done?.(), 250)
    }

    const blocked = (target) => {
      for (let n = target; n && n !== el; n = n.parentElement) {
        if (n.nodeType !== 1) continue
        if (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable) return true
        if (n.hasAttribute?.('data-no-swipe-back')) return true
        const cs = getComputedStyle(n)
        if (cs.position === 'fixed') return true
        if (n.scrollWidth > n.clientWidth + 1 && (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) return true
      }
      return false
    }

    const onStart = (e) => {
      if (!enabledRef.current || e.touches.length !== 1 || blocked(e.target)) { s = null; return }
      // Läuft noch eine Ausgleitanimation, keine neue Geste starten.
      if (el.style.transform) { s = null; return }
      s = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now(), lock: null, dx: 0 }
    }

    const onMove = (e) => {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (!s.lock) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        s.lock = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'h' : 'v'
        if (s.lock === 'h') {
          el.style.willChange = 'transform'
          el.style.transition = 'none'
        }
      }
      if (s.lock !== 'h') return
      if (e.cancelable) e.preventDefault()
      s.dx = dx
      el.style.transform = `translate3d(${dx}px, 0, 0)`
      el.style.boxShadow = dx > 0 ? '-10px 0 28px rgba(0,0,0,0.18)' : '10px 0 28px rgba(0,0,0,0.18)'
    }

    const onEnd = () => {
      if (!s) return
      const { lock, dx, time } = s
      s = null
      if (lock !== 'h') return
      const w = el.clientWidth || window.innerWidth
      const v = dx / Math.max(1, Date.now() - time) // px/ms
      const commit = Math.abs(dx) > w * minDistance || (Math.abs(v) > 0.5 && Math.abs(dx) > 40)
      if (commit) {
        animateTo(dx > 0 ? w : -w, () => {
          backRef.current?.()
          // Fallback: blieb die Seite stehen (Navigation fehlgeschlagen), zurückholen.
          timer = setTimeout(() => animateTo(0, reset), 800)
        })
      } else {
        animateTo(0, reset)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      clearTimeout(timer)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref])
}
