import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrayerCard from './PrayerCard'
import AddToListSheet from './AddToListSheet'
import ForwardSheet from './ForwardSheet'
import { usePrayerEngagement } from '../../hooks/usePrayerEngagement'
import { usePrayerActions } from '../../hooks/usePrayerActions'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { forwardMessageFields } from '../../lib/prayerModel'
import { supabase } from '../../lib/supabase'

// ════════════════════════════════════════════════════════════════════════
// Liste von Gebets-Karten mit allen Aktionen
// ════════════════════════════════════════════════════════════════════════
// Lädt Logs + Kommentare gesammelt, verdrahtet Beten/Kommentieren/Bearbeiten
// und mountet die Sheets „Zu Liste hinzufügen" und „Weiterleiten" einmal für
// die ganze Liste. Wird von der Oikos-Person-Ansicht, der Community, dem
// For-You-Feed und den Gebetslisten verwendet.
//
// prayers   – normalisierte Gebete (lib/prayerModel)
// goalByKey – optional: Gebetsziel je prayer.key
export default function PrayerCardList({
  prayers,
  goalByKey = null,
  showSourceBadge = false,
  showContext = true,
  // Zusatz-Einträge im ⋯-Menü bzw. Badge je Gebet – z.B. „Aus Liste
  // entfernen" in einer Gebetsliste oder die Ampel-Markierung.
  extraMenuItems = null,
  extraBadge = null,
  onOpenGoal,
  onChanged,
  renderBetween,
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { logsMap, notesMap, pushLog, pushNote, removeNote } = usePrayerEngagement(prayers)
  const actions = usePrayerActions()
  const [listPrayer, setListPrayer] = useState(null)
  const [forwardPrayer, setForwardPrayer] = useState(null)

  async function handlePray(prayer) {
    const log = await actions.pray(prayer)
    pushLog(prayer.key, log)
    // Ist ein (nicht-individuelles) Gebetsziel verknüpft, zählt das Gebet auch
    // dorthin – wie bisher im For-You-Feed.
    const goal = goalByKey?.get(prayer.key)
    if (goal && goal.goal_type !== 'custom') {
      try {
        await supabase.rpc('contribute_to_prayer_goal', { p_goal_id: goal.id, p_minutes: 0 })
        onChanged?.()
      } catch {
        // Ziel-Fortschritt ist nicht kritisch – das Gebet ist protokolliert.
      }
    }
  }

  async function handleComment(prayer, text, isPublic, replyToId = null) {
    const note = await actions.comment(prayer, text, isPublic, replyToId)
    pushNote(prayer.key, note)
  }

  async function handleDeleteComment(prayer, note) {
    if (!window.confirm('Diesen Kommentar wirklich löschen?')) return
    try {
      await actions.deleteComment(note.id)
      removeNote(prayer.key, note.id)
    } catch {
      showToast('Fehler beim Löschen', 'error')
    }
  }

  // Privat antworten: Chat mit dem Kommentar-Autor öffnen und den Kommentar
  // als Zitat vorausfüllen – im Chat wird dann einfach weitergeschrieben.
  async function handlePrivateReply(prayer, note) {
    if (!note.author_id || note.author_id === user?.id) return
    try {
      const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: note.author_id })
      if (error) throw error
      const quoteText = `Zu deinem Kommentar „${note.text}": `
      navigate(`/chat/${convId}`, { state: { quoteText } })
    } catch {
      showToast('Chat konnte nicht geöffnet werden', 'error')
    }
  }

  async function handleUpdate(prayer, updates) {
    try {
      await actions.updatePrayer(prayer, updates)
      onChanged?.()
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleToggleAnswered(prayer) {
    try {
      await actions.toggleAnswered(prayer)
      onChanged?.()
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleDelete(prayer) {
    if (!window.confirm('Dieses Gebet wirklich löschen?')) return
    try {
      await actions.remove(prayer)
      showToast('Gebet gelöscht')
      onChanged?.()
    } catch {
      showToast('Fehler beim Löschen', 'error')
    }
  }

  async function handleLaterPray(prayer) {
    try {
      await actions.laterPray(prayer)
    } catch {
      showToast('Fehler beim Hinzufügen', 'error')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {prayers.map((prayer, index) => (
          <div key={prayer.key}>
            <PrayerCard
              prayer={prayer}
              logs={logsMap[prayer.key]}
              notes={notesMap[prayer.key]}
              currentUserId={user?.id}
              goal={goalByKey?.get(prayer.key) || null}
              showSourceBadge={showSourceBadge}
              showContext={showContext}
              extraMenuItems={extraMenuItems?.(prayer) || []}
              extraBadge={extraBadge?.(prayer) || null}
              onPray={handlePray}
              onComment={handleComment}
              onDeleteComment={handleDeleteComment}
              onPrivateReply={handlePrivateReply}
              onUpdate={handleUpdate}
              onToggleAnswered={handleToggleAnswered}
              onDelete={handleDelete}
              onAddToList={setListPrayer}
              onLaterPray={handleLaterPray}
              onForward={setForwardPrayer}
              onOpenGoal={onOpenGoal}
            />
            {renderBetween?.(prayer, index)}
          </div>
        ))}
      </div>

      {listPrayer && (
        <AddToListSheet prayer={listPrayer} onClose={() => setListPrayer(null)} />
      )}
      {forwardPrayer && (
        <ForwardSheet
          previewTitle={forwardPrayer.title}
          buildMessage={() => forwardMessageFields(forwardPrayer)}
          onClose={() => setForwardPrayer(null)}
        />
      )}
    </>
  )
}
