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
