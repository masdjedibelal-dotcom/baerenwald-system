import type { ObjektHistorieRow } from '@/lib/objektakte/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { summeObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'

export type ObjektKpiSnapshot = {
  vorgaengeGesamt: number
  offenInArbeit: number
  kostenLaufendesJahr: number
  kostenOhneAngabeImJahr: number
  anlagenAnzahl: number
  nachGewerk: Array<{ gewerk: string; count: number }>
}

function istOffenOderInArbeit(row: ObjektHistorieRow): boolean {
  const u = row.unterstatus.toLowerCase()
  if (u === 'storniert' || u === 'abgebrochen' || u === 'abgelehnt' || u === 'bezahlt') {
    return false
  }
  if (u === 'abgeschlossen') return false
  return true
}

function datumImJahr(iso: string, jahr: number): boolean {
  const d = iso.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  return Number(d.slice(0, 4)) === jahr
}

/** KPI-Übersicht — null-tolerant, leere Objekte → Nullen. */
export function computeObjektKpis(
  rows: ObjektHistorieRow[],
  anlagenAnzahl: number,
  jahr = new Date().getFullYear()
): ObjektKpiSnapshot {
  const jahrRows = rows.filter((r) => datumImJahr(r.datum, jahr))
  const { summe, ohneAngabe } = summeObjektVorgangKosten(jahrRows)

  const gewerkMap = new Map<string, number>()
  for (const r of rows) {
    const g = r.gewerkLabel?.trim() || '—'
    gewerkMap.set(g, (gewerkMap.get(g) ?? 0) + 1)
  }
  const nachGewerk = Array.from(gewerkMap.entries())
    .filter(([g]) => g !== '—')
    .map(([gewerk, count]) => ({ gewerk, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    vorgaengeGesamt: rows.length,
    offenInArbeit: rows.filter(istOffenOderInArbeit).length,
    kostenLaufendesJahr: summe,
    kostenOhneAngabeImJahr: ohneAngabe,
    anlagenAnzahl,
    nachGewerk,
  }
}

export function phaseChipLabelHistorie(phase: VorgangPhase | 'bestand'): string {
  if (phase === 'bestand') return 'Wartung & Pflege'
  if (phase === 'anfrage') return 'Anfrage'
  if (phase === 'angebot') return 'Angebot'
  if (phase === 'auftrag') return 'Auftrag'
  return 'Rechnung'
}
