# Store-Einreichung: Unterlagen und Checkliste

Alles, was Apple und Google außerhalb des Codes verlangen. Die Texte hier
sind Vorlagen – Platzhalter in eckigen Klammern müssen gefüllt werden.

---

## Build erzeugen

```bash
npm run build          # Web-Assets nach dist/
npx cap sync           # dist/ in die nativen Projekte kopieren
npx cap open ios       # Xcode (nur auf macOS)
npx cap open android   # Android Studio
```

Die Umgebungsvariablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_GOOGLE_MAPS_API_KEY`, `VITE_VAPID_PUBLIC_KEY`) werden beim Build
eingebettet. Vor `npm run build` also sicherstellen, dass `.env` gefüllt ist –
sonst startet die App im Store mit undefinierten Werten.

---

## App-Beschreibung (Deutsch)

**Name:** OIKOS
**Untertitel (max. 30 Zeichen):** Beten für dein Umfeld

**Kurzbeschreibung (Google Play, max. 80 Zeichen):**
Behalte dein Umfeld im Blick und bete gezielt für die Menschen darin.

**Beschreibung:**

```
OIKOS kommt aus dem Griechischen und bedeutet Haus oder Hausgemeinschaft –
der Kreis von Menschen, mit denen du wirklich zu tun hast. Familie, Freunde,
Nachbarn, Kollegen.

Genau darum geht es in dieser App: die Menschen in deinem Umfeld nicht aus
dem Blick zu verlieren und regelmäßig für sie zu beten.

DEINE OIKOS-KARTE
Trage die Menschen ein, die dir wichtig sind, und ordne sie so an, wie sie
zueinander stehen. So siehst du auf einen Blick, wer zu deinem Umfeld gehört
und für wen du länger nicht gebetet hast.

GEBETE, DIE NICHT UNTERGEHEN
Halte Anliegen fest, notiere, was sich verändert, und markiere Erhörungen.
Die Gebetsstatistik zeigt dir, wo du dranbleibst – ohne Druck.

GEMEINSAM STATT ALLEIN
Verbinde dich mit Geschwistern, teile Anliegen und betet füreinander.
In Communities könnt ihr euch als Gruppe austauschen.

GEFÜHRTER GEBETSMODUS
Wenn du nicht weißt, wo du anfangen sollst: Der Gebetsmodus führt dich
Schritt für Schritt durch deine Anliegen.

OIKOS ist kostenlos und ohne Werbung.
```

**Keywords (Apple, max. 100 Zeichen, kommagetrennt):**
`beten,Gebet,Gebetsliste,christlich,Glaube,Bibel,Gemeinde,Andacht,Fürbitte,Freunde`

**Kategorie:** Lifestyle (Primär), Soziale Netze (Sekundär)
**Altersfreigabe:** 12+ bzw. USK 12 – wegen nutzergenerierter Inhalte
und uneingeschränktem Web-Zugriff über Kartendienste.

---

## Pflicht-URLs

| Feld | Wert |
|---|---|
| Support-URL | `[PLATZHALTER: https://…/support]` |
| Marketing-URL | `https://oikos-app-tau.vercel.app` |
| Datenschutz-URL | `https://oikos-app-tau.vercel.app/legal/privacy` |
| Nutzungsbedingungen | `https://oikos-app-tau.vercel.app/legal/terms` |

Die beiden Rechtstexte sind auch ohne Login erreichbar – das prüfen beide
Stores.

---

## Apple: Privacy Nutrition Label

Anzugeben unter „App Privacy". Nichts davon wird zum Tracking über andere
Apps hinweg verwendet, ATT ist daher nicht nötig.

| Datenart | Erhoben | Mit Identität verknüpft | Zweck |
|---|---|---|---|
| E-Mail-Adresse | ja | ja | Konto, Authentifizierung |
| Name / Benutzername | ja | ja | Konto, Anzeige im Profil |
| Ungefährer Standort | ja (optional) | ja | Karten- und Ortsfunktionen |
| Fotos | ja (optional) | ja | Profilbild, Beiträge, Chat |
| Nutzerinhalte | ja | ja | Kernfunktion der App |
| Kontakte | nein | – | Es wird kein Adressbuch gelesen |
| Nutzungsdaten | ja | nein | Verbesserung der App (Vercel Analytics) |
| Diagnose | nein | – | – |

Genauer Standort wird bewusst **nicht** erhoben: die App speichert Positionen
nur in verringerter Genauigkeit (siehe `phase17b_location_precision.sql`).

---

## Google Play: Data Safety

Dieselben Angaben wie oben. Zusätzlich anzukreuzen:

- Daten werden bei der Übertragung verschlüsselt: **ja** (HTTPS durchgehend)
- Nutzer können die Löschung ihrer Daten beantragen: **ja**
  (Einstellungen → Account → Account löschen, sofort wirksam)
- Es findet keine Weitergabe an Dritte zu Werbezwecken statt

Google verlangt zusätzlich eine öffentlich erreichbare **URL zur
Kontolöschung**. Da die Löschung nur in der App möglich ist, dort auf
`https://oikos-app-tau.vercel.app/legal/privacy` verweisen – der Abschnitt
„Deine Rechte" beschreibt den Weg.

---

## Screenshots

Erforderliche Größen:

- **iPhone 6,7"** (1290 × 2796) – Pflicht, mindestens 3
- **iPhone 6,5"** (1242 × 2688) – Pflicht, wenn 6,7" nicht alles abdeckt
- **iPad 12,9"** (2048 × 2732) – nur bei iPad-Unterstützung
- **Android Smartphone** (mind. 1080 px Breite), mindestens 2
- **Google Play Feature-Graphic** (1024 × 500) – Pflicht

Vorschlag für die Reihenfolge (die ersten beiden entscheiden):

1. Oikos-Karte mit eingetragenen Personen
2. Geführter Gebetsmodus
3. Gebetsanliegen mit Verlauf und Erhörung
4. Community-Ansicht
5. Gebetsstatistik

---

## Review-Zugang für Apple

Apple testet mit einem echten Konto. Ohne funktionierende Zugangsdaten wird
die Einreichung abgelehnt.

```
Benutzername: [PLATZHALTER: E-Mail des Demo-Kontos]
Passwort:     [PLATZHALTER]
```

Das Demo-Konto muss:

- eine **abgeschlossene E-Mail-Verifikation** haben – sonst hängt der Reviewer
  am Hinweisbanner fest (`SettingsView.jsx`, `profile.email_verified`)
- eine befüllte Oikos-Karte, ein paar Gebete, eine Community und einen Chat
  enthalten, damit die Funktionen überhaupt sichtbar sind
- mit einem zweiten Konto verbunden sein, damit Melden und Blockieren
  ausprobiert werden können

**Notizen für den Reviewer:**

```
OIKOS ist eine App zum Beten für den eigenen Bekanntenkreis.

Melden und Blockieren: In jedem Beitrag, Kommentar und in jeder Nachricht
über das Menü (⋯). Blockieren zusätzlich im Profil oben rechts.
Blockierte Nutzer sind unter Einstellungen → Blockierte Nutzer verwaltbar.

Konto löschen: Einstellungen → Account → Account löschen. Die Löschung
erfolgt sofort und vollständig.

Die App enthält keine Käufe und keine Werbung.
```

---

## Vor dem Upload prüfen

- [ ] Migrationen `phase58` bis `phase61` im Supabase-SQL-Editor ausgeführt
- [ ] `phase61` Schritt 3 liefert keine ungeschützte Tabelle mit
      personenbezogenen Daten mehr
- [ ] Kontolöschung mit einem Testkonto durchgespielt und in der Datenbank
      kontrolliert
- [ ] Melden und Blockieren mit zwei Konten getestet
- [ ] Chat-Foto-URL im Inkognito-Fenster aufgerufen → muss 403 liefern
- [ ] Platzhalter in `src/lib/legalTexts.js` gefüllt, Texte rechtlich geprüft
- [ ] Bundle-ID in `capacitor.config.json` stimmt mit App Store Connect überein
- [ ] Versionsnummer in `package.json` sowie in beiden nativen Projekten erhöht
- [ ] Auf einem Gerät mit Notch geprüft: Bottom-Nav sitzt über dem
      Home-Indicator, Chat-Eingabeleiste springt bei Tastatur nicht
- [ ] Flugmodus-Test: kein Endlos-Spinner in den Haupt-Tabs
- [ ] `assetlinks.json` (Android) und `apple-app-site-association` (iOS)
      unter `/.well-known/` auf der Domain hinterlegt, sonst greifen die
      Deep Links für Bestätigungs- und Reset-Mails nicht
