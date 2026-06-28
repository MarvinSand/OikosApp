# CLAUDE.md – Lessons Learned & Dev Notes

## KRITISCH: Supabase-Spalten müssen vor Nutzung existieren

**Problem:** Wenn eine Spalte in einem `supabase.from('table').update({...})` Payload enthalten ist, die in der Datenbank **nicht existiert**, schlägt das **gesamte Update fehl** – alle anderen Felder werden ebenfalls nicht gespeichert. Der Fehler lautet:

```
Could not find the 'column_name' column of 'table' in the schema cache
```

**Ursache im Oktober 2025:** `birthday`, `show_birthday`, `gender`, `church_name` wurden im Frontend (ProfileView.jsx) als Formularfelder implementiert, aber **nie als Migration in der Datenbank angelegt**. Dadurch scheiterte jedes Profil-Speichern.

**Lektion:**
- Bevor ein neues Feld in einem Supabase `update()` / `insert()` Payload ergänzt wird, prüfen, ob die Spalte in den Migration-Dateien unter `supabase/` existiert.
- Migration-Dateien sind in `supabase/phase*.sql`.
- Neue Spalten → neue Migration anlegen (z.B. `supabase/phase22_missing_profile_columns.sql`) und im Supabase SQL-Editor ausführen.
- Niemals Frontend-Felder und DB-Spalten auseinanderlaufen lassen.

**Fix:** `supabase/phase22_missing_profile_columns.sql` anlegen und im Supabase Dashboard (SQL Editor) ausführen.

---

## Git-Strategie: Feature-Branch nach Squash-Merge

Wenn ein Feature-Branch per Squash-Merge in `main` gelandet ist und der Branch danach weiterentwickelt wurde, kann `git rebase` oder `git push` fehlschlagen, weil die Commit-Historien divergieren.

**Lösung:** Geänderte Dateien cherry-picken statt rebasen:
```bash
git checkout origin/main -b temp-fix
git checkout feature-branch -- src/path/to/changed/file.jsx
git commit -m "..."
git push -u origin temp-fix:main
```

---

## Deployment

- Vercel deployed automatisch von `main` → https://oikos-app-tau.vercel.app/
- Feature-Branches haben eigene Preview-URLs (Vercel Dashboard → Deployments)
- Alle Änderungen direkt auf `main` pushen (die App hat noch keine aktiven User)

---

## Supabase Migrations ausführen

1. Supabase Dashboard öffnen → SQL Editor
2. Inhalt der `.sql`-Datei einfügen
3. "Run" klicken
4. Alle Phase-Migrations sind idempotent (können mehrfach ausgeführt werden)

---

## Eingabeleisten/Chat: fix unten an der Bottom-Nav verankern

**Problem:** Eine Chat-Eingabeleiste als normales Flex-Kind (Seite `h-full`/`100dvh` + `flex flex-col`, Leiste als letztes Kind) hängt von der Höhen-Mathematik des Containers ab. Folge: eine **schwarze Lücke** über der Bottom-Nav und die Leiste **verschiebt sich** (z. B. wenn das Textfeld mehrzeilig wird oder die Tastatur aufgeht). Trat zuerst im Chat (`ConversationView`) auf, später erneut auf der Community-Detailseite (`CommunityDetail`).

**Lösung (bewährt, in `ConversationView` + `CommunityDetail`):**
1. Seite muss eine **full-screen route** sein → in `src/App.jsx` zu `isFullScreenRoute` hinzufügen (sonst greift `.mobile-nav-padding` zusätzlich und erzeugt die Lücke).
2. Root-Container: `style={{ height: '100dvh' }}` + `flex flex-col` — **nicht** `h-full`, und **kein** Nav-Padding am Root.
3. Eingabeleiste bekommt `className="chat-input-bar"` → `position: fixed; bottom: calc(68px + safe-area)` (genau über der Nav), zentriert, `max-width: 42rem`, `z-index: 35`. Definiert in `src/index.css` (`.chat-input-bar`). Dadurch klebt sie unten und bewegt sich nie.
4. Scrollbare Nachrichtenliste: `paddingBottom: calc(132px + env(safe-area-inset-bottom, 0px))`, damit die letzte Nachricht nicht hinter Leiste + Nav verschwindet.
5. Weitere scrollbare Tabs derselben Seite (ohne fixe Leiste): `paddingBottom: calc(~84px + env(safe-area-inset-bottom, 0px))` für Nav-Freiraum.

**Wiederverwendbare CSS:** `.chat-input-bar` und `.chat-nav-clearance` in `src/index.css`. Referenz-Implementierung: `src/pages/ConversationView.jsx`.
