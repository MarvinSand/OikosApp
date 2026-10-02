// Angaben zum Betreiber für Datenschutzerklärung, Nutzungsbedingungen und
// Kontakt. Werden zur Build-Zeit aus Umgebungsvariablen gelesen (Vercel →
// Environment Variables bzw. GitHub → Secrets für den iOS-Build), damit keine
// persönlichen Daten im Quellcode stehen.
//
// VOR DER VERÖFFENTLICHUNG SETZEN (DSGVO Art. 13 verlangt Name + Anschrift
// des Verantwortlichen, Apple verlangt eine Kontaktmöglichkeit):
//   VITE_LEGAL_NAME     z. B. "Max Mustermann"
//   VITE_LEGAL_ADDRESS  z. B. "Musterstraße 1, 12345 Musterstadt, Deutschland"
//   VITE_SUPPORT_EMAIL  z. B. "support@oikosapp.net"
export const LEGAL = {
  operatorName: import.meta.env.VITE_LEGAL_NAME || '',
  operatorAddress: import.meta.env.VITE_LEGAL_ADDRESS || '',
  contactEmail: import.meta.env.VITE_SUPPORT_EMAIL || '',
  lastUpdated: 'September 2026',
}

export const TERMS_PATH = '/terms'
export const PRIVACY_PATH = '/privacy'
