// ════════════════════════════════════════════════════════════════════════
// Gemeinsames Gebets-Modell
// ════════════════════════════════════════════════════════════════════════
// Gebete liegen in zwei Tabellen:
//   'oikos'    → prayer_requests          (an eine Oikos-Person gebunden)
//   'personal' → personal_prayer_requests (Feed, Community, geteilte Gebete)
// Alles darüber (Karte, Aktionen, Feeds) arbeitet nur noch mit dem hier
// normalisierten Objekt – so sehen Gebete überall gleich aus, egal woher sie
// kommen.

export const KIND_OIKOS = 'oikos'
export const KIND_PERSONAL = 'personal'

// Tabelle/Spalte je Gebets-Art. Ersetzt die früher an vier Stellen
// duplizierten `request.person_id ? … : …`-Abfragen.
export function requestTable(kind) {
  return kind === KIND_OIKOS ? 'prayer_requests' : 'personal_prayer_requests'
}
export function logTable(kind) {
  return kind === KIND_OIKOS ? 'prayer_logs' : 'personal_prayer_logs'
}
export function logColumn(kind) {
  return kind === KIND_OIKOS ? 'prayer_request_id' : 'request_id'
}
export function listColumn(kind) {
  return kind === KIND_OIKOS ? 'prayer_request_id' : 'personal_prayer_request_id'
}
// Spalte in prayer_notes (Kommentare), die auf das Gebet zeigt.
export function noteColumn(kind) {
  return kind === KIND_OIKOS ? 'prayer_request_id' : 'request_id'
}
// Spalte in `messages`, über die eine Chat-Nachricht auf das Gebet zeigt.
export function messageColumn(kind) {
  return kind === KIND_OIKOS ? 'prayer_request_id' : 'personal_prayer_request_id'
}

// Art einer rohen DB-Zeile bestimmen (prayer_requests hat person_id).
export function kindOf(row) {
  return row?.person_id ? KIND_OIKOS : KIND_PERSONAL
}

// Rohe DB-Zeile → einheitliches Gebets-Objekt.
//   source: woher das Gebet im aktuellen Feed stammt ('personal' | 'sibling' |
//           'oikos' | 'community' | 'shared') – rein informativ für Badges.
export function normalizePrayer(row, { kind = null, source = null } = {}) {
  if (!row) return null
  const k = kind || kindOf(row)
  const isOikos = k === KIND_OIKOS
  return {
    key: `${k}:${row.id}`,
    id: row.id,
    kind: k,
    title: row.title || '',
    description: row.description || '',
    author: row.profiles || null,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    isAnswered: !!row.is_answered,
    isPinned: !!row.is_pinned,
    // Oikos-Anliegen kennen is_public, Feed-Anliegen visibility.
    isPublic: isOikos ? row.is_public !== false : row.visibility !== 'private',
    visibility: isOikos ? (row.is_public === false ? 'private' : 'public') : (row.visibility || 'private'),
    category: row.category || null,
    communityId: row.visibility_community_id || null,
    personId: row.person_id || null,
    personName: row.oikos_people?.name || null,
    source: source || (isOikos ? 'oikos' : 'personal'),
    raw: row,
  }
}

// Liste normalisieren und Dubletten entfernen (dasselbe Gebet kann über
// mehrere Quellen hereinkommen, z.B. Community + geteilt im Chat).
export function dedupePrayers(prayers) {
  const byKey = new Map()
  for (const p of prayers) {
    if (!p) continue
    if (!byKey.has(p.key)) byKey.set(p.key, p)
  }
  return [...byKey.values()]
}

export function sortByCreatedDesc(prayers) {
  return [...prayers].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

// Felder für eine Chat-Nachricht, die dieses Gebet weiterleitet.
export function forwardMessageFields(prayer) {
  return {
    type: 'prayer_request',
    text: prayer.title,
    bible_verse_text: prayer.description || null,
    [messageColumn(prayer.kind)]: prayer.id,
  }
}

// ── Formatierung (aus PrayerRequestsSection übernommen) ──────────────────
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  if (hours < 48) return 'gestern'
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tagen`
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

export function formatLastPrayed(iso) {
  if (!iso) return 'noch nie'
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dDay.getTime() === today.getTime())
    return `heute um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  if (dDay.getTime() === yesterday.getTime()) return 'gestern'
  const diffDays = Math.round((today - dDay) / 86400000)
  if (diffDays < 30) return `vor ${diffDays} Tagen`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

export function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Anzeigename eines Gebets-Autors ('Du' für eigene Anliegen).
export function authorName(prayer, currentUserId) {
  if (prayer.ownerId && prayer.ownerId === currentUserId) return 'Du'
  return prayer.author?.full_name || prayer.author?.username || prayer.personName || 'Unbekannt'
}
