import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GuidedPrayerMode from '../prayer/GuidedPrayerMode'

// Öffentliches Gebetsanliegen mit den meisten Interaktionen HEUTE
// (🙏-Gebete + Kommentare von heute) – prominent auf der Home-Seite.
export default function TopPrayerToday() {
  const [request, setRequest] = useState(null)
  const [interactions, setInteractions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showPrayer, setShowPrayer] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayISO = todayStart.toISOString()

      // Heutige Interaktionen: Gebete + Kommentare
      const [{ data: logs }, { data: notes }] = await Promise.all([
        supabase.from('personal_prayer_logs').select('request_id').gte('created_at', todayISO),
        supabase.from('prayer_notes').select('request_id').gte('created_at', todayISO),
      ])

      const counts = {}
      for (const l of (logs || [])) counts[l.request_id] = (counts[l.request_id] || 0) + 1
      for (const n of (notes || [])) counts[n.request_id] = (counts[n.request_id] || 0) + 1

      const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
      if (ranked.length === 0) { setRequest(null); return }

      const topIds = ranked.slice(0, 10).map(([id]) => id)
      const { data: candidates } = await supabase
        .from('personal_prayer_requests')
        .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
        .in('id', topIds)
        .eq('visibility', 'public')
        .eq('is_answered', false)

      const byId = {}
      for (const r of (candidates || [])) byId[r.id] = r

      // erstes (höchstgewichtetes) öffentliches Anliegen wählen
      const top = ranked.map(([id]) => id).find(id => byId[id])
      if (!top) { setRequest(null); return }
      setRequest(byId[top])
      setInteractions(counts[top] || 0)
    } catch {
      setRequest(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <div style={{ height: 160, borderRadius: 18, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  }
  if (!request) return null

  const ownerName = request.profiles?.full_name || request.profiles?.username || 'Unbekannt'
  const prayItems = [{ type: 'personal', request, ampel: null }]

  return (
    <>
      <div style={{
        borderRadius: 18, padding: '20px 20px',
        background: 'linear-gradient(160deg, #1A1208 0%, #2A1B0A 100%)',
        boxShadow: '0 8px 28px rgba(58,46,36,0.22)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: '#D4A853', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>
            🔥 Meistbewegtes Gebet heute
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 34, lineHeight: 1 }}>{request.icon || '🙏'}</span>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: '#F0EDE6', margin: 0, lineHeight: 1.25 }}>
              {request.title}
            </h2>
          </div>

          {request.description && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'rgba(240,237,230,0.7)', lineHeight: 1.6, margin: '0 0 12px' }}>
              {request.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'rgba(240,237,230,0.6)' }}>
              von {ownerName} · 🙏 {interactions} {interactions === 1 ? 'Interaktion' : 'Interaktionen'} heute
            </span>
            <button
              onClick={() => setShowPrayer(true)}
              style={{
                flexShrink: 0, padding: '10px 18px', borderRadius: 50, border: 'none',
                backgroundColor: '#D4A853', color: '#1A1208',
                fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🙏 Mitbeten
            </button>
          </div>
        </div>
      </div>

      {showPrayer && (
        <GuidedPrayerMode
          items={prayItems}
          onClose={() => { setShowPrayer(false); load() }}
        />
      )}
    </>
  )
}
