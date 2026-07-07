// Pure layout helpers for the Oikos map (no React).
// The map keeps a "raw" position store (persisted/manual); these functions
// derive a clean display layout from it: new people land in free spots,
// overlapping nodes get pushed apart, overlay groups get room.

// Deterministic pseudo-random angle from two ids — used to separate nodes
// that sit exactly on top of each other without Math.random()
function hashAngle(idA, idB) {
  const s = idA < idB ? idA + idB : idB + idA
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return (Math.abs(h) % 360) * (Math.PI / 180)
}

/**
 * Iterative collision relaxation.
 * basePositions: { [id]: {x, y} }
 * nodes: [{ id, r, fixed }] — r is the effective radius (overlay parents get
 *        their disc radius), fixed nodes (currently dragged) never move.
 * opts: { cx, cy, centerR, gap, iterations }
 * Returns basePositions unchanged (same reference) if nothing overlaps.
 */
export function relaxLayout(basePositions, nodes, { cx, cy, centerR = 48, gap = 12, iterations = 40 } = {}) {
  const sorted = [...nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const pos = {}
  for (const n of sorted) {
    const p = basePositions[n.id]
    if (p) pos[n.id] = { x: p.x, y: p.y }
  }
  const active = sorted.filter(n => pos[n.id])
  let anyMoved = false

  for (let iter = 0; iter < iterations; iter++) {
    let maxMove = 0

    // Keep movable nodes clear of the fixed center node
    for (const n of active) {
      if (n.fixed) continue
      const p = pos[n.id]
      const required = centerR + n.r + gap
      const dx = p.x - cx
      const dy = p.y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < required) {
        const push = required - d
        if (d < 0.01) {
          const a = hashAngle(n.id, 'center')
          p.x += Math.cos(a) * push
          p.y += Math.sin(a) * push
        } else {
          p.x += (dx / d) * push
          p.y += (dy / d) * push
        }
        maxMove = Math.max(maxMove, push)
      }
    }

    // Pairwise repulsion
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]
        const b = active[j]
        if (a.fixed && b.fixed) continue
        const pa = pos[a.id]
        const pb = pos[b.id]
        const required = a.r + b.r + gap
        let dx = pb.x - pa.x
        let dy = pb.y - pa.y
        let d = Math.sqrt(dx * dx + dy * dy)
        if (d >= required) continue
        if (d < 0.01) {
          const ang = hashAngle(a.id, b.id)
          dx = Math.cos(ang)
          dy = Math.sin(ang)
          d = 1
        } else {
          dx /= d
          dy /= d
        }
        const overlap = required - Math.min(d, required)
        if (a.fixed) {
          pb.x += dx * overlap
          pb.y += dy * overlap
        } else if (b.fixed) {
          pa.x -= dx * overlap
          pa.y -= dy * overlap
        } else {
          pa.x -= dx * (overlap / 2)
          pa.y -= dy * (overlap / 2)
          pb.x += dx * (overlap / 2)
          pb.y += dy * (overlap / 2)
        }
        maxMove = Math.max(maxMove, overlap)
      }
    }

    if (maxMove > 0.5) anyMoved = true
    else break
  }

  if (!anyMoved) return basePositions
  return { ...basePositions, ...pos }
}

/**
 * Find a spot for a newly added person: the midpoint of the largest angular
 * gap on the ring, stepping outward if the ring is crowded.
 * existingPositions: array of {x, y} of already-placed primary people.
 */
export function findFreeSpot(existingPositions, cx, cy, ringRadius, r = 38, gap = 12) {
  const placed = existingPositions.filter(Boolean)
  if (placed.length === 0) {
    return { x: cx, y: cy - ringRadius }
  }

  const angles = placed
    .map(p => Math.atan2(p.y - cy, p.x - cx))
    .sort((a, b) => a - b)
  let bestGap = -1
  let bestAngle = -Math.PI / 2
  for (let i = 0; i < angles.length; i++) {
    const a0 = angles[i]
    const a1 = i === angles.length - 1 ? angles[0] + 2 * Math.PI : angles[i + 1]
    const gapSize = a1 - a0
    if (gapSize > bestGap) {
      bestGap = gapSize
      bestAngle = a0 + gapSize / 2
    }
  }

  const minDist = 2 * r + gap
  let radius = ringRadius
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = { x: cx + radius * Math.cos(bestAngle), y: cy + radius * Math.sin(bestAngle) }
    const collides = placed.some(p => Math.hypot(p.x - candidate.x, p.y - candidate.y) < minDist)
    if (!collides) return candidate
    radius += minDist * 0.6
  }
  return { x: cx + radius * Math.cos(bestAngle), y: cy + radius * Math.sin(bestAngle) }
}

/**
 * Position for the childIndex-th secondary child of a parent: fan out
 * alternating right/left of the center→parent line instead of stacking.
 */
export function fanOutSecondary(parentPos, cx, cy, childIndex = 0, dist = 110) {
  const dx = parentPos.x - cx
  const dy = parentPos.y - cy
  const baseAngle = Math.atan2(dy, dx)
  // Angular step so neighboring children clear each other (2*38+12 ≈ 88px chord)
  const step = 2 * Math.asin(Math.min(1, 44 / dist))
  const k = Math.ceil(childIndex / 2)
  const sign = childIndex % 2 === 1 ? 1 : -1
  const offset = childIndex === 0 ? 0 : sign * k * step
  const angle = baseAngle + offset
  return {
    x: parentPos.x + dist * Math.cos(angle),
    y: parentPos.y + dist * Math.sin(angle),
  }
}

/**
 * Radius of the disc an overlay group occupies around its parent node.
 * visiblePersons: overlay persons currently shown; offsets are relative to
 * the linked user's own map center (brotherCx/brotherCy).
 */
export function overlayDiscRadius(visiblePersons, brotherCx, brotherCy, bRingRadius, personR = 38) {
  let maxOffset = bRingRadius
  for (const p of visiblePersons) {
    if (p.pos_x != null && p.pos_y != null) {
      const off = Math.hypot(p.pos_x - brotherCx, p.pos_y - brotherCy)
      if (off > maxOffset) maxOffset = off
    }
  }
  return maxOffset + personR + 20
}
