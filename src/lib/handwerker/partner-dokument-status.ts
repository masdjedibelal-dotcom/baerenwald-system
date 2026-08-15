import type { PartnerDokument } from '@/lib/types'

export type PartnerDokumentStatus =
  | 'freigegeben'
  | 'genehmigt'
  | 'hochgeladen'
  | 'in_pruefung'
  | 'eingereicht'
  | 'abgelehnt'
  | 'geloescht'

export function partnerDokumentIstFreigegeben(status: string | null | undefined): boolean {
  const s = (status ?? 'freigegeben').toLowerCase()
  return s === 'freigegeben' || s === 'genehmigt'
}

export function partnerDokumentIstGeloescht(
  doc: Pick<PartnerDokument, 'status' | 'geloescht_am'> | null | undefined
): boolean {
  if (!doc) return false
  if (doc.geloescht_am) return true
  return String(doc.status ?? '').toLowerCase() === 'geloescht'
}

/** Offen = Partner hat eingereicht, CRM hat noch nicht entschieden. */
export function partnerDokumentIstOffen(status: string | null | undefined): boolean {
  const s = (status ?? '').toLowerCase()
  return s === 'in_pruefung' || s === 'eingereicht' || s === 'hochgeladen'
}

export function partnerDokumentStatusLabel(status: string | null | undefined): string {
  const s = (status ?? 'freigegeben').toLowerCase()
  if (s === 'geloescht') return 'Gelöscht'
  if (s === 'freigegeben' || s === 'genehmigt') return 'Angenommen'
  if (s === 'abgelehnt') return 'Abgelehnt'
  if (s === 'in_pruefung' || s === 'eingereicht' || s === 'hochgeladen') return 'Offen'
  return 'Offen'
}

export function partnerDokumentZaehltAlsVorhanden(doc: PartnerDokument | undefined): boolean {
  if (!doc?.datei_url?.trim()) return false
  if (partnerDokumentIstGeloescht(doc)) return false
  return partnerDokumentIstFreigegeben(doc.status)
}
