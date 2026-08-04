// Gemeinsamer Rahmen für alle Feed-Karten (Post, Kommentar, fokussierter
// Beitrag). Hält Rahmenlinien und die Thread-Linie in der Avatar-Spalte an
// einer Stelle, damit alle Ansichten pixelgenau gleich aussehen.

// Avatar (36px) + linker Rand (16px) + Abstand (10px) → Textspalte startet bei 62px.
export const AVATAR_SIZE = 36
export const CONTENT_INSET = 62
// Mittelachse des Avatars: 16 (Rand) + 18 (halber Avatar) − 1 (halbe Linienbreite)
const LINE_X = 33
const LINE_W = 2
// Der Avatar sitzt im Header zwischen diesen beiden Y-Werten.
const AVATAR_TOP = 12
const AVATAR_BOTTOM = AVATAR_TOP + AVATAR_SIZE

export default function FeedCardFrame({ threadLineBefore, threadLineAfter, children, style }) {
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        borderLeft: '1px solid var(--color-warm-3)',
        borderRight: '1px solid var(--color-warm-3)',
        // Innerhalb einer Thread-Kette entfällt der Trennstrich, damit die
        // Linie ohne Unterbrechung in die nächste Karte weiterläuft.
        borderBottom: threadLineAfter ? 'none' : '1px solid var(--color-warm-3)',
        ...style,
      }}
    >
      {/* Linie von der Oberkante bis zum Avatar (Anschluss an die Karte darüber) */}
      {threadLineBefore && (
        <div style={{
          position: 'absolute', left: LINE_X, top: 0, height: AVATAR_TOP,
          width: LINE_W, backgroundColor: 'var(--color-warm-3)',
        }} />
      )}

      {/* Linie vom Avatar bis zur Unterkante (Anschluss an die Karte darunter) */}
      {threadLineAfter && (
        <div style={{
          position: 'absolute', left: LINE_X, top: AVATAR_BOTTOM, bottom: 0,
          width: LINE_W, backgroundColor: 'var(--color-warm-3)',
        }} />
      )}

      {children}
    </div>
  )
}
