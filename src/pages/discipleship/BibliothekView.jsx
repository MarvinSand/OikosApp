import { useState, useEffect, useMemo } from 'react'
import { Search, BookOpen, ListChecks, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

const TAGS = ['Angst', 'Streit', 'Ehe & Familie', 'Heilung', 'Liebe', 'Annahme', 'Schuld']

const TYPE_META = {
  bibelstudium: { label: 'Bibelstudium', icon: BookOpen },
  verssammlung: { label: 'Verssammlung', icon: ListChecks },
  artikel: { label: 'Artikel', icon: FileText },
}

export default function BibliothekView() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('library_entries').select('id, type, title, bible_reference, tags, body').order('title')
      .then(({ data }) => { if (!cancelled) { setEntries(data || []); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      const matchesTags = activeTags.length === 0 || activeTags.some(t => e.tags?.includes(t))
      const matchesSearch = !q || e.title.toLowerCase().includes(q) || (e.bible_reference || '').toLowerCase().includes(q)
      return matchesTags && matchesSearch
    })
  }, [entries, search, activeTags])

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft/bibliothek" />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <Search size={16} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Titel oder Bibelstelle suchen…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text)' }}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-3">
          {TAGS.map(tag => {
            const isActive = activeTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  color: isActive ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-10" style={{ color: 'var(--color-text-tertiary)' }}>Keine Einträge gefunden.</p>
        )}

        <div className="space-y-2.5">
          {filtered.map(entry => {
            const meta = TYPE_META[entry.type]
            const Icon = meta?.icon || FileText
            const isOpen = expanded === entry.id
            return (
              <div key={entry.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-bg)' }}>
                    <Icon size={16} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{entry.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {meta?.label}{entry.bible_reference ? ` · ${entry.bible_reference}` : ''}
                    </p>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4" style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {entry.body?.text && <p>{entry.body.text}</p>}
                    {entry.body?.verses && (
                      <ul className="list-disc pl-4 space-y-1">
                        {entry.body.verses.map((v, i) => <li key={i}>{v}</li>)}
                      </ul>
                    )}
                    <div className="flex gap-1.5 flex-wrap mt-3">
                      {entry.tags?.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full" style={{ fontSize: 10.5, backgroundColor: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
