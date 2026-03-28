import { X } from 'lucide-react'
import PrayerRequestsSection from '../person/PrayerRequestsSection'
import ImpactMapSection from '../person/ImpactMapSection'

export default function OverlayPersonSheet({ person, onClose }) {
  if (!person) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'var(--color-white)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        zIndex: 50,
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 24px rgba(58,46,36,0.14)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '8px 20px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-warm-3)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              backgroundColor: person.is_christian ? '#D4EDDA' : 'var(--color-warm-4)',
              border: `2px solid ${person.is_christian ? '#4E7A53' : 'var(--color-warm-3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Lora, serif', fontSize: 18,
            }}>
              {person.is_christian ? '🌿' : '🌱'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {person.name}
              </h2>
              <span style={{
                fontFamily: 'Lora, serif', fontSize: 12,
                color: person.is_christian ? '#4E7A53' : 'var(--color-text-muted)',
                fontStyle: 'italic',
              }}>
                {person.is_christian ? 'Christ/in' : 'Noch nicht Christ/in'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
          <PrayerRequestsSection personId={person.id} isOwner={false} />
          <ImpactMapSection personId={person.id} isOwner={false} personName={person.name} />
        </div>
      </div>
    </>
  )
}
