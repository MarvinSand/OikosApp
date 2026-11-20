// Die 5 pro-Person einstellbaren Benachrichtigungsarten (notification_preferences).
// Geteilt zwischen UserProfile.jsx (Glocke-Sheet für eine einzelne Person) und
// NotificationSettingsView.jsx (Übersicht über alle Personen), damit Labels nie
// auseinanderlaufen.
import { tr } from '../i18n'

// label/desc sind Getter (Sprache zum Lesezeitpunkt).
export const NOTIFICATION_PREF_FIELDS = [
  { field: 'notify_prayer_requests', get label() { return tr('Neue Gebetsanliegen') }, get desc() { return tr('Wenn neue Anliegen hinzugefügt werden') } },
  { field: 'notify_feed_posts', get label() { return tr('Neue Feed-Beiträge') }, get desc() { return tr('Wenn im Feed etwas Neues gepostet wird') } },
  { field: 'notify_oikos_entries', get label() { return tr('Neue OIKOS-Einträge') }, get desc() { return tr('Wenn Personen zur OIKOS-Map hinzugefügt werden') } },
  { field: 'notify_prayers_for_oikos', get label() { return tr('Gebetsanliegen für OIKOS') }, get desc() { return tr('Wenn ein neues Gebetsanliegen für eine Person im OIKOS gepostet wird') } },
  { field: 'notify_storyline_entries', get label() { return tr('Neue Story-Line Einträge') }, get desc() { return tr('Wenn ein neuer Story-Line Eintrag für eine OIKOS-Person hinzugefügt wird') } },
]
