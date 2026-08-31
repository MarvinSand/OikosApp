# OIKOS in den App Store & Play Store bringen

Diese App war bisher eine reine Web-App (Vite/React, deployed auf Vercel).
Für die Stores wurde sie mit **Capacitor** in native Android/iOS-Hüllen
gepackt – der komplette React-Code bleibt unverändert, läuft aber jetzt
zusätzlich in einer echten Android/iOS-App (WebView + native Plugins für
Statusleiste, Zurück-Button, Splash-Screen).

## Was bereits erledigt ist (in diesem Branch)

- Capacitor installiert & konfiguriert (`capacitor.config.json`, App-ID
  `com.marvinsand.oikos`, App-Name `OIKOS`)
- `android/` und `ios/` Projekte generiert
- App-Icon + Splash-Screen generiert (Platzhalter aus dem OIKOS-Branding,
  Quelle: `resources/icon.svg`) und in alle nötigen Android-/iOS-Größen
  sowie als PWA-Icons (`public/icons/`) exportiert
- Web-Manifest (`public/manifest.webmanifest`) + Meta-Tags für "Add to
  Home Screen" ergänzt
- Android-Permissions für Standort (Weltkarte-Feature) ergänzt,
  iOS-Nutzungstext (`NSLocationWhenInUseUsageDescription`) ergänzt
- App auf Hochformat (Portrait) festgelegt (passt zum bestehenden
  Mobile-Layout)
- Native Bridge (`src/components/native/NativeBridge.jsx`): Statusleiste,
  Splash-Screen-Ausblenden, Android-Hardware-Zurück-Taste – alles ein
  No-Op im normalen Web-Betrieb (Vercel bleibt unverändert nutzbar)
- Release-Signing-Grundgerüst in `android/app/build.gradle` (liest aus
  `android/keystore.properties`, die **nicht** eingecheckt wird)
- Öffentliche Datenschutzerklärung unter `/privacy` ergänzt (Pflicht für
  beide Stores – z. B. `https://oikos-app-tau.vercel.app/privacy` nach dem
  nächsten Vercel-Deploy)
- npm-Skripte: `npm run cap:sync`, `npm run android:open`, `npm run ios:open`

**Wichtige Einschränkung dieser Umgebung:** Diese Cloud-Session hat keinen
Zugriff auf das Android SDK / Google Maven Repository (Netzwerk-Sandbox
blockt `dl.google.com`) und keinen Mac für Xcode. Der native Build (APK/AAB
bzw. IPA) **muss** deshalb auf deinem Windows-PC (Android) bzw. dem
Mac (iOS) passieren – das ist unten Schritt für Schritt beschrieben.

## Icon ersetzen (optional, empfohlen)

Das aktuelle Icon ist ein einfacher Platzhalter (schwarzer Hintergrund,
blaues "Haus"-Symbol aus deinem bestehenden Akzent-Blau). Wenn du ein
richtiges Logo hast:

1. Ersetze `resources/icon.svg` (1024×1024, quadratisch) und
   `resources/icon-foreground.svg` (Motiv zentriert, min. 20% Rand für
   Android Adaptive Icons)
2. `npm run assets:generate` – erzeugt automatisch alle Android-/iOS-/PWA-
   Größen neu
3. `npm run cap:sync`

---

## Teil A – Android (funktioniert komplett unter Windows, kein Mac nötig)

### A1. Android Studio installieren (einmalig, ~15 Min)
1. https://developer.android.com/studio herunterladen und installieren
2. Beim ersten Start: Standard-SDK-Komponenten installieren lassen
   (Android SDK, Android SDK Platform-Tools, ein aktuelles Platform-Image)

### A2. Projekt öffnen und Env-Variablen setzen
1. `git pull` / Branch `claude/oikos-app-store-deployment-hmk7d3` auschecken
2. `.env` Datei im Projekt-Root anlegen (falls noch nicht vorhanden) mit den
   echten Werten, die aktuell in Vercel unter **Project Settings → Environment
   Variables** stehen:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_GOOGLE_MAPS_API_KEY=...
   ```
   **Wichtig:** Ohne diese Variablen baut die App zwar, aber Login/Supabase/
   Google Maps funktionieren in der gebauten App nicht.
3. `npm install`
4. `npm run android:open` – baut das Web-Bundle, synct es nach `android/`
   und öffnet Android Studio

### A3. In Android Studio testen
1. Android Studio lädt beim ersten Öffnen Gradle-Abhängigkeiten herunter
   (paar Minuten, braucht Internet)
2. Emulator erstellen (Device Manager → Create Device, z. B. Pixel 8) oder
   eigenes Android-Handy per USB mit aktiviertem USB-Debugging anschließen
3. Play-Button (▶) klicken – App startet nativ, testen wie auf echtem Handy
   (Login, Gebete, Weltkarte mit Standort-Freigabe-Dialog, Zurück-Taste)

### A4. Signierten Release-Build erzeugen (für den Play Store)
1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. **Android App Bundle (.aab)** wählen (Play Store verlangt AAB, kein APK)
3. **Create new...** um einen neuen Keystore (Signierschlüssel) zu erzeugen
   – Passwort und Datei **sicher aufbewahren**, z. B. Passwort-Manager.
   **Ohne diesen Keystore kannst du später keine App-Updates mehr
   hochladen** – das ist der wichtigste Schritt hier.
4. Speichere die Keystore-Datei außerhalb des Git-Repos (z. B.
   `~/oikos-release.keystore`)
5. Optional, aber praktisch: lege `android/keystore.properties` an
   (lokal, wird von `.gitignore` ausgeschlossen):
   ```
   storeFile=C:/Users/DEIN_NAME/oikos-release.keystore
   storePassword=DEIN_STORE_PASSWORT
   keyAlias=DEIN_KEY_ALIAS
   keyPassword=DEIN_KEY_PASSWORT
   ```
   Danach baut `Build → Generate Signed Bundle` automatisch signiert.
6. Build-Variante **release** wählen → fertig ist die `app-release.aab`
   unter `android/app/release/`

### A5. Google Play Console Account erstellen (musst du selbst tun)
1. https://play.google.com/console/signup – einmalig **25 USD**
   Registrierungsgebühr, Google-Konto + Zahlungsmethode nötig
2. Entwicklerprofil ausfüllen (Name, Adresse – wird teils öffentlich
   angezeigt)
3. Verifizierung kann 1–2 Tage dauern (manchmal Ausweis-Upload nötig)

### A6. App in Play Console anlegen & Listing ausfüllen
1. **App erstellen** → Name "OIKOS", Sprache Deutsch, App/Spiel: App,
   Kostenlos/Kostenpflichtig wählen
2. **Store-Eintrag**: kurze + lange Beschreibung, Kategorie (z. B.
   "Lifestyle" oder "Soziales Netzwerk")
3. **Grafiken**: Feature-Grafik (1024×500), mind. 2 Screenshots pro
   Gerätetyp (Handy-Screenshots einfach aus dem Emulator/eigenem Handy)
4. **Datenschutzerklärung-URL**: die neue `/privacy`-Seite verwenden,
   z. B. `https://oikos-app-tau.vercel.app/privacy`
5. **Content Rating Fragebogen** ausfüllen (Themen: nutzergenerierte
   Inhalte, Chat-Funktion → wahrscheinlich Rating "Teen" wegen Chat)
6. **Data Safety Form**: welche Daten die App sammelt (E-Mail, Name,
   Standort bei Weltkarte, Nutzungsinhalte) – Vorlage steht in der neuen
   `/privacy`-Seite
7. **Zielgruppe & Inhalt**: Altersfreigabe passend zum Content-Rating
8. Unter **Produktion → Neue Version erstellen**: die `.aab` aus A4
   hochladen, Versionshinweise eintragen, **Überprüfen & Rollout starten**

Google-Review dauert normalerweise **wenige Stunden bis 1-2 Tage** für die
erste Einreichung.

---

## Teil B – iOS (braucht zwingend einen Mac mit Xcode)

### B1. Apple Developer Account erstellen (musst du selbst tun)
1. https://developer.apple.com/programs/enroll/ – **99 USD/Jahr**
2. Apple-ID nötig, Identitätsprüfung kann 1–2 Tage dauern

### B2. Auf dem Mac: Xcode installieren
1. Xcode aus dem Mac App Store installieren (kostenlos, aber groß, ~15 GB)
2. Xcode einmal öffnen, Lizenz akzeptieren, Command Line Tools installieren
   lassen
3. In Xcode: **Settings → Accounts** → mit der Apple-ID (Developer Account)
   anmelden

### B3. Projekt auf den Mac übertragen
1. Repo klonen bzw. den Branch `claude/oikos-app-store-deployment-hmk7d3`
   auschecken
2. `.env` mit den echten Supabase/Google-Maps-Werten anlegen (wie bei
   Android, A2)
3. `npm install`
4. CocoaPods installieren falls nicht vorhanden: `sudo gem install cocoapods`
5. `npm run ios:open` – baut, synct und öffnet das Xcode-Projekt
   (`ios/App/App.xcworkspace`)

### B4. In Xcode konfigurieren
1. Projekt "App" auswählen → Tab **Signing & Capabilities**
2. **Team**: dein Apple Developer Team auswählen (Xcode erstellt
   automatisch ein Provisioning Profile)
3. **Bundle Identifier** prüfen: `com.marvinsand.oikos` (muss exakt so in
   App Store Connect angelegt werden, siehe B5)
4. Mit einem angeschlossenen iPhone oder dem Simulator testen (▶-Button) –
   Login, Gebete, Standort-Dialog, Push-Berechtigung falls vorhanden prüfen

### B5. App Store Connect anlegen
1. https://appstoreconnect.apple.com → **Meine Apps → +**
2. Bundle-ID `com.marvinsand.oikos` registrieren (unter
   developer.apple.com/account/resources/identifiers falls noch nicht
   automatisch von Xcode angelegt)
3. App-Infos: Name "OIKOS", Primäre Sprache Deutsch, SKU (frei wählbar,
   z. B. `oikos-app-001`)

### B6. Store-Listing & Screenshots
1. **Datenschutzerklärung-URL**: `https://oikos-app-tau.vercel.app/privacy`
2. **App-Datenschutz (App Privacy) Fragebogen**: analog zur Android Data
   Safety Form ausfüllen (E-Mail, Name, Standort, nutzergenerierte Inhalte)
3. **Screenshots**: Pflicht für mind. ein iPhone-Format (6.7" oder 6.9",
   je nach aktueller Anforderung) – per Simulator erstellen
   (Xcode → Simulator → Cmd+S für Screenshot)
4. Beschreibung, Keywords, Support-URL, Marketing-URL ausfüllen
5. Altersfreigabe-Fragebogen ausfüllen (wegen Chat/UGC vermutlich 12+ oder
   17+)

### B7. Build hochladen & einreichen
1. In Xcode: **Product → Archive** (nur mit "Any iOS Device" oder realem
   Gerät als Ziel möglich, nicht mit dem Simulator)
2. Im Organizer-Fenster: **Distribute App → App Store Connect → Upload**
3. Nach ein paar Minuten Verarbeitungszeit erscheint der Build in App Store
   Connect unter der App → **Build auswählen**
4. **Für Prüfung einreichen**

**Wichtiger Hinweis zu Apples Review:** Apple lehnt reine "Website-Wrapper"
unter Richtlinie 4.2 (Minimum Functionality) manchmal ab. Diese App hat
durch die native Bridge (Statusleiste, Hardware-Zurück auf Android,
natives Splash-Screen, Standort-Permission-Dialog) bereits echtes natives
Verhalten – trotzdem: Falls Apple ablehnt, hilft meist der Hinweis in den
Notizen an den Reviewer ("Login-Testdaten bereitstellen") oder das
Nachrüsten weiterer nativer Funktionen (z. B. echte Push-Notifications
über Capacitor statt nur Web-Push, siehe unten).

Apple-Review dauert typischerweise **24–48 Stunden**.

---

## Bekannte offene Punkte / nächste Schritte (nicht blockierend für den ersten Release)

- **Push-Notifications**: `public/sw.js` ist Web-Push (funktioniert nur im
  Browser-Kontext). In der nativen App greift das nicht automatisch – für
  echte native Push-Benachrichtigungen müsste zusätzlich
  `@capacitor/push-notifications` + Firebase Cloud Messaging (Android) /
  APNs (iOS) eingerichtet werden. Für den ersten Store-Release nicht nötig.
- **App-Icon**: aktuell Platzhalter, siehe "Icon ersetzen" oben.
- **Versionierung**: `android/app/build.gradle` (`versionCode`/
  `versionName`) und `ios/App/App.xcodeproj` (`MARKETING_VERSION`/
  `CURRENT_PROJECT_VERSION`) bei jedem neuen Store-Update erhöhen.

## Kurz-Zusammenfassung: was du JETZT tun kannst

| Wo | Was |
|---|---|
| **Sofort (Windows)** | Play Console Account erstellen (25$), Android Studio installieren, `.env` mit echten Keys anlegen, `npm run android:open`, App testen, Screenshots machen |
| **Sofort (überall)** | Apple Developer Account erstellen (99$/Jahr) – Verifizierung dauert, lieber früh starten |
| **Sobald Play Console verifiziert** | Signierten `.aab` bauen (Keystore sicher aufbewahren!), Store-Listing ausfüllen, einreichen |
| **Sobald Mac verfügbar** | Xcode installieren, `.env` übertragen, `npm run ios:open`, Team/Signing einrichten, testen, archivieren, in App Store Connect einreichen |
