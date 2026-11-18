import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCommunityMembersPreview } from '../../hooks/useCommunityMembersPreview'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

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

// Karten-Pin-Sheet für Gemeinden/Hausgemeinden – auch für Nicht-Mitglieder
// aufrufbar. Zeigt Beschreibung + Mitglieder (öffentlich sichtbar, siehe
// useCommunityMembersPreview) und erlaubt Nicht-Mitgliedern, eine private
// Frage an die Gemeinde zu stellen (community_questions, siehe phase62).
export default function GemeindePinSheet({ gemeinde, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const previews = useCommunityMembersPreview([gemeinde.id], 6)
  const members = previews[gemeinde.id] || []

  const [memberCount, setMemberCount] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [myQuestions, setMyQuestions] = useState([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const { count } = await supabase
        .from('community_members')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', gemeinde.id)
      if (active) setMemberCount(count ?? 0)

      if (user) {
        const { data } = await supabase
          .from('community_members')
          .select('id')
          .eq('community_id', gemeinde.id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (active) setIsMember(!!data)
      }
    })()
    return () => { active = false }
  }, [gemeinde.id, user])

  // Eigene Fragen + Antworten wie ein Chat (RLS: Fragesteller sieht seine
  // Fragen auch ohne Mitgliedschaft). Bei Öffnen und beim Zurückkehren in die
  // App neu laden, damit eingetroffene Antworten sichtbar werden.
  const loadQuestions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('community_questions')
      .select('id, question, answer, status, answered_by, answered_at, created_at')
      .eq('community_id', gemeinde.id)
      .eq('asked_by', user.id)
      .order('created_at', { ascending: true })
    if (!data) return
    const ids = [...new Set(data.map(q => q.answered_by).filter(Boolean))]
    let names = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username').in('id', ids)
      names = Object.fromEntries((profs || []).map(p => [p.id, p.full_name || p.username]))
    }
    setMyQuestions(data.map(q => ({ ...q, answererName: names[q.answered_by] || null })))
  }, [gemeinde.id, user?.id])

  useEffect(() => {
    loadQuestions()
    const onVisible = () => { if (document.visibilityState === 'visible') loadQuestions() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadQuestions])

  async function handleSendQuestion() {
    if (!question.trim() || !user) return
    setSending(true)
    const { error } = await supabase
      .from('community_questions')
      .insert({ community_id: gemeinde.id, asked_by: user.id, question: question.trim() })
    setSending(false)
    if (error) {
      showToast('Fehler beim Senden', 'error')
      return
    }
    setAsking(false)
    setQuestion('')
    showToast('Frage gesendet ✓')
    loadQuestions()
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 48px',
        maxHeight: '80%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: gemeinde.avatar_url ? 'transparent' : C.accentDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', fontSize: 26,
          }}>
            {gemeinde.avatar_url
              ? <img src={gemeinde.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏠'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>{gemeinde.name}</p>
            {gemeinde.address && (
              <p style={{ fontSize: 12, color: C.textSec, margin: '5px 0 0' }}>📍 {gemeinde.address}</p>
            )}
            {gemeinde.meeting_info && (
              <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>🕒 {gemeinde.meeting_info}</p>
            )}
            {gemeinde.distance != null && (
              <p style={{ fontSize: 12, color: C.textTer, margin: '5px 0 0' }}>
                {gemeinde.distance < 1 ? 'Weniger als 1 km entfernt' : `${Math.round(gemeinde.distance)} km entfernt`}
              </p>
            )}
          </div>
        </div>

        {gemeinde.description && (
          <p style={{ fontSize: 14, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: '0 0 18px' }}>
            {gemeinde.description}
          </p>
        )}

        {/* Mitglieder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex' }}>
            {members.map((m, i) => (
              <div key={m.id} style={{
                width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
                border: `2px solid ${C.bg}`, marginLeft: i > 0 ? -10 : 0,
                background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {m.avatar_url
                  ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (m.full_name || '?').trim()[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12.5, color: C.textSec }}>
            {memberCount == null ? '…' : `${memberCount} Mitglied${memberCount === 1 ? '' : 'er'}`}
          </span>
        </div>

        {/* Fragen & Antworten (nur Nicht-Mitglieder) – wie ein Chat */}
        {!isMember && user && (
          <div style={{ marginBottom: 12 }}>
            {myQuestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {myQuestions.map(q => (
                  <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ alignSelf: 'flex-end', maxWidth: '82%', padding: '9px 13px', borderRadius: '18px 18px 5px 18px', background: C.accent, color: '#fff', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {q.question}
                    </div>
                    {q.status === 'answered' && q.answer ? (
                      <div style={{ alignSelf: 'flex-start', maxWidth: '82%', padding: '9px 13px', borderRadius: '18px 18px 18px 5px', background: C.bgSec, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.accentDark, marginBottom: 2 }}>
                          {q.answererName ? `Antwort von ${q.answererName}` : 'Antwort der Gemeinde'}
                        </span>
                        {q.answer}
                      </div>
                    ) : (
                      <p style={{ alignSelf: 'flex-start', fontSize: 11.5, fontStyle: 'italic', color: C.textTer, margin: '0 0 0 4px' }}>
                        Noch keine Antwort – du wirst benachrichtigt.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {asking ? (
              <div>
                <textarea
                  autoFocus
                  value={question}
                  onChange={e => setQuestion(e.target.value.slice(0, 500))}
                  placeholder="Was möchtest du die Gemeinde fragen?"
                  rows={3}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgSec, fontSize: 14, color: C.text, resize: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setAsking(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'none', fontSize: 13, color: C.textSec, cursor: 'pointer' }}>Abbrechen</button>
                  <button
                    onClick={handleSendQuestion}
                    disabled={!question.trim() || sending}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: question.trim() ? C.accent : C.border, color: '#fff', fontSize: 13, fontWeight: 600, cursor: question.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Send size={13} /> {sending ? 'Sende…' : 'Senden'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAsking(true)}
                style={{ width: '100%', padding: '13px 0', border: `1.5px solid ${C.border}`, borderRadius: 14, background: 'none', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {myQuestions.length > 0 ? 'Weitere Frage stellen' : 'Frage an die Gemeinde stellen'}
              </button>
            )}
          </div>
        )}

        {isMember && (
          <button
            onClick={() => { onClose(); navigate(`/community/${gemeinde.id}`) }}
            style={{
              width: '100%', padding: '13px 0', border: 'none',
              borderRadius: 14, background: C.accent, color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ArrowRight size={15} /> Zur Community
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
