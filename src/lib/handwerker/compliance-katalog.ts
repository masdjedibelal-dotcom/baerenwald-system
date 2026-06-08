import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { partnerDokumentIstFreigegeben } from '@/lib/handwerker/partner-dokument-status'

export type ComplianceScope = 'standard' | 'stamm' | 'bauprojekt' | 'gewerk'

export const COMPLIANCE_SCOPE_LABELS: Record<ComplianceScope, string> = {
  standard: 'Allgemeine Partnerunterlagen',
  stamm: 'Allgemeine Partnerunterlagen',
  bauprojekt: 'Bauprojekt & Vertrag',
  gewerk: 'Gewerkspezifisch',
}

export type ComplianceDokumentStatus = 'fehlend' | 'ok' | 'warnung' | 'abgelaufen'

export const INDIVIDUELL_TYP_SLUG = 'individuell'

export function isStandardScope(typ: ComplianceDokumentTyp): boolean {
  const s = typ.scope ?? 'stamm'
  return s === 'standard' || s === 'stamm'
}

export function isProjektScope(typ: ComplianceDokumentTyp): boolean {
  return !isStandardScope(typ)
}

/** Nur allgemeine Partner-Compliance (Handwerker-Tab). */
export function filterStandardComplianceTypen(typen: ComplianceDokumentTyp[]): ComplianceDokumentTyp[] {
  return typen
    .filter((t) => t.aktiv !== false && isStandardScope(t))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

/** Projekt-Checkliste: alle nicht-Standard-Typen, ohne Gewerk-Filter. */
export function filterProjektComplianceTypen(typen: ComplianceDokumentTyp[]): ComplianceDokumentTyp[] {
  return typen
    .filter((t) => t.aktiv !== false && isProjektScope(t) && !t.mehrfach_erlaubt)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export function individuellTyp(typen: ComplianceDokumentTyp[]): ComplianceDokumentTyp | undefined {
  return typen.find((t) => t.slug === INDIVIDUELL_TYP_SLUG && t.aktiv !== false)
}

export function gruppeComplianceTypen(
  typen: ComplianceDokumentTyp[]
): { kategorie: string; typen: ComplianceDokumentTyp[] }[] {
  const map = new Map<string, ComplianceDokumentTyp[]>()
  for (const t of typen) {
    const scope = (t.scope ?? 'standard') as ComplianceScope
    const key = t.kategorie?.trim() || COMPLIANCE_SCOPE_LABELS[scope] || 'Weitere'
    const list = map.get(key) ?? []
    list.push(t)
    map.set(key, list)
  }
  return Array.from(map.entries()).map(([kategorie, items]) => ({ kategorie, typen: items }))
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

export function istPflichtTyp(typ: ComplianceDokumentTyp, projektKontext = false): boolean {
  if (typ.pflicht_fuer_fachbetriebe && isStandardScope(typ)) return true
  if (projektKontext && typ.pflicht_bauprojekt) return true
  return false
}

export function projektChecklisteFortschritt(
  typen: ComplianceDokumentTyp[],
  dokumente: PartnerDokument[],
  handwerkerId: string,
  auftragId: string
): { erfuellt: number; pflicht: number; gesamt: number } {
  const projektTypen = filterProjektComplianceTypen(typen)
  const pflichtTypen = projektTypen.filter((t) => t.pflicht_bauprojekt)
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
