import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { PrayerCard } from './Prayers'

// Einzelnes Gebet – analog zur Feed-Detailseite (FeedPostView). Lädt das Gebet
// direkt per ID, zeigt es mit denselben Aktionen wie im Gebete-Tab (beten,
// kommentieren, löschen).
export default function PrayerDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [request, setRequest] = useState(null)
  const [kind, setKind] = useState('personal')  // 'personal' | 'person'
  const [logs, setLogs] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() /* eslint-disable-next-line */ }, [id])

  async function load() {
    setLoading(true)
    setNotFound(false)

    // 1) Persönliches Anliegen
    const { data: personal } = await supabase
      .from('personal_prayer_requests')
      .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
      .eq('id', id)
      .maybeSingle()

    if (personal) {
      setKind('personal')
      setRequest(personal)
      const [{ data: logData }, { data: noteData }] = await Promise.all([
        supabase.from('personal_prayer_logs').select('id, request_id, user_id, created_at').eq('request_id', id),
        supabase.from('prayer_notes')
          .select('id, request_id, text, is_public, created_at, profiles!author_id(id, username, full_name)')
          .eq('request_id', id).order('created_at', { ascending: false }),
      ])
      setLogs(logData || [])
      setNotes((noteData || []).filter(n => n.is_public || n.profiles?.id === user?.id))
      setLoading(false)
      return
    }

    // 2) Per-Person-Anliegen (OIKOS)
    const { data: perPerson } = await supabase
      .from('prayer_requests')
      .select('*, profiles!owner_id(id, username, full_name, gender, is_christian)')
      .eq('id', id)
      .maybeSingle()

    if (perPerson) {
      setKind('person')
      setRequest({ ...perPerson, title: perPerson.content })
      const { data: logData } = await supabase
        .from('prayer_logs').select('id, prayer_request_id, user_id, created_at').eq('prayer_request_id', id)
      setLogs((logData || []).map(l => ({ ...l, request_id: l.prayer_request_id })))
      setNotes([])
      setLoading(false)
      return
    }

    setNotFound(true)
    setLoading(false)
  }

  async function handlePray(requestId) {
    const opt = { id: 'opt_' + Date.now(), request_id: requestId, user_id: user.id, created_at: new Date().toISOString() }
    setLogs(prev => [opt, ...prev])
    const { error } = kind === 'person'
      ? await supabase.from('prayer_logs').insert({ prayer_request_id: requestId, user_id: user.id })
      : await supabase.from('personal_prayer_logs').insert({ request_id: requestId, user_id: user.id })
    if (error) setLogs(prev => prev.filter(l => l.id !== opt.id))
  }

  async function handleComment(requestId, text, isPublic) {
    const { data, error } = await supabase.from('prayer_notes')
      .insert({ request_id: requestId, author_id: user.id, text, is_public: isPublic })
      .select('id, request_id, text, is_public, created_at, profiles!author_id(id, username, full_name)')
      .single()
    if (error) { showToast('Fehler beim Kommentieren', 'error'); return }
    if (isPublic) setNotes(prev => [data, ...prev])
  }

  async function handleDelete(req) {
    if (!window.confirm('Dieses Gebet wirklich löschen?')) return
    const table = kind === 'person' ? 'prayer_requests' : 'personal_prayer_requests'
    const { error } = await supabase.from(table).delete().eq('id', req.id)
    if (error) { showToast('Fehler beim Löschen', 'error'); return }
    showToast('Gebet gelöscht')
    navigate(-1)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0,
        backgroundColor: 'var(--color-bg)', zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} aria-label="Zurück" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Gebet</span>
      </div>

      <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
        {loading && <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>Lädt…</p>}
        {!loading && notFound && <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>Gebet nicht gefunden.</p>}
        {!loading && request && (
          <PrayerCard
            request={request}
            logs={logs}
            notes={notes}
            onPray={handlePray}
            onComment={handleComment}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
