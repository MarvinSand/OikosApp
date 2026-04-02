import { useState, useEffect } from 'react'
import { Plus, Lock, Globe, MoreVertical, Pencil, Check, Trash2, X } from 'lucide-react'
import { usePrayerRequests } from '../../hooks/usePrayerRequests'
import { usePrayerLogs } from '../../hooks/usePrayerLogs'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Confetti from '../ui/Confetti'

function formatLastPrayed(iso) {
  if (!iso) return '🙏 Noch nie gebetet'
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dDay.getTime() === today.getTime())
    return `🙏 Heute um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  if (dDay.getTime() === yesterday.getTime()) return '🙏 Gestern'
  const diffDays = Math.round((today - dDay) / 86400000)
  if (diffDays < 30) return `🙏 Vor ${diffDays} Tagen`
  return `🙏 ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
}

// ─── PrayedBySheet ────────────────────────────────────────────
function PrayedBySheet({ prayersByUser, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '65vh', overflowY: 'auto', animation: 'sheetSlideUp 0.25s ease-out',
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
              <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, backgroundColor: profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700 }}>
                {initials}
              </div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{name}</p>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes sheetSlideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }`}</style>
    </>
  )
}

// ─── EditRequestSheet ─────────────────────────────────────────
function EditRequestSheet({ req, onSave, onClose }) {
  const [title, setTitle] = useState(req.title || '')
  const [description, setDescription] = useState(req.description || '')
  const [isPublic, setIsPublic] = useState(req.is_public !== false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onSave(req.id, { title: title.trim(), description: description.trim() || null, is_public: isPublic })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 70, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.25s ease-out', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Anliegen bearbeiten</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <label style={lbl}>Titel *</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} style={inp} />

        <label style={{ ...lbl, marginTop: 12 }}>Beschreibung</label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={3} style={{ ...inp, resize: 'vertical' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px' }}>
              {isPublic ? <><Globe size={12} style={{ display: 'inline', marginRight: 4 }} />Öffentlich</> : <><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />Privat</>}
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              {isPublic ? 'Für andere sichtbar' : 'Nur für dich'}
            </p>
          </div>
          <button
            onClick={() => setIsPublic(v => !v)}
            style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: isPublic ? 'var(--color-accent)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: isPublic ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', marginTop: 16, backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </>
  )
}

// ─── PrayerRequestCard ────────────────────────────────────────
function PrayerRequestCard({ req, isOwner, onUpdate, onToggleAnswered, onDelete, onPrayed, lastPrayed }) {
  const { hasPrayedToday, prayersByUser, logPrayer } = usePrayerLogs(req.id)
  const { showToast } = useToast()
  const [showPrayedBy, setShowPrayedBy] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [confetti, setConfetti] = useState(false)

  const isAnswered = req.is_answered

  async function handlePray() {
    try {
      await logPrayer()
      showToast('🙏 Gebet wurde notiert')
      onPrayed?.(req.id)
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleToggleAnswered() {
    if (!isAnswered) { setConfetti(true); setTimeout(() => setConfetti(false), 3200) }
    await onToggleAnswered(req.id)
    showToast(isAnswered ? 'Als offen markiert' : '🎉 Als erhört markiert!')
  }

  return (
    <>
      <Confetti show={confetti} />
      <div style={{
        backgroundColor: isAnswered ? 'rgba(76,103,65,0.06)' : 'var(--color-warm-4)',
        borderRadius: 14, padding: '12px 14px',
        border: `1.5px solid ${isAnswered ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
        borderLeft: `4px solid ${isAnswered ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
      }}>
        {/* Titel + Menü */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isAnswered && (
              <span style={{ display: 'inline-block', fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, backgroundColor: 'var(--color-warm-1)', color: 'white', marginBottom: 5 }}>
                🎉 Erhört
              </span>
            )}
            <p style={{
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, margin: 0,
              color: isAnswered ? 'var(--color-text-muted)' : 'var(--color-text)',
              textDecoration: isAnswered ? 'line-through' : 'none',
            }}>
              {req.title}
            </p>
            {req.description && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
                {req.description}
              </p>
            )}
          </div>

          {/* ··· Owner Menu */}
          {isOwner && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setShowMenu(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: 6, color: 'var(--color-text-light)' }}>
                <MoreVertical size={15} />
              </button>
              {showMenu && (
                <>
                  <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.14)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 190 }}>
                    <button
                      onClick={() => { setShowMenu(false); setShowEdit(true) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)' }}
                    >
                      <Pencil size={13} /> Bearbeiten
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); handleToggleAnswered() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: isAnswered ? 'var(--color-text)' : 'var(--color-warm-1)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)', fontWeight: isAnswered ? 400 : 600 }}
                    >
                      <Check size={13} /> {isAnswered ? 'Als offen markieren' : 'Als erhört markieren ✓'}
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onUpdate(req.id, { is_public: !req.is_public }) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)' }}
                    >
                      {req.is_public ? <><Lock size={13} /> Privat machen</> : <><Globe size={13} /> Öffentlich machen</>}
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onDelete(req.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: '#C0392B', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <Trash2 size={13} /> Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom row: Pray button + avatar bubbles */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {!isOwner ? (
            <button
              onClick={handlePray}
              disabled={hasPrayedToday}
              style={{ padding: '6px 12px', borderRadius: 8, cursor: hasPrayedToday ? 'default' : 'pointer', backgroundColor: hasPrayedToday ? 'transparent' : 'var(--color-warm-1)', color: hasPrayedToday ? 'var(--color-text-muted)' : 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, border: hasPrayedToday ? '1px solid var(--color-warm-3)' : 'none', flexShrink: 0 }}
            >
              {hasPrayedToday ? '🙏 Gebetet' : 'Ich habe gebetet'}
            </button>
          ) : (
            <button
              onClick={handlePray}
              disabled={hasPrayedToday}
              style={{ padding: '5px 10px', borderRadius: 8, cursor: hasPrayedToday ? 'default' : 'pointer', backgroundColor: 'transparent', color: hasPrayedToday ? 'var(--color-text-light)' : 'var(--color-warm-1)', fontFamily: 'Lora, serif', fontSize: 12, border: '1px solid var(--color-warm-3)', flexShrink: 0, opacity: hasPrayedToday ? 0.6 : 1 }}
            >
              🙏 {hasPrayedToday ? 'Gebetet' : 'Beten'}
            </button>
          )}

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
                    <div key={p.userId} style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: p.profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Lora, serif', fontSize: 8, fontWeight: 700, border: '1.5px solid var(--color-warm-4)', marginLeft: i > 0 ? -7 : 0, position: 'relative', zIndex: 3 - i }}>
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

        {!isAnswered && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: '6px 0 0', fontStyle: 'italic' }}>
            {formatLastPrayed(lastPrayed)}
          </p>
        )}
      </div>

      {showPrayedBy && (
        <PrayedBySheet prayersByUser={prayersByUser} onClose={() => setShowPrayedBy(false)} />
      )}
      {showEdit && (
        <EditRequestSheet req={req} onSave={onUpdate} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}

// ─── AddRequestForm ───────────────────────────────────────────
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
      <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel des Anliegens *" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSave()} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beschreibung (optional)" rows={2} style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button onClick={() => setIsPublic(!isPublic)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {isPublic ? <Globe size={13} color="var(--color-accent)" /> : <Lock size={13} />}
          {isPublic ? 'Öffentlich' : 'Privat'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ ...smallBtn, backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-warm-3)' }}>Abbrechen</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{ ...smallBtn, backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', border: 'none' }}>Speichern</button>
        </div>
      </div>
    </div>
  )
}

// ─── PrayerRequestsSection ────────────────────────────────────
export default function PrayerRequestsSection({ personId, isOwner }) {
  const { user } = useAuth()
  const { requests, loading, addRequest, updateRequest, deleteRequest, toggleAnswered } = usePrayerRequests(personId)
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
      if (!map[row.prayer_request_id]) map[row.prayer_request_id] = row.created_at
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
    showToast('Anliegen gelöscht')
  }

  const activeRaw = requests.filter(r => !r.is_answered)
  const active = [
    ...activeRaw.filter(r => !lastPrayedMap[r.id]),
    ...activeRaw.filter(r => !!lastPrayedMap[r.id]).sort((a, b) => new Date(lastPrayedMap[a.id]) - new Date(lastPrayedMap[b.id])),
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
            <PrayerRequestCard
              key={req.id} req={req} isOwner={isOwner}
              lastPrayed={lastPrayedMap[req.id]}
              onUpdate={updateRequest}
              onToggleAnswered={toggleAnswered}
              onDelete={handleDelete}
              onPrayed={(id) => setLastPrayedMap(prev => ({ ...prev, [id]: new Date().toISOString() }))}
            />
          ))}

          {showAddForm && (
            <AddRequestForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
          )}

          {answered.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic', marginBottom: 8 }}>Erhört ✓</p>
              {answered.map(req => (
                <PrayerRequestCard
                  key={req.id} req={req} isOwner={isOwner}
                  lastPrayed={undefined}
                  onUpdate={updateRequest}
                  onToggleAnswered={toggleAnswered}
                  onDelete={handleDelete}
                />
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

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', display: 'block' }
const smallBtn = { padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500 }
const sectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }
const addBtn = { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer' }
const skeleton = { height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
