import { useEffect, useRef } from 'react'

// 3D-Handy für die Landingpage: reagiert auf Maus/Neigung (CSS-3D), zeigt
// echte App-Screens und lässt Glas-Karten in unterschiedlicher Tiefe
// schweben (Parallax). Reine CSS-Transforms → läuft auf der GPU.
//
// Props:
//   screens – [{ src, alt }]  aktive Ansicht per `active`
//   cards   – [{ id, className, children, depth }] schwebende Elemente
//   scrollRotate – Element-Ref-Fortschritt wird extern über `style`-Variable --p gesetzt

export default function Phone3D({ screens, active = 0, cards = [], className = '', tiltMax = 14 }) {
  const stageRef = useRef(null)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let tx = 0, ty = 0, cx = 0, cy = 0
    let inside = false

    const frame = () => {
      raf = 0
      cx += (tx - cx) * 0.09
      cy += (ty - cy) * 0.09
      el.style.setProperty('--rx', `${(-cy * tiltMax).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${(cx * tiltMax).toFixed(2)}deg`)
      el.style.setProperty('--mx', cx.toFixed(3))
      el.style.setProperty('--my', cy.toFixed(3))
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }

    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
      inside = true
      kick()
    }
    const onLeave = () => { tx = 0; ty = 0; inside = false; kick() }
    // Touch-Geräte: sanftes Kippen per Gerätelage, wenn erlaubt (Android/ältere iOS)
    const onOrient = (e) => {
      if (inside || e.gamma == null) return
      tx = Math.max(-1, Math.min(1, e.gamma / 30))
      ty = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30))
      kick()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('deviceorientation', onOrient, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('deviceorientation', onOrient)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [tiltMax])

  return (
    <div ref={stageRef} className={`lp-p3d ${className}`}>
      <div className="lp-p3d-halo" aria-hidden="true" />
      <div className="lp-p3d-body">
        <div className="lp-p3d-float">
          <div className="lp-phone lp-phone-3d">
            <div className="lp-p3d-gloss" aria-hidden="true" />
            <div className="lp-phone-screen">
              <span className="lp-p3d-island" aria-hidden="true" />
              {screens.map((s, i) => (
                <img
                  key={s.src}
                  src={s.src}
                  alt={i === active ? s.alt : ''}
                  aria-hidden={i !== active}
                  className={i === active ? 'is-active' : ''}
                  width="720"
                  height="1657"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              ))}
            </div>
          </div>
          {cards.map(c => (
            <div
              key={c.id}
              className={`lp-p3d-card ${c.className || ''}`}
              style={{ '--d': c.depth ?? 60 }}
              aria-hidden={c.decorative ? 'true' : undefined}
            >
              {c.children}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
