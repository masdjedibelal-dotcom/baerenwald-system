import { publicWebsiteBaseUrl } from '@/lib/portal-utils'
import type { OrgFreigabeStatus } from '@/lib/types'

export function buildMeldeLink(orgKennung: string, meldeSlug?: string | null): string {
  const org = orgKennung.trim().toLowerCase()
  const base = `${publicWebsiteBaseUrl()}/melden/${encodeURIComponent(org)}`
  const slug = meldeSlug?.trim().toLowerCase()
  if (slug) return `${base}/${encodeURIComponent(slug)}`
  return base
}

export function buildEinladungErgaenzenLink(token: string): string {
  return `${publicWebsiteBaseUrl()}/melden/ergaenzen/${encodeURIComponent(token.trim())}`
}

export function orgFreigabeBlockiertPartner(status: OrgFreigabeStatus | null | undefined): boolean {
  return status === 'ausstehend' || status === 'abgelehnt'
}

export const ANLASS_LABELS: Record<string, string> = {
  meldung: 'Meldung',
  projekt: 'Projekt',
  servicepaket: 'Servicepaket',
  sonstiges: 'Sonstiges',
}

export const ORG_FREIGABE_LABELS: Record<OrgFreigabeStatus, string> = {
  nicht_noetig: 'Keine Freigabe nötig',
  ausstehend: 'Wartet auf Freigabe',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
}

export const EINLADUNG_STATUS_LABELS: Record<string, string> = {
  offen: 'Einladung offen',
  ergaenzt: 'Ergänzt',
  entfallen: 'Entfallen',
}

export const ERFASSUNG_VON_LABELS: Record<string, string> = {
  melder: 'Melder',
  organisation: 'Organisation',
  crm: 'CRM',
}
