import { publicWebsiteBaseUrl } from '@/lib/portal-utils'
import type { OrgFreigabeStatus } from '@/lib/types'

export function buildMeldeLink(orgKennung: string, meldeSlug?: string | null): string {
  const org = orgKennung.trim().toLowerCase()
  const base = `${publicWebsiteBaseUrl()}/melden/${encodeURIComponent(org)}`
  const slug = meldeSlug?.trim().toLowerCase()
  if (slug) return `${base}/${encodeURIComponent(slug)}`
  return base
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
  // ausstehend/beschluss: Angebot muss erst an HV — Versand ist der Freigabe-Einstieg.
  if ((hvMeldungStatus ?? '').trim() === 'notmassnahme') return null
  if (status === 'abgelehnt') {
    return 'Organisation hat die Freigabe abgelehnt — Versand an den Kunden ist blockiert.'
  }
  return null
}

/**
 * Kunden-/HV-Versand blockieren?
 * Nur bei Ablehnung — „ausstehend“ darf den Versand nicht blockieren
 * (sonst sieht die HV das Angebot nie und kann nicht freigeben).
 */
export function orgFreigabeBlockiertKundenversandStatus(
  status: OrgFreigabeStatus | null | undefined,
  hvMeldungStatus?: string | null
): boolean {
  if ((hvMeldungStatus ?? '').trim() === 'notmassnahme') return false
  return status === 'abgelehnt'
}

export const ORG_FREIGABE_LABELS: Record<OrgFreigabeStatus, string> = {
  // Flow-Vereinfachung 30.09.2026: ein Wartezustand „Wartet auf Zustimmung“ — einzige Quelle
  nicht_noetig: 'Nicht nötig',
  ausstehend: 'Wartet auf Zustimmung',
  beschluss_ausstehend: 'Wartet auf Zustimmung',
  freigegeben: 'Zugestimmt',
  abgelehnt: 'Abgelehnt',
}
