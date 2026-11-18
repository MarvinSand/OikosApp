import { useRef } from 'react'

// 3D-Kachel: neigt sich zum Mauszeiger, Glanzfläche folgt dem Zeiger.
// Auf Touch-Geräten bleibt sie flach (kein Hover).
export default function Tilt({ children, className = '', max = 9, as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const raf = useRef(0)

  const set = (e) => {
    const el = ref.current
    if (!el || e.pointerType === 'touch') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      el.style.setProperty('--tx', `${((0.5 - y) * max * 2).toFixed(2)}deg`)
      el.style.setProperty('--ty', `${((x - 0.5) * max * 2).toFixed(2)}deg`)
      el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
      el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
    })
  }
  const reset = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.setProperty('--tx', '0deg')
    el.style.setProperty('--ty', '0deg')
  }

  return (
    <Tag ref={ref} className={`lp-tilt ${className}`} onPointerMove={set} onPointerLeave={reset} {...rest}>
      <span className="lp-tilt-glare" aria-hidden="true" />
      {children}
    </Tag>
  )
}
