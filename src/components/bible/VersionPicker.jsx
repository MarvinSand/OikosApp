import { useMemo, useState } from 'react'
import { X, Search, Star, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { languageLabel, languageOptions } from '../../lib/bibleVersionDefaults'
import { useBibleVersionsByLanguage, useVersionMeta } from '../../hooks/useBible'

// Übersetzung wählen. Drei Schritte, damit nie der ganze Katalog auf einmal lädt:
//  1. Favoriten (kein Netzwerk-Call)
//  2. Sprache wählen
//  3. Übersetzungen dieser einen Sprache (wird erst jetzt geladen)
// Genutzt von BibleView und VersePickerSheet.
const overlayStyle = { backgroundColor: 'var(--color-bg)', paddingTop: 'env(safe-area-inset-top, 0px)' }
const listPad = { paddingBottom: 'calc(var(--bottom-nav-h, 64px) + 16px)' }
const headStyle = { borderBottom: '1px solid var(--color-border)' }
const tertiary = { color: 'var(--color-text-tertiary)' }

export default function VersionPicker({ currentId, favorites, onToggleFavorite, onSelect, onClose }) {
  const [step, setStep] = useState('favorites') // 'favorites' | 'language' | 'versions'
  const [lang, setLang] = useState(null)
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  const favIds = useMemo(() => [...(favorites || [])], [favorites])
  const metaOf = useVersionMeta(favIds)
  const { versions, loading, error } = useBibleVersionsByLanguage(step === 'versions' ? lang : null)
  const langs = useMemo(() => languageOptions(), [])

  function VersionRow(v) {
    const isFavorite = favorites?.has(String(v.id))
    return (
      <div key={v.id} className="w-full flex items-center gap-2 py-3" style={headStyle}>
        <button
          onClick={() => onSelect(v.id)}
          className="flex-1 text-left"
          style={{ color: String(v.id) === String(currentId) ? 'var(--color-accent)' : 'var(--color-text)' }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>{v.localized_title || v.title}</div>
          <div style={{ fontSize: 12, ...tertiary }}>{v.localized_abbreviation || v.abbreviation}</div>
        </button>
        <button onClick={() => onToggleFavorite(v.id)} className="p-1.5" aria-label="Favorit">
          <Star size={16} style={{ color: isFavorite ? '#f59e0b' : 'var(--color-text-tertiary)' }} fill={isFavorite ? '#f59e0b' : 'none'} />
        </button>
      </div>
    )
  }

  function Header({ title, back }) {
    return (
      <div className="flex items-center gap-2 px-4 py-4" style={headStyle}>
        {back && (
          <button onClick={back} className="p-1 -ml-1" aria-label="Zurück">
            <ChevronLeft size={20} style={tertiary} />
          </button>
        )}
        <h2 className="font-bold flex-1" style={{ color: 'var(--color-text)' }}>{title}</h2>
        <button onClick={onClose} aria-label="Schließen"><X size={20} style={tertiary} /></button>
      </div>
    )
  }

  function SearchBox({ placeholder }) {
    return (
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <Search size={16} style={tertiary} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
      </div>
    )
  }

  // ── Schritt 2: Sprache ──
  if (step === 'language') {
    const match = l => !q || l.label.toLowerCase().includes(q) || l.tag.includes(q)
    const pinned = langs.pinned.filter(match)
    const rest = langs.rest.filter(match)
    const LangRow = l => (
      <button
        key={l.tag}
        onClick={() => { setLang(l.tag); setSearch(''); setStep('versions') }}
        className="w-full flex items-center justify-between py-3 text-left"
        style={{ ...headStyle, color: 'var(--color-text)' }}
      >
        {l.label}
        <ChevronRight size={16} style={tertiary} />
      </button>
    )
    return (
      <div className="fixed inset-0 z-40 flex flex-col" style={overlayStyle}>
        {Header({ title: "Sprache wählen", back: () => { setSearch(''); setStep('favorites') } })}
        {SearchBox({ placeholder: 'Sprache suchen…' })}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={listPad}>
          {pinned.map(LangRow)}
          {pinned.length > 0 && rest.length > 0 && <div style={{ height: 12 }} />}
          {rest.map(LangRow)}
          {!pinned.length && !rest.length && <p style={{ ...tertiary, padding: '16px 0' }}>Keine Sprache gefunden.</p>}
        </div>
      </div>
    )
  }

  // ── Schritt 3: Übersetzungen einer Sprache ──
  if (step === 'versions') {
    const list = (versions || [])
      .filter(v => !q
        || (v.localized_title || v.title || '').toLowerCase().includes(q)
        || (v.localized_abbreviation || v.abbreviation || '').toLowerCase().includes(q))
      .sort((a, b) => (a.localized_title || a.title || '').localeCompare(b.localized_title || b.title || '', 'de'))
    return (
      <div className="fixed inset-0 z-40 flex flex-col" style={overlayStyle}>
        {Header({ title: languageLabel(lang), back: () => { setSearch(''); setStep('language') } })}
        {SearchBox({ placeholder: 'Übersetzung suchen…' })}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={listPad}>
          {loading && <p style={{ ...tertiary, padding: '16px 0' }}>Lädt Übersetzungen…</p>}
          {error && <p style={{ ...tertiary, padding: '16px 0' }}>Übersetzungen konnten nicht geladen werden.</p>}
          {!loading && !error && list.length === 0 && (
            <p style={{ ...tertiary, padding: '16px 0' }}>Keine Übersetzung gefunden.</p>
          )}
          {list.map(VersionRow)}
        </div>
      </div>
    )
  }

  // ── Schritt 1: Favoriten ──
  const favs = favIds.map(metaOf).filter(Boolean)
  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={overlayStyle}>
      {Header({ title: 'Übersetzung wählen' })}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={listPad}>
        <p className="text-xs font-semibold uppercase tracking-wide pt-2 pb-1" style={tertiary}>Favoriten</p>
        {favs.length === 0 && <p style={{ ...tertiary, padding: '12px 0' }}>Noch keine Favoriten.</p>}
        {favs.map(VersionRow)}
        <button
          onClick={() => { setSearch(''); setStep('language') }}
          className="w-full flex items-center gap-2 py-3 mt-3 font-semibold text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          <Plus size={16} /> Weitere Übersetzungen suchen
        </button>
      </div>
    </div>
  )
}
