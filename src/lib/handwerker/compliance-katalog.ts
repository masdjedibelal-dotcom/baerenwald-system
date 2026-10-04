import type { ComplianceDokumentTyp,Gewerk,PartnerDokument } from '@/lib/types'
import { partnerDokumentIstFreigegeben } from '@/lib/handwerker/partner-dokument-status'
import {
  filterPartnerComplianceTypen,type ComplianceEbene
} from '@/lib/handwerker/compliance-partner-profile'

export type { ComplianceEbene }
export {
  COMPLIANCE_EBENE_LABELS,
  filterPartnerComplianceTypen,
  filterLeistungComplianceTypen,
} from '@/lib/handwerker/compliance-partner-profile'

export type ComplianceDokumentStatus =
  | 'fehlend'
  | 'ok'
  | 'warnung'
  | 'abgelaufen'
  | 'in_pruefung'
  | 'abgelehnt'

/**
 * Freie Partner-/CRM-Uploads (kein Katalog-Typ).
 * Portal erwartet denselben Slug (`eigenes_dokument`); `individuell` bleibt Alias für Altbestand.
 */
export const INDIVIDUELL_TYP_SLUG = 'eigenes_dokument'
export const INDIVIDUELL_TYP_SLUG_LEGACY = 'individuell'

export function istEigeneUnterlageTyp(slug: string | null | undefined): boolean {
  const s = (slug ?? '').trim()
  return s === INDIVIDUELL_TYP_SLUG || s === INDIVIDUELL_TYP_SLUG_LEGACY
}

/** Stamm: Allgemein + Meister (Partner-Tab). */
export function filterStandardComplianceTypen(
  typen: ComplianceDokumentTyp[],
  handwerkerGewerke?: string[] | null,
  alleGewerke: Gewerk[] = []
): ComplianceDokumentTyp[] {
  const allg = filterPartnerComplianceTypen(typen, 'allgemein', handwerkerGewerke, alleGewerke)
  const meister = filterPartnerComplianceTypen(typen, 'meister', handwerkerGewerke, alleGewerke)
  return [...allg, ...meister]
}

export function dokumenteFuerProjekt(
  dokumente: PartnerDokument[],
  handwerkerId: string,
  auftragId: string
): PartnerDokument[] {
  return dokumente.filter(
    (d) => d.handwerker_id === handwerkerId && d.auftrag_id === auftragId && d.datei_url?.trim()
  )
}

export function standardDokumente(dokumente: PartnerDokument[]): PartnerDokument[] {
  return dokumente.filter((d) => !d.auftrag_id && d.datei_url?.trim())
}

export function dokumentFuerTyp(
  dokumente: PartnerDokument[],
  typSlug: string,
  opts?: { handwerkerId?: string; auftragId?: string | null }
): PartnerDokument | undefined {
  return dokumente.find((d) => {
    if (d.typ !== typSlug || !d.datei_url?.trim()) return false
    if (String(d.status ?? '').toLowerCase() === 'geloescht' || d.geloescht_am) return false
    if (opts?.handwerkerId && d.handwerker_id !== opts.handwerkerId) return false
    if (opts?.auftragId !== undefined) {
      const want = opts.auftragId
      if (want == null) return !d.auftrag_id
      return d.auftrag_id === want
    }
    return true
  })
}

export function complianceDokumentStatus(
  typ: ComplianceDokumentTyp,
  doc: PartnerDokument | undefined,
  now = new Date()
): ComplianceDokumentStatus {
  void typ
  if (!doc?.datei_url?.trim()) return 'fehlend'
  if (String(doc.status ?? '').toLowerCase() === 'geloescht' || doc.geloescht_am) {
    return 'fehlend'
  }
  const workflow = (doc.status ?? '').toLowerCase()
  if (workflow === 'abgelehnt') return 'abgelehnt'
  if (!partnerDokumentIstFreigegeben(doc.status)) {
    // Hochgeladen / eingereicht — nicht mit Ablauf-Warnung vermischen
    return 'in_pruefung'
  }
  if (!doc.gueltig_bis) return 'ok'
  const bis = new Date(doc.gueltig_bis)
  if (Number.isNaN(bis.getTime())) return 'ok'
  if (bis < now) return 'abgelaufen'
  const warn = new Date(now)
  warn.setDate(warn.getDate() + 30)
  if (bis <= warn) return 'warnung'
  return 'ok'
}
