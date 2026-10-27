import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Läuft von target nach oben bis root und meldet true, sobald ein horizontal
// scrollbarer Container (Karussell, Filter-Chips, …) gekreuzt wird – dort hat
// natives Scrollen Vorrang.
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

// Horizontaler Pager: Seiten liegen nebeneinander und folgen dem Finger.
// Der Fortschritt (fraktionaler Index) wird als CSS-Variable `--pager-progress`
// auf `syncRef` geschrieben, damit ein SegmentedTabs-Indikator (`synced`)
// ohne Re-Render mitwandert. Seiten werden erst gerendert, wenn sie besucht
// bzw. beim Wischen angedeutet werden (spart Requests beim Start).
export default function SwipePager({ count, index, onIndexChange, renderPane, syncRef, paneClassName = '' }) {
  const rootRef = useRef(null)
  const trackRef = useRef(null)
  const indexRef = useRef(index)
  const changeRef = useRef(onIndexChange)
  const mounted = useRef(false)
  const [visited, setVisited] = useState(() => new Set([index]))
  indexRef.current = index
  changeRef.current = onIndexChange

  function setProgress(p, animate) {
    const track = trackRef.current
    if (track) {
      track.style.transition = animate ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
      track.style.transform = `translate3d(${(-p * 100) / count}%, 0, 0)`
    }
    const sync = syncRef?.current
    if (sync) {
      sync.style.setProperty('--pager-progress', String(p))
      sync.style.setProperty('--pager-transition', animate ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none')
    }
  }

  useLayoutEffect(() => {
    setVisited(v => (v.has(index) ? v : new Set(v).add(index)))
    setProgress(index, mounted.current)
    mounted.current = true
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let s = null

    function onStart(e) {
      if (e.touches.length !== 1) { s = null; return }
      const t = e.touches[0]
      if (crossesHorizontalScroller(e.target, el)) { s = null; return }
      s = { x: t.clientX, y: t.clientY, time: Date.now(), lock: null, dx: 0 }
    }

    function onMove(e) {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (!s.lock) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        s.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v'
        if (s.lock === 'h') {
          const i = indexRef.current
          setVisited(v => {
            const next = new Set(v)
            if (i > 0) next.add(i - 1)
            if (i < count - 1) next.add(i + 1)
            return next.size === v.size ? v : next
          })
        }
      }
      if (s.lock !== 'h') return
      if (e.cancelable) e.preventDefault()
      s.dx = dx
      const w = el.clientWidth || 1
      let p = indexRef.current - dx / w
      if (p < 0) p *= 0.3
      else if (p > count - 1) p = count - 1 + (p - (count - 1)) * 0.3
      setProgress(p, false)
    }

    function onEnd() {
      if (!s) return
      const { lock, dx, time } = s
      s = null
      if (lock !== 'h') return
      const w = el.clientWidth || 1
      const v = dx / Math.max(1, Date.now() - time) // px/ms
      const i = indexRef.current
      let target = i
      if ((dx < -w * 0.25 || v < -0.5) && i < count - 1) target = i + 1
      else if ((dx > w * 0.25 || v > 0.5) && i > 0) target = i - 1
      setProgress(target, true)
      if (target !== i) changeRef.current?.(target)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [count])

  return (
    <div ref={rootRef} style={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
      <div ref={trackRef} style={{ display: 'flex', width: `${count * 100}%`, height: '100%', willChange: 'transform' }}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            className={`overflow-y-auto overflow-x-hidden hide-scrollbar ${paneClassName}`}
            style={{ width: `${100 / count}%`, height: '100%', flexShrink: 0, overscrollBehaviorX: 'none' }}
          >
            {visited.has(i) ? renderPane(i) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
