import 'server-only'

import {
  complianceAblaufHinweis,
  filterLeistungComplianceTypen,
  filterPartnerComplianceTypen,
  istPflichtFuerPartner,
  istPflichtFuerProjekt,
  partnerHatMeisterGewerke,
  partnerLeistetBauleistung,
} from '@/lib/handwerker/compliance-partner-profile'
import { complianceDokumentStatus, dokumentFuerTyp, dokumenteFuerProjekt } from '@/lib/handwerker/compliance-katalog'
import { normalizeComplianceEbene } from '@/lib/handwerker/compliance-partner-profile'
import { partnerDokumentStatusLabel, partnerDokumentIstFreigegeben } from '@/lib/handwerker/partner-dokument-status'
import { RAHMENVERTRAG_TYP_SLUG, rahmenvertragErfuellt } from '@/lib/handwerker/compliance-vertrag-status'
import type { ComplianceDokumentTyp, Gewerk, PartnerDokument } from '@/lib/types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'

export type PortalComplianceDokumentZeile = {
  slug: string
  bezeichnung: string
  beschreibung: string | null
  ebene: 'allgemein' | 'meister' | 'leistung'
  pflicht: boolean
  status: 'fehlend' | 'ok' | 'warnung' | 'abgelaufen'
  status_label: string
  gueltig_bis: string | null
  ablauf_hinweis: string | null
  dokument_id: string | null
  workflow_status: string | null
  vertrag_referenz: string | null
  erneuerung_monate: number | null
}

export type PortalComplianceStamm = {
  allgemein: PortalComplianceDokumentZeile[]
  meister: PortalComplianceDokumentZeile[]
  profil: {
    leistet_bauleistung: boolean
    hat_meister_gewerke: boolean
  }
}

export type PortalComplianceAuftrag = {
  auftrag_id: string
  titel: string
  projektvertrag_ok: boolean
  leistung: PortalComplianceDokumentZeile[]
  fortschritt: { erfuellt: number; pflicht: number }
}

function zeileFuerTyp(
  typ: ComplianceDokumentTyp,
  doc: PartnerDokument | undefined,
  pflicht: boolean,
  rahmenVertrag?: HandwerkerVertragRow | null,
  stammDocs?: PartnerDokument[]
): PortalComplianceDokumentZeile {
  const rvOk =
    typ.slug === RAHMENVERTRAG_TYP_SLUG &&
    stammDocs &&
    rahmenvertragErfuellt(stammDocs, rahmenVertrag ?? null)
  const status = rvOk ? 'ok' : complianceDokumentStatus(typ, doc)
  const workflow = doc?.status ?? null

  let statusLabel = 'Fehlt'
  if (rvOk) statusLabel = 'Rahmenvertrag im CRM'
  else if (workflow && partnerDokumentIstFreigegeben(workflow)) statusLabel = 'Bestätigt'
  else if (workflow && workflow !== 'freigegeben' && workflow !== 'genehmigt') {
    statusLabel = partnerDokumentStatusLabel(workflow)
  } else if (status === 'ok') statusLabel = 'Vorhanden'
  else if (status === 'warnung') statusLabel = 'Läuft bald ab / In Prüfung'
  else if (status === 'abgelaufen') statusLabel = 'Abgelaufen'

  return {
    slug: typ.slug,
    bezeichnung: typ.bezeichnung,
    beschreibung: typ.beschreibung,
    ebene: normalizeComplianceEbene(typ),
    pflicht,
    status,
    status_label: statusLabel,
    gueltig_bis: doc?.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : null,
    ablauf_hinweis: complianceAblaufHinweis(status, doc?.gueltig_bis),
    dokument_id: doc?.id ?? null,
    workflow_status: workflow,
    vertrag_referenz: typ.vertrag_referenz ?? null,
    erneuerung_monate: typ.erneuerung_monate,
  }
}

export function buildPortalComplianceStamm(opts: {
  typen: ComplianceDokumentTyp[]
  dokumente: PartnerDokument[]
  handwerkerGewerke: string[] | null | undefined
  alleGewerke: Gewerk[]
  rahmenVertrag?: HandwerkerVertragRow | null
}): PortalComplianceStamm {
  const stammDocs = opts.dokumente.filter((d) => !d.auftrag_id)
  const hwGewerke = opts.handwerkerGewerke

  const mapEbene = (ebene: 'allgemein' | 'meister') =>
    filterPartnerComplianceTypen(opts.typen, ebene, hwGewerke, opts.alleGewerke).map((typ) =>
      zeileFuerTyp(
        typ,
        dokumentFuerTyp(stammDocs, typ.slug),
        istPflichtFuerPartner(typ, hwGewerke, opts.alleGewerke),
        opts.rahmenVertrag,
        stammDocs
      )
    )

  return {
    allgemein: mapEbene('allgemein'),
    meister: mapEbene('meister'),
    profil: {
      leistet_bauleistung: partnerLeistetBauleistung(hwGewerke, opts.alleGewerke),
      hat_meister_gewerke: partnerHatMeisterGewerke(hwGewerke, opts.alleGewerke),
    },
  }
}

export function buildPortalComplianceAuftrag(opts: {
  auftragId: string
  titel: string
  projektGewerkSlugs: string[]
  typen: ComplianceDokumentTyp[]
  dokumente: PartnerDokument[]
  handwerkerId: string
  handwerkerGewerke: string[] | null | undefined
  alleGewerke: Gewerk[]
  projektvertragOk: boolean
  /** Vom CRM gewählt; null = alle Leistungs-Typen mit Auto-Pflicht */
  compliancePflichtSlugs?: string[] | null
  istBauprojekt?: boolean | null
}): PortalComplianceAuftrag {
  const projektDocs = dokumenteFuerProjekt(opts.dokumente, opts.handwerkerId, opts.auftragId)
  let leistungTypen = filterLeistungComplianceTypen(
    opts.typen,
    opts.projektGewerkSlugs,
    opts.handwerkerGewerke,
    opts.alleGewerke,
    opts.istBauprojekt
  )

  const crmSlugs = opts.compliancePflichtSlugs
  if (crmSlugs != null) {
    const slugSet = new Set(crmSlugs)
    leistungTypen = leistungTypen.filter((t) => slugSet.has(t.slug))
  }

  const leistung = leistungTypen.map((typ) =>
    zeileFuerTyp(
      typ,
      dokumentFuerTyp(projektDocs, typ.slug),
      crmSlugs != null
        ? crmSlugs.includes(typ.slug)
        : istPflichtFuerProjekt(
            typ,
            opts.projektGewerkSlugs,
            opts.handwerkerGewerke,
            opts.alleGewerke,
            opts.istBauprojekt
          )
    )
  )

  const pflicht = leistung.filter((z) => z.pflicht).length
  const erfuellt = leistung.filter((z) => z.pflicht && z.status !== 'fehlend').length

  return {
    auftrag_id: opts.auftragId,
    titel: opts.titel,
    projektvertrag_ok: opts.projektvertragOk,
    leistung,
    fortschritt: { erfuellt, pflicht },
  }
}
