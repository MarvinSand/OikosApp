// Feste Hintergrund-Illustration für den gemeinsamen Garten – Wiese unter
// offenem Himmel, angedeuteter Zaun am Horizont als Ausblick auf das später
// folgende gemeinsame Dorf (eigenes Haus + Häuser der Geschwister).
export default function GardenBackground() {
  return (
    <svg
      viewBox="0 0 400 700"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFE3E0" />
          <stop offset="100%" stopColor="#E7EFCB" />
        </linearGradient>
        <linearGradient id="gardenField" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FBF6B" />
          <stop offset="100%" stopColor="#5A9B48" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="700" fill="url(#gardenSky)" />
      <circle cx="330" cy="80" r="34" fill="#F6DE94" opacity="0.9" />
      <path d="M0,150 C90,110 310,110 400,150 L400,700 L0,700 Z" fill="url(#gardenField)" />

      {/* Angedeuteter Zaun am Horizont */}
      {Array.from({ length: 11 }).map((_, i) => (
        <rect key={i} x={20 + i * 36} y="132" width="5" height="24" fill="#B08A5A" opacity="0.6" />
      ))}
      <rect x="14" y="140" width="378" height="4" fill="#B08A5A" opacity="0.5" />
    </svg>
  )
}
