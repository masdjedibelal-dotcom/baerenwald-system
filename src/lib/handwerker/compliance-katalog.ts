import type { ComplianceDokumentTyp,Gewerk } from '@/lib/types'
import {
filterPartnerComplianceTypen,type ComplianceEbene
} from '@/lib/handwerker/compliance-partner-profile'

export type { ComplianceEbene }
export {
  COMPLIANCE_EBENE_LABELS,
  filterPartnerComplianceTypen,
  filterLeistungComplianceTypen,
} from '@/lib/handwerker/compliance-partner-profile'

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
