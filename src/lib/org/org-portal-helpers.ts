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
  // Dokumentierte Ausnahme (06-PROZESSE.md): Notmaßnahme darf Partner ohne Org-Freigabe
  // beauftragen — HV hat Sofortmaßnahme gewählt; Gate gilt wieder nach normalem Angebot.
  if ((hvMeldungStatus ?? '').trim() === 'notmassnahme') return false
  return status === 'ausstehend' || status === 'beschluss_ausstehend' || status === 'abgelehnt'
}

/** Verständliche Hinweis-Message für UI/Actions — kanonisch für alle Partner-Sendepfade. */
export function orgFreigabePartnerBlockMessage(
  status: OrgFreigabeStatus | null | undefined,
  hvMeldungStatus?: string | null
): string | null {
  if (!orgFreigabeBlockiertPartner(status, hvMeldungStatus)) return null
  if (status === 'abgelehnt') {
    return 'Organisation hat die Freigabe abgelehnt — Partner-Anfrage ist blockiert.'
  }
  return 'Wartet auf Org-Freigabe — Partner-Anfrage kann erst nach Freigabe gesendet werden.'
}

/** Hinweis wenn Kundenversand wegen fehlender HV-Freigabe blockiert ist. */
export function orgFreigabeKundenversandBlockMessage(
  status: OrgFreigabeStatus | null | undefined,
  hvMeldungStatus?: string | null
): string | null {
  if (!orgFreigabeBlockiertPartner(status, hvMeldungStatus)) return null
  if (status === 'abgelehnt') {
    return 'Organisation hat die Freigabe abgelehnt — Versand an den Kunden ist blockiert.'
  }
  if (status === 'beschluss_ausstehend') {
    return 'Wartet auf Eigentümerbeschluss — Versand an den Kunden erst nach Freigabe.'
  }
  return 'Wartet auf HV-Freigabe — Versand an den Kunden erst nach Freigabe erteilen.'
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
  hm_pruefung: 'Hausmeister-Prüfung',
  hm_erledigt: 'Vom Hausmeister erledigt',
}

export const KOSTENTRAEGER_LABELS: Record<string, string> = {
  gemeinschaft: 'Gemeinschaft (WEG)',
  sondereigentum: 'Sondereigentum',
  mieter: 'Mieter',
  versicherung: 'Versicherung',
  unklar: 'Noch unklar',
}

export const ORG_FREIGABE_LABELS: Record<OrgFreigabeStatus, string> = {
  nicht_noetig: 'nicht erforderlich',
  ausstehend: 'ausstehend',
  beschluss_ausstehend: 'Wartet auf Beschluss',
  freigegeben: 'erteilt',
  abgelehnt: 'abgelehnt',
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
