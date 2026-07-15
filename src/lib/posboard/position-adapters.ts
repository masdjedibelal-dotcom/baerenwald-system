import type { AuftragPosition, AngebotPosition } from '@/lib/types'
import {
  dokumentZeilenToPosBoardLines,
  posBoardLineFromAngebotPosition,
  posBoardLinesFromAngebotPositionen,
  posBoardLinesToAngebotPositionen,
  posBoardLinesToDokumentZeilen,
  type PosBoardLine,
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

/** Auftragspositionen → PosBoard-Zeilen (read-only Detail-Ansicht). */
export function auftragPositionenToPosBoardLines(items: AuftragPosition[]): PosBoardLine[] {
  return items.map((p) => {
    const vk =
      p.preis_fix != null
        ? Number(p.preis_fix)
        : (Number(p.lohn_fix ?? 0) + Number(p.material_fix ?? 0)) || 0
    return {
      id: p.id,
      gewerk: p.gewerk_name?.trim() || p.gewerk_slug || 'Allgemein',
      name: p.leistung_name?.trim() || 'Position',
      beschreibung: p.beschreibung?.trim() || undefined,
      menge: Number(p.menge) || 0,
      einheit: p.einheit ?? 'Stk',
      preis: vk,
      ust: 19,
    }
  })
}

/** @deprecated Nutze auftragPositionenToPosBoardLines — bleibt für Alt-Importe. */
export function auftragPositionenToPosBoard(items: AuftragPosition[]): AngebotPosition[] {
  return posBoardLinesToAngebotPositionen(auftragPositionenToPosBoardLines(items))
}

/** AngebotPositionen → PosBoard-Zeilen. */
export function angebotPositionenToPosBoardLines(items: AngebotPosition[]): PosBoardLine[] {
  return posBoardLinesFromAngebotPositionen(items)
}

/** PosBoard-Zeilen → AngebotPositionen (mit optionaler Basis-Map für Metadaten). */
export function posBoardLinesToAngebotPositionenWithBase(
  lines: PosBoardLine[],
  baseItems: AngebotPosition[]
): AngebotPosition[] {
  const baseById = new Map(baseItems.map((p) => [p.id, p]))
  return posBoardLinesToAngebotPositionen(lines, baseById)
}

/** DokumentZeilen → PosBoard; Re-Export für Wizard-Integration. */
export { dokumentZeilenToPosBoardLines as dokumentZeilenToPosBoard }

/** PosBoard → DokumentZeilen; Re-Export für Wizard-Integration. */
export { posBoardLinesToDokumentZeilen as posBoardToDokumentZeilen }

/** Einzelne AngebotPosition → PosBoardLine. */
export { posBoardLineFromAngebotPosition as angebotPositionToPosBoardLine }
