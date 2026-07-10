import type { AngebotHandwerkerRow, OrgFreigabeStatus } from '@/lib/types'
import { hasHwEinreichung } from '@/lib/partner/handwerker-einreichung'
import { orgFreigabeBlockiertPartner } from '@/lib/org/org-portal-helpers'

export function hatAngebotHandwerker(rows: AngebotHandwerkerRow[] | null | undefined): boolean {
  return (rows ?? []).length > 0
}

export function handwerkerZuweisungAktiv(z: AngebotHandwerkerRow): boolean {
  return (z.status ?? 'ausstehend').toLowerCase() !== 'abgelehnt'
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

export function darfAngebotAnKundeSenden(
  rows: AngebotHandwerkerRow[] | null | undefined,
  angebotStatus?: string | null
): boolean {
  const list = rows ?? []
  if (!list.length) return true
  if (angebotStatus === 'handwerker_akzeptiert') return true
  return handwerkerFreigabeErledigt(list)
}

export function orgFreigabeBlockiertHandwerker(
  orgStatus: OrgFreigabeStatus | null | undefined
): boolean {
  return orgFreigabeBlockiertPartner(orgStatus)
}

export function orgFreigabeBlockierHinweis(
  orgStatus: OrgFreigabeStatus | null | undefined
): string | null {
  if (orgStatus === 'ausstehend') {
    return 'Wartet auf Org-Freigabe — Handwerker können erst danach angefragt werden.'
  }
  if (orgStatus === 'abgelehnt') {
    return 'Organisation hat die Freigabe abgelehnt — Handwerker-Anfrage blockiert.'
  }
  return null
}

export function handwerkerSendenBlockierHinweis(
  rows: AngebotHandwerkerRow[] | null | undefined,
  orgStatus?: OrgFreigabeStatus | null
): string {
  const orgHinweis = orgFreigabeBlockierHinweis(orgStatus)
  if (orgHinweis) return orgHinweis
  const list = rows ?? []
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
