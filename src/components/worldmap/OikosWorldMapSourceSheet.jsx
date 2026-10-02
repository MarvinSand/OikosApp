import { createPortal } from 'react-dom'
import { X, ArrowLeft } from 'lucide-react'

const C = {
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  text: 'var(--color-text)',
  textSec: 'var(--color-text-secondary)',
  textTer: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
  bgSec: 'var(--color-bg-secondary)',
}

const WHO_OPTIONS = [
  {
    value: 'linked_visible',
    icon: '🔵',
    label: 'Nur Geschwister mit Account, die schon sichtbar sind',
    desc: 'Verbindet nur Personen, die bereits als Pin auf der Weltkarte zu sehen sind – keine neuen Pins.',
  },
  {
    value: 'all_assigned',
    icon: '📍',
    label: 'Jeder, dem ein Standort zugewiesen wurde',
    desc: 'Zeigt zusätzlich Personen ohne Account, denen in der Oikos Map ein Standort zugewiesen wurde.',
  },
]

export default function OikosWorldMapSourceSheet({ source, onClose }) {
  const {
    ownMaps, loadingMaps, checkedMapIds, toggleMap, setAllMaps,
    step, confirmMaps, backToMaps,
    confirmMode, loadingResult,
  } = source

  const allChecked = ownMaps.length > 0 && checkedMapIds.size === ownMaps.length

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px',
        maxHeight: '80%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>
        {step === 'mode' && (
          <button onClick={backToMaps} style={{ position: 'absolute', top: 16, left: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
        )}

        {step === 'maps' && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px', textAlign: 'center' }}>
              Oikos Verbindungen anzeigen
            </h3>
            <p style={{ fontSize: 12, color: C.textTer, margin: '0 0 18px', textAlign: 'center' }}>
              Wähle eine oder mehrere deiner Oikos Maps aus.
            </p>

            {loadingMaps ? (
              <p style={{ fontSize: 13, color: C.textTer, textAlign: 'center', padding: '20px 0' }}>Lade Maps…</p>
            ) : ownMaps.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textTer, textAlign: 'center', padding: '20px 0' }}>
                Du hast noch keine Oikos Map angelegt.
              </p>
            ) : (
              <>
                <button
                  onClick={() => setAllMaps(!allChecked)}
                  style={{ border: 'none', background: 'none', color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 10 }}
                >
                  {allChecked ? 'Alle abwählen' : 'Alle auswählen'}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  {ownMaps.map(m => {
                    const checked = checkedMapIds.has(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMap(m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${checked ? C.accent : C.border}`,
                          background: checked ? C.bgSec : C.bg,
                          fontSize: 14, textAlign: 'left',
                          color: checked ? C.accentDark : C.text,
                          fontWeight: checked ? 700 : 400,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{checked ? '✓' : '○'}</span>
                        <span style={{ flex: 1 }}>{m.name}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <button
              onClick={confirmMaps}
              disabled={checkedMapIds.size === 0}
              style={{
                width: '100%', padding: '14px', border: 'none', borderRadius: 14,
                background: checkedMapIds.size === 0 ? C.border : C.accent,
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: checkedMapIds.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Weltkarte anzeigen
            </button>
          </>
        )}

        {step === 'mode' && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px', textAlign: 'center' }}>
              Wer soll angezeigt werden?
            </h3>
            <p style={{ fontSize: 12, color: C.textTer, margin: '0 0 18px', textAlign: 'center' }}>
              Bestimmt, welche Personen und Beziehungslinien eingeblendet werden.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WHO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => confirmMode(opt.value)}
                  disabled={loadingResult}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
                    padding: '14px 14px', borderRadius: 14, cursor: loadingResult ? 'wait' : 'pointer',
                    border: `1.5px solid ${C.border}`, background: C.bg, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{opt.icon} {opt.label}</span>
                  <span style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}>{opt.desc}</span>
                </button>
              ))}
            </div>

            {loadingResult && (
              <p style={{ fontSize: 12, color: C.textTer, textAlign: 'center', marginTop: 14 }}>Lade…</p>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
