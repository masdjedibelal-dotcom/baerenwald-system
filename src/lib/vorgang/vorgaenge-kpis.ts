import type { VorgangListeRow } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { zaehleOffeneVorgaenge } from '@/lib/vorgang/vorgang-offen'

export type VorgaengeKpis = {
  offeneAnfragen: number
  offeneAngebote: number
  aktiveAuftraege: number
  offeneRechnungen: number
  /** Offene wiederkehrende Vorgänge (Bestand) */
  bestandAktiv: number
}

/** Spec §8 — KPI-Karten über der Vorgänge-Liste. Offen-Zahlen = Tab „Offen“ (vorgang-offen.ts). */
export function computeVorgaengeKpis(rows: VorgangListeRow[]): VorgaengeKpis {
  const offen = zaehleOffeneVorgaenge(rows)
  let bestandAktiv = 0
  for (const r of rows) {
    const u = r.unterstatus.toLowerCase()
    if (
      r.ist_wiederkehrend &&
      !(
        u === 'storniert' ||
        u === 'abgebrochen' ||
        u === 'abgelehnt' ||
        u === 'bezahlt' ||
        u === 'abgeschlossen'
      )
    ) {
      bestandAktiv++
    }
  }
  return {
    offeneAnfragen: offen.anfrage,
    offeneAngebote: offen.angebot,
    aktiveAuftraege: offen.auftrag,
    offeneRechnungen: offen.rechnung,
    bestandAktiv,
  }
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
