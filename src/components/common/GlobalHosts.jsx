import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useT } from '../../i18n'
import { useRegionJoinNotice, closeRegionJoinNotice } from '../../lib/regionNotice'
import {
  useHighlightComposerPreset, closeHighlightComposer, HIGHLIGHTS_CHANGED_EVENT,
} from '../../lib/highlightComposer'
import HighlightComposerSheet from '../home/HighlightComposerSheet'

// Overlays, die von überall ausgelöst werden können (Pop-up nach dem Standort-
// Eintrag, Moderator-Fenster „In Aktuelles anzeigen“). Einmal in der App
// eingehängt, damit sie das Schließen eines Menüs/Sheets überleben.
export default function GlobalHosts() {
  const composerPreset = useHighlightComposerPreset()
  return (
    <>
      <RegionJoinNotice />
      {composerPreset && (
        <HighlightComposerSheet
          preset={composerPreset}
          onClose={closeHighlightComposer}
          onCreated={() => {
            closeHighlightComposer()
            window.dispatchEvent(new Event(HIGHLIGHTS_CHANGED_EVENT))
          }}
        />
      )}
    </>
  )
}

function RegionJoinNotice() {
  const { t } = useT()
  const navigate = useNavigate()
  const groups = useRegionJoinNotice()
  if (!groups) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={closeRegionJoinNotice} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 360, background: 'var(--color-bg)',
        borderRadius: 20, padding: '24px 20px 18px', textAlign: 'center',
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)', animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent-dark)' }}>
          <MapPin size={24} />
        </div>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
          {t('Willkommen in deiner Region!')}
        </h3>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13.5, color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
          {groups.length > 1
            ? t('Du bist jetzt in diesen Gruppen und kannst dich dort mit Geschwistern austauschen:')
            : t('Du bist jetzt in dieser Gruppe und kannst dich dort mit Geschwistern austauschen:')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => { closeRegionJoinNotice(); navigate(`/community/${g.id}`) }}
              style={{ padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-accent)', background: 'var(--color-accent-light)', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}
            >
              {g.name}
            </button>
          ))}
        </div>
        <button
          onClick={closeRegionJoinNotice}
          style={{ width: '100%', padding: '12px 0', border: 'none', borderRadius: 12, cursor: 'pointer', backgroundColor: 'var(--color-accent)', color: '#000', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700 }}
        >
          {t('Super')}
        </button>
      </div>
    </div>,
    document.body
  )
}
