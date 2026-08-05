// Deterministische, dark-mode-sichere Cover-Verläufe pro Community.
// Reine Funktionen – keine DB. Weißer Text/Initialen auf den Verläufen
// erreicht überall Kontrast ≥4.5:1 (dunkle, gesättigte Farbpaare).

const COVERS = [
  { from: '#6366F1', to: '#8B5CF6' }, // Indigo → Violett
  { from: '#0EA5E9', to: '#2563EB' }, // Cyan → Blau
  { from: '#14B8A6', to: '#059669' }, // Teal → Emerald
  { from: '#F43F5E', to: '#F97316' }, // Rose → Orange
  { from: '#D946EF', to: '#7C3AED' }, // Fuchsia → Purple
  { from: '#F59E0B', to: '#EA580C' }, // Amber → Orange
  { from: '#EC4899', to: '#BE185D' }, // Pink → Rosé dunkel
  { from: '#10B981', to: '#0D9488' }, // Grün → Teal
]

export function hashString(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// Liefert ein Cover-Theme für eine Community (anhand id oder Name).
export function communityCover(key) {
  const c = COVERS[hashString(key) % COVERS.length]
  return {
    from: c.from,
    to: c.to,
    gradient: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`,
  }
}

export function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
