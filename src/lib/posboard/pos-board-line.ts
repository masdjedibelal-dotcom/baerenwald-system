import { positionVkNettoStueck } from '@/lib/angebot-positionen'
import {
  GEWERK_NAME_ALLGEMEIN,
  neueArtikelZeile,
  type DokumentArtikelZeile,
  type DokumentZeile,
  type MwstSatzOption,
} from '@/lib/dokument-zeilen'
import type { AngebotPosition } from '@/lib/types'

export type PosBoardLine = {
  id: string
  gewerk: string
  name: string
  beschreibung?: string
  menge: number
  einheit: string
  /** Einzelpreis netto */
  preis: number
  ust?: number
}

export const POS_BOARD_DEFAULT_GEWERK = 'Allgemein'

export function posBoardLineId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function neuePosBoardLine(partial?: Partial<PosBoardLine>): PosBoardLine {
  return {
    id: posBoardLineId(),
    gewerk: POS_BOARD_DEFAULT_GEWERK,
    name: '',
    beschreibung: '',
    menge: 1,
    einheit: 'Stück',
    preis: 0,
    ust: 19,
    ...partial,
  }
}

export function posBoardLineNetto(line: PosBoardLine): number {
  return (Number(line.menge) || 0) * (Number(line.preis) || 0)
}

export function posBoardLineFromAngebotPosition(p: AngebotPosition): PosBoardLine {
  const name = (p.leistung_name || p.leistung || '').trim()
  const beschreibungRaw = (p.beschreibung || '').trim()
  const displayName = name || beschreibungRaw || '(ohne Bezeichnung)'
  return {
    id: p.id,
    gewerk: p.gewerk_name?.trim() || p.gewerk_id || POS_BOARD_DEFAULT_GEWERK,
    name: displayName,
    beschreibung: name ? beschreibungRaw : '',
    menge: Number(p.menge) || 0,
    einheit: p.einheit || 'Stück',
    preis: positionVkNettoStueck(p),
    ust: p.mwst_satz != null ? Number(p.mwst_satz) : 19,
  }
}

export function posBoardLineToAngebotPosition(
  line: PosBoardLine,
  base?: Partial<AngebotPosition>
): AngebotPosition {
  const m = Math.max(line.menge || 1, 0.0001)
  const vk = Math.round((Number(line.preis) || 0) * 100) / 100
  const lineTotal = Math.round(vk * m * 100) / 100
  return {
    id: line.id,
    gewerk_id: base?.gewerk_id ?? '',
    gewerk_name: line.gewerk,
    gewerk_slug: base?.gewerk_slug,
    gewerk_block_key: base?.gewerk_block_key,
    leistung: line.name,
    leistung_name: line.name,
    beschreibung: line.beschreibung ?? '',
    lohn_netto: vk,
    material_netto: 0,
    vk_netto: vk,
    gesamt_min: lineTotal,
    gesamt_max: lineTotal,
    menge: line.menge,
    einheit: line.einheit,
    mwst_satz: line.ust ?? 19,
    preis_typ: 'fix',
    ...base,
  }
}

export function posBoardLinesFromAngebotPositionen(items: AngebotPosition[]): PosBoardLine[] {
  return items.map(posBoardLineFromAngebotPosition)
}

export function posBoardLinesToAngebotPositionen(
  lines: PosBoardLine[],
  baseById?: Map<string, Partial<AngebotPosition>>
): AngebotPosition[] {
  return lines.map((line) => posBoardLineToAngebotPosition(line, baseById?.get(line.id)))
}

export function posBoardLineFromDokumentArtikel(z: DokumentArtikelZeile): PosBoardLine {
  return {
    id: z.id,
    gewerk: z.gewerkName?.trim() || GEWERK_NAME_ALLGEMEIN,
    name: z.bezeichnung.trim() || 'Position',
    beschreibung: z.positionBeschreibung?.trim() || undefined,
    menge: z.menge,
    einheit: z.einheit,
    preis: z.vkNetto,
    ust: z.mwstSatz,
  }
}

export function posBoardLineToDokumentArtikel(
  line: PosBoardLine,
  base?: Partial<DokumentArtikelZeile>
): DokumentArtikelZeile {
  const mwst: MwstSatzOption =
    line.ust === 0 || line.ust === 7 ? line.ust : 19
  return {
    ...neueArtikelZeile({
      id: line.id,
      bezeichnung: line.name,
      positionBeschreibung: line.beschreibung,
      menge: line.menge,
      einheit: line.einheit,
      vkNetto: line.preis,
      mwstSatz: mwst,
      gewerkName: line.gewerk,
      gewerk_id: base?.gewerk_id,
      gewerk_slug: base?.gewerk_slug,
      gewerk_block_key: base?.gewerk_block_key,
      preisliste_id: base?.preisliste_id,
      kostenart: base?.kostenart,
      kostenverteilung: base?.kostenverteilung,
      rabattProzent: base?.rabattProzent ?? 0,
      fachbetriebHinweisAnzeigen: base?.fachbetriebHinweisAnzeigen,
    }),
    id: line.id,
  }
}

export function dokumentZeilenToPosBoardLines(zeilen: DokumentZeile[]): PosBoardLine[] {
  return zeilen
    .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
    .map(posBoardLineFromDokumentArtikel)
}

/** Ersetzt Artikel-Zeilen, behält Freitext/Gesamtrabatt. */
export function posBoardLinesToDokumentZeilen(
  lines: PosBoardLine[],
  existing: DokumentZeile[]
): DokumentZeile[] {
  const baseById = new Map<string, DokumentArtikelZeile>()
  for (const z of existing) {
    if (z.typ === 'artikel') baseById.set(z.id, z)
  }
  const preserved = existing.filter((z) => z.typ !== 'artikel')
  const artikel = lines.map((line) => posBoardLineToDokumentArtikel(line, baseById.get(line.id)))
  const rabatt = preserved.find((z) => z.typ === 'gesamtrabatt')
  const ohneRabatt = preserved.filter((z) => z.typ !== 'gesamtrabatt')
  return rabatt ? [...ohneRabatt, ...artikel, rabatt] : [...ohneRabatt, ...artikel]
}
