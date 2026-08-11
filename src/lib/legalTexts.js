// ─────────────────────────────────────────────────────────────
// Rechtstexte für App Store und Google Play.
//
// Beide Stores verlangen eine in der App erreichbare Datenschutz-
// erklärung; für Apps mit nutzergenerierten Inhalten verlangt Apple
// (Guideline 1.2) zusätzlich Nutzungsbedingungen mit einer klaren
// Null-Toleranz-Regel gegenüber anstößigen Inhalten. In Deutschland
// kommt die Impressumspflicht nach § 5 DDG hinzu.
//
// ⚠️ ENTWURF – VOR DER EINREICHUNG RECHTLICH PRÜFEN LASSEN.
// Alle mit [PLATZHALTER] markierten Stellen müssen ausgefüllt werden,
// sonst ist das Impressum unvollständig und die Store-Einreichung
// scheitert an der Datenschutz-/Support-URL-Prüfung.
// ─────────────────────────────────────────────────────────────

export const LEGAL_CONTACT_EMAIL = '[PLATZHALTER: kontakt@deine-domain.de]'
export const LEGAL_LAST_UPDATED = '11. August 2026'

export const LEGAL_DOCS = {
  privacy: {
    slug: 'privacy',
    title: 'Datenschutzerklärung',
    short: 'Welche Daten wir verarbeiten und warum',
    body: `
## 1. Verantwortlicher

[PLATZHALTER: Vor- und Nachname bzw. Firmierung]
[PLATZHALTER: Straße und Hausnummer]
[PLATZHALTER: PLZ und Ort]
E-Mail: ${LEGAL_CONTACT_EMAIL}

## 2. Worum es bei OIKOS geht

OIKOS ist eine App, mit der du dein persönliches Umfeld – deinen „Oikos“ –
im Blick behältst und für die Menschen darin betest. Dafür verarbeiten wir
nur die Daten, die für diesen Zweck nötig sind.

## 3. Welche Daten wir verarbeiten

**Kontodaten.** E-Mail-Adresse und Passwort (verschlüsselt gespeichert),
Name und Benutzername. Ohne diese Daten ist kein Konto möglich.

**Profildaten.** Freiwillige Angaben wie Geburtstag, Wohnort, Gemeinde,
Kurzbeschreibung und Profilbild. Für jede dieser Angaben entscheidest du in
den Einstellungen selbst, ob sie öffentlich sichtbar ist.

**Inhalte, die du erstellst.** Gebetsanliegen, Notizen, Beiträge, Kommentare,
Chat-Nachrichten und Fotos. Die Sichtbarkeit legst du jeweils selbst fest.

**Angaben zu anderen Personen.** Auf deiner Oikos-Karte kannst du Menschen
eintragen, die selbst keine Nutzer der App sind – etwa Name, Beziehung zu dir
und ein ungefährer Ort. Diese Einträge sind ausschließlich für dich sichtbar,
solange du die Karte nicht ausdrücklich freigibst. Trage bitte nur ein, was
du verantworten kannst, und keine besonders sensiblen Angaben über Dritte
(Gesundheit, sexuelle Orientierung, religiöse Überzeugung Dritter) ohne deren
Einverständnis.

**Standortdaten.** Nur, wenn du sie ausdrücklich freigibst, und nur in
verringerter Genauigkeit, um Orte auf der Karte zu platzieren. Du kannst die
Freigabe jederzeit in den Einstellungen und in den Systemeinstellungen deines
Geräts widerrufen.

**Nutzungsdaten.** Anonymisierte Zugriffsstatistiken zur Verbesserung der App.
Es findet kein app-übergreifendes Tracking und keine Weitergabe zu Werbezwecken
statt.

## 4. Rechtsgrundlagen

Die Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags
(Art. 6 Abs. 1 lit. b DSGVO), auf Grundlage deiner Einwilligung
(Art. 6 Abs. 1 lit. a DSGVO – etwa bei Standort und Benachrichtigungen)
sowie zur Wahrung berechtigter Interessen an einem sicheren, missbrauchsfreien
Betrieb (Art. 6 Abs. 1 lit. f DSGVO).

## 5. Auftragsverarbeiter

Die Daten werden bei Supabase (Datenbank, Authentifizierung, Dateispeicher)
und Vercel (Auslieferung der App) verarbeitet. Für Karten- und Adressfunktionen
kommt Google Maps zum Einsatz; dabei wird deine IP-Adresse an Google übermittelt.
Mit allen Dienstleistern bestehen Verträge zur Auftragsverarbeitung.

## 6. Speicherdauer

Deine Daten bleiben gespeichert, solange dein Konto besteht. Löschst du dein
Konto, werden dein Profil, deine Karten, Gebete, Beiträge, Kommentare, Chats
und hochgeladenen Dateien unwiderruflich entfernt.

## 7. Deine Rechte

Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine
erteilte Einwilligung zu widerrufen. Dein Konto kannst du jederzeit selbst
löschen: Einstellungen → Account → Account löschen. Für alle anderen Anliegen
schreib uns an ${LEGAL_CONTACT_EMAIL}.

Außerdem steht dir ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu.

## 8. Kinder und Jugendliche

OIKOS richtet sich an Personen ab 16 Jahren. Jüngere Nutzer benötigen die
Einwilligung der Erziehungsberechtigten.

## 9. Änderungen

Wir passen diese Erklärung an, wenn sich die App oder die Rechtslage ändert.
Stand: ${LEGAL_LAST_UPDATED}.
`.trim(),
  },

  terms: {
    slug: 'terms',
    title: 'Nutzungsbedingungen',
    short: 'Die Regeln für das Miteinander in OIKOS',
    body: `
## 1. Geltungsbereich

Diese Bedingungen regeln die Nutzung der App OIKOS. Mit der Registrierung
erkennst du sie an.

## 2. Dein Konto

Du bist für dein Konto und dein Passwort verantwortlich und gibst bei der
Registrierung zutreffende Angaben an. Ein Konto pro Person. Du musst mindestens
16 Jahre alt sein oder die Einwilligung deiner Erziehungsberechtigten haben.

## 3. Regeln für Inhalte – Null-Toleranz

Für Inhalte, die du erstellst, bist du selbst verantwortlich. **Nicht erlaubt**
sind insbesondere:

- Beleidigungen, Belästigung, Mobbing, Bedrohungen oder Stalking
- Hassrede und Diskriminierung, etwa wegen Herkunft, Religion, Geschlecht,
  sexueller Orientierung oder Behinderung
- sexuelle, pornografische oder anderweitig anstößige Darstellungen
- Gewaltverherrlichung sowie Aufrufe zu Gewalt oder Selbstverletzung
- Spam, Werbung, Kettenbriefe und Betrugsversuche
- Inhalte, die Rechte Dritter verletzen (Urheber-, Marken- oder Persönlichkeitsrechte)
- personenbezogene Daten Dritter ohne deren Einverständnis
- rechtswidrige Inhalte jeder Art

**Wir dulden solche Inhalte nicht.** Gemeldete Inhalte prüfen wir und entfernen
sie in der Regel innerhalb von 24 Stunden. Bei Verstößen können wir Inhalte
löschen, Funktionen einschränken und Konten dauerhaft sperren.

## 4. Melden und Blockieren

In jedem Beitrag, Kommentar, Chat und Profil findest du eine Meldefunktion.
Zusätzlich kannst du jeden Nutzer blockieren; ihr seht dann die Inhalte des
jeweils anderen nicht mehr. Blockierungen verwaltest du unter
Einstellungen → Blockierte Nutzer.

## 5. Umgang mit Angaben über Dritte

Auf deiner Oikos-Karte kannst du Menschen eintragen, die die App nicht nutzen.
Gehe damit sorgsam um: Trage nur ein, was du verantworten kannst, und teile
Karten mit solchen Einträgen nur, wenn die betroffenen Personen einverstanden sind.

## 6. Deine Rechte an deinen Inhalten

Deine Inhalte gehören dir. Du räumst uns lediglich das Recht ein, sie im
Rahmen des Betriebs der App zu speichern und den von dir gewählten Empfängern
anzuzeigen.

## 7. Verfügbarkeit

Wir bemühen uns um einen zuverlässigen Betrieb, können aber keine
ununterbrochene Verfügbarkeit zusichern. Wartungsarbeiten und Störungen
können zu Unterbrechungen führen.

## 8. Kündigung

Du kannst dein Konto jederzeit ohne Angabe von Gründen löschen:
Einstellungen → Account → Account löschen. Wir können das Nutzungsverhältnis
bei schweren oder wiederholten Verstößen gegen Abschnitt 3 beenden.

## 9. Haftung

Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei
Verletzung von Leben, Körper und Gesundheit. Im Übrigen haften wir nur bei
Verletzung wesentlicher Vertragspflichten und beschränkt auf den typischen,
vorhersehbaren Schaden.

## 10. Schlussbestimmungen

Es gilt das Recht der Bundesrepublik Deutschland. Sollte eine Bestimmung
unwirksam sein, bleibt der übrige Vertrag wirksam.

Stand: ${LEGAL_LAST_UPDATED}. Kontakt: ${LEGAL_CONTACT_EMAIL}
`.trim(),
  },

  imprint: {
    slug: 'imprint',
    title: 'Impressum',
    short: 'Anbieterkennzeichnung nach § 5 DDG',
    body: `
## Angaben gemäß § 5 DDG

[PLATZHALTER: Vor- und Nachname bzw. Firmierung]
[PLATZHALTER: Straße und Hausnummer]
[PLATZHALTER: PLZ und Ort]
[PLATZHALTER: Land]

## Kontakt

E-Mail: ${LEGAL_CONTACT_EMAIL}
[PLATZHALTER: Telefonnummer, falls vorhanden]

## Vertreten durch

[PLATZHALTER: Nur bei juristischen Personen – Geschäftsführung bzw. Vorstand]

## Registereintrag

[PLATZHALTER: Registergericht und Registernummer, falls vorhanden]

## Umsatzsteuer-Identifikationsnummer

[PLATZHALTER: USt-IdNr. gemäß § 27a UStG, falls vorhanden]

## Verantwortlich für den Inhalt

[PLATZHALTER: Name und Anschrift der verantwortlichen Person]

## Streitschlichtung

Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren
vor einer Verbraucherschlichtungsstelle teilzunehmen.

Stand: ${LEGAL_LAST_UPDATED}.
`.trim(),
  },
}

export const LEGAL_ORDER = ['privacy', 'terms', 'imprint']
