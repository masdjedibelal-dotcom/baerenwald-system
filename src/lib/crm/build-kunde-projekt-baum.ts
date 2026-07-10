import { BEREICH_LABELS } from '@/lib/utils'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { betragAnzeige, resolveStatusEinfach } from '@/lib/angebot-einfach'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import type { AngebotStatus, AuftragStatus, LeadListAngebot } from '@/lib/types'

export type KundeProjektAngebotAst = {
  id: string
  label: string
  status: string
  statusEinfach: ReturnType<typeof resolveStatusEinfach>
  betrag: string
  href: string
}

export type KundeProjektAuftragAst = {
  id: string
  titel: string
  status: AuftragStatus
  href: string
}

export type KundeProjektRechnungAst = {
  id: string
  nummer: string
  status: string
  betrag: string
  href: string
}

export type KundeProjektAst = {
  leadId: string
  leadLabel: string
  leadStatus: string
  leadHref: string
  angebote: KundeProjektAngebotAst[]
  auftrag: KundeProjektAuftragAst | null
  rechnungen: KundeProjektRechnungAst[]
}

function leadLabel(row: {
  id: string
  situation?: string | null
  bereiche?: string[] | null
}): string {
  const bereiche = bereicheFuerAnzeige(row.bereiche, row.situation)
  if (bereiche.length) {
    return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  }
  const sit = leadSituationDisplay(row.situation)
  if (sit) return sit
  return `Anfrage ${row.id.slice(0, 8).toUpperCase()}`
}

type KundeLeadAngebot = NonNullable<
  NonNullable<KundeDetailPayload['leads']>[number]['angebote']
>[number]

function leadAngebotRow(a: KundeLeadAngebot | LeadListAngebot): KundeLeadAngebot {
  return a as KundeLeadAngebot
}

export function buildKundeProjektBaeume(kunde: KundeDetailPayload): KundeProjektAst[] {
  const auftraege = kunde.auftraege ?? []
  const rechnungen = kunde.rechnungen ?? []
  const auftragByLead = new Map<string, (typeof auftraege)[0]>()

  for (const a of auftraege) {
    const angRaw = a.angebote
    const angList = Array.isArray(angRaw) ? angRaw : angRaw ? [angRaw] : []
    for (const ang of angList) {
      const lid = (ang as { lead_id?: string | null }).lead_id
      if (lid) auftragByLead.set(lid, a)
    }
  }

  const baeume: KundeProjektAst[] = (kunde.leads ?? []).map((lead) => {
    const angebote = (lead.angebote ?? []).map((raw) => {
      const a = leadAngebotRow(raw)
      return {
      id: a.id,
      label: a.id.slice(0, 8).toUpperCase(),
      status: a.status,
      statusEinfach: resolveStatusEinfach({
        status: a.status as AngebotStatus,
        status_einfach: a.status_einfach ?? null,
        gueltig_bis: a.gueltig_bis ?? null,
      }),
      betrag: betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max),
      href: `/angebote/${a.id}`,
      }
    })

    let auftragRow = auftragByLead.get(lead.id) ?? null
    if (!auftragRow) {
      const aid = (lead.angebote ?? []).map(leadAngebotRow).find((a) => a.auftrag_id)?.auftrag_id
      if (aid) auftragRow = auftraege.find((x) => x.id === aid) ?? null
    }

    const auftrag: KundeProjektAuftragAst | null = auftragRow
      ? {
          id: auftragRow.id,
          titel: auftragRow.titel?.trim() || 'Auftrag',
          status: auftragRow.status as AuftragStatus,
          href: `/auftraege/${auftragRow.id}`,
        }
      : null

    const rechnungenAst: KundeProjektRechnungAst[] = rechnungen
      .filter((r) => (auftrag ? r.auftrag_id === auftrag.id : false))
      .map((r) => ({
        id: r.id,
        nummer: r.rechnungsnummer,
        status: r.status,
        betrag: betragAnzeige(r.brutto, null, null),
        href: `/rechnungen/${r.id}`,
      }))

    return {
      leadId: lead.id,
      leadLabel: leadLabel(lead),
      leadStatus: lead.status,
      leadHref: `/anfragen/${lead.id}`,
      angebote,
      auftrag,
      rechnungen: rechnungenAst,
    }
  })

  return baeume.sort(
    (a, b) =>
      new Date(
        (kunde.leads ?? []).find((l) => l.id === b.leadId)?.created_at ?? 0
      ).getTime() -
      new Date(
        (kunde.leads ?? []).find((l) => l.id === a.leadId)?.created_at ?? 0
      ).getTime()
  )
}
