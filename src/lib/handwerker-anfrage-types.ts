/** Öffentliche GET-Antwort `/api/handwerker/anfrage/[token]` */
export type HandwerkerAnfragePublicPayload = {
  handwerker_name: string
  gewerk_name: string
  plz: string
  ort: string
  zeitraum: string
  geplanter_start: string | null
  antwort_frist_iso: string | null
  positionen: Array<{
    leistung?: string
    beschreibung: string
    menge: number
    einheit: string
  }>
  kontakt_telefon: string
  kontakt_email: string
  status: string
  antwort_at: string | null
  antwort: 'akzeptiert' | 'abgelehnt' | null
}
