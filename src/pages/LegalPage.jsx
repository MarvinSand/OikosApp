import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LEGAL } from '../lib/legal'

// Nutzungsbedingungen (inkl. Community-Richtlinien mit Null-Toleranz für
// anstößige Inhalte – App-Store-Richtlinie 1.2) und Datenschutzerklärung
// (Richtlinie 5.1.1 + DSGVO). Öffentlich erreichbar (/terms, /privacy), damit
// dieselben URLs in App Store Connect hinterlegt werden können.

function Operator() {
  const { operatorName, operatorAddress, contactEmail } = LEGAL
  return (
    <p>
      {operatorName || 'Betreiber der OIKOS-App'}
      {operatorAddress && <><br />{operatorAddress}</>}
      {contactEmail && <><br />E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></>}
    </p>
  )
}

function ContactLine() {
  return LEGAL.contactEmail
    ? <>per E-Mail an <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> oder über die Melden-Funktion in der App</>
    : <>über die Melden-Funktion in der App</>
}

function Terms() {
  return (
    <>
      <h1>Nutzungsbedingungen &amp; Community-Richtlinien</h1>
      <p className="legal-meta">Stand: {LEGAL.lastUpdated}</p>

      <h2>1. Worum es geht</h2>
      <p>
        OIKOS ist eine christliche Community-App, um füreinander zu beten, sich zu vernetzen und
        Glaubensinhalte zu teilen. Mit der Registrierung akzeptierst du diese Bedingungen.
      </p>

      <h2>2. Dein Konto</h2>
      <p>
        Du musst mindestens 16 Jahre alt sein. Deine Angaben müssen wahr sein, dein Passwort
        hältst du geheim. Du kannst dein Konto jederzeit unter Einstellungen → Account löschen
        entfernen; dabei werden deine Daten gelöscht.
      </p>

      <h2>3. Null Toleranz für anstößige Inhalte und missbräuchliches Verhalten</h2>
      <p>In Beiträgen, Kommentaren, Gebeten, Nachrichten, Profilen und Communities ist verboten:</p>
      <ul>
        <li>Belästigung, Mobbing, Drohungen oder Einschüchterung</li>
        <li>Hassrede oder Diskriminierung (z. B. wegen Herkunft, Geschlecht, Behinderung, Religion)</li>
        <li>sexuelle, pornografische oder gewaltverherrlichende Inhalte</li>
        <li>Spam, Werbung, Betrug oder Phishing</li>
        <li>rechtswidrige Inhalte und Urheberrechtsverletzungen</li>
        <li>das Veröffentlichen privater Daten anderer ohne deren Zustimmung</li>
        <li>das Vortäuschen einer fremden Identität</li>
      </ul>
      <p>
        Verstöße führen zur Entfernung der Inhalte und – je nach Schwere – zur Sperrung oder
        Löschung des Kontos.
      </p>

      <h2>4. Melden und Blockieren</h2>
      <p>
        Über das Menü (⋯) an Beiträgen, Kommentaren, Gebeten, Nachrichten und Profilen kannst du
        Inhalte melden und Personen blockieren. Blockierte Personen und du seht gegenseitig keine
        Inhalte mehr und könnt euch nicht mehr direkt schreiben. Wir prüfen jede Meldung innerhalb
        von 24 Stunden und entfernen unzulässige Inhalte.
      </p>

      <h2>5. Angaben über andere Personen</h2>
      <p>
        In deinen Oikos Maps kannst du Menschen aus deinem Umfeld eintragen, für die du betest.
        Trage dort nur so viel ein, wie du brauchst (z. B. Vornamen), und teile Angaben über andere
        nur, wenn diese damit einverstanden wären.
      </p>

      <h2>6. Deine Inhalte</h2>
      <p>
        Die Rechte an deinen Inhalten bleiben bei dir. Du erlaubst uns, sie im Rahmen der von dir
        gewählten Sichtbarkeit in der App anzuzeigen. Mit dem Löschen eines Inhalts oder deines
        Kontos endet diese Erlaubnis.
      </p>

      <h2>7. Verfügbarkeit und Haftung</h2>
      <p>
        Wir bemühen uns um einen störungsfreien Betrieb, können ihn aber nicht garantieren. Für
        Inhalte anderer Nutzer sind diese selbst verantwortlich. Wir haften unbeschränkt nur bei
        Vorsatz und grober Fahrlässigkeit sowie nach zwingenden gesetzlichen Vorschriften.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Wir können diese Bedingungen anpassen und informieren dich in der App über wesentliche
        Änderungen.
      </p>

      <h2>9. Kontakt</h2>
      <Operator />
      <p>Fragen und Hinweise erreichen uns <ContactLine />.</p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <p className="legal-meta">Stand: {LEGAL.lastUpdated}</p>

      <h2>1. Verantwortlicher</h2>
      <Operator />

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><strong>Konto:</strong> E-Mail-Adresse, Name, Benutzername, Passwort (nur verschlüsselt gespeichert).</li>
        <li><strong>Profil (freiwillig):</strong> Profilbild, Bio, Geschlecht, Geburtstag, Stadt/Land, Gemeinde, Angabe zum Glauben.</li>
        <li><strong>Standort (freiwillig):</strong> Adresse bzw. Koordinaten, wenn du sie für die Weltkarte oder eine Aktivität angibst. Die Genauigkeit für Freunde und andere bestimmst du selbst.</li>
        <li><strong>Inhalte:</strong> Beiträge, Kommentare, Gebetsanliegen, Chat-Nachrichten und Fotos, Oikos Maps (inkl. der dort eingetragenen Personen), Community-Mitgliedschaften.</li>
        <li><strong>Technische Daten:</strong> Zeitpunkt der letzten Aktivität, Push-Token deines Geräts (wenn du Mitteilungen erlaubst), Meldungen und Blockierungen.</li>
      </ul>
      <p>
        Angaben zu deinem Glauben sind besonders geschützte Daten (Art. 9 DSGVO). Wir verarbeiten
        sie nur, weil und soweit du sie selbst freiwillig angibst (Einwilligung, Art. 9 Abs. 2
        lit. a DSGVO); du kannst sie jederzeit ändern oder löschen.
      </p>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Bereitstellung der App und ihrer Funktionen (Art. 6 Abs. 1 lit. b DSGVO).</li>
        <li>Sicherheit, Missbrauchsbekämpfung und Moderation gemeldeter Inhalte (Art. 6 Abs. 1 lit. f DSGVO).</li>
        <li>Push-Mitteilungen und Standort nur nach deiner Zustimmung im Betriebssystem (Art. 6 Abs. 1 lit. a DSGVO).</li>
      </ul>
      <p>Wir verkaufen keine Daten, zeigen keine Werbung und betreiben kein Tracking.</p>

      <h2>4. Dienstleister</h2>
      <ul>
        <li><strong>Supabase</strong> (Datenbank, Anmeldung, Dateispeicher) – Serverstandort EU (Irland).</li>
        <li><strong>Google Maps Platform</strong> (Karten und Adresssuche) – Google Ireland Ltd.; dabei kann deine IP-Adresse an Google übermittelt werden.</li>
        <li><strong>YouVersion</strong> (Bibeltexte, abgerufen über unseren Server; optional Verknüpfung deines YouVersion-Kontos).</li>
        <li><strong>Apple Push Notification Service</strong> (Zustellung von Mitteilungen auf iPhones).</li>
        <li><strong>Vercel</strong> (Hosting der Web-Version inkl. cookieloser Reichweitenmessung – nur im Browser, nicht in der iOS-App).</li>
        <li><strong>Resend</strong> (Versand von E-Mail-Benachrichtigungen, sofern aktiviert).</li>
      </ul>
      <p>
        Soweit Daten in die USA gelangen, erfolgt dies auf Grundlage des EU-US Data Privacy
        Framework bzw. von EU-Standardvertragsklauseln.
      </p>

      <h2>5. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten, solange dein Konto besteht. Löschst du dein Konto
        (Einstellungen → Account löschen), werden deine Daten gelöscht. Gelesene Benachrichtigungen
        werden nach einem Monat automatisch entfernt.
      </p>

      <h2>6. Speicherung auf deinem Gerät</h2>
      <p>
        Die App speichert deine Anmeldung, Einstellungen und zuletzt geladene Inhalte lokal auf
        deinem Gerät, damit sie schneller startet. Beim Abmelden werden die zwischengespeicherten
        Inhalte gelöscht. Es werden keine Tracking- oder Werbe-Cookies verwendet.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch sowie auf Widerruf erteilter Einwilligungen mit Wirkung
        für die Zukunft. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.
        Wende dich dazu <ContactLine />.
      </p>
    </>
  )
}

export default function LegalPage({ kind }) {
  const navigate = useNavigate()
  return (
    <div className="bg-bg min-h-full" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <header
        className="flex items-center gap-2 px-4"
        style={{ height: 52, borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, backgroundColor: 'var(--color-bg)', zIndex: 10 }}
      >
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Zurück"
          style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
          {kind === 'privacy' ? 'Datenschutz' : 'Nutzungsbedingungen'}
        </span>
      </header>
      <article className="legal-content" style={{ padding: '8px 20px', maxWidth: 680, margin: '0 auto' }}>
        {kind === 'privacy' ? <Privacy /> : <Terms />}
      </article>
    </div>
  )
}
