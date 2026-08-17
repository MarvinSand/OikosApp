function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Kleiner, sich überlappender Avatar-Stapel (max. 2 Bilder) + Anzahl-Text.
// Für "gemeinsame Freunde"-Hinweise neben Namen oder auf Vorschlagskarten.
export default function MutualAvatars({ people = [], count = people.length, size = 18 }) {
  if (count === 0) return null
  const shown = people.slice(0, 2)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ display: 'flex' }}>
        {shown.map((p, i) => (
          p.avatar_url ? (
            <img
              key={p.id}
              src={p.avatar_url}
              alt=""
              style={{
                width: size, height: size, borderRadius: '50%', objectFit: 'cover',
                border: '1.5px solid var(--color-bg)', marginLeft: i === 0 ? 0 : -6, flexShrink: 0,
              }}
            />
          ) : (
            <div
              key={p.id}
              style={{
                width: size, height: size, borderRadius: '50%', flexShrink: 0,
                border: '1.5px solid var(--color-bg)', marginLeft: i === 0 ? 0 : -6,
                backgroundColor: 'var(--color-warm-1)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.42, fontWeight: 700,
              }}
            >
              {getInitials(p.full_name || p.username)}
            </div>
          )
        ))}
      </div>
      <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>
        {count} gemeinsame{count === 1 ? 'r' : ''} Freund{count === 1 ? '' : 'e'}
      </span>
    </div>
  )
}
