import type { VorgangListeRow } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'

export type VorgaengeKpis = {
  neueAnfragen: number
  offeneAngebote: number
  aktiveAuftraege: number
  offeneRechnungen: number
}

/** Spec §8 — KPI-Karten über der Vorgänge-Liste. */
export function computeVorgaengeKpis(rows: VorgangListeRow[]): VorgaengeKpis {
  let neueAnfragen = 0
  let offeneAngebote = 0
  let aktiveAuftraege = 0
  let offeneRechnungen = 0

  for (const r of rows) {
    const u = r.unterstatus.toLowerCase()
    if (r.phase === 'anfrage' && u === 'neu') neueAnfragen++
    if (r.phase === 'angebot' && (u === 'entwurf' || u === 'gesendet')) offeneAngebote++
    if (r.phase === 'auftrag' && (u === 'offen' || u === 'in_arbeit' || u === 'abnahme')) {
      aktiveAuftraege++
    }
    if (r.phase === 'rechnung' && (u === 'entwurf' || u === 'gesendet')) offeneRechnungen++
  }

  return { neueAnfragen, offeneAngebote, aktiveAuftraege, offeneRechnungen }
}

export function countVorgaengeByPhase(rows: VorgangListeRow[]): Record<VorgangPhase, number> {
  return rows.reduce(
    (acc, r) => {
      acc[r.phase] = (acc[r.phase] ?? 0) + 1
      return acc
    },
    { anfrage: 0, angebot: 0, auftrag: 0, rechnung: 0 } as Record<VorgangPhase, number>
  )
}
