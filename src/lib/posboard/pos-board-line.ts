import { positionVkNettoStueck } from '@/lib/angebot-positionen'
import {
  splitNettoStueck,
  type KostenVerteilung,
} from '@/lib/angebot-kosten-split'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  GEWERK_NAME_ALLGEMEIN,
  neueArtikelZeile,
  neueFreitextZeile,
  neueGesamtrabattZeile,
  type DokumentArtikelZeile,
  type DokumentFreitextZeile,
  type DokumentGesamtrabattZeile,
  type DokumentZeile,
  type MwstSatzOption,
} from '@/lib/dokument-zeilen'
import { withResolvedGewerkMeta } from '@/lib/angebote/resolve-position-gewerk'
import type { AngebotPosition, Gewerk } from '@/lib/types'

export type PosBoardLineKind = 'position' | 'freitext' | 'nachlass'

export type PosBoardLine = {
  id: string
  gewerk: string
  /** Gewerk-UUID (Katalog/Preisliste) — für Speichern & Zuweisung */
  gewerk_id?: string | null
  gewerk_slug?: string | null
  name: string
  beschreibung?: string
  menge: number
  einheit: string
  /** Einzelpreis netto (bei Nachlass: Wert; Modus über nachlassModus) */
  preis: number
  ust?: number
  /** Kostenart für PDF-Ausweis (Allgemein / Lohn / Material) */
  kostenverteilung?: KostenVerteilung
  /** Zeilentyp — Standard Position */
  kind?: PosBoardLineKind
  /** Nur kind=nachlass */
  nachlassModus?: 'prozent' | 'betrag'
  /** Legacy Preisliste-ID (= oft Katalog-Varianten-ID nach Import) */
  preisliste_id?: string | null
  /** Katalog-Variante (Herkunft) */
  variante_id?: string | null
  /** katalog | frei */
  position_quelle?: 'katalog' | 'frei' | null
  /** Kundennotiz / Regie-Meta */
  notizExtern?: string
  /** Sichtbarer Regieschein-Chip auf Rechnung */
  regieSchein?: boolean
}

function parseKostenverteilung(v: unknown): KostenVerteilung {
  if (v === 'lohn' || v === 'material' || v === 'allgemein') return v
  return 'allgemein'
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
    kostenverteilung: 'allgemein',
    ...partial,
  }
}

export function posBoardLineNetto(line: PosBoardLine): number {
  if (line.kind === 'freitext') return 0
  if (line.kind === 'nachlass') {
    // Anzeigezeile — Abzug wird dokumentweit berechnet; hier 0 für Positions-Summe
    return 0
  }
  return (Number(line.menge) || 0) * (Number(line.preis) || 0)
}

export function posBoardLineFromAngebotPosition(p: AngebotPosition): PosBoardLine {
  const name = (p.leistung_name || p.leistung || '').trim()
  const beschreibungRaw = (p.beschreibung || '').trim()
  const displayName = name || beschreibungRaw || '(ohne Bezeichnung)'
  const varianteId = p.variante_id || p.leistung_id || null
  const isRegie = String(p.verguetung ?? '').toLowerCase() === 'aufwand'
  return {
    id: p.id,
    gewerk: p.gewerk_name?.trim() || p.gewerk_id || POS_BOARD_DEFAULT_GEWERK,
    gewerk_id: p.gewerk_id?.trim() || null,
    gewerk_slug: p.gewerk_slug?.trim() || null,
    name: displayName,
    beschreibung: name ? beschreibungRaw : '',
    menge: Number(p.menge) || 0,
    einheit: p.einheit || 'Stück',
    preis: positionVkNettoStueck(p),
    ust: p.mwst_satz != null ? Number(p.mwst_satz) : 19,
    kostenverteilung: parseKostenverteilung(p.kostenverteilung),
    preisliste_id: varianteId,
    variante_id: varianteId,
    position_quelle:
      p.position_quelle === 'katalog' || p.position_quelle === 'frei'
        ? p.position_quelle
        : varianteId
          ? 'katalog'
          : 'frei',
    notizExtern: p.notiz_extern,
    regieSchein: isRegie,
  }
}

function resolvePosBoardGewerkFields(
  line: PosBoardLine,
  base: Partial<AngebotPosition> | undefined,
  gewerke: Gewerk[]
): Pick<AngebotPosition, 'gewerk_id' | 'gewerk_name' | 'gewerk_slug'> {
  return withResolvedGewerkMeta(
    {
      gewerk_id: line.gewerk_id?.trim() || base?.gewerk_id?.trim() || '',
      gewerk_slug: line.gewerk_slug?.trim() || base?.gewerk_slug?.trim(),
      gewerk_name: line.gewerk?.trim() || base?.gewerk_name?.trim() || POS_BOARD_DEFAULT_GEWERK,
    },
    gewerke
  )
}

export function posBoardLineToAngebotPosition(
  line: PosBoardLine,
  base?: Partial<AngebotPosition>,
  gewerke: Gewerk[] = []
): AngebotPosition {
  const m = Math.max(line.menge || 1, 0.0001)
  const vk = Math.round((Number(line.preis) || 0) * 100) / 100
  const lineTotal = Math.round(vk * m * 100) / 100
  const kostenverteilung = parseKostenverteilung(
    line.kostenverteilung ?? base?.kostenverteilung
  )
  const { lohn_netto, material_netto } = splitNettoStueck(vk, {
    firm: defaultFirmenEinstellungen(),
    leistung: line.name,
    kostenverteilung,
  })
  const isRegie = Boolean(line.regieSchein)
  const gewerkFields = resolvePosBoardGewerkFields(line, base, gewerke)
  return {
    ...(base ?? {}),
    id: line.id,
    gewerk_id: gewerkFields.gewerk_id,
    gewerk_name: gewerkFields.gewerk_name,
    gewerk_slug: gewerkFields.gewerk_slug,
    gewerk_block_key: base?.gewerk_block_key,
    leistung: line.name,
    leistung_name: line.name,
    leistung_id: line.variante_id || line.preisliste_id || base?.leistung_id,
    variante_id: line.variante_id || line.preisliste_id || base?.variante_id || null,
    position_quelle:
      line.position_quelle ||
      (line.variante_id || line.preisliste_id ? 'katalog' : 'frei'),
    beschreibung: line.beschreibung ?? '',
    lohn_netto,
    material_netto,
    vk_netto: vk,
    gesamt_min: lineTotal,
    gesamt_max: lineTotal,
    menge: line.menge,
    einheit: line.einheit,
    mwst_satz: line.ust ?? 19,
    preis_typ: 'fix',
    einkaufspreis: base?.einkaufspreis,
    kostenverteilung,
    verguetung: isRegie ? 'aufwand' : 'festpreis',
    ...(isRegie
      ? {
          geschaetzt_std: m,
          stundensatz: vk,
          notiz_extern: line.notizExtern?.trim() || 'nach Aufwand',
        }
      : line.notizExtern?.trim()
        ? { notiz_extern: line.notizExtern.trim() }
        : {}),
  }
}

export function posBoardLinesFromAngebotPositionen(
  items: AngebotPosition[] | null | undefined
): PosBoardLine[] {
  const list = Array.isArray(items) ? items : []
  return list.map(posBoardLineFromAngebotPosition)
}

export function posBoardLinesToAngebotPositionen(
  lines: PosBoardLine[] | null | undefined,
  baseById?: Map<string, Partial<AngebotPosition>>,
  gewerke: Gewerk[] = []
): AngebotPosition[] {
  const list = Array.isArray(lines) ? lines : []
  return list.map((line) => posBoardLineToAngebotPosition(line, baseById?.get(line.id), gewerke))
}

export function posBoardLineFromDokumentArtikel(z: DokumentArtikelZeile): PosBoardLine {
  const varianteId = z.variante_id || z.preisliste_id || null
  return {
    id: z.id,
    gewerk: z.gewerkName?.trim() || GEWERK_NAME_ALLGEMEIN,
    gewerk_id: z.gewerk_id?.trim() || null,
    gewerk_slug: z.gewerk_slug?.trim() || null,
    // Leer lassen dürfen — sonst springt der Editor bei Löschen zurück auf „Position“
    name: z.bezeichnung ?? '',
    beschreibung: z.positionBeschreibung ?? undefined,
    menge: z.menge,
    einheit: z.einheit,
    preis: z.vkNetto,
    ust: z.mwstSatz,
    kostenverteilung: parseKostenverteilung(z.kostenverteilung),
    preisliste_id: varianteId,
    variante_id: varianteId,
    position_quelle:
      z.position_quelle === 'katalog' || z.position_quelle === 'frei'
        ? z.position_quelle
        : varianteId
          ? 'katalog'
          : 'frei',
    notizExtern: z.notizExtern,
    regieSchein: z.regieSchein,
  }
}

export function posBoardLineToDokumentArtikel(
  line: PosBoardLine,
  base?: Partial<DokumentArtikelZeile>,
  gewerke: Gewerk[] = []
): DokumentArtikelZeile {
  const mwst: MwstSatzOption =
    line.ust === 0 || line.ust === 7 ? line.ust : 19
  const kostenverteilung = parseKostenverteilung(
    line.kostenverteilung ?? base?.kostenverteilung
  )
  const gewerkFields = resolvePosBoardGewerkFields(
    line,
    base
      ? {
          gewerk_id: base.gewerk_id,
          gewerk_slug: base.gewerk_slug,
          gewerk_name: base.gewerkName,
        }
      : undefined,
    gewerke
  )
  return {
    ...neueArtikelZeile({
      id: line.id,
      bezeichnung: line.name,
      positionBeschreibung: line.beschreibung,
      notizExtern: line.notizExtern ?? base?.notizExtern,
      regieSchein: line.regieSchein ?? base?.regieSchein,
      menge: line.menge,
      einheit: line.einheit,
      vkNetto: line.preis,
      mwstSatz: mwst,
      gewerkName: gewerkFields.gewerk_name,
      gewerk_id: gewerkFields.gewerk_id,
      gewerk_slug: gewerkFields.gewerk_slug,
      gewerk_block_key: base?.gewerk_block_key,
      preisliste_id: line.variante_id || line.preisliste_id || base?.preisliste_id,
      variante_id: line.variante_id || line.preisliste_id || base?.variante_id,
      position_quelle:
        line.position_quelle ||
        (line.variante_id || line.preisliste_id ? 'katalog' : 'frei'),
      kostenart: base?.kostenart,
      kostenverteilung,
      rabattProzent: base?.rabattProzent ?? 0,
      fachbetriebHinweisAnzeigen: base?.fachbetriebHinweisAnzeigen,
    }),
    id: line.id,
  }
}

export function dokumentZeilenToPosBoardLines(zeilen: DokumentZeile[]): PosBoardLine[] {
  const out: PosBoardLine[] = []
  for (const z of zeilen) {
    if (z.typ === 'artikel') {
      out.push(posBoardLineFromDokumentArtikel(z))
      continue
    }
    if (z.typ === 'freitext') {
      out.push({
        id: z.id,
        gewerk: GEWERK_NAME_ALLGEMEIN,
        name: z.titel ?? '',
        beschreibung: z.text ?? '',
        menge: 0,
        einheit: '',
        preis: 0,
        ust: 0,
        kind: 'freitext',
      })
      continue
    }
    if (z.typ === 'gesamtrabatt') {
      out.push({
        id: z.id,
        gewerk: GEWERK_NAME_ALLGEMEIN,
        name: z.bezeichnung ?? '',
        beschreibung: '',
        menge: 1,
        einheit: z.modus === 'prozent' ? '%' : '€',
        preis: z.wert,
        ust: 0,
        kind: 'nachlass',
        nachlassModus: z.modus,
      })
    }
  }
  return out
}

/** Ersetzt alle PosBoard-Zeilen inkl. Freitext/Nachlass. */
export function posBoardLinesToDokumentZeilen(
  lines: PosBoardLine[],
  existing: DokumentZeile[],
  gewerke: Gewerk[] = []
): DokumentZeile[] {
  const baseById = new Map<string, DokumentArtikelZeile>()
  const freitextById = new Map<string, DokumentFreitextZeile>()
  const rabattById = new Map<string, DokumentGesamtrabattZeile>()
  for (const z of existing) {
    if (z.typ === 'artikel') baseById.set(z.id, z)
    if (z.typ === 'freitext') freitextById.set(z.id, z)
    if (z.typ === 'gesamtrabatt') rabattById.set(z.id, z)
  }

  const out: DokumentZeile[] = []
  let nachlass: DokumentGesamtrabattZeile | null = null

  for (const line of lines) {
    const kind = line.kind ?? 'position'
    if (kind === 'freitext') {
      const prev = freitextById.get(line.id)
      out.push({
        ...(prev ?? neueFreitextZeile()),
        id: line.id,
        typ: 'freitext',
        // Kein Fallback auf prev — sonst lassen sich Titel/Text nicht leeren / Leerzeichen tippen
        titel: line.name ?? '',
        text: line.beschreibung ?? '',
      })
      continue
    }
    if (kind === 'nachlass') {
      const prev = rabattById.get(line.id)
      nachlass = {
        ...(prev ?? neueGesamtrabattZeile()),
        id: line.id,
        typ: 'gesamtrabatt',
        bezeichnung: line.name ?? prev?.bezeichnung ?? 'Nachlass',
        modus: line.nachlassModus ?? prev?.modus ?? 'prozent',
        wert: Math.max(0, Number(line.preis) || 0),
      }
      continue
    }
    out.push(posBoardLineToDokumentArtikel(line, baseById.get(line.id), gewerke))
  }

  return nachlass ? [...out, nachlass] : out
}
