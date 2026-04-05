import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PrayerRequestsSection from '../person/PrayerRequestsSection'
import ImpactMapSection from '../person/ImpactMapSection'
import StoryLineSection from '../person/StoryLineSection'

const BADGE_COLORS = {
  'Freund/in':    { bg: '#E8F4E8', color: 'var(--color-warm-1)' },
  'Kollege/in':   { bg: '#EAF0F8', color: '#3A5F8A' },
  'Familie':      { bg: '#FBF0E8', color: '#A0694A' },
  'Nachbar/in':   { bg: '#F5F0E0', color: '#8A7040' },
  'Bekannte/r':   { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
  'Sonstige/r':   { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const STAGE_NAMES = ['Freisetzung', 'Meine Rolle', 'Empathie', 'Perspektive', 'Wortkraft', 'Kontinuität']

export default function OverlayPersonSheet({ person: initialPerson, onClose }) {
  const [person, setPerson] = useState(initialPerson)
  const [connections, setConnections] = useState([])
  const [mapPeople, setMapPeople] = useState([])

  // Load full person data + connections when sheet opens
  useEffect(() => {
    if (!initialPerson?.id) return

    // Fetch full person record
    supabase
      .from('oikos_people')
      .select('id, name, is_christian, impact_stage, relationship_type, notes, map_id')
      .eq('id', initialPerson.id)
      .single()
      .then(({ data }) => {
        if (data) setPerson(data)
      })
  }, [initialPerson?.id])

  // Load connections and sibling people once we have map_id
  useEffect(() => {
    if (!person?.map_id) return

    Promise.all([
      supabase
        .from('oikos_connections')
        .select('id, source_person_id, target_person_id, label')
        .eq('map_id', person.map_id),
      supabase
        .from('oikos_people')
        .select('id, name')
        .eq('map_id', person.map_id),
    ]).then(([connRes, peopleRes]) => {
      setConnections(connRes.data || [])
      setMapPeople(peopleRes.data || [])
    })
  }, [person?.map_id])

  if (!person) return null

  const relBadge = BADGE_COLORS[person.relationship_type] || null
  const stageNum = person.impact_stage || 1
  const stageName = STAGE_NAMES[stageNum - 1]

  const myConnections = connections.filter(
    c => c.source_person_id === person.id || c.target_person_id === person.id
  )

  function getOtherPerson(conn) {
    const otherId = conn.source_person_id === person.id ? conn.target_person_id : conn.source_person_id
    return mapPeople.find(p => p.id === otherId)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.3)', backdropFilter: 'blur(3px)', zIndex: 40 }}
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                backgroundColor: person.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700,
              }}>
                {getInitials(person.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.2 }}>
                  {person.name}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {person.relationship_type && (
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: relBadge?.bg || 'var(--color-warm-4)', color: relBadge?.color || 'var(--color-text-muted)' }}>
                      {person.relationship_type}
                    </span>
                  )}
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: person.is_christian ? 'var(--color-accent-light)' : 'var(--color-warm-4)', color: person.is_christian ? 'var(--color-accent-dark)' : 'var(--color-text-muted)' }}>
                    {person.is_christian ? 'Christ 🌿' : 'Noch nicht 🌱'}
                  </span>
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>
                    Stufe {stageNum} – {stageName}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, flexShrink: 0, marginLeft: 8 }}
            >
              <X size={18} color="var(--color-text-muted)" />
            </button>
          </div>

          {/* Notes */}
          {person.notes && (
            <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 20, padding: '10px 14px', backgroundColor: 'var(--color-warm-4)', borderRadius: 12 }}>
              {person.notes}
            </p>
          )}

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

          {/* Gebetsanliegen */}
          <PrayerRequestsSection personId={person.id} isOwner={false} />

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

          {/* Story-Line */}
          <StoryLineSection personId={person.id} isOwner={false} />

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

          {/* Impact Map */}
          <ImpactMapSection personId={person.id} isOwner={false} personName={person.name} />

          <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

          {/* Verbindungen */}
          <div style={{ marginBottom: 8 }}>
            <h4 style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verbindungen
            </h4>

            {myConnections.length === 0 && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', marginBottom: 12 }}>
                Keine Verbindungen.
              </p>
            )}

            {myConnections.map(conn => {
              const other = getOtherPerson(conn)
              if (!other) return null
              return (
                <div key={conn.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)' }}>
                    ↔ {other.name}
                  </span>
                  {conn.label && (
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', marginLeft: 6 }}>
                      {conn.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </>
  )
}
