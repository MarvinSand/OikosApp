import { useState } from 'react'
import { X, Search, Star } from 'lucide-react'
import { DEFAULT_STARRED_VERSIONS, groupVersionsByLanguage } from '../../lib/bibleVersionDefaults'

// Übersetzung wählen (1400+ YouVersion-Bibeln) - Vollbild-Picker mit
// Favoriten oben, Rest nach Sprache gruppiert. Wird sowohl von BibleView
// (Lese-Tab) als auch von VersePickerSheet (Bibelstellen-Auswahl in
// Composern/Bekenntnissen) genutzt.
export default function VersionPicker({ versions, loading, currentId, favorites, onToggleFavorite, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  const matches = (v) =>
    (v.localized_title || v.title || '').toLowerCase().includes(q)
    || (v.localized_abbreviation || v.abbreviation || '').toLowerCase().includes(q)

  const all = versions || []
  // Defaults zuerst, dann die echten API-Daten drüber (falls der Katalog
  // inzwischen geladen ist) - so zeigt die Favoriten-Zeile schon vor dem
  // ersten Laden Titel/Abkürzung, statt leer zu bleiben.
  const versionById = new Map([...DEFAULT_STARRED_VERSIONS, ...all].map(v => [String(v.id), v]))
  const favoriteVersions = [...(favorites || [])]
    .map(id => versionById.get(id))
    .filter(v => v && (!q || matches(v)))

  const rest = all.filter(v => !favorites?.has(String(v.id)) && (!q || matches(v)))
  // Pro Sprachgruppe gedeckelt statt einer flachen Liste: verhindert, dass
  // eine einzelne Sprache mit hunderten Einträgen den Rest verdrängt, UND
  // hält die Anzahl gerenderter Zeilen (~1479 Übersetzungen insgesamt)
  // niedrig genug, um auf dem Handy flüssig zu bleiben.
  const PER_LANGUAGE_CAP = q ? 60 : 15
  const groups = groupVersionsByLanguage(rest).map(g => ({
    ...g,
    shown: g.items.slice(0, PER_LANGUAGE_CAP),
    hiddenCount: g.items.length - Math.min(g.items.length, PER_LANGUAGE_CAP),
  }))

  function VersionRow(v) {
    const isFavorite = favorites?.has(String(v.id))
    return (
      <div
        key={v.id}
        className="w-full flex items-center gap-2 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => onSelect(v.id)}
          className="flex-1 text-left"
          style={{ color: String(v.id) === String(currentId) ? 'var(--color-accent)' : 'var(--color-text)' }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>{v.localized_title || v.title}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v.localized_abbreviation || v.abbreviation}</div>
        </button>
        <button onClick={() => onToggleFavorite(v.id)} className="p-1.5">
          <Star size={16} style={{ color: isFavorite ? '#f59e0b' : 'var(--color-text-tertiary)' }} fill={isFavorite ? '#f59e0b' : 'none'} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Übersetzung wählen</h2>
        <button onClick={onClose}><X size={20} style={{ color: 'var(--color-text-tertiary)' }} /></button>
      </div>
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <Search size={16} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Übersetzung suchen (1400+ verfügbar)…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text)' }}
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {favoriteVersions.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide pt-2 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>Favoriten</p>
            {favoriteVersions.map(VersionRow)}
          </>
        )}

        {/* Der volle Katalog lädt erst jetzt (Picker gerade geöffnet) - bis
            dahin bleiben die Favoriten oben trotzdem sofort sichtbar. */}
        {loading && !all.length && (
          <p style={{ color: 'var(--color-text-tertiary)', padding: '16px 0' }}>Lädt weitere Übersetzungen…</p>
        )}
        {!loading && all.length > 0 && favoriteVersions.length === 0 && groups.length === 0 && (
          <p style={{ color: 'var(--color-text-tertiary)', padding: '16px 0' }}>Keine Übersetzung gefunden.</p>
        )}

        {groups.map(g => (
          <div key={g.tag}>
            <p className="text-xs font-semibold uppercase tracking-wide pt-3 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {g.label}
            </p>
            {g.shown.map(VersionRow)}
            {g.hiddenCount > 0 && (
              <p className="text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                +{g.hiddenCount} weitere auf {g.label} – Suche verfeinern, um sie zu finden.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
