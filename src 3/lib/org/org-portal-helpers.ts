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

export function orgFreigabeBlockiertPartner(
  status: OrgFreigabeStatus | null | undefined,
  hvMeldungStatus?: string | null
): boolean {
  if ((hvMeldungStatus ?? '').trim() === 'notmassnahme') return false
  return status === 'ausstehend' || status === 'abgelehnt'
}

export const ANLASS_LABELS: Record<string, string> = {
  meldung: 'Meldung',
  projekt: 'Projekt',
  servicepaket: 'Servicepaket',
  katalog: 'Katalog',
  fixauftrag: 'Fixauftrag',
  sonstiges: 'Sonstiges',
}

export const HV_MELDUNG_STATUS_LABELS: Record<string, string> = {
  neu: 'Neu',
  notmassnahme: 'Läuft — Notmaßnahme',
  angebot_eingefordert: 'Angebot eingefordert',
  kleinreparatur: 'Kleinreparatur',
  abgelehnt: 'Abgelehnt',
  abgeschlossen: 'Abgeschlossen',
}

export const KOSTENTRAEGER_LABELS: Record<string, string> = {
  gemeinschaft: 'Gemeinschaft (WEG)',
  sondereigentum: 'Sondereigentum',
  mieter: 'Mieter',
  versicherung: 'Versicherung',
  unklar: 'Noch unklar',
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
