import type { PartnerDokument } from '@/lib/types'

export type PartnerDokumentStatus =
  | 'freigegeben'
  | 'genehmigt'
  | 'hochgeladen'
  | 'in_pruefung'
  | 'eingereicht'
  | 'abgelehnt'

export function partnerDokumentIstFreigegeben(status: string | null | undefined): boolean {
  const s = (status ?? 'freigegeben').toLowerCase()
  return s === 'freigegeben' || s === 'genehmigt'
}

export function partnerDokumentStatusLabel(status: string | null | undefined): string {
  const s = (status ?? 'freigegeben').toLowerCase()
  if (s === 'freigegeben' || s === 'genehmigt') return 'Bestätigt'
  if (s === 'abgelehnt') return 'Abgelehnt'
  if (s === 'in_pruefung' || s === 'eingereicht' || s === 'hochgeladen') return 'In Prüfung'
  return 'In Prüfung'
}

export function partnerDokumentZaehltAlsVorhanden(doc: PartnerDokument | undefined): boolean {
  if (!doc?.datei_url?.trim()) return false
  return partnerDokumentIstFreigegeben(doc.status)
}
