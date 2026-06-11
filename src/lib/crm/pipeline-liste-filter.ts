import { resolveStatusEinfach, type AngebotStatusEinfach } from '@/lib/angebot-einfach'
import { LEAD_STATUS_VOR_ANGEBOT, leadStatusVorAngebot } from '@/lib/lead-angebot-funnel'
import { matchesAuftragPhase } from '@/lib/auftraege/auftrag-liste-helpers'
import type {
  AngebotListeEintrag,
  AuftragListeEintrag,
  LeadStatus,
  LeadWithAngebote,
} from '@/lib/types'

/** Aktive Anfragen-Pipeline: Neu → Kontaktiert → Termin. */
export const ANFRAGEN_PIPELINE_STATUS: LeadStatus[] = [...LEAD_STATUS_VOR_ANGEBOT]

/** In der Anfragen-Liste sichtbar (+ abgelehnte Anfragen per Filter). */
export const ANFRAGEN_LISTE_STATUS: LeadStatus[] = [...ANFRAGEN_PIPELINE_STATUS, 'abgebrochen']

export type AnfragenStatusFilter = '' | (typeof ANFRAGEN_LISTE_STATUS)[number]

export const ANFRAGEN_STATUS_FILTER_ORDER: AnfragenStatusFilter[] = [
  '',
  ...ANFRAGEN_PIPELINE_STATUS,
  'abgebrochen',
]

export function leadStatusInAnfragenListe(status: LeadStatus): boolean {
  return ANFRAGEN_LISTE_STATUS.includes(status)
}

/** Anfragen-Pipeline: vor Angebot, ohne verknüpftes Angebot. */
export function leadInAnfragenPipeline(lead: LeadWithAngebote): boolean {
  if (!leadStatusVorAngebot(lead.status)) return false
  const angebote = lead.angebote ?? []
  if (angebote.length > 0) return false
  return true
}

const ANGEBOT_PIPELINE_AUSGESCHLOSSEN: AngebotStatusEinfach[] = ['abgelehnt', 'abgelaufen']

/** Angebote-Pipeline: offen, noch kein Auftrag. */
export function angebotInAngebotePipeline(
  angebot: AngebotListeEintrag,
  angebotIdsMitAuftrag: ReadonlySet<string>
): boolean {
  if (angebotIdsMitAuftrag.has(angebot.id)) return false
  const st = resolveStatusEinfach(angebot)
  if (ANGEBOT_PIPELINE_AUSGESCHLOSSEN.includes(st)) return false
  return true
}

/** Aufträge-Pipeline: nur laufende Aufträge. */
export function auftragInAuftraegePipeline(auftrag: AuftragListeEintrag): boolean {
  return matchesAuftragPhase(auftrag, 'aktiv')
}

export function buildAngebotIdsMitAuftrag(rows: { angebot_id: string | null }[]): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    const id = row.angebot_id?.trim()
    if (id) ids.add(id)
  }
  return ids
}

export { rechnungInRechnungenPipeline } from '@/lib/rechnungen/rechnung-liste-helpers'
