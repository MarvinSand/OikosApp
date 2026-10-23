import { X } from 'lucide-react'

const TYPE_INFO = {
  sport:  { emoji: '🏋️', label: 'Sport' },
  work:   { emoji: '💼', label: 'Arbeit' },
  school: { emoji: '🏫', label: 'Schule' },
  church: { emoji: '⛪', label: 'Gemeinde' },
  place:  { emoji: '📍', label: 'Ort' },
  other:  { emoji: '🗺️', label: 'Sonstiges' },
}

// Rein lesende Ansicht eines Ortes aus der eingeblendeten Map einer
// verlinkten Person — spiegelt OverlayPersonSheet, nur für Orte statt
// Personen (kein Editieren/Löschen/Verbinden, das bleibt der Besitzer-Map).
export default function OverlayPlaceSheet({ place, onClose, connectedPersonNames = [] }) {
  if (!place) return null
  const info = TYPE_INFO[place.type] || TYPE_INFO.place
  const notesVisible = place.is_public !== false && place.notes
  const prayerVisible = place.prayer_is_public === true && place.prayer_request

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.3)', backdropFilter: 'blur(3px)', zIndex: 40 }}
      />
      <div style={{
        position: 'fixed', bottom: 12,
        left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)', maxWidth: 480,
        backgroundColor: 'var(--color-surface-blur)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border)',
        borderRadius: 32,
        zIndex: 50,
        maxHeight: 'calc(90vh - 24px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px -12px rgba(58,46,36,0.25), 0 0 0 1px rgba(232, 213, 183, 0.3)',
        animation: 'sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                backgroundColor: 'var(--color-warm-4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {info.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, lineHeight: 1.2 }}>
                  {place.name}
                </h3>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: 'var(--color-warm-4)', color: 'var(--color-text-muted)' }}>
                  {info.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, flexShrink: 0, marginLeft: 8 }}
            >
              <X size={18} color="var(--color-text-muted)" />
            </button>
          </div>

          {notesVisible && (
            <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 20, padding: '10px 14px', backgroundColor: 'var(--color-warm-4)', borderRadius: 12 }}>
              {place.notes}
            </p>
          )}

          {prayerVisible && (
            <div style={{ marginBottom: 20, padding: '10px 14px', backgroundColor: 'var(--color-gold-light)', borderRadius: 12 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
                Gebetsanliegen
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
                {place.prayer_request}
              </p>
            </div>
          )}

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

          <div>
            <h4 style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verbundene Personen
            </h4>
            {connectedPersonNames.length === 0 && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                Keine Personen verbunden.
              </p>
            )}
            {connectedPersonNames.map((name, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
