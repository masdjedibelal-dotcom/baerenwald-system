import { istFachbetriebGewerk } from '@/lib/gewerke-ausfuehrung'
import type { ComplianceDokumentTyp, Gewerk } from '@/lib/types'

export type ComplianceEbene = 'allgemein' | 'meister' | 'leistung'

export const COMPLIANCE_EBENE_LABELS: Record<ComplianceEbene, string> = {
  allgemein: 'Allgemeine Partnerunterlagen',
  meister: 'Meister & Fachbetrieb',
  leistung: 'Leistungsvertrag & Auftrag',
}

export function normalizeComplianceEbene(typ: ComplianceDokumentTyp): ComplianceEbene {
  const ebene = typ.compliance_ebene
  if (ebene === 'meister' || ebene === 'leistung') return ebene
  if (typ.scope === 'bauprojekt' || typ.scope === 'gewerk') return 'leistung'
  return 'allgemein'
}

export function partnerGewerkSlugs(handwerkerGewerke: string[] | null | undefined): string[] {
  return (handwerkerGewerke ?? []).map((s) => s.trim()).filter(Boolean)
}

export function gewerkSlugsAusPositionen(
  positionen: Array<{ gewerk_slug?: string | null }> | null | undefined
): string[] {
  const set = new Set<string>()
  for (const p of positionen ?? []) {
    const s = p.gewerk_slug?.trim()
    if (s) set.add(s)
  }
  return Array.from(set)
}

/** Mindestens ein Gewerk mit Bau-Charakter (SoKA, §48b …). */
export function partnerLeistetBauleistung(
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[]
): boolean {
  const slugs = new Set(partnerGewerkSlugs(handwerkerGewerke))
  if (!slugs.size) return false
  return alleGewerke.some((g) => slugs.has(g.slug) && g.ist_bauleistung === true)
}

/** Meister-/Fachbetrieb-Gewerke (aus Einstellungen Gewerke → Ausführung). */
export function partnerHatMeisterGewerke(
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[]
): boolean {
  const slugs = partnerGewerkSlugs(handwerkerGewerke)
  return slugs.some((slug) => {
    const g = alleGewerke.find((x) => x.slug === slug)
    return istFachbetriebGewerk(g)
  })
}

export function typPasstZuGewerken(
  typ: ComplianceDokumentTyp,
  gewerkSlugs: string[]
): boolean {
  const filter = typ.gewerk_slugs?.filter(Boolean) ?? []
  if (!filter.length) return true
  if (!gewerkSlugs.length) return false
  const set = new Set(gewerkSlugs)
  return filter.some((s) => set.has(s))
}

export function typGiltFuerPartner(
  typ: ComplianceDokumentTyp,
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[]
): boolean {
  if (typ.aktiv === false) return false
  const ebene = normalizeComplianceEbene(typ)
  const slugs = partnerGewerkSlugs(handwerkerGewerke)
  const hatBau = partnerLeistetBauleistung(slugs, alleGewerke)
  const hatMeister = partnerHatMeisterGewerke(slugs, alleGewerke)

  if (ebene === 'meister' && !hatMeister) return false
  if (typ.nur_bei_bauleistung && !hatBau) return false
  if (!typPasstZuGewerken(typ, slugs)) return false
  return true
}

export function typGiltFuerProjekt(
  typ: ComplianceDokumentTyp,
  projektGewerkSlugs: string[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[],
  istBauprojekt?: boolean | null
): boolean {
  if (typ.aktiv === false) return false
  if (normalizeComplianceEbene(typ) !== 'leistung') return false
  if (istBauprojekt === false && typ.nur_bei_bauleistung) return false

  const relevantSlugs = projektGewerkSlugs

  let hatBau: boolean
  if (istBauprojekt === true) {
    hatBau = true
  } else if (istBauprojekt === false) {
    hatBau = false
  } else {
    hatBau = relevantSlugs.some((s) => {
      const g = alleGewerke.find((x) => x.slug === s)
      return g?.ist_bauleistung === true
    })
  }

  if (typ.nur_bei_bauleistung && !hatBau) return false
  return typPasstZuGewerken(typ, relevantSlugs)
}

export function istPflichtFuerPartner(
  typ: ComplianceDokumentTyp,
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[]
): boolean {
  if (!typGiltFuerPartner(typ, handwerkerGewerke, alleGewerke)) return false
  return typ.pflicht_fuer_fachbetriebe === true
}

export function istPflichtFuerProjekt(
  typ: ComplianceDokumentTyp,
  projektGewerkSlugs: string[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[],
  istBauprojekt?: boolean | null
): boolean {
  if (!typGiltFuerProjekt(typ, projektGewerkSlugs, handwerkerGewerke, alleGewerke, istBauprojekt)) {
    return false
  }
  return typ.pflicht_bauprojekt === true
}

export function filterPartnerComplianceTypen(
  typen: ComplianceDokumentTyp[],
  ebene: ComplianceEbene,
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[]
): ComplianceDokumentTyp[] {
  return typen
    .filter(
      (t) =>
        normalizeComplianceEbene(t) === ebene &&
        typGiltFuerPartner(t, handwerkerGewerke, alleGewerke) &&
        !t.mehrfach_erlaubt
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export function filterLeistungComplianceTypen(
  typen: ComplianceDokumentTyp[],
  projektGewerkSlugs: string[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: Gewerk[],
  istBauprojekt?: boolean | null
): ComplianceDokumentTyp[] {
  return typen
    .filter(
      (t) =>
        normalizeComplianceEbene(t) === 'leistung' &&
        typGiltFuerProjekt(t, projektGewerkSlugs, handwerkerGewerke, alleGewerke, istBauprojekt)
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

/** Hinweis für Portal: Ablauf / Neu-Upload. */
export function complianceAblaufHinweis(
  status: 'fehlend' | 'ok' | 'warnung' | 'abgelaufen',
  gueltigBis: string | null | undefined
): string | null {
  if (status === 'fehlend') return 'Bitte hochladen'
  if (status === 'abgelaufen') return 'Abgelaufen — bitte neu hochladen'
  if (status === 'warnung' && gueltigBis) {
    try {
      const d = new Date(gueltigBis)
      return `Läuft ab am ${d.toLocaleDateString('de-DE')} — bitte rechtzeitig neu hochladen`
    } catch {
      return 'Läuft bald ab — bitte neu hochladen'
    }
  }
  if (status === 'warnung') return 'In Prüfung oder läuft bald ab'
  return null
}
