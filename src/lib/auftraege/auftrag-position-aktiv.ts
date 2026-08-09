import type { AuftragPosition } from '@/lib/types'
import { istInterneAuftragGewerkBeschreibung } from '@/lib/auftraege/auftrag-position-blocks'

/** Soft-gelöscht / Partner-Entfernung — nicht mehr in Auftragswert & Summen. */
export function istAuftragPositionEntfernt(
  p: Pick<AuftragPosition, 'aenderung_typ'>
): boolean {
  return (p.aenderung_typ ?? '').toLowerCase() === 'entfernt'
}

/** Zählt für VK/EK, Badge, Zahlplan-Gesamt. */
export function istAuftragPositionFuerSumme(
  p: AuftragPosition
): boolean {
  if (istInterneAuftragGewerkBeschreibung(p)) return false
  if (istAuftragPositionEntfernt(p)) return false
  return true
}

export function auftragPositionenFuerSumme(
  positionen: AuftragPosition[] | null | undefined
): AuftragPosition[] {
  return (positionen ?? []).filter(istAuftragPositionFuerSumme)
}
