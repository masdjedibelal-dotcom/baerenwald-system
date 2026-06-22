export type BaustellenDokumentTyp = 'tagesbericht' | 'wochenbericht' | 'regiebericht' | 'sonstiges'

export type AuftragBaustelleTeam = {
  bauleiter_name?: string | null
  bauleiter_telefon?: string | null
  bauleiter_email?: string | null
  bau_mannschaft: string[]
  bau_nachunternehmer_name?: string | null
  bau_nachunternehmer_firma?: string | null
}

export type AuftragRegiearbeit = {
  id: string
  auftrag_id: string
  datum: string
  bezeichnung: string
  beschreibung?: string | null
  personen_anzahl: number
  stunden: number
  material?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type AuftragWochenbericht = {
  id: string
  auftrag_id: string
  wochen_nummer: number
  kalenderwoche: number
  jahr: number
  von_datum: string
  bis_datum: string
  fazit?: string | null
  ausblick?: string | null
  pdf_url?: string | null
  created_at: string
  updated_at: string
}

export type AuftragBaustellenDokument = {
  id: string
  auftrag_id: string
  typ: BaustellenDokumentTyp
  titel: string
  datei_url: string
  kalenderwoche?: number | null
  jahr?: number | null
  wochen_nummer?: number | null
  quelle: 'upload' | 'generiert'
  referenz_id?: string | null
  created_at: string
}

export const BAUSTELLEN_DOKUMENT_TYP_LABELS: Record<BaustellenDokumentTyp, string> = {
  tagesbericht: 'Tagesbericht',
  wochenbericht: 'Wochenbericht',
  regiebericht: 'Regiebericht',
  sonstiges: 'Sonstiges',
}

export function parseStringListJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => String(x ?? '').trim()).filter(Boolean)
}
