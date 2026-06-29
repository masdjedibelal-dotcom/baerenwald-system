import {
  complianceDokumentStatus,
  dokumenteFuerProjekt,
  dokumentFuerTyp,
  filterProjektComplianceTypen,
  filterStandardComplianceTypen,
  istPflichtTyp,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, Gewerk, PartnerDokument } from '@/lib/types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { hatOffeneErgaenzungFuerPortal } from '@/lib/vertraege/portal-vertrag-helpers'

export const RAHMENVERTRAG_TYP_SLUG = 'rahmenvertrag'

export function rahmenvertragErfuellt(
  dokumente: PartnerDokument[],
  rahmenVertrag?: HandwerkerVertragRow | null
): boolean {
  const doc = dokumentFuerTyp(dokumente, RAHMENVERTRAG_TYP_SLUG, { auftragId: null })
  if (doc?.datei_url?.trim()) return true
  return Boolean(
    rahmenVertrag?.pdf_url?.trim() &&
      (rahmenVertrag.status === 'pdf_erzeugt' || rahmenVertrag.status === 'unterschrieben')
  )
}

export function projektvertragErfuellt(
  vertraege: HandwerkerVertragRow[],
  auftragId: string,
  handwerkerId: string,
  auftragHandwerkerBestaetigtAm?: string | null,
  opts?: { istBauprojekt?: boolean | null }
): boolean {
  if (opts?.istBauprojekt === false) return true
  if (hatOffeneErgaenzungFuerPortal(vertraege, auftragId, handwerkerId)) return false
  if (auftragHandwerkerBestaetigtAm) return true
  const v = vertraege.find(
    (x) =>
      x.typ === 'projekt' &&
      x.auftrag_id === auftragId &&
      x.handwerker_id === handwerkerId &&
      x.pdf_url?.trim()
  )
  if (!v) return false
  return v.status === 'pdf_erzeugt' || v.status === 'unterschrieben'
}

export function fehlendeStandardCompliance(
  typen: ComplianceDokumentTyp[],
  dokumente: PartnerDokument[],
  rahmenVertrag?: HandwerkerVertragRow | null,
  handwerkerGewerke?: string[] | null,
  alleGewerke: Gewerk[] = []
): ComplianceDokumentTyp[] {
  const standard = filterStandardComplianceTypen(typen, handwerkerGewerke, alleGewerke)
  const standardDocs = dokumente.filter((d) => !d.auftrag_id)
  return standard.filter((t) => {
    if (!istPflichtTyp(t, { handwerkerGewerke, alleGewerke })) return false
    if (t.slug === RAHMENVERTRAG_TYP_SLUG) {
      return !rahmenvertragErfuellt(standardDocs, rahmenVertrag)
    }
    return complianceDokumentStatus(t, dokumentFuerTyp(standardDocs, t.slug)) === 'fehlend'
  })
}

export function fehlendeProjektCompliance(
  typen: ComplianceDokumentTyp[],
  dokumente: PartnerDokument[],
  handwerkerId: string,
  auftragId: string,
  projektGewerkSlugs: string[] = [],
  handwerkerGewerke?: string[] | null,
  alleGewerke: Gewerk[] = []
): ComplianceDokumentTyp[] {
  const projektTypen = filterProjektComplianceTypen(
    typen,
    projektGewerkSlugs,
    handwerkerGewerke,
    alleGewerke
  )
  const docs = dokumenteFuerProjekt(dokumente, handwerkerId, auftragId)
  return projektTypen.filter(
    (t) =>
      istPflichtTyp(t, {
        projektKontext: true,
        projektGewerkSlugs,
        handwerkerGewerke,
        alleGewerke,
      }) && complianceDokumentStatus(t, dokumentFuerTyp(docs, t.slug)) === 'fehlend'
  )
}

export type AuftragHandwerkerComplianceZeile = {
  handwerker_id: string
  handwerker_name: string
  rahmenvertrag_ok: boolean
  projektvertrag_ok: boolean
  fehlende_unterlagen: number
  fehlende_unterlagen_labels: string[]
}

export function auftragHandwerkerComplianceZeilen(opts: {
  auftragId: string
  ist_bauprojekt?: boolean | null
  handwerker: { handwerker_id: string; name: string; projektvertrag_bestaetigt_am?: string | null }[]
  complianceTypen: ComplianceDokumentTyp[]
  partnerDokumente: PartnerDokument[]
  vertraege: HandwerkerVertragRow[]
  rahmenVertraegeByHandwerker: Map<string, HandwerkerVertragRow | null>
}): AuftragHandwerkerComplianceZeile[] {
  const {
    auftragId,
    handwerker,
    complianceTypen,
    partnerDokumente,
    vertraege,
    rahmenVertraegeByHandwerker,
  } = opts

  return handwerker.map((hw) => {
    const hwDocs = partnerDokumente.filter((d) => d.handwerker_id === hw.handwerker_id)
    const rahmen = rahmenVertraegeByHandwerker.get(hw.handwerker_id) ?? null
    const fehlendStd = fehlendeStandardCompliance(complianceTypen, hwDocs, rahmen)
    const fehlendProj = fehlendeProjektCompliance(
      complianceTypen,
      partnerDokumente,
      hw.handwerker_id,
      auftragId
    )
    const fehlendeLabels = [
      ...fehlendStd.map((t) => t.bezeichnung),
      ...fehlendProj.map((t) => t.bezeichnung),
    ]

    return {
      handwerker_id: hw.handwerker_id,
      handwerker_name: hw.name,
      rahmenvertrag_ok: rahmenvertragErfuellt(hwDocs, rahmen),
      projektvertrag_ok: projektvertragErfuellt(
        vertraege,
        auftragId,
        hw.handwerker_id,
        hw.projektvertrag_bestaetigt_am,
        { istBauprojekt: opts.ist_bauprojekt }
      ),
      fehlende_unterlagen: fehlendeLabels.length,
      fehlende_unterlagen_labels: fehlendeLabels,
    }
  })
}

export function complianceStatusLabel(status: ComplianceDokumentStatus): string {
  if (status === 'ok') return 'Vorhanden'
  if (status === 'warnung') return 'Läuft ab'
  if (status === 'abgelaufen') return 'Abgelaufen'
  return 'Fehlt'
}
