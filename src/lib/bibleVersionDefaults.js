import { BIBLE_LANGUAGE_TAGS } from './bibleLanguageTags'
import { getLang, tr } from '../i18n'

// Standardmäßig favorisierte Übersetzungen (ohne Netzwerk verfügbar) + Helfer
// zum Gruppieren der YouVersion-Übersetzungen nach Sprache.
//
// Der Katalog der YouVersion Platform API enthält nur Übersetzungen, die die
// Verlage für die API freigegeben haben (Nov. 2026 geprüft: 1484 Übersetzungen,
// 1262 Sprachen; Deutsch nur 7: Lutherbibel 1912, Elberfelder (ELB/ELB71/ELBBK),
// Albrecht NT+Psalmen, Hoffnung für alle, Textbibel Kautzsch/Weizsäcker). Schlachter 2000,
// bibel.heute, NLT, KJV, ESV, NIV fehlen dort – ein Parameter `all_available=true`
// ändert daran nichts (liefert weiterhin dieselben 7). Sie lassen sich also
// nicht hinzufügen. Ersatz: Elberfelder 1871 statt Schlachter, Berean Standard
// Bible statt NLT.
export const DEFAULT_STARRED_VERSIONS = [
  { id: '73',   localized_title: 'Hoffnung für alle',    localized_abbreviation: 'Hfa',   language_tag: 'de' },
  { id: '58',   localized_title: 'Elberfelder 1871',      localized_abbreviation: 'ELB71', language_tag: 'de' },
  { id: '3034', localized_title: 'Berean Standard Bible', localized_abbreviation: 'BSB',   language_tag: 'en' },
]

export const DEFAULT_STARRED_IDS = DEFAULT_STARRED_VERSIONS.map(v => v.id)

// language_tag ist mal ein 2-stelliger ISO-639-1-Code ("de"), mal ein
// 3-stelliger ISO-639-3-Code für seltene Sprachen ("kud") - Intl.DisplayNames
// kennt beide Formen und übersetzt sie in die App-Sprache; unbekannte Codes
// (sehr kleine Sprachen ohne Eintrag) fallen auf den rohen Code zurück statt
// zu crashen.
const displayNames = {}
export function languageLabel(tag, lang = getLang()) {
  if (!tag) return tr('Unbekannt')
  try {
    displayNames[lang] ??= new Intl.DisplayNames([lang], { type: 'language' })
    return displayNames[lang].of(tag) || tag.toUpperCase()
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
    .sort((a, b) => a.label.localeCompare(b.label, getLang() === 'en' ? 'en' : 'de'))
}

// Sprachen, die zuerst im Sprach-Schritt des VersionPickers erscheinen.
export const PINNED_LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'pt', 'nl', 'ru', 'pl', 'tr']

// Auswahlliste für den Sprach-Schritt: ALLE Sprachen des YouVersion-Katalogs
// (bibleLanguageTags.js, generiert). Die Bibel-API filtert per
// language_ranges[]=<code>; so muss nie der Gesamtkatalog geladen werden.
export function languageOptions(lang = getLang()) {
  const collator = lang === 'en' ? 'en' : 'de'
  const pinned = PINNED_LANGUAGES.map(tag => ({ tag, label: languageLabel(tag, lang) }))
  const rest = BIBLE_LANGUAGE_TAGS
    .filter(tag => !PINNED_LANGUAGES.includes(tag))
    .map(tag => ({ tag, label: languageLabel(tag, lang) }))
    .sort((a, b) => a.label.localeCompare(b.label, collator))
  return { pinned, rest }
}
