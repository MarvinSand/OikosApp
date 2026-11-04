import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Maximize2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePublicMap } from '../../hooks/usePublicMap'
import MapCanvas from './MapCanvas'

// Zeigt die echte Map einer verlinkten Person unverändert (keine
// Koordinaten-Übersetzung, keine gemeinsame Kollisionsauflösung mit der
// Betrachter-Map) — eine eigene, unabhängige MapCanvas-Instanz mit den
// tatsächlichen Daten dieser Map, daher 1:1 identisch zu dem, was die
// Person selbst auf ihrer Map sieht. Ergänzt (ersetzt nicht) das
// eingeblendete Overlay direkt auf der eigenen Karte.
export default function MapPreviewSheet({ userId, initialMapId, onClose }) {
  const navigate = useNavigate()
  const [maps, setMaps] = useState(null) // null = noch am Laden
  const [selectedMapId, setSelectedMapId] = useState(initialMapId || null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('oikos_maps')
      .select('id, name, visibility, kind')
      .eq('user_id', userId)
      .neq('visibility', 'private')
      .order('created_at')
      .then(({ data }) => {
        if (cancelled) return
        const list = data || []
        setMaps(list)
        // Ausdrücklich angetippte Map (z. B. Eigene-Map-Kästchen im Overlay)
        // hat Vorrang; sonst ist die Geschwister-Systemkarte immer gepinnt
        // zuerst (siehe CLAUDE.md), sonst die erste gefundene Map.
        if (initialMapId && list.some(m => m.id === initialMapId)) return
        const first = list.find(m => m.kind === 'siblings') || list[0]
        setSelectedMapId(first?.id || null)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const { people, connections, places, placeConnections, ownerName, loading } = usePublicMap(userId, selectedMapId)

  function handleFullscreen() {
    onClose()
    navigate(`/user/${userId}/map/${selectedMapId}`)
  }

  const showEmpty = maps !== null && maps.length === 0

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
        height: '70vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px -12px rgba(58,46,36,0.25), 0 0 0 1px rgba(232, 213, 183, 0.3)',
        animation: 'sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ownerName ? `${ownerName}s Map` : 'Map'}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {selectedMapId && (
              <button
                onClick={handleFullscreen}
                aria-label="Vollbild"
                style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Maximize2 size={15} color="var(--color-warm-1)" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Schließen"
              style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={15} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>

        {/* Map-Umschalter — nur bei mehr als einer öffentlichen Map */}
        {maps && maps.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 10px', flexShrink: 0 }}>
            {maps.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                  border: `1.5px solid ${selectedMapId === m.id ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                  backgroundColor: selectedMapId === m.id ? 'var(--color-warm-1)' : 'transparent',
                  color: selectedMapId === m.id ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {/* Karte */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', borderTop: '1px solid var(--color-warm-3)' }}>
          {showEmpty ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Keine öffentliche Map verfügbar.
              </p>
            </div>
          ) : loading || !selectedMapId ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={22} color="var(--color-warm-3)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <MapCanvas
              userName={ownerName}
              people={people}
              connections={connections}
              places={places}
              placeConnections={placeConnections}
              overlayData={[]}
              readOnly
              ownerDisconnectedIds={new Set(people.filter(p => p.owner_disconnected).map(p => p.id))}
            />
          )}
        </div>
      </div>
    </>
  )
}
