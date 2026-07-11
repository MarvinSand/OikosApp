// Wiederverwendbare Berglandschafts-Illustration für den Pilgerweg.
// variant="fork"  → inkl. Pfad, der sich unten in zwei Wege gabelt (Fork-Screen)
// variant="plain" → nur die Landschaft, ohne Pfad-Illustration (Pfad-Screen,
//                    dort zeichnet PilgrimPath den eigentlichen Stationen-Pfad)
export default function MountainBackground({ variant = 'plain', className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 400 700"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      style={{ position: 'absolute', inset: 0, ...style }}
      aria-hidden="true"
    >
      {/* Sonne – warmer Goldton, kein Glow */}
      <circle cx="308" cy="96" r="30" fill="#E8C56A" opacity="0.9" />

      {/* Linker, blasser kahler Hügel (breiter Weg) */}
      <path
        d="M0,700 L0,440 C70,395 150,410 195,445 C225,470 250,510 250,700 Z"
        fill="#DAD7C8"
        opacity="0.9"
      />
      <path
        d="M0,700 L0,510 C50,480 110,490 150,520 C185,548 205,600 205,700 Z"
        fill="#C9C5B2"
        opacity="0.7"
      />

      {/* Rechte, satte grüne Berge */}
      <path
        d="M150,700 C155,520 210,400 255,350 C295,305 350,330 400,270 L400,700 Z"
        fill="#33593F"
      />
      <path
        d="M220,700 C230,560 275,460 335,410 C365,385 400,395 400,395 L400,700 Z"
        fill="#294A34"
        opacity="0.92"
      />

      {/* Einfache Tannen-Silhouetten am Fuß der grünen Berge */}
      {[
        [268, 560], [296, 585], [324, 600], [350, 575], [278, 610], [312, 630], [346, 618],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <polygon points="0,-22 -10,0 10,0" fill="#1F3A28" />
          <polygon points="0,-13 -8,4 8,4" fill="#1F3A28" />
          <rect x="-2" y="4" width="4" height="6" fill="#1F3A28" />
        </g>
      ))}

      {variant === 'fork' && (
        <g strokeLinecap="round" fill="none">
          {/* Pfad von unten, gabelt sich */}
          <path d="M195,700 L195,545" stroke="#EDE7D8" strokeWidth="18" />
          {/* Links: breiter, blasser Weg */}
          <path d="M195,545 C160,505 110,470 70,445" stroke="#E4DFCE" strokeWidth="20" />
          {/* Rechts: schmaler Weg in die grünen Berge */}
          <path d="M195,545 C220,500 265,455 305,415" stroke="#E4DFCE" strokeWidth="9" />
        </g>
      )}
    </svg>
  )
}
