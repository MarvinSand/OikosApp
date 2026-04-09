import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePublicMap } from '../hooks/usePublicMap'
import MapCanvas from '../components/map/MapCanvas'
import { STAGES } from '../hooks/useImpactMap'

const BADGE_COLORS = {
  'Freund/in':  { bg: '#E8F4E8', color: 'var(--color-warm-1)' },
  'Kollege/in': { bg: '#EAF0F8', color: '#3A5F8A' },
  'Familie':    { bg: '#FBF0E8', color: '#A0694A' },
  'Nachbar/in': { bg: '#F5F0E0', color: '#8A7040' },
  'Bekannte/r': { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
  'Sonstige/r': { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
}

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── PublicPersonSheet ────────────────────────────────────────
function PublicPersonSheet({ person, currentUserId, onClose }) {
  const [requests, setRequests] = useState([])
  const [stages, setStages] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [prayedIds, setPrayedIds] = useState(new Set())

  useEffect(() => {
    loadData()
  }, [person.id])

  async function loadData() {
    const [{ data: reqData }, { data: stageData }] = await Promise.all([
      supabase
        .from('prayer_requests')
        .select('id, title, description, is_answered')
        .eq('person_id', person.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('impact_map_progress')
        .select('stage, note, completed_at')
        .eq('person_id', person.id)
        .eq('is_public', true)
        .order('stage'),
    ])
    setRequests(reqData || [])
    setStages(stageData || [])
    setLoadingData(false)
  }

  async function handlePray(requestId) {
    setPrayedIds(prev => new Set([...prev, requestId]))
    await supabase.from('prayer_logs').insert({ prayer_request_id: requestId, user_id: currentUserId })
  }

  const relBadge = BADGE_COLORS[person.relationship_type] || null
  const hasContent = requests.length > 0 || stages.length > 0

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              backgroundColor: person.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700,
            }}>
              {getInitials(person.name)}
            </div>
            <div>
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
                {person.name}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {person.relationship_type && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: relBadge?.bg || 'var(--color-warm-4)', color: relBadge?.color || 'var(--color-text-muted)' }}>
                    {person.relationship_type}
                  </span>
                )}
                <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: person.is_christian ? '#DFF5E8' : 'var(--color-warm-4)', color: person.is_christian ? '#1E8449' : 'var(--color-text-muted)' }}>
                  {person.is_christian ? 'Christ 🌿' : 'Noch nicht 🌱'}
                </span>
                {person.impact_stage > 0 && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>
                    Stufe {person.impact_stage}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Notiz */}
        {person.notes && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 16px', padding: '10px 14px', backgroundColor: 'var(--color-warm-4)', borderRadius: 12 }}>
            {person.notes}
          </p>
        )}

        {loadingData && (
          <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {!loadingData && !hasContent && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Diese Person hat ihre Inhalte privat gestellt.
          </p>
        )}

        {/* Impact Map Stufen */}
        {!loadingData && stages.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Impact Map
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stages.map(entry => {
                const s = STAGES[entry.stage - 1]
                const isDone = !!entry.completed_at
                return (
                  <div key={entry.stage} style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: isDone ? 'rgba(122,158,126,0.08)' : 'var(--color-warm-4)', border: `1.5px solid ${isDone ? 'var(--color-accent-light)' : 'var(--color-warm-3)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: entry.note ? 4 : 0 }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: isDone ? 'var(--color-accent-dark)' : 'var(--color-warm-1)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Stufe {entry.stage}
                      </span>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                        {s?.name}{isDone ? ' ✓' : ''}
                      </span>
                    </div>
                    {entry.note && (
                      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                        „{entry.note}"
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Gebetsanliegen */}
        {!loadingData && requests.length > 0 && (
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Gebetsanliegen
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map(r => {
                const prayed = prayedIds.has(r.id)
                return (
                  <div key={r.id} style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: r.is_answered ? 'rgba(122,158,126,0.08)' : 'var(--color-warm-4)', border: `1.5px solid ${r.is_answered ? 'var(--color-accent-light)' : 'var(--color-warm-3)'}` }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: r.is_answered ? 'var(--color-text-muted)' : 'var(--color-text)', margin: '0 0 4px', textDecoration: r.is_answered ? 'line-through' : 'none' }}>
                      {r.title}
                    </p>
                    {r.description && (
                      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.4, margin: '0 0 8px' }}>
                        {r.description}
                      </p>
                    )}
                    {!r.is_answered && (
                      <button
                        onClick={() => !prayed && handlePray(r.id)}
                        disabled={prayed}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          cursor: prayed ? 'default' : 'pointer',
                          backgroundColor: prayed ? 'transparent' : 'var(--color-warm-1)',
                          color: prayed ? 'var(--color-text-muted)' : 'white',
                          fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500,
                          border: prayed ? '1px solid var(--color-warm-3)' : 'none',
                        }}
                      >
                        {prayed ? '🙏 Gebetet' : '🙏 Ich habe gebetet'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── PublicMapView (Main) ─────────────────────────────────────
export default function PublicMapView() {
  const { id: userId, mapId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { map, people, connections, ownerName, loading } = usePublicMap(userId, mapId)
  const [selectedPerson, setSelectedPerson] = useState(null)

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <div style={{ height: 18, width: 140, borderRadius: 8, backgroundColor: 'var(--color-warm-3)' }} />
          <div style={{ width: 36 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--color-warm-3)', borderTopColor: 'var(--color-warm-1)', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (!map) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <span style={headerTitle}>Nicht gefunden</span>
          <div style={{ width: 36 }} />
        </div>
        <p style={{ padding: 24, fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
          Diese Map ist nicht verfügbar.
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }} className="md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
        <span style={headerTitle}>{map.name}</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, padding: 8, overflow: 'hidden' }}>
        <MapCanvas
          userName={ownerName}
          people={people}
          connections={connections}
          onPersonClick={setSelectedPerson}
          readOnly
        />
      </div>

      {selectedPerson && (
        <PublicPersonSheet
          person={selectedPerson}
          currentUserId={user?.id}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  )
}

const headerStyle = {
  backgroundColor: 'var(--color-white)',
  borderBottom: '1px solid var(--color-warm-3)',
  padding: '14px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  position: 'sticky', top: 0, zIndex: 5, flexShrink: 0,
}
const backBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }
const headerTitle = { fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center', margin: '0 8px' }
