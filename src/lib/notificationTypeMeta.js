// Icon + Label pro notifications.type – geteilt zwischen NotificationsPage.jsx
// (Icon-Bubble, Gruppen-Überschrift) und NotificationSettingsView.jsx
// (E-Mail-Toggle-Liste), damit neue Typen nur an einer Stelle ergänzt werden.
export const NOTIFICATION_TYPE_META = {
  friend_request: { icon: '👤', label: 'Freundschaftsanfragen' },
  friend_accepted: { icon: '🤝', label: 'Verbindungen' },
  community_invite: { icon: '👥', label: 'Gemeinschaft' },
  community_event: { icon: '📅', label: 'Veranstaltungen' },
  prayer_shared: { icon: '🙏', label: 'Gebete' },
  prayer_log: { icon: '🙏', label: 'Gebetsprotokolle' },
  oikos_entry: { icon: '🗺', label: 'Oikos-Karte' },
  birthday: { icon: '🎂', label: 'Geburtstage' },
  feed_post: { icon: '📝', label: 'Feed' },
  prayer_reminder: { icon: '⏰', label: 'Lange nicht gebetet' },
  sibling_requests_reminder: { icon: '📋', label: 'Offene Anliegen von Geschwistern' },
  weekly_digest: { icon: '📊', label: 'Wochenrückblick' },
  bible_note_comment: { icon: '💬', label: 'Kommentare zu Bibel-Notizen' },
  community_join_request: { icon: '🙋', label: 'Beitrittsanfragen' },
  community_join_decision: { icon: '✅', label: 'Entscheidung zu deiner Anfrage' },
  community_question: { icon: '❓', label: 'Fragen an deine Gemeinde' },
  community_answer: { icon: '💬', label: 'Antworten auf deine Fragen' },
  message: { icon: '💬', label: 'Direktnachrichten' },
}
