// Öffentliche, nicht-authentifizierte Route (/privacy) – wird von Apple
// App Store Connect und Google Play Console als Datenschutzerklärungs-URL
// verlangt und muss ohne Login erreichbar sein.
export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px', color: 'var(--color-text)', background: 'var(--color-bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Datenschutzerklärung – OIKOS</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>Stand: 31. August 2026</p>

      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        OIKOS ist eine App zum gemeinsamen Beten und geistlichen Wachsen in Gemeinschaft.
        Diese Erklärung beschreibt, welche personenbezogenen Daten wir verarbeiten und wofür.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>1. Verantwortlicher</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Marvin Sand<br />
        E-Mail: marvinsand0607@gmail.com
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>2. Welche Daten wir verarbeiten</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.7, marginBottom: 16 }}>
        <li>Account-Daten: E-Mail-Adresse, Name, optional Profilbild, Bio, Geburtstag, Geschlecht, Gemeinde-Zugehörigkeit</li>
        <li>Nutzungsinhalte: Gebete, Kommentare, Beiträge, Nachrichten in Konversationen/Communities</li>
        <li>Standortdaten: nur wenn du aktiv eine Aktivität auf der Weltkarte erstellst und deinem Gerät die Berechtigung erteilst</li>
        <li>Technische Daten: Geräteinformationen für Push-Benachrichtigungen (sofern aktiviert)</li>
      </ul>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>3. Zweck der Verarbeitung</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Die Daten werden ausschließlich zur Bereitstellung der App-Funktionen genutzt: Anmeldung,
        Darstellung von Profilen, Gebeten, Chats, Communities und der Weltkarte sowie zum Versand
        von Push-Benachrichtigungen. Es findet kein Verkauf von Daten an Dritte statt und keine
        Nutzung für Werbezwecke.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>4. Auftragsverarbeiter</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Für Hosting, Datenbank und Authentifizierung nutzen wir Supabase (Supabase Inc.). Für das
        Deployment der Web-Anwendung nutzen wir Vercel Inc. Beide Anbieter verarbeiten Daten in
        unserem Auftrag gemäß Art. 28 DSGVO.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>5. Deine Rechte</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
        deiner Daten sowie auf Datenübertragbarkeit. Du kannst dein Konto und alle zugehörigen
        Daten jederzeit in den App-Einstellungen löschen oder uns unter der oben genannten
        E-Mail-Adresse kontaktieren.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>6. Minderjährige</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        OIKOS richtet sich nicht gezielt an Kinder unter 13 Jahren. Uns ist bewusst, dass wir bei
        Kenntnis einer Registrierung eines Kindes unter 13 Jahren die Daten löschen müssen.
      </p>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>7. Kontakt</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Bei Fragen zum Datenschutz erreichst du uns unter marvinsand0607@gmail.com.
      </p>
    </div>
  )
}
