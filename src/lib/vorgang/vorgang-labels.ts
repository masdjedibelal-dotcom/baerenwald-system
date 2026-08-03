import type { VorgangPhase } from '@/lib/vorgang/types'

const LEAD_UNTERSTATUS: Record<string, string> = {
  neu: 'Neu',
  kontaktiert: 'Kontaktiert',
  termin: 'Termin',
  abgebrochen: 'Verloren',
  storniert: 'Storniert',
}

const ANGEBOT_UNTERSTATUS: Record<string, string> = {
  entwurf: 'Entwurf',
  gesendet_handwerker: 'Gesendet Handwerker',
  handwerker_akzeptiert: 'Handwerker akzeptiert',
  gesendet_kunde: 'Gesendet Kunde',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  abgelaufen: 'Abgelaufen',
  ersetzt: 'Ersetzt',
  storniert: 'Storniert',
}

const AUFTRAG_UNTERSTATUS: Record<string, string> = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  abnahme: 'Abnahme',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
}

const RECHNUNG_UNTERSTATUS: Record<string, string> = {
  ausstehend: 'Offen',
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
}

export function unterstatusLabel(phase: VorgangPhase, unterstatus: string): string {
  const key = unterstatus.trim().toLowerCase()
  switch (phase) {
    case 'anfrage':
      return LEAD_UNTERSTATUS[key] ?? key
    case 'angebot':
      return ANGEBOT_UNTERSTATUS[key] ?? key
    case 'auftrag':
      return AUFTRAG_UNTERSTATUS[key] ?? key
    case 'rechnung':
      return RECHNUNG_UNTERSTATUS[key] ?? key
    default:
      return key
  }
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
  freigabe: 'Warte auf Hausverwaltung',
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

/** Kanonische Unterstatus-Werte pro Phase (Spec §8 Filter). */
export const PHASE_UNTERSTATUS_VALUES: Record<VorgangPhase, readonly string[]> = {
  anfrage: ['neu', 'kontaktiert', 'termin', 'abgebrochen', 'storniert'],
  angebot: [
    'entwurf',
    'gesendet_handwerker',
    'handwerker_akzeptiert',
    'gesendet_kunde',
    'gesendet',
    'angenommen',
    'abgelehnt',
    'abgelaufen',
    'ersetzt',
    'storniert',
  ],
  auftrag: ['offen', 'in_arbeit', 'abnahme', 'abgeschlossen', 'storniert'],
  rechnung: ['ausstehend', 'entwurf', 'gesendet', 'bezahlt', 'storniert'],
}
