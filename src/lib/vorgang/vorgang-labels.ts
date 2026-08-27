import type { VorgangPhase } from '@/lib/vorgang/types'
import {
  PHASE_UNTERSTATUS_VALUES as MAP_PHASE_VALUES,
  statusLabel,
  type VorgangPhaseKey,
} from '@/lib/status/status-map'

export function unterstatusLabel(phase: VorgangPhase, unterstatus: string): string {
  return statusLabel(phase as VorgangPhaseKey, unterstatus)
}

const HV_KANALE = new Set([
  'hv_melder_link',
  'hv_direkt',
  'hv_einladung',
  'hv_katalog',
  'hv_manuell',
  'org_portal',
  'org_funnel',
  'org_service',
])

export function kanalMetaFromLead(kanal: string | null | undefined): string | null {
  const k = (kanal ?? '').trim()
  if (!k) return null
  if (HV_KANALE.has(k) || k.startsWith('hv_') || k.startsWith('org_')) return 'HV-Meldung'
  if (k === 'website') return 'Website'
  if (k === 'telefon') return 'Telefon'
  if (k === 'whatsapp') return 'WhatsApp'
  if (k === 'email') return 'E-Mail'
  return 'Direktkunde'
}

export const ACTOR_LABELS: Record<string, string> = {
  freigabe: 'Kunde',
  handwerker: 'Handwerker',
  kunde: 'Kunde',
  bw: 'Bärenwald',
}

export const PHASE_LABELS: Record<VorgangPhase, string> = {
  anfrage: 'Anfrage',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  rechnung: 'Rechnung',
}

/** Kanonische Unterstatus-Werte pro Phase (Spec §8 Filter) — aus status-map. */
export const PHASE_UNTERSTATUS_VALUES: Record<VorgangPhase, readonly string[]> =
  MAP_PHASE_VALUES
