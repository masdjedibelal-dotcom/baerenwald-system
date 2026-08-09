import type { AuftragPosition } from '@/lib/types'
import {
  groupAuftragPositionenByGewerk,
  type AuftragGewerkBlock,
  type GewerkOpt,
} from '@/lib/auftraege/auftrag-position-blocks'

/** Ausführungsphasen im Auftrag (Oberpunkte unter Positionen). Leer = ohne Phase. */
export const AUFTRAG_LEISTUNG_PHASEN = [
  'Planung',
  'Vorbereitung',
  'Ausführung',
  'Abnahme',
  'Rechnung',
] as const

export type AuftragLeistungPhase = (typeof AUFTRAG_LEISTUNG_PHASEN)[number]

export type AuftragPhaseBlock = {
  /** leer = „Ohne Phase“ */
  phase: string
  label: string
  gewerke: AuftragGewerkBlock[]
}

export function phaseLabel(phase: string | null | undefined): string {
  const p = phase?.trim()
  return p || 'Ohne Phase'
}

export function positionPhase(p: AuftragPosition): string {
  const raw = p.projekt_phase?.trim()
  if (raw === '') return ''
  return raw || 'Ausführung'
}

export function positionGewerkKey(p: AuftragPosition): string {
  return p.gewerk_block_key?.trim() || p.gewerk_slug?.trim() || `name:${p.gewerk_name}`
}

/** Leistung ohne Handwerker = von uns abgedeckt (Eigenleistung, keine Fremdleistung). */
export function istEigenleistungPosition(p: AuftragPosition): boolean {
  return !p.handwerker_id
}

export function istFremdleistungPosition(p: AuftragPosition): boolean {
  return !!p.handwerker_id
}

/** Interner EK (Lohn + Material) — nur bei Eigenleistung relevant. */
export function preisEigenleistung(p: AuftragPosition): number {
  if (!istEigenleistungPosition(p)) return 0
  return (p.lohn_fix ?? 0) + (p.material_fix ?? 0)
}

/** Partner-EK (Fremdleistung) — nur wenn ein Handwerker zugeordnet ist. */
export function preisPartner(p: AuftragPosition): number {
  if (!istFremdleistungPosition(p)) return 0
  if (p.preis_partner != null && p.preis_partner > 0) return p.preis_partner
  return (p.lohn_fix ?? 0) + (p.material_fix ?? 0)
}

export function hwStatusKurzLabel(status: string | null | undefined): string {
  const v = (status ?? 'ausstehend').toLowerCase()
  if (v === 'akzeptiert' || v === 'zugewiesen') return 'Bestätigt'
  if (v === 'angefragt' || v === 'warten') return 'Angefragt'
  if (v === 'abgelehnt') return 'Abgelehnt'
  return 'Offen'
}

export function hwStatusKurzClass(status: string | null | undefined): string {
  const v = (status ?? 'ausstehend').toLowerCase()
  if (v === 'akzeptiert' || v === 'zugewiesen') return 'hw-badge-bestaetigt'
  if (v === 'angefragt' || v === 'warten') return 'hw-badge-angefragt'
  if (v === 'abgelehnt') return 'hw-badge-abgelehnt'
  return 'hw-badge-offen'
}

function minDate(values: (string | null | undefined)[]): string | null {
  const dates = values.map((d) => d?.slice(0, 10)).filter(Boolean) as string[]
  if (!dates.length) return null
  return dates.sort()[0]!
}

function maxDate(values: (string | null | undefined)[]): string | null {
  const dates = values.map((d) => d?.slice(0, 10)).filter(Boolean) as string[]
  if (!dates.length) return null
  return dates.sort().at(-1)!
}

export function gewerkZeitraum(block: AuftragGewerkBlock): { von: string | null; bis: string | null } {
  return {
    von: minDate(block.positionen.map((p) => p.start_datum)),
    bis: maxDate(block.positionen.map((p) => p.end_datum)),
  }
}

export function phaseZeitraum(gewerke: AuftragGewerkBlock[]): { von: string | null; bis: string | null } {
  const pos = gewerke.flatMap((g) => g.positionen)
  return {
    von: minDate(pos.map((p) => p.start_datum)),
    bis: maxDate(pos.map((p) => p.end_datum)),
  }
}

/** Phase → Gewerk → Leistungen; leere Phasen werden mit angezeigt. */
export function groupAuftragPositionenByPhaseAndGewerk(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): AuftragPhaseBlock[] {
  const phaseOrder = ['', ...AUFTRAG_LEISTUNG_PHASEN]
  const byPhase = new Map<string, AuftragPosition[]>()

  for (const p of positionen) {
    const ph = positionPhase(p)
    if (!byPhase.has(ph)) byPhase.set(ph, [])
    byPhase.get(ph)!.push(p)
  }

  const extraPhases = Array.from(byPhase.keys()).filter((k) => !phaseOrder.includes(k))
  const order = [...phaseOrder, ...extraPhases]

  return order.map((phase) => ({
    phase,
    label: phaseLabel(phase),
    gewerke: groupAuftragPositionenByGewerk(byPhase.get(phase) ?? [], gewerke),
  }))
}

export function summenPositionen(positionen: AuftragPosition[]): {
  verkauf: number
  /** EK Fremdleistung (Partner / Handwerker) */
  partner: number
  /** EK Eigenleistung (intern: Lohn + Material) */
  eigen: number
  marge: number
} {
  const verkauf = positionen.reduce((s, p) => s + (p.preis_fix ?? 0), 0)
  const partner = positionen.reduce((s, p) => s + preisPartner(p), 0)
  const eigen = positionen.reduce((s, p) => s + preisEigenleistung(p), 0)
  return { verkauf, partner, eigen, marge: verkauf - partner - eigen }
}
