import type { AngebotVariantenPersistJson } from '@/lib/angebote/angebot-wizard-types'
import {
  groupAngebotPositionenByBlock,
  positionenFuerSummen,
  resolveBlockTitelFromGroup,
  type AngebotBlockPdfEntry,
  type AngebotPdfFreitext,
  type AngebotPositionBlockGroup,
} from '@/lib/angebote/angebot-position-blocks'
import { summenAusPositionen, normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotTemplatePosition, AngebotTemplateSummen } from '@/lib/templates/angebot-template'
import type { AngebotPosition, Gewerk } from '@/lib/types'
import {
  getHinweisForPosition,
  gewerkById,
  resolveIstFachbetriebInPdf,
} from '@/lib/gewerke-ausfuehrung'
import { angebotGewerkNameAnzeige, ZEILE_SLUG_FREITEXT } from '@/lib/dokument-zeilen'
import { richTextToPlain } from '@/lib/rich-text'

export type { AngebotPdfFreitext, AngebotBlockPdfEntry, AngebotPositionBlockGroup }

/** Ein Gewerk- oder Varianten-Abschnitt im Projektangebot-PDF. */
export type AngebotProjektPdfBlock = {
  nummer: number
  titel: string
  leistungsliste: string[]
  /** Gemischte Reihenfolge für PDF (Positionen + Freitexte) */
  entries: AngebotBlockPdfEntry[]
  /** Nur Preis-Positionen (Kompatibilität / Summen) */
  positionen: AngebotTemplatePosition[]
  summen: AngebotTemplateSummen
}

export function mapAngebotPositionenToTemplateRows(
  anPos: AngebotPosition[],
  gewerke: Gewerk[]
): AngebotTemplatePosition[] {
  let posNr = 0
  return anPos
    .filter((p) => (p.gewerk_slug ?? '') !== ZEILE_SLUG_FREITEXT)
    .map((p) => {
      posNr += 1
      const menge = Math.max(Number(p.menge) || 1, 0.01)
      const einzel =
        (() => {
          const unit = Number(p.lohn_netto ?? 0) + Number(p.material_netto ?? 0)
          if (unit > 0) return Math.round(unit * 100) / 100
          const a = Number(p.gesamt_min ?? 0)
          const b = Number(p.gesamt_max ?? 0)
          if (a <= 0 && b <= 0) return 0
          return a === b ? Math.round(a * 100) / 100 : Math.round(((a + b) / 2) * 100) / 100
        })()
      const gesamt = Math.round(einzel * menge * 100) / 100
      const g = gewerkById(gewerke, p.gewerk_id)
      const istFachbetrieb = resolveIstFachbetriebInPdf(p, g)
      const leistung = (p.leistung || '').trim()
      const beschRaw = (p.beschreibung || '').trim()
      const defaultHinweis = g?.id ? getHinweisForPosition(g.id, gewerke) : ''
      let beschreibung: string | null = null
      if (beschRaw && beschRaw !== leistung) {
        if (!istFachbetrieb && defaultHinweis && beschRaw === defaultHinweis) {
          beschreibung = null
        } else {
          beschreibung = beschRaw
        }
      }
      return {
        pos: posNr,
        gewerk_name: angebotGewerkNameAnzeige(p.gewerk_name?.trim() || g?.name?.trim() || null),
        bezeichnung: p.leistung || p.beschreibung || 'Position',
        beschreibung,
        ist_fachbetrieb: istFachbetrieb,
        menge,
        einheit: p.einheit || 'pauschal',
        einzelpreis_netto: einzel,
        rabatt_prozent: null,
        gesamt_netto: gesamt,
      }
    })
}

function summenToTemplate(s: ReturnType<typeof summenAusPositionen>, mwstSatz = 19): AngebotTemplateSummen {
  return {
    netto: Math.round(s.nettoMin * 100) / 100,
    mwst_prozent: mwstSatz,
    mwst_betrag: Math.round(s.mwstBetragMin * 100) / 100,
    brutto: Math.round(s.bruttoMin * 100) / 100,
  }
}

/** Leistungs-Bullets aus Positions-Beschreibungen (wie im Word-Muster). */
export function leistungslisteAusPositionen(rows: AngebotTemplatePosition[]): string[] {
  const seen = new Set<string>()
  const bullets: string[] = []
  for (const p of rows) {
    const raw = p.beschreibung?.trim()
    if (!raw || raw === p.bezeichnung.trim()) continue
    const plain = richTextToPlain(raw)
    for (const line of plain.split(/\n+/)) {
      const t = line.replace(/^[-•*]\s*/, '').trim()
      if (t.length > 2 && !seen.has(t)) {
        seen.add(t)
        bullets.push(t)
      }
    }
  }
  return bullets.slice(0, 12)
}

function blockToPdf(
  group: AngebotPositionBlockGroup,
  nummer: number,
  gewerke: Gewerk[],
  mwstSatz: number
): AngebotProjektPdfBlock {
  const priced = positionenFuerSummen(group)
  const rows = mapAngebotPositionenToTemplateRows(priced, gewerke)
  return {
    nummer,
    titel: resolveBlockTitelFromGroup(group, gewerke),
    leistungsliste: leistungslisteAusPositionen(rows),
    entries: group.entries,
    positionen: rows,
    summen: summenToTemplate(summenAusPositionen(priced, mwstSatz), mwstSatz),
  }
}

export function buildProjektPdfBloecke(
  hauptPositionen: AngebotPosition[],
  varianten: AngebotVariantenPersistJson | null,
  gewerke: Gewerk[],
  mwstSatz = 19
): AngebotProjektPdfBlock[] {
  const posB = varianten?.b?.positionen?.length
    ? normalizeAngebotPositionen(varianten.b.positionen)
    : []

  if (posB.length > 0 && varianten) {
    const posA = varianten.a?.positionen?.length
      ? normalizeAngebotPositionen(varianten.a.positionen)
      : normalizeAngebotPositionen(hauptPositionen)
    const blocks: AngebotProjektPdfBlock[] = []
    const aGroups = groupAngebotPositionenByBlock(posA, gewerke)
    if (aGroups.length) {
      blocks.push({
        ...blockToPdf(aGroups[0], 1, gewerke, mwstSatz),
        titel: varianten.a?.name?.trim() || aGroups[0].titel,
      })
    } else {
      blocks.push({
        nummer: 1,
        titel: varianten.a?.name?.trim() || 'Variante A',
        leistungsliste: [],
        entries: [],
        positionen: [],
        summen: summenToTemplate(summenAusPositionen(posA, mwstSatz), mwstSatz),
      })
    }
    const bGroups = groupAngebotPositionenByBlock(posB, gewerke)
    if (bGroups.length) {
      blocks.push({
        ...blockToPdf(bGroups[0], 2, gewerke, mwstSatz),
        titel: varianten.b?.name?.trim() || bGroups[0].titel,
      })
    } else {
      blocks.push({
        nummer: 2,
        titel: varianten.b?.name?.trim() || 'Variante B',
        leistungsliste: [],
        entries: [],
        positionen: [],
        summen: summenToTemplate(summenAusPositionen(posB, mwstSatz), mwstSatz),
      })
    }
    return blocks
  }

  const pos = normalizeAngebotPositionen(hauptPositionen)
  const groups = groupAngebotPositionenByBlock(pos, gewerke)
  if (groups.length <= 1) {
    const g = groups[0]
    if (!g) {
      return [
        {
          nummer: 1,
          titel: 'Leistungsübersicht',
          leistungsliste: [],
          entries: [],
          positionen: [],
          summen: summenToTemplate(summenAusPositionen(pos, mwstSatz), mwstSatz),
        },
      ]
    }
    return [blockToPdf(g, 1, gewerke, mwstSatz)]
  }

  return groups.map((g, i) => blockToPdf(g, i + 1, gewerke, mwstSatz))
}
