import type { ComplianceDokumentTyp, Gewerk, PartnerDokument } from '@/lib/types'
import { partnerDokumentIstFreigegeben } from '@/lib/handwerker/partner-dokument-status'
import {
  COMPLIANCE_EBENE_LABELS,
  filterLeistungComplianceTypen,
  filterPartnerComplianceTypen,
  istPflichtFuerPartner,
  istPflichtFuerProjekt,
  normalizeComplianceEbene,
  type ComplianceEbene,
} from '@/lib/handwerker/compliance-partner-profile'

export type { ComplianceEbene }
export {
  COMPLIANCE_EBENE_LABELS,
  filterPartnerComplianceTypen,
  filterLeistungComplianceTypen,
} from '@/lib/handwerker/compliance-partner-profile'

export type ComplianceScope = 'standard' | 'stamm' | 'bauprojekt' | 'gewerk'

/** @deprecated Nutze COMPLIANCE_EBENE_LABELS */
export const COMPLIANCE_SCOPE_LABELS: Record<ComplianceScope, string> = {
  standard: 'Allgemeine Partnerunterlagen',
  stamm: 'Allgemeine Partnerunterlagen',
  bauprojekt: 'Leistungsvertrag & Auftrag',
  gewerk: 'Gewerkspezifisch',
}

export type ComplianceDokumentStatus = 'fehlend' | 'ok' | 'warnung' | 'abgelaufen'

export const INDIVIDUELL_TYP_SLUG = 'individuell'

export function isStandardScope(typ: ComplianceDokumentTyp): boolean {
  const ebene = normalizeComplianceEbene(typ)
  return ebene === 'allgemein' || ebene === 'meister'
}

export function isProjektScope(typ: ComplianceDokumentTyp): boolean {
  return normalizeComplianceEbene(typ) === 'leistung'
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

/** Projekt-Checkliste (Leistungsebene). */
export function filterProjektComplianceTypen(
  typen: ComplianceDokumentTyp[],
  projektGewerkSlugs: string[] = [],
  handwerkerGewerke?: string[] | null,
  alleGewerke: Gewerk[] = [],
  istBauprojekt?: boolean | null
): ComplianceDokumentTyp[] {
  return filterLeistungComplianceTypen(
    typen,
    projektGewerkSlugs,
    handwerkerGewerke,
    alleGewerke,
    istBauprojekt
  ).filter((t) => !t.mehrfach_erlaubt || t.slug === INDIVIDUELL_TYP_SLUG)
}

export function individuellTyp(typen: ComplianceDokumentTyp[]): ComplianceDokumentTyp | undefined {
  return typen.find((t) => t.slug === INDIVIDUELL_TYP_SLUG && t.aktiv !== false)
}

export function gruppeComplianceTypen(
  typen: ComplianceDokumentTyp[]
): { kategorie: string; typen: ComplianceDokumentTyp[] }[] {
  const map = new Map<string, ComplianceDokumentTyp[]>()
  for (const t of typen) {
    const ebene = normalizeComplianceEbene(t)
    const key = t.kategorie?.trim() || COMPLIANCE_EBENE_LABELS[ebene] || 'Weitere'
    const list = map.get(key) ?? []
    list.push(t)
    map.set(key, list)
  }
  return Array.from(map.entries()).map(([kategorie, items]) => ({ kategorie, typen: items }))
}

export function gruppeNachEbene(
  typen: ComplianceDokumentTyp[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[]
): { ebene: ComplianceEbene; label: string; typen: ComplianceDokumentTyp[] }[] {
  const ebenen: ComplianceEbene[] = ['allgemein', 'meister', 'leistung']
  return ebenen
    .map((ebene) => {
      const items =
        ebene === 'leistung'
          ? typen.filter((t) => normalizeComplianceEbene(t) === 'leistung')
          : filterPartnerComplianceTypen(typen, ebene, handwerkerGewerke, alleGewerke)
      return { ebene, label: COMPLIANCE_EBENE_LABELS[ebene], typen: items }
    })
    .filter((g) => g.typen.length > 0)
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
    if (opts?.handwerkerId && d.handwerker_id !== opts.handwerkerId) return false
    if (opts?.auftragId !== undefined) {
      const want = opts.auftragId
      if (want == null) return !d.auftrag_id
      return d.auftrag_id === want
    }
    return true
  })
}

export function dokumenteFuerTyp(
  dokumente: PartnerDokument[],
  typSlug: string,
  handwerkerId: string,
  auftragId: string
): PartnerDokument[] {
  return dokumente.filter(
    (d) =>
      d.typ === typSlug &&
      d.handwerker_id === handwerkerId &&
      d.auftrag_id === auftragId &&
      d.datei_url?.trim()
  )
}

export function complianceDokumentStatus(
  typ: ComplianceDokumentTyp,
  doc: PartnerDokument | undefined,
  now = new Date()
): ComplianceDokumentStatus {
  if (!doc?.datei_url?.trim()) return 'fehlend'
  if (!partnerDokumentIstFreigegeben(doc.status)) {
    if ((doc.status ?? '').toLowerCase() === 'abgelehnt') return 'fehlend'
    return 'warnung'
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

export function istPflichtTyp(
  typ: ComplianceDokumentTyp,
  opts?: {
    projektKontext?: boolean
    handwerkerGewerke?: string[] | null
    projektGewerkSlugs?: string[]
    alleGewerke?: Gewerk[]
    istBauprojekt?: boolean | null
  }
): boolean {
  const gewerke = opts?.alleGewerke ?? []
  if (opts?.projektKontext) {
    return istPflichtFuerProjekt(
      typ,
      opts.projektGewerkSlugs ?? [],
      opts.handwerkerGewerke,
      gewerke,
      opts.istBauprojekt
    )
  }
  return istPflichtFuerPartner(typ, opts?.handwerkerGewerke, gewerke)
}

export function projektChecklisteFortschritt(
  typen: ComplianceDokumentTyp[],
  dokumente: PartnerDokument[],
  handwerkerId: string,
  auftragId: string,
  projektGewerkSlugs: string[] = [],
  handwerkerGewerke?: string[] | null,
  alleGewerke: Gewerk[] = [],
  istBauprojekt?: boolean | null
): { erfuellt: number; pflicht: number; gesamt: number } {
  const projektTypen = filterProjektComplianceTypen(
    typen,
    projektGewerkSlugs,
    handwerkerGewerke,
    alleGewerke,
    istBauprojekt
  )
  const pflichtTypen = projektTypen.filter((t) =>
    istPflichtFuerProjekt(t, projektGewerkSlugs, handwerkerGewerke, alleGewerke, istBauprojekt)
  )
  const docs = dokumenteFuerProjekt(dokumente, handwerkerId, auftragId)
  const erfuelltPflicht = pflichtTypen.filter(
    (t) => complianceDokumentStatus(t, dokumentFuerTyp(docs, t.slug)) !== 'fehlend'
  ).length
  const erfuelltGesamt = projektTypen.filter(
    (t) => complianceDokumentStatus(t, dokumentFuerTyp(docs, t.slug)) !== 'fehlend'
  ).length
  return {
    erfuellt: erfuelltPflicht,
    pflicht: pflichtTypen.length,
    gesamt: erfuelltGesamt,
  }
}
