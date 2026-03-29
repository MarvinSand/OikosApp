import { useState, useEffect } from 'react'
import { Plus, Lock, Globe, Check, Trash2 } from 'lucide-react'
import { usePrayerRequests } from '../../hooks/usePrayerRequests'
import { usePrayerLogs } from '../../hooks/usePrayerLogs'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function formatLastPrayed(iso) {
  if (!iso) return '🙏 Noch nie gebetet'
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dDay.getTime() === today.getTime()) {
    return `🙏 Heute um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  }
  if (dDay.getTime() === yesterday.getTime()) return '🙏 Gestern'
  const diffDays = Math.round((today - dDay) / 86400000)
  if (diffDays < 30) return `🙏 Vor ${diffDays} Tagen`
  return `🙏 ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
}

function PrayedBySheet({ prayersByUser, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px 48px',
        maxHeight: '65vh', overflowY: 'auto',
        animation: 'sheetSlideUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 14 }}>
          🙏 Haben gebetet ({prayersByUser.length})
        </h3>
        {prayersByUser.map(({ userId, profile }) => {
          const name = profile?.full_name || profile?.username || 'Unbekannt'
          const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div key={userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                backgroundColor: profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
              }}>
                {initials}
              </div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                {name}
              </p>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes sheetSlideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }`}</style>
    </>
  )
}

function PrayerRequestCard({ req, isOwner, onToggleAnswered, onTogglePublic, onDelete, onPrayed, lastPrayed }) {
  const { hasPrayedToday, prayersByUser, logPrayer } = usePrayerLogs(req.id)
  const { showToast } = useToast()
  const [showPrayedBy, setShowPrayedBy] = useState(false)

  async function handlePray() {
    try {
      await logPrayer()
      showToast('🙏 Gebet wurde notiert')
      onPrayed?.(req.id)
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  return (
    <>
      <div style={{
        backgroundColor: req.is_answered ? 'rgba(122,158,126,0.08)' : 'var(--color-warm-4)',
        borderRadius: 14, padding: '12px 14px',
        border: `1.5px solid ${req.is_answered ? 'var(--color-accent-light)' : 'var(--color-warm-3)'}`,
      }}>
        {/* Titel + Aktionen */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
            color: req.is_answered ? 'var(--color-text-muted)' : 'var(--color-text)',
            textDecoration: req.is_answered ? 'line-through' : 'none',
            flex: 1,
          }}>
            {req.title}
          </span>
          {isOwner && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={handlePray} disabled={hasPrayedToday} title="Ich habe gebetet" style={iconBtn}>
                <span style={{ fontSize: 13, opacity: hasPrayedToday ? 0.4 : 1 }}>🙏</span>
              </button>
              <button onClick={() => onTogglePublic(req.id)} title={req.is_public ? 'Öffentlich' : 'Privat'} style={iconBtn}>
                {req.is_public
                  ? <Globe size={13} color="var(--color-accent)" />
                  : <Lock size={13} color="var(--color-text-light)" />}
              </button>
              <button onClick={() => onToggleAnswered(req.id)} title="Als erhört markieren" style={iconBtn}>
                <Check size={13} color={req.is_answered ? 'var(--color-accent)' : 'var(--color-text-light)'} />
              </button>
              <button onClick={() => onDelete(req.id)} title="Löschen" style={iconBtn}>
                <Trash2 size={13} color="#C0392B" />
              </button>
            </div>
          )}
        </div>

        {/* Beschreibung */}
        {req.description && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
            {req.description}
          </p>
        )}

        {/* Untere Zeile: Gebet-Button + Gebetet-von Bubbles */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {!isOwner ? (
            <button
              onClick={handlePray}
              disabled={hasPrayedToday}
              style={{
                padding: '6px 12px', borderRadius: 8, cursor: hasPrayedToday ? 'default' : 'pointer',
                backgroundColor: hasPrayedToday ? 'transparent' : 'var(--color-warm-1)',
                color: hasPrayedToday ? 'var(--color-text-muted)' : 'white',
                fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500,
                border: hasPrayedToday ? '1px solid var(--color-warm-3)' : 'none',
                flexShrink: 0,
              }}
            >
              {hasPrayedToday ? '🙏 Gebetet' : 'Ich habe gebetet'}
            </button>
          ) : <div />}

          {/* Avatar Bubbles + Zähler */}
          {prayersByUser.length > 0 && (
            <button
              onClick={() => setShowPrayedBy(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}
            >
              <div style={{ display: 'flex' }}>
                {prayersByUser.slice(0, 3).map((p, i) => {
                  const name = p.profile?.full_name || p.profile?.username || '?'
                  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={p.userId} style={{
                      width: 22, height: 22, borderRadius: '50%',
                      backgroundColor: p.profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontFamily: 'Lora, serif', fontSize: 8, fontWeight: 700,
                      border: '1.5px solid var(--color-warm-4)',
                      marginLeft: i > 0 ? -7 : 0,
                      position: 'relative', zIndex: 3 - i,
                    }}>
                      {initials}
                    </div>
                  )
                })}
              </div>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                {prayersByUser.length}
              </span>
            </button>
          )}
        </div>

        {/* Letztes Gebet */}
        {!req.is_answered && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: '6px 0 0', fontStyle: 'italic' }}>
            {formatLastPrayed(lastPrayed)}
          </p>
        )}
      </div>

      {showPrayedBy && (
        <PrayedBySheet prayersByUser={prayersByUser} onClose={() => setShowPrayedBy(false)} />
      )}
    </>
  )
}

function AddRequestForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), description: description.trim() || null, is_public: isPublic })
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px', border: '1.5px solid var(--color-warm-1)' }}>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titel des Anliegens *"
        style={inputStyle}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
        rows={2}
        style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button
          onClick={() => setIsPublic(!isPublic)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}
        >
          {isPublic ? <Globe size={13} color="var(--color-accent)" /> : <Lock size={13} />}
          {isPublic ? 'Öffentlich' : 'Privat'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ ...smallBtn, backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-warm-3)' }}>
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{ ...smallBtn, backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', border: 'none' }}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PrayerRequestsSection({ personId, isOwner }) {
  const { user } = useAuth()
  const { requests, loading, addRequest, deleteRequest, toggleAnswered, togglePublic } = usePrayerRequests(personId)
  const { showToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [lastPrayedMap, setLastPrayedMap] = useState({})

  const reqIds = requests.map(r => r.id).join(',')
  useEffect(() => {
    if (!requests.length || !user) return
    loadLastPrayed()
  }, [reqIds, user?.id])

  async function loadLastPrayed() {
    const ids = requests.map(r => r.id)
    const { data } = await supabase
      .from('prayer_logs')
      .select('prayer_request_id, created_at')
      .eq('user_id', user.id)
      .in('prayer_request_id', ids)
      .order('created_at', { ascending: false })
    const map = {}
    for (const row of (data || [])) {
      if (!map[row.prayer_request_id]) {
        map[row.prayer_request_id] = row.created_at
      }
    }
    setLastPrayedMap(map)
  }

  async function handleAdd(data) {
    try {
      await addRequest(data)
      setShowAddForm(false)
      showToast('Anliegen hinzugefügt')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Anliegen wirklich löschen?')) return
    await deleteRequest(id)
    showToast('Anliegen gelöscht', 'info')
  }

  const activeRaw = requests.filter(r => !r.is_answered)
  const active = [
    ...activeRaw.filter(r => !lastPrayedMap[r.id]),
    ...activeRaw
      .filter(r => !!lastPrayedMap[r.id])
      .sort((a, b) => new Date(lastPrayedMap[a.id]) - new Date(lastPrayedMap[b.id])),
  ]
  const answered = requests.filter(r => r.is_answered)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={sectionHeader}>
        <h4 style={sectionTitle}>Gebetsanliegen</h4>
        {isOwner && !showAddForm && (
          <button onClick={() => setShowAddForm(true)} style={addBtn}>
            <Plus size={13} /> Hinzufügen
          </button>
        )}
      </div>

      {loading ? (
        <div style={skeleton} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map(req => (
            <PrayerRequestCard key={req.id} req={req} isOwner={isOwner}
              lastPrayed={lastPrayedMap[req.id]}
              onToggleAnswered={toggleAnswered} onTogglePublic={togglePublic} onDelete={handleDelete}
              onPrayed={(id) => setLastPrayedMap(prev => ({ ...prev, [id]: new Date().toISOString() }))} />
          ))}

          {showAddForm && (
            <AddRequestForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
          )}

          {answered.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic', marginBottom: 8 }}>
                Erhört ✓
              </p>
              {answered.map(req => (
                <PrayerRequestCard key={req.id} req={req} isOwner={isOwner}
                  lastPrayed={undefined}
                  onToggleAnswered={toggleAnswered} onTogglePublic={togglePublic} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {requests.length === 0 && !showAddForm && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              {isOwner ? 'Füge dein erstes Gebetsanliegen hinzu.' : 'Noch keine öffentlichen Anliegen.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)',
  fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', display: 'block',
}
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: 6 }
const smallBtn = { padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500 }
const sectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }
const addBtn = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
  borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none',
  fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer',
}
const skeleton = { height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }
