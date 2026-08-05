// Die 5 pro-Person einstellbaren Benachrichtigungsarten (notification_preferences).
// Geteilt zwischen UserProfile.jsx (Glocke-Sheet für eine einzelne Person) und
// NotificationSettingsView.jsx (Übersicht über alle Personen), damit Labels nie
// auseinanderlaufen.
export const NOTIFICATION_PREF_FIELDS = [
  { field: 'notify_prayer_requests', label: 'Neue Gebetsanliegen', desc: 'Wenn neue Anliegen hinzugefügt werden' },
  { field: 'notify_feed_posts', label: 'Neue Feed-Beiträge', desc: 'Wenn im Feed etwas Neues gepostet wird' },
  { field: 'notify_oikos_entries', label: 'Neue OIKOS-Einträge', desc: 'Wenn Personen zur OIKOS-Map hinzugefügt werden' },
  { field: 'notify_prayers_for_oikos', label: 'Gebetsanliegen für OIKOS', desc: 'Wenn ein neues Gebetsanliegen für eine Person im OIKOS gepostet wird' },
  { field: 'notify_storyline_entries', label: 'Neue Story-Line Einträge', desc: 'Wenn ein neuer Story-Line Eintrag für eine OIKOS-Person hinzugefügt wird' },
]
