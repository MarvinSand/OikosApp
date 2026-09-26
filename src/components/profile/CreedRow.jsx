import { Copy, Flag, Lock, Globe, ChevronDown, Pencil, Check } from 'lucide-react'

export function formatConfessedAt(iso) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

// Eine Zeile für "Meine Bekenntnisse" (Profil-Tab), "Öffentliche Bekenntnisse
// entdecken" (Profil-Tab) und die öffentlichen Bekenntnisse auf fremden
// Profilen (UserCreedsTab) - dieselbe Darstellung, nur die verfügbaren
// Aktionen (Bearbeiten/Übernehmen/Melden) unterscheiden sich je Kontext.
//
// Konvention: eine Zeile mit bible_reference = null und "§ "-Präfix im body
// ist ein Abschnittstitel (siehe phase65b_discipleship_seed.sql).
export function CreedRow({
  creed, isOwn, isOfficial, expanded, lines, confessionCount, historyOpen, history,
  onToggleExpand, onEdit, onAdopt, onReport, onConfess, onToggleHistory, onOpenLine,
}) {
  return (
    <div className="rounded-2xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center gap-1.5 pl-1 pr-3 py-2">
        <button onClick={onToggleExpand} className="flex-1 flex items-center gap-2 min-w-0 text-left px-2.5 py-1.5">
          <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0, transition: 'transform 0.15s' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{creed.title}</p>
              {isOwn && (creed.visibility === 'public' ? <Globe size={12} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} /> : <Lock size={12} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />)}
            </div>
            {!isOwn && (
              <p style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
                {isOfficial ? 'Offiziell' : `von ${creed.profiles?.full_name || creed.profiles?.username || 'Jemandem'}`}
              </p>
            )}
          </div>
        </button>

        {isOwn && onEdit && (
          <button onClick={onEdit} className="p-1.5 flex-shrink-0"><Pencil size={15} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        )}
        {!isOwn && !isOfficial && onReport && (
          <button onClick={onReport} className="p-1.5 flex-shrink-0"><Flag size={15} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        )}
        {!isOwn && onAdopt && (
          <button onClick={onAdopt} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
            <Copy size={12} /> Übernehmen
          </button>
        )}

        {/* Abhak-Kästchen + Zähler + kleines Dropdown mit dem Verlauf */}
        <div className="flex items-center gap-1 flex-shrink-0 relative">
          <button
            onClick={onConfess}
            title="Bekannt - abhaken"
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg)', border: '1.5px solid var(--color-accent)' }}
          >
            <Check size={14} style={{ color: 'var(--color-accent)' }} />
          </button>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-tertiary)', minWidth: 14, textAlign: 'center' }}>
            {confessionCount}
          </span>
          <button
            onClick={onToggleHistory}
            title="Verlauf anzeigen"
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <ChevronDown size={13} style={{ color: 'var(--color-text-tertiary)', transform: historyOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {historyOpen && (
            <div
              style={{
                position: 'absolute', top: '120%', right: 0, zIndex: 30, width: 210,
                backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: '10px 12px', maxHeight: 220, overflowY: 'auto',
              }}
            >
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                {confessionCount}× bekannt
              </p>
              {!history && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
              {history?.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Noch nicht abgehakt.</p>}
              {history?.map(h => (
                <p key={h.id} style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '3px 0' }}>
                  {formatConfessedAt(h.confessed_at)}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {!lines && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
          {lines?.map(line => (
            line.bible_reference === null && line.body.startsWith('§ ') ? (
              <p key={line.id} className="mt-3 mb-1 first:mt-0" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                {line.body.replace(/^§\s*/, '')}
              </p>
            ) : line.bible_reference ? (
              <button key={line.id} onClick={() => onOpenLine(line)} className="block w-full text-left py-1">
                <span style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{line.body} </span>
                <span style={{ fontSize: 11.5, color: 'var(--color-accent)', fontWeight: 600 }}>{line.bible_reference}</span>
              </button>
            ) : (
              <p key={line.id} className="py-1" style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{line.body}</p>
            )
          ))}
        </div>
      )}
    </div>
  )
}
