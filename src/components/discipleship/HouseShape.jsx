// Haus eines Geschwisters in der Dorf-Ansicht (leicht schräge Top-Down-Optik).
// Lokaler Koordinatenraum ca. 120×110, Standfläche unten bei y≈100.
// Das eigene Haus wird wärmer/hervorgehoben gezeichnet.
export default function HouseShape({ isOwn = false }) {
  const wall = isOwn ? '#F0E0C0' : '#E4D9C4'
  const wallShade = isOwn ? '#DCC79E' : '#CFC2A8'
  const roof = isOwn ? '#B4472F' : '#8C5A45'
  const roofShade = isOwn ? '#933724' : '#6F4636'

  return (
    <g>
      {/* Schatten auf dem Boden */}
      <ellipse cx="60" cy="101" rx="46" ry="11" fill="rgba(0,0,0,0.18)" />

      {/* Wandkörper */}
      <path d="M18,58 L102,58 L102,98 L18,98 Z" fill={wall} />
      <path d="M78,58 L102,58 L102,98 L78,98 Z" fill={wallShade} />

      {/* Dach */}
      <path d="M60,14 L112,60 L8,60 Z" fill={roof} />
      <path d="M60,14 L112,60 L86,60 Z" fill={roofShade} />

      {/* Tür */}
      <path d="M50,72 L70,72 L70,98 L50,98 Z" fill="#7A5232" />
      <circle cx="66" cy="86" r="2" fill="#E8C56A" />

      {/* Fenster */}
      <rect x="27" y="70" width="15" height="13" rx="2" fill="#9CC7D6" stroke="#7A5232" strokeWidth="2" />
      <rect x="82" y="70" width="13" height="13" rx="2" fill="#7FAEBD" stroke="#7A5232" strokeWidth="2" />

      {/* Schornstein */}
      <rect x="86" y="26" width="11" height="20" fill={roofShade} />
    </g>
  )
}
