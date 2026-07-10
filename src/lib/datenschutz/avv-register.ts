/** AVV-Register — Unterauftragsverarbeiter (manuell pflegen, mit Anwalt abstimmen). */
export const DATENSCHUTZ_AVV_REGISTER = [
  {
    name: 'Supabase Inc.',
    zweck: 'Datenbank, Auth, Storage (EU Frankfurt)',
    standort: 'EU (Frankfurt) / Singapur (Holding)',
    vertrag: 'AVV / DPA Supabase',
  },
  {
    name: 'Resend Inc.',
    zweck: 'Transaktions-E-Mails (Melder-Bestätigung, Org-Benachrichtigung)',
    standort: 'USA (EU-US Data Privacy Framework)',
    vertrag: 'AVV / DPA Resend',
  },
  {
    name: 'Netlify Inc.',
    zweck: 'Hosting Website / Meldeformular',
    standort: 'USA (EU-US Data Privacy Framework)',
    vertrag: 'AVV Netlify',
  },
  {
    name: 'PostHog Inc.',
    zweck: 'Web-Statistik (nur nach Cookie-Einwilligung)',
    standort: 'EU (Frankfurt)',
    vertrag: 'AVV PostHog',
  },
] as const
