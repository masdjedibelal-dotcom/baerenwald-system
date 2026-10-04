import type { AuftragPosition } from '@/lib/types'
import { istRegiePosition } from '@/lib/auftraege/regie-display'
import {
  dokumentZeilenToPosBoardLines,
  posBoardLineFromAngebotPosition,posBoardLinesToDokumentZeilen,
  type PosBoardLine
} from '@/lib/posboard/pos-board-line'

export type { PosBoardLine } from '@/lib/posboard/pos-board-line'
export {
  dokumentZeilenToPosBoardLines,
  posBoardLineFromAngebotPosition,
  posBoardLineFromDokumentArtikel,
  posBoardLineNetto,
  posBoardLineToAngebotPosition,
  posBoardLineToDokumentArtikel,
  posBoardLinesFromAngebotPositionen,
  posBoardLinesToAngebotPositionen,
  posBoardLinesToDokumentZeilen,
  neuePosBoardLine,
  posBoardLineId,
  POS_BOARD_DEFAULT_GEWERK,
} from '@/lib/posboard/pos-board-line'

/** Auftragspositionen → PosBoard-Zeilen (Stückpreis = VK/Menge bzw. Lohn+Material). */
export function auftragPositionenToPosBoardLines(
  items: AuftragPosition[] | null | undefined
): PosBoardLine[] {
  const list = Array.isArray(items) ? items : []
  return list
    .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt')
    .map((p) => {
      const isRegie = istRegiePosition(p)
      const menge = isRegie
        ? Number(p.geschaetzt_std) > 0
          ? Number(p.geschaetzt_std)
          : Number(p.menge) || 1
        : Number(p.menge) || 1
      // preis_fix / lohn_fix / material_fix sind Zeilensummen (wie aus dem Angebot übernommen) —
      // Einzelpreis daher immer durch die Menge teilen, sonst verdoppelt Speichern den Preis.
      const zeile =
        p.preis_fix != null
          ? Number(p.preis_fix)
          : Number(p.lohn_fix ?? 0) + Number(p.material_fix ?? 0)
      let unit = zeile / Math.max(menge, 0.0001)
      const kundenSatz = Number(p.stundensatz_kunde ?? 0)
      const partnerSatz = Number(p.stundensatz ?? 0)
      if (isRegie && (kundenSatz > 0 || partnerSatz > 0)) {
        unit = kundenSatz > 0 ? kundenSatz : partnerSatz
      }
      return {
        id: p.id,
        gewerk: p.gewerk_name?.trim() || p.gewerk_slug || 'Allgemein',
        name: p.leistung_name?.trim() || 'Position',
        beschreibung: p.beschreibung?.trim() || undefined,
        menge,
        einheit: isRegie ? p.einheit?.trim() || 'h' : p.einheit ?? 'Stück',
        preis: Math.round(unit * 100) / 100,
        ust: 19,
        regieSchein: isRegie || undefined,
      }
    })
}

/** DokumentZeilen → PosBoard; Re-Export für Wizard-Integration. */
export { dokumentZeilenToPosBoardLines as dokumentZeilenToPosBoard }

/** PosBoard → DokumentZeilen; Re-Export für Wizard-Integration. */
export { posBoardLinesToDokumentZeilen as posBoardToDokumentZeilen }

/** Einzelne AngebotPosition → PosBoardLine. */
export { posBoardLineFromAngebotPosition as angebotPositionToPosBoardLine }
