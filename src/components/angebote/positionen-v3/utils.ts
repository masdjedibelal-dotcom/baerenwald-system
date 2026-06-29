import {
  istFreitextPosition,
  istGewerkBeschreibungPosition,
} from '@/lib/dokument-zeilen'
import { positionNettoZeile } from '@/lib/angebot-positionen'
import type { AngebotPosition, Gewerk } from '@/lib/types'
import type { AngebotPositionBlockGroup } from '@/lib/angebote/angebot-position-blocks'
import { positionenFuerSummen } from '@/lib/angebote/angebot-position-blocks'

export type AngebotGewerkOpt = { id: string; name: string; slug: string }

export type AngebotGewerkBlock = {
  key: string
  gewerkId: string
  gewerkName: string
  gewerkSlug: string | null
  positionen: AngebotPosition[]
}

export function angebotPositionAnzeigeTitel(p: AngebotPosition): string {
  const leistung = (p.leistung_name || p.leistung || '').trim()
  if (istFreitextPosition(p)) {
    if (leistung && leistung !== 'Freitext') return leistung
    return (p.gewerk_name || '').trim() || 'Freitext'
  }
  return leistung || (p.beschreibung || '').trim() || '—'
}

export function angebotRowMarge(p: AngebotPosition): { ek: number; marge: number; pct: number | null } {
  const vk = positionNettoZeile(p)
  const ek = Math.max(0, (p.einkaufspreis ?? 0) * (p.menge || 1))
  const marge = vk - ek
  const pct = vk > 0 ? Math.round((marge / vk) * 1000) / 10 : null
  return { ek, marge, pct }
}

export function blockVkSummeAngebot(block: AngebotPositionBlockGroup): number {
  return positionenFuerSummen(block).reduce((s, p) => s + positionNettoZeile(p), 0)
}

export function angebotPositionenFuerAnzeige(positionen: AngebotPosition[]): AngebotPosition[] {
  return positionen.filter((p) => !istGewerkBeschreibungPosition(p))
}

/** Gruppiert bearbeitbare Positionen nach gewerk_block_key (wie Auftrag v3). */
export function groupAngebotPositionenByGewerkBlock(
  positionen: AngebotPosition[],
  gewerke: Gewerk[] | AngebotGewerkOpt[]
): AngebotGewerkBlock[] {
  const sorted = angebotPositionenFuerAnzeige(positionen).filter((p) => !istFreitextPosition(p))
  const blocks: AngebotGewerkBlock[] = []
  const indexByKey = new Map<string, number>()

  for (const p of sorted) {
    const slug = p.gewerk_slug?.trim()
    const g =
      (slug ? gewerke.find((x) => x.slug === slug) : undefined) ??
      gewerke.find((x) => x.name === p.gewerk_name)
    const key =
      p.gewerk_block_key?.trim() ||
      p.gewerk_id?.trim() ||
      slug ||
      `name:${(p.gewerk_name || '').trim().toLowerCase()}`

    let idx = indexByKey.get(key)
    if (idx === undefined) {
      idx = blocks.length
      indexByKey.set(key, idx)
      blocks.push({
        key,
        gewerkId: g?.id ?? p.gewerk_id ?? '',
        gewerkName: g?.name ?? p.gewerk_name,
        gewerkSlug: slug ?? g?.slug ?? null,
        positionen: [],
      })
    }
    blocks[idx]!.positionen.push(p)
  }

  return blocks
}

export function createLeeresAngebotGewerkBlock(gewerk: AngebotGewerkOpt): AngebotGewerkBlock {
  return {
    key: `${gewerk.slug}-${Date.now()}`,
    gewerkId: gewerk.id,
    gewerkName: gewerk.name,
    gewerkSlug: gewerk.slug,
    positionen: [],
  }
}

export function blockVkSummeAngebotBlock(block: AngebotGewerkBlock): number {
  return block.positionen.reduce((s, p) => s + positionNettoZeile(p), 0)
}
