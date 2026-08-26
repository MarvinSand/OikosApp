# CLAUDE.md – Lessons Learned & Dev Notes

## Mobil weiterhin langsam trotz weniger Requests: Home zog heimlich den Google-Maps-Loader mit

**Problem:** Nach den Request-Reduzierungen (siehe Eintrag unten) fühlte sich die App auf dem Handy trotzdem noch langsam an. Ursache war kein Netzwerk-/Query-Problem mehr, sondern Bundle-Gewicht: `HomeCommunityTab.jsx` (**statisch** von der eagerly geladenen `Home.jsx` importiert) importierte `{ CreateCommunitySheet, JoinCommunityModal }` **statisch** aus `pages/FriendsView.jsx` – einer 2200-Zeilen-Datei mit Feed/Chat/Community-Logik. Ein statischer Import zwingt den Browser, das komplette Zielmodul zu laden und auszuführen, *bevor* das importierende Modul fertig ist – unabhängig davon, ob `lazy()`/`Suspense` irgendwo anders in der Kette verwendet wird. Da `CreateCommunitySheet` zusätzlich `AddressAutocomplete` (→ `@react-google-maps/api`, ~161 kB / 37 kB gzip) einbindet, lud **jeder** App-Start diesen kompletten Google-Maps-Loader mit – obwohl der Community-Tab auf Home gar nicht der Standard-Tab ist und die Sheets nur nach einem Tap auf "Erstellen"/"Beitreten" gebraucht werden. Ein vorheriger Fix-Versuch (`preloadLandingRoute` in `vite.config.js`) hatte das Symptom schon dokumentiert, aber nur die *Preload-Priorität* entschärft – am eigentlichen Zwangsimport änderte das nichts.

**Fix:**
- `CreateCommunitySheet`/`JoinCommunityModal` aus `FriendsView.jsx` in eine eigene Datei `src/components/community/CommunitySheets.jsx` ausgelagert (dedupliziert `FriendsView.jsx` gleich mit).
- `HomeCommunityTab.jsx` lädt beide jetzt über `lazy(() => import(...))` + `<Suspense>` – der Google-Maps-Loader wird erst angefordert, wenn eines der beiden Sheets tatsächlich öffnet.
- `Home.jsx` lädt `HomeCommunityTab` selbst jetzt ebenfalls lazy (vorher statischer Import, obwohl der Community-Tab beim ersten Render meist gar nicht sichtbar ist).
- Effekt: Home-Chunk 27,6 kB → 19,1 kB gzip; `AddressAutocomplete`/Google-Maps-Bundle (161 kB / 37 kB gzip) komplett aus Homes kritischem Pfad entfernt.

**Lektion:**
- Ein Component-Baum, der teilweise `lazy()` nutzt, ist **nicht automatisch leichtgewichtig** – ein einziger *statischer* Import irgendwo in der Kette (auch tief verschachtelt) zieht das Zielmodul trotzdem eager mit rein. Bei Bundle-Untersuchungen nach genau solchen Querimporten suchen: `grep -rn "from '.*/pages/" src/components`.
- Named Exports aus einer Seiten-Datei (`pages/*.jsx`) heraus an anderer Stelle zu importieren ist ein Warnsignal – wenn ein Unterkomponente wie ein Sheet/Modal auch von woanders gebraucht wird, gehört sie in eine eigene Datei außerhalb von `pages/`, nicht als Named Export einer Route.
- `npm run build` und die Chunk-Größen in der Ausgabe sind der schnellste Weg, sowas zu entdecken – ein unerwartet großer oder unerwartet in einem Chunk gelandeter Import (hier: Google Maps im `Home`-Chunk) fällt dort sofort auf.

## Home-Dashboard: 28+ Requests durch serverseitige Views/RPCs auf ~5 reduziert

**Problem:** Auch nach dem RLS-Fix (siehe Eintrag unten) lud die Home-Seite beim ersten Rendern noch 28+ einzelne Supabase-Requests: `usePrayerGoals` lief als 2 Vorab-Queries (Community-/Freundschafts-IDs) + 5 parallele visibility-Queries (public/mine/specific/community/siblings) = 7 Requests; `useConversations` – auf Home nur für ein `hasUnread`-Badge genutzt – lud bis zu 9 Requests (Mitgliedschaften → Konversationen je Typ → Nachrichten/Gegenüber/Community-Mitgliedschaften → Profile); `TopPrayerToday` brauchte 3 Requests (2 parallele Ranking-Queries, dann eine dritte, vom Ranking abhängige Kandidaten-Query); die Profil-Vervollständigungs-Karte zog über `useProfile` (4 Requests) + `useFriendships` (2 Requests) weitere 6 Requests nur für ein paar Booleans/Zahlen.

**Fix (`supabase/phase64_home_dashboard_rpcs.sql`):** Die Visibility-/Ranking-Logik dorthin verlagert, wo sie ohnehin schon existiert oder klar serverseitig gehört:
- `my_prayer_goals` – eine View (`security_invoker = true`, damit die bestehende RLS-Policy "Read prayer_goals" weiter pro Nutzer greift) mit einem `bucket`-Label (`mine`/`public`/`community`/`shared`) statt 5 einzelner visibility-Queries. Die RLS-Policy implementierte exakt dieselbe OR-Logik ohnehin schon – ein ungefilterter Select auf der View liefert dieselbe Ergebnismenge in einem Request.
- `get_my_conversations()` – eine RPC mit LATERAL JOINs, die pro Konversation letzte Nachricht, Gegenüber/Community/Aktivität und ein fertig berechnetes `unread` liefert.
- `has_unread_conversations()` – eine eigene, sehr leichte RPC (`select bool_or(unread) from get_my_conversations()`) für Home, das nur das Badge-Bit braucht, nicht Nachrichteninhalte/Profile/Community-Namen.
- `get_top_prayer_today()` – Ranking (Logs+Kommentare von heute) und Kandidatenauswahl in einer Query statt 2+1 Requests mit echter Abhängigkeit dazwischen.
- `get_profile_completion_status()` – Bio/Avatar/Standort/People-Count/Freundschaftsstatus in einer RPC statt `useProfile` + `useFriendships` (6 Requests) zu kombinieren.

**Lektion:**
- Wenn eine RLS-Policy schon die komplette Sichtbarkeits-Logik (eigene ODER public ODER Community-Mitglied ODER ...) abbildet, braucht der Client dieselbe Logik **nicht noch einmal** über mehrere gefilterte Queries nachzubauen – ein einzelner ungefilterter Select (ggf. über eine dünne View mit `security_invoker = true`) reicht.
- Prüfen, ob eine Seite wirklich die volle Datenform eines geteilten Hooks braucht, oder nur ein einzelnes Bit (Beispiel: Home brauchte für's Chat-Badge nur `hasUnread`, nicht die komplette Konversationsliste mit Nachrichteninhalten – dafür lohnt sich eine eigene, schlanke RPC statt des vollen Hooks).
- Mehrstufige Abhängigkeiten (Query A liefert IDs für Query B) lassen sich oft in eine einzige SQL-Funktion mit CTEs/LATERAL JOINs verlagern, statt sie als sequenzielle Client-Requests nachzubilden.

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
