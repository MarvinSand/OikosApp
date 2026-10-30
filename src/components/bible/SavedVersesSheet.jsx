import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Bookmark, Highlighter, StickyNote } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { resolveHighlightColor } from '../../lib/bibleColors'

const TABS = [
  { key: 'highlights', label: 'Markierungen', icon: Highlighter },
  { key: 'bookmarks', label: 'Gespeichert', icon: Bookmark },
  { key: 'notes', label: 'Notizen', icon: StickyNote },
]

// Alle eigenen Verse nach Art (wie in der YouVersion-App): Markierungen,
// Gespeichert (Lesezeichen), Notizen. Antippen springt zur Stelle.
export default function SavedVersesSheet({ onClose, onOpen }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('highlights')
  const [data, setData] = useState({ highlights: null, bookmarks: null, notes: null })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const [h, b, n] = await Promise.all([
        supabase.from('bible_highlights').select('id, bible_id, book, chapter, verse_start, verse_end, reference_label, color, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
        supabase.from('bible_bookmarks').select('id, bible_id, book, chapter, verse, reference_label, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
        supabase.from('bible_notes').select('id, bible_id, book, chapter, verse_start, verse_end, reference_label, note, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
      ])
      if (cancelled) return
      setData({ highlights: h.data || [], bookmarks: b.data || [], notes: n.data || [] })
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const list = data[tab]

  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 70, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="w-full max-w-md flex flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--color-bg)', maxHeight: '85dvh', height: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Meine Verse</h2>
          <button onClick={onClose} aria-label="Schließen"><X size={20} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>

        <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-secondary)', color: active ? '#fff' : 'var(--color-text-secondary)' }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {list === null && <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
          {list?.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {tab === 'highlights' ? 'Noch keine markierten Verse.' : tab === 'bookmarks' ? 'Noch keine gespeicherten Verse.' : 'Noch keine Notizen.'}
            </p>
          )}
          {list?.map(item => {
            const verseStart = item.verse_start ?? item.verse
            const verseEnd = item.verse_end ?? null
            return (
              <button
                key={item.id}
                onClick={() => onOpen({ bibleId: item.bible_id, book: item.book, chapter: item.chapter, verseStart, verseEnd })}
                className="w-full flex items-start gap-3 p-3 mb-2 rounded-xl text-left"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                {tab === 'highlights' && (
                  <span className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: resolveHighlightColor(item.color), boxShadow: '0 0 0 1px var(--color-border)' }} />
                )}
                {tab === 'bookmarks' && <Bookmark size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} fill="var(--color-accent)" />}
                {tab === 'notes' && <StickyNote size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.reference_label}</p>
                  {tab === 'notes' && (
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{item.note}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
