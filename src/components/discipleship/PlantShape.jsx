// Reine SVG-Darstellung einer Pflanze (ohne Wrapper), damit sie sowohl in der
// Dorf-Karte als auch einzeln verwendet werden kann.
// Wachstumsstufe entspricht 1:1 der bestehenden Impact-Map-Stufe
// (1 Freisetzung … 6 Kontinuität). Ist Stufe 6 abgeschlossen, wird zusätzlich
// der Ernte-Zustand (goldene Blüte + Glanz) gezeigt.
const STEM_COLOR = '#3F7E30'
const LEAF_COLORS = ['#8FBF6B', '#79B159', '#5FA047']
const BLOOM_COLOR = '#E8879B'
const HARVEST_COLOR = '#E8B33C'

function Stage1() {
  // Same/Keimling – kleiner Spross knapp über dem Boden
  return (
    <g>
      <path d="M20,47 C20,41 17,38 20,34" stroke={STEM_COLOR} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="16" cy="38" rx="4" ry="2.4" fill={LEAF_COLORS[0]} transform="rotate(-25 16 38)" />
      <ellipse cx="23" cy="36" rx="4" ry="2.4" fill={LEAF_COLORS[0]} transform="rotate(20 23 36)" />
    </g>
  )
}

function Stage2() {
  return (
    <g>
      <path d="M20,47 C20,38 18,32 20,25" stroke={STEM_COLOR} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <ellipse cx="14" cy="38" rx="5.5" ry="3.2" fill={LEAF_COLORS[0]} transform="rotate(-30 14 38)" />
      <ellipse cx="26" cy="34" rx="5.5" ry="3.2" fill={LEAF_COLORS[1]} transform="rotate(25 26 34)" />
    </g>
  )
}

function Stage3() {
  return (
    <g>
      <path d="M20,47 C20,36 18,28 20,18" stroke={STEM_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="13" cy="38" rx="6" ry="3.4" fill={LEAF_COLORS[0]} transform="rotate(-30 13 38)" />
      <ellipse cx="27" cy="34" rx="6" ry="3.4" fill={LEAF_COLORS[1]} transform="rotate(28 27 34)" />
      <ellipse cx="14" cy="26" rx="5.5" ry="3" fill={LEAF_COLORS[2]} transform="rotate(-20 14 26)" />
    </g>
  )
}

function Stage4() {
  // Knospe – noch geschlossen
  return (
    <g>
      <path d="M20,47 C20,34 19,24 20,14" stroke={STEM_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="12" cy="34" rx="6" ry="3.4" fill={LEAF_COLORS[0]} transform="rotate(-30 12 34)" />
      <ellipse cx="28" cy="30" rx="6" ry="3.4" fill={LEAF_COLORS[1]} transform="rotate(28 28 30)" />
      <ellipse cx="20" cy="13" rx="5" ry="6.5" fill={BLOOM_COLOR} opacity="0.75" />
    </g>
  )
}

function Stage5() {
  // Blüte – voll geöffnet
  return (
    <g>
      <path d="M20,47 C20,33 19,22 20,11" stroke={STEM_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="11" cy="33" rx="6" ry="3.4" fill={LEAF_COLORS[0]} transform="rotate(-30 11 33)" />
      <ellipse cx="29" cy="29" rx="6" ry="3.4" fill={LEAF_COLORS[1]} transform="rotate(28 29 29)" />
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse key={deg} cx="20" cy="11" rx="3.4" ry="6.5" fill={BLOOM_COLOR} transform={`rotate(${deg} 20 11)`} />
      ))}
      <circle cx="20" cy="11" r="3" fill="#F4D27A" />
    </g>
  )
}

function Stage6() {
  // Kontinuität abgeschlossen = Ernte-Darstellung
  return (
    <g>
      <path d="M20,47 C20,33 19,22 20,11" stroke={STEM_COLOR} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="11" cy="33" rx="6" ry="3.4" fill={LEAF_COLORS[0]} transform="rotate(-30 11 33)" />
      <ellipse cx="29" cy="29" rx="6" ry="3.4" fill={LEAF_COLORS[1]} transform="rotate(28 29 29)" />
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse key={deg} cx="20" cy="11" rx="3.6" ry="7" fill={HARVEST_COLOR} transform={`rotate(${deg} 20 11)`} />
      ))}
      <circle cx="20" cy="11" r="3.4" fill="#FFF4D6" />
    </g>
  )
}

const STAGE_RENDERERS = { 1: Stage1, 2: Stage2, 3: Stage3, 4: Stage4, 5: Stage5, 6: Stage6 }

// Zeichnet die Pflanze im lokalen Koordinatenraum 40×52 (Boden bei y≈47).
export default function PlantShape({ growthStage = 1, isHarvested = false }) {
  const stage = Math.min(6, Math.max(1, growthStage))
  const StageShape = STAGE_RENDERERS[stage]
  return (
    <g>
      <ellipse cx="20" cy="47" rx="9" ry="2.8" fill="rgba(0,0,0,0.16)" />
      <StageShape />
      {/* Ernte: kleine Funken um die Blüte statt einer flächigen Aufhellung */}
      {isHarvested && (
        <g fill="#FFE9A8" stroke="#E8B33C" strokeWidth="0.8">
          <circle cx="31" cy="6" r="2.2" />
          <circle cx="9" cy="9" r="1.7" />
          <circle cx="26" cy="20" r="1.4" />
        </g>
      )}
    </g>
  )
}
