// Icon + Label pro notifications.type – geteilt zwischen NotificationsPage.jsx
// (Icon-Bubble, Gruppen-Überschrift) und NotificationSettingsView.jsx
// (E-Mail-Toggle-Liste), damit neue Typen nur an einer Stelle ergänzt werden.
import { tr } from '../i18n'

// `label` ist ein Getter (Sprache zum Lesezeitpunkt), damit die Konstante sprachunabhängig bleibt.
export const NOTIFICATION_TYPE_META = {
  friend_request: { icon: '👤', get label() { return tr('Freundschaftsanfragen') } },
  friend_accepted: { icon: '🤝', get label() { return tr('Verbindungen') } },
  community_invite: { icon: '👥', get label() { return tr('Gemeinschaft') } },
  community_event: { icon: '📅', get label() { return tr('Veranstaltungen') } },
  prayer_shared: { icon: '🙏', get label() { return tr('Gebete') } },
  prayer_log: { icon: '🙏', get label() { return tr('Gebetsprotokolle') } },
  oikos_entry: { icon: '🗺', get label() { return tr('Oikos-Karte') } },
  birthday: { icon: '🎂', get label() { return tr('Geburtstage') } },
  feed_post: { icon: '📝', get label() { return tr('Feed') } },
  prayer_reminder: { icon: '⏰', get label() { return tr('Lange nicht gebetet') } },
  sibling_requests_reminder: { icon: '📋', get label() { return tr('Offene Anliegen von Geschwistern') } },
  weekly_digest: { icon: '📊', get label() { return tr('Wochenrückblick') } },
  bible_note_comment: { icon: '💬', get label() { return tr('Kommentare zu Bibel-Notizen') } },
  community_join_request: { icon: '🙋', get label() { return tr('Beitrittsanfragen') } },
  community_join_decision: { icon: '✅', get label() { return tr('Entscheidung zu deiner Anfrage') } },
  community_question: { icon: '❓', get label() { return tr('Fragen an deine Gemeinde') } },
  community_answer: { icon: '💬', get label() { return tr('Antworten auf deine Fragen') } },
  message: { icon: '💬', get label() { return tr('Direktnachrichten') } },
}
