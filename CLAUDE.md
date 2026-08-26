# CLAUDE.md – Lessons Learned & Dev Notes

## Langsamer erster Seitenaufbau: RLS-Policies waren die Hauptursache, nicht Vercel/Supabase-Plan

**Problem (bis Aug. 2026):** Die App fühlte sich beim ersten Öffnen sehr langsam an, unabhängig davon, wie viel client-seitiges Caching/Parallelisieren in den Hooks schon gemacht wurde (siehe `useAuth`-Eintrag unten). Der Supabase Performance Advisor zeigte den eigentlichen Grund: **152 RLS-Policies** riefen `auth.uid()` direkt in `USING`/`WITH CHECK` auf, statt es als `(select auth.uid())` zu wrappen. Postgres wertet einen nackten Funktionsaufruf dort für **jede geprüfte Zeile neu** aus, statt ihn einmal pro Query zu cachen (InitPlan). Dazu kamen **225 Fälle von mehreren permissiven Policies** auf derselben Tabelle/Aktion (u.a. exakte Duplikate wie `notif_select` + `select own notifications` auf `notifications`) – Postgres muss dann alle davon pro Zeile auswerten – sowie **83 fehlende Indizes auf Foreign-Key-Spalten** (`community_members.user_id`, `messages.sender_id`, `friendships.addressee_id`, `personal_prayer_requests.owner_id`, ...), die genau die Spalten sind, über die die App-Hooks filtern/joinen.

Das betraf praktisch jede Tabelle, die beim App-Start oder Navigieren angefasst wird (profiles, friendships, notifications, conversations, messages, community_members, prayer_goals, personal_prayer_requests, world_map_activities, ...). Bei ~15–25 Supabase-Abfragen pro Seitenaufbau addierte sich das zu spürbaren Sekunden – **nicht** der Supabase-Free-Plan oder Vercel als Hosting waren die Ursache, und es gibt keine YouVersion-Bible-API-Anbindung im Code (nur DB-Spalten `bible_reference`/`bible_verse`, keine externen Fetches).

**Fix:** `supabase/phase62_rls_performance_initplan.sql` (alle `auth.uid()` → `(select auth.uid())`, Duplikat-Policies entfernt) und `supabase/phase63_missing_fk_indexes.sql` (fehlende FK-Indizes). Beide idempotent, im Supabase SQL-Editor ausführbar.

**Lektion:**
- Bei "die App ist langsam" **zuerst den Supabase Performance Advisor prüfen** (`get_advisors` mit `type: "performance"` bzw. Dashboard → Advisors), bevor man Client-Code optimiert. Client-seitiges Query-Batching/Caching (Modul-Caches, `Promise.all` statt serieller Waterfalls) hilft, behebt aber nicht das Grundproblem, wenn jede einzelne Query durch ineffiziente RLS langsam ist.
- Jede neue RLS-Policy mit `(select auth.uid())` statt nacktem `auth.uid()` schreiben.
- Vor dem Anlegen einer neuen Policy prüfen, ob für dieselbe Tabelle/Aktion schon eine passende existiert – nicht einfach eine weitere permissive Policy stapeln.
- Bei neuen Foreign-Key-Spalten direkt einen Index mitanlegen, wenn die Spalte in `.eq()`/`.in()`/`.or()`-Filtern verwendet wird.

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

## Performance: `useAuth` ist ein geteilter Store – nicht wieder aufsplitten

**Problem (bis Aug. 2026):** `useAuth()` legte pro Aufrufstelle eigenen State an, rief `supabase.auth.getSession()` auf und registrierte einen eigenen `onAuthStateChange`-Listener. Bei ~80 Aufrufstellen: ~80 Session-Abfragen + ~80 Listener pro Seitenaufbau. Schlimmer noch: jede Instanz startete mit `user = null`, also lief **jeder** abhängige Hook (`useEffect(..., [user?.id])`) zweimal – einmal ins Leere, einmal mit User. Das verdoppelte praktisch alle Datenabfragen und war die Hauptursache für den langsamen Start.

**Jetzt:** `src/hooks/useAuth.js` ist ein Modul-Store mit `useSyncExternalStore` – eine Session-Abfrage, ein Listener, ein geteilter Zustand. Die API (`{ user, session, loading, login, register, logout, resendVerificationEmail }`) ist unverändert, alle Aufrufstellen bleiben gleich.

**Nebeneffekt:** Weil `App` das Rendern bis `loading === false` blockiert, sehen alle Kind-Komponenten den User jetzt **sofort beim ersten Render**. Der Crash-Typ „Cannot read properties of null (reading 'id')" bei Mount-Effekten ist damit strukturell weg.

**Lektion:** Hooks, die dieselben Daten für viele Komponenten laden (`useCommunities`, `useNotifications`, …), brauchen einen Modul-Cache mit In-Flight-Dedupe – sonst feuert jede Instanz dieselbe Query erneut.

---

## Realtime-Kanäle brauchen eindeutige Namen

`supabase.channel('conversations-realtime')` mit **festem** Namen in einem Hook, der mehrfach gemountet wird: die Instanzen teilen sich einen Kanal, und der erste Unmount (`removeChannel`) killt das Abo für alle noch gemounteten. Kanalnamen deshalb pro Instanz eindeutig machen (`...-${Math.random().toString(36).slice(2)}`). Reloads aus Realtime-Events außerdem debouncen – sonst läuft bei einem Schwall Inserts die komplette Query-Kette pro Event.

---

## `preventDefault()` in Touch-/Wheel-Handlern: native Listener nötig

**Konsolen-Warnung:** `Unable to preventDefault inside passive event listener invocation.`

**Ursache:** React hängt `touchstart`, `touchmove` und `wheel` **passiv** an den Root-Container. `e.preventDefault()` in `onTouchMove` / `onWheel` ist dort wirkungslos und erzeugt nur die Warnung.

**Lösung (siehe `MapCanvas.jsx`):** Handler per `addEventListener(..., { passive: false })` direkt am Element registrieren. Damit der Listener nur einmal registriert wird und trotzdem aktuellen State sieht, den Handler über eine Ref lesen:

```js
const gestureHandlers = useRef({})
gestureHandlers.current.touchMove = handleTouchMove   // jedes Render aktualisieren

useEffect(() => {
  const el = rootRef.current
  const onTouchMove = e => gestureHandlers.current.touchMove(e)
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  return () => el.removeEventListener('touchmove', onTouchMove)
}, [])
```

**Alternative:** Wenn `preventDefault` nur das Scrollen verhindern soll, reicht oft `touch-action: none` im CSS – dann kann der `preventDefault`-Aufruf ganz entfallen (so gelöst beim Zoom-Slider in `WorldMapView.jsx`).

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

**⚠️ iOS-Safari-Caveat (wichtig!):** `position: fixed`-Leisten können auf iOS Safari beim **Unmount einer SPA-Route** eine schwarze Compositing-Geister-Fläche unten hinterlassen, die **auch auf anderen Seiten bleibt, bis man neu lädt**. Das tritt v. a. auf, wenn die Leiste **bedingt** (in einem Tab) gemountet wird – wie auf der Community-Detailseite (`CommunityDetail`). **Lösung dort:** KEINE fixed-Leiste, sondern Eingabeleiste **im Fluss** (Flex-Kind) + Root-Container `style={{ height: '100dvh', paddingBottom: 'var(--bottom-nav-h, 64px)' }}`.

**Exakte Nav-Höhe:** `BottomNav.jsx` misst die echte Nav-Höhe (inkl. Safe-Area) per `ResizeObserver` und schreibt sie als CSS-Variable **`--bottom-nav-h`** auf `document.documentElement`. Für Bottom-Insets (z. B. Chat-Seiten ohne fixe Leiste) `var(--bottom-nav-h, 64px)` nutzen – so bleibt in Dark Mode keine schwarze Rest-Lücke. (Die fixe `.chat-input-bar` ist weiterhin okay für **dedizierte Vollbild-Chatseiten** wie `ConversationView`, die selten unmounten.)

---

## Gebete: EIN Modell, EINE Karte (ab Phase 57)

**Vorher:** Gebete wurden an fünf Stellen unterschiedlich gerendert und an drei Stellen unterschiedlich gespeichert. Community-Gebete waren gar keine Gebete, sondern Chat-Nachrichten (`messages.type='prayer_request'`) mit einem Zähler im **localStorage** – also pro Gerät, maximal ein Gebet, für niemanden sonst sichtbar.

**Jetzt:**
- `src/lib/prayerModel.js` normalisiert beide Tabellen zu einem Objekt (`kind: 'oikos' | 'personal'`) und liefert die Tabellen-/Spaltenwahl (`logTable`, `logColumn`, `listColumn`, `noteColumn`). **Nie wieder** `request.person_id ? … : …` an einzelnen Aufrufstellen ausschreiben.
- `src/components/prayer/PrayerCard.jsx` ist die einzige Gebets-Karte (Design: Oikos-Map). `PrayerCardList.jsx` verdrahtet Beten/Kommentar/Liste/Weiterleiten und mountet die Sheets einmal pro Liste.
- Logs + Kommentare kommen gesammelt aus `usePrayerEngagement(prayers)` – nicht pro Karte einzeln nachladen.
- Community-Gebete sind `personal_prayer_requests` mit `visibility='community'` + `visibility_community_id`; zusätzlich wird eine Chat-Nachricht mit `personal_prayer_request_id` gepostet, damit das Gebet im Chat sichtbar bleibt und denselben Zähler bedient.

**Wichtig:** `visibility` hatte einen Check-Constraint auf `('public','siblings','communities','private')`, das Frontend schrieb aber seit jeher `'community'` (Singular). Jedes Community-Gebet scheiterte still am Constraint. Seit `phase57_community_prayers.sql` ist `'community'` der gültige Wert.

**Merksatz:** Zustand, den mehrere Nutzer sehen sollen (Gebets-Zähler, Kommentare), gehört **nie** in den localStorage.
