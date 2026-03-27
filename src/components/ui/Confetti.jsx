import { useEffect, useState } from 'react'

const COLORS = ['#C8956A', '#D4A853', '#7A9E7E', '#E8D5B7', '#A0694A', '#B5CEB8']

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

export default function Confetti({ show }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!show) { setParticles([]); return }
    const pieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: randomBetween(10, 90),
      delay: randomBetween(0, 0.8),
      duration: randomBetween(1.5, 2.5),
      size: randomBetween(6, 12),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotate: randomBetween(0, 360),
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }))
    setParticles(pieces)
    const timer = setTimeout(() => setParticles([]), 3000)
    return () => clearTimeout(timer)
  }, [show])

  if (!particles.length) return null

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 998, overflow: 'hidden' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '100%',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : 3,
            animation: `confettiFly ${p.duration}s ease-out ${p.delay}s forwards`,
            transform: `rotate(${p.rotate}deg)`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFly {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; top: 80%; }
          100% { transform: translateY(-80vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
