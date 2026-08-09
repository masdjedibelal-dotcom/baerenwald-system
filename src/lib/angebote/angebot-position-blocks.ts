import { GEWERK_SLUG_ANFAHRT, rebindLooseAnfahrtPositionen } from '@/lib/anfahrt-angebot'
import {
  angebotGewerkNameAnzeige,
  GEWERK_BESCHREIBUNG_TITEL,
  istFreitextPosition,
  istGewerkBeschreibungLeistungName,
  istGewerkBeschreibungPosition,
} from '@/lib/dokument-zeilen'
import type { AngebotPosition, Gewerk } from '@/lib/types'

export type AngebotPdfFreitext = {
  titel: string
  text: string
}

export type AngebotBlockPdfEntry =
  | { kind: 'position'; position: AngebotPosition }
  | { kind: 'freitext'; freitext: AngebotPdfFreitext }

export type AngebotPositionBlockGroup = {
  key: string
  titel: string
  /** Reihenfolge wie im Wizard (Positionen und Freitexte gemischt) */
  entries: AngebotBlockPdfEntry[]
}

function blockKeyForPosition(p: AngebotPosition): string {
  const explicit = p.gewerk_block_key?.trim()
  if (explicit) return explicit
  if ((p.gewerk_slug ?? '') === GEWERK_SLUG_ANFAHRT) return '__anfahrt__'
  return p.gewerk_id?.trim() || p.gewerk_slug?.trim() || p.gewerk_name?.trim() || 'frei'
}

function titelForBlock(key: string, sample: AngebotPosition | undefined, gewerke: Gewerk[]): string {
  if (key === '__anfahrt__') return 'Anfahrt'
  const gid = sample?.gewerk_id?.trim() || gewerke.find((g) => g.id === key)?.id || ''
  const g = gewerke.find((x) => x.id === gid)
  const raw = sample?.gewerk_name?.trim() || g?.name
  if (!raw) return 'Weitere Leistungen'
  return angebotGewerkNameAnzeige(raw)
}

/** Gewerk-Überschrift aus Artikel-Positionen (individueller Wizard-Titel hat Vorrang). */
export function resolveBlockTitelFromGroup(
  group: AngebotPositionBlockGroup,
  gewerke: Gewerk[]
): string {
  for (const entry of group.entries) {
    if (entry.kind !== 'position') continue
    const name = entry.position.gewerk_name?.trim()
    if (name) return angebotGewerkNameAnzeige(name)
  }
  return titelForBlock(group.key, undefined, gewerke)
}

/** Reihenfolge wie im Wizard; Freitexte bleiben beim Abschnitt, in dem sie eingefügt wurden. */
export function groupAngebotPositionenByBlock(
  positionen: AngebotPosition[],
  gewerke: Gewerk[]
): AngebotPositionBlockGroup[] {
  const pos = rebindLooseAnfahrtPositionen(positionen)
  const order: string[] = []
  const map = new Map<string, AngebotPositionBlockGroup>()
  let lastKey = 'frei'
  let lastSample: AngebotPosition | undefined

  const ensure = (key: string, sample?: AngebotPosition) => {
    if (!map.has(key)) {
      order.push(key)
      map.set(key, {
        key,
        titel: titelForBlock(key, sample, gewerke),
        entries: [],
      })
    }
    return map.get(key)!
  }

  for (const p of pos) {
    if (istGewerkBeschreibungPosition(p)) {
      const key = p.gewerk_block_key?.trim() || lastKey
      lastKey = key
      ensure(key, lastSample)
      ensure(key, lastSample).entries.push({
        kind: 'freitext',
        freitext: {
          titel: GEWERK_BESCHREIBUNG_TITEL,
          text: (p.beschreibung ?? '').trim(),
        },
      })
      continue
    }

    if (istFreitextPosition(p)) {
      const key = p.gewerk_block_key?.trim() || lastKey
      lastKey = key
      ensure(key, lastSample)
      ensure(key, lastSample).entries.push({
        kind: 'freitext',
        freitext: {
          titel: (() => {
            const t = (p.leistung ?? '').trim()
            if (!t || t === 'Freitext') return ''
            return t
          })(),
          text: (p.beschreibung ?? '').trim(),
        },
      })
      continue
    }

    const key = blockKeyForPosition(p)
    lastKey = key
    lastSample = p
    ensure(key, p).entries.push({ kind: 'position', position: p })
  }

  return order.map((k) => {
    const group = map.get(k)!
    return {
      ...group,
      titel: resolveBlockTitelFromGroup(group, gewerke),
    }
  })
}

export function positionenAusBlock(group: AngebotPositionBlockGroup): AngebotPosition[] {
  return group.entries
    .filter((e): e is Extract<AngebotBlockPdfEntry, { kind: 'position' }> => e.kind === 'position')
    .map((e) => e.position)
}

export function positionenFuerSummen(block: AngebotPositionBlockGroup): AngebotPosition[] {
  return positionenAusBlock(block).filter((p) => !istFreitextPosition(p))
}

/** Interne Gewerk-Notiz aus dem Wizard — nicht in Positions-Listen anzeigen. */
export function istInterneGewerkBeschreibungEntry(entry: AngebotBlockPdfEntry): boolean {
  return entry.kind === 'freitext' && istGewerkBeschreibungLeistungName(entry.freitext.titel)
}

/** Positions-Tab / Detail-Ansicht ohne interne Gewerk-Beschreibungen. */
export function groupAngebotPositionenByBlockForAnzeige(
  positionen: AngebotPosition[],
  gewerke: Gewerk[]
): AngebotPositionBlockGroup[] {
  return groupAngebotPositionenByBlock(positionen, gewerke).map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => !istInterneGewerkBeschreibungEntry(entry)),
  }))
}
