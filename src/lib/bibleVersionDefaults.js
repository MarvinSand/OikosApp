// Standardmäßig favorisierte Übersetzungen (ohne Netzwerk verfügbar) + Helfer
// zum Gruppieren der ~1479 YouVersion-Übersetzungen nach Sprache.
//
// Schlachter 2000 und New Living Translation sind nicht über die YouVersion
// Platform API verfügbar (Verlage geben viele bekannte Übersetzungen wie
// Schlachter, KJV, ESV, NIV-US nicht für die kostenlose API frei) - Ersatz
// nach Rücksprache: Elberfelder 1871 (schon vorgesehen) statt Schlachter,
// Berean Standard Bible statt NLT.
export const DEFAULT_STARRED_VERSIONS = [
  { id: '73',   localized_title: 'Hoffnung für alle',    localized_abbreviation: 'Hfa',   language_tag: 'de' },
  { id: '58',   localized_title: 'Elberfelder 1871',      localized_abbreviation: 'ELB71', language_tag: 'de' },
  { id: '3034', localized_title: 'Berean Standard Bible', localized_abbreviation: 'BSB',   language_tag: 'en' },
]

export const DEFAULT_STARRED_IDS = DEFAULT_STARRED_VERSIONS.map(v => v.id)

// language_tag ist mal ein 2-stelliger ISO-639-1-Code ("de"), mal ein
// 3-stelliger ISO-639-3-Code für seltene Sprachen ("kud") - Intl.DisplayNames
// kennt beide Formen und übersetzt sie ins Deutsche; unbekannte Codes (sehr
// kleine Sprachen ohne Eintrag) fallen auf den rohen Code zurück statt zu
// crashen.
let displayNames = null
export function languageLabel(tag) {
  if (!tag) return 'Unbekannt'
  try {
    displayNames ??= new Intl.DisplayNames(['de'], { type: 'language' })
    return displayNames.of(tag) || tag.toUpperCase()
  } catch {
    return tag.toUpperCase()
  }
}

// Gruppiert eine Liste von Bibel-Objekten nach language_tag, Gruppen
// alphabetisch nach ihrem angezeigten Sprachnamen sortiert.
export function groupVersionsByLanguage(versions) {
  const groups = new Map()
  for (const v of versions) {
    const tag = v.language_tag || 'und'
    if (!groups.has(tag)) groups.set(tag, [])
    groups.get(tag).push(v)
  }
  return [...groups.entries()]
    .map(([tag, items]) => ({ tag, label: languageLabel(tag), items }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
}
