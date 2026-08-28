import type { AngebotHandwerkerRow, OrgFreigabeStatus } from '@/lib/types'
import { hasHwEinreichung } from '@/lib/partner/handwerker-einreichung'
import {
  orgFreigabeBlockiertPartner,
  orgFreigabeKundenversandBlockMessage,
  orgFreigabePartnerBlockMessage,
} from '@/lib/org/org-portal-helpers'
import { ohnePartnerLvZuweisungen } from '@/lib/angebote/partner-einholung'

export type OrgFreigabeKundenversandOpts = {
  orgStatus?: OrgFreigabeStatus | null
  hvMeldungStatus?: string | null
  freigabeBypassGrund?: string | null
  funnelDirektauftrag?: boolean
}

export function orgFreigabeKundenversandOptsFromLead(
  lead:
    | {
        org_freigabe_status?: string | null
        hv_meldung_status?: string | null
        freigabe_bypass_grund?: string | null
        funnel_daten?: unknown
      }
    | null
    | undefined
): OrgFreigabeKundenversandOpts | undefined {
  if (!lead) return undefined
  const funnel =
    lead.funnel_daten &&
    typeof lead.funnel_daten === 'object' &&
    !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as { direktauftrag?: unknown })
      : null
  return {
    orgStatus: lead.org_freigabe_status as OrgFreigabeStatus | undefined,
    hvMeldungStatus: lead.hv_meldung_status,
    freigabeBypassGrund: lead.freigabe_bypass_grund,
    funnelDirektauftrag: funnel?.direktauftrag === true,
  }
}

/** HV-Freigabe fehlt — außer Akut / Notmaßnahme. */
export function orgFreigabeBlockiertKundenversand(
  opts: OrgFreigabeKundenversandOpts | null | undefined
): boolean {
  if (!opts) return false
  const bypass = (opts.freigabeBypassGrund ?? '').trim().toLowerCase()
  if (bypass === 'akut' || opts.funnelDirektauftrag === true) return false
  return orgFreigabeBlockiertPartner(opts.orgStatus, opts.hvMeldungStatus)
}

export function hatAngebotHandwerker(rows: AngebotHandwerkerRow[] | null | undefined): boolean {
  return ohnePartnerLvZuweisungen(rows).length > 0
}

export function handwerkerZuweisungAktiv(z: AngebotHandwerkerRow): boolean {
  const s = (z.status ?? 'ausstehend').toLowerCase()
  return s !== 'abgelehnt' && s !== 'ersetzt'
}

export function aktiveHandwerkerZuweisungen(rows: AngebotHandwerkerRow[]): AngebotHandwerkerRow[] {
  return rows.filter(handwerkerZuweisungAktiv)
}

export function handwerkerAnfrageErledigt(rows: AngebotHandwerkerRow[]): boolean {
  const aktiv = aktiveHandwerkerZuweisungen(rows)
  if (!aktiv.length) return false
  return aktiv.every((r) => {
    const s = (r.status ?? 'ausstehend').toLowerCase()
    return s === 'angefragt' || s === 'akzeptiert' || s === 'zugewiesen'
  })
}

export function handwerkerEinreichungErledigt(rows: AngebotHandwerkerRow[]): boolean {
  const aktiv = aktiveHandwerkerZuweisungen(rows)
  if (!aktiv.length) return false
  return aktiv.every((r) => hasHwEinreichung(r))
}

export function handwerkerFreigabeErledigt(rows: AngebotHandwerkerRow[]): boolean {
  const aktiv = aktiveHandwerkerZuweisungen(rows)
  if (!aktiv.length) return false
  return aktiv.every((r) => (r.hw_status ?? '').toLowerCase() === 'uebernommen')
}

/** Partner-Angebot/Rechnung eingeholt und bestätigt — Voraussetzung für Kundenversand. */
export function handwerkerPipelineErledigt(rows: AngebotHandwerkerRow[] | null | undefined): boolean {
  const list = rows ?? []
  if (!list.length) return false
  return handwerkerFreigabeErledigt(list)
}

function zuweisungenMitLv(rows: AngebotHandwerkerRow[] | null | undefined): AngebotHandwerkerRow[] {
  return (rows ?? []).filter((r) => r.ohne_lv !== true)
}

export function darfAngebotAnKundeSenden(
  rows: AngebotHandwerkerRow[] | null | undefined,
  angebotStatus?: string | null,
  orgFreigabe?: OrgFreigabeKundenversandOpts
): boolean {
  if (orgFreigabeBlockiertKundenversand(orgFreigabe)) return false
  const list = zuweisungenMitLv(rows)
  if (!list.length) return true
  if (angebotStatus === 'handwerker_akzeptiert') return true
  return handwerkerFreigabeErledigt(list)
}

export function orgFreigabeBlockiertHandwerker(
  orgStatus: OrgFreigabeStatus | null | undefined,
  hvMeldungStatus?: string | null
): boolean {
  return orgFreigabeBlockiertPartner(orgStatus, hvMeldungStatus)
}

export function orgFreigabeBlockierHinweis(
  orgStatus: OrgFreigabeStatus | null | undefined,
  hvMeldungStatus?: string | null
): string | null {
  return orgFreigabePartnerBlockMessage(orgStatus, hvMeldungStatus)
}

export function handwerkerSendenBlockierHinweis(
  rows: AngebotHandwerkerRow[] | null | undefined,
  orgStatus?: OrgFreigabeStatus | null,
  hvMeldungStatus?: string | null,
  orgFreigabe?: OrgFreigabeKundenversandOpts
): string {
  const orgOpts =
    orgFreigabe ??
    (orgStatus != null || hvMeldungStatus != null
      ? { orgStatus, hvMeldungStatus }
      : undefined)
  const list = zuweisungenMitLv(rows)
  if (orgFreigabeBlockiertPartner(orgOpts?.orgStatus, orgOpts?.hvMeldungStatus)) {
    if (
      !list.length &&
      orgFreigabeBlockiertKundenversand(orgOpts)
    ) {
      const kundenMsg = orgFreigabeKundenversandBlockMessage(
        orgOpts?.orgStatus,
        orgOpts?.hvMeldungStatus
      )
      if (kundenMsg) return kundenMsg
    }
    const partnerMsg = orgFreigabePartnerBlockMessage(
      orgOpts?.orgStatus,
      orgOpts?.hvMeldungStatus
    )
    if (partnerMsg) return partnerMsg
  }
  if (!list.length) {
    return 'Bitte zuerst Handwerker zuweisen und Partner-Angebot einholen.'
  }
  if (!handwerkerAnfrageErledigt(list)) {
    return 'Bitte zuerst alle Handwerker anfragen (Partner-Mail oder Link).'
  }
  if (!handwerkerEinreichungErledigt(list)) {
    return 'Es fehlt noch mindestens ein Handwerker-Angebot oder eine Rechnung.'
  }
  if (!handwerkerFreigabeErledigt(list)) {
    return 'Bitte Partner-Einreichung im Angebot mit „Bestätigen & Partner informieren“ abschließen.'
  }
  return 'Handwerker-Schritte noch offen.'
}
