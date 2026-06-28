import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import type { GewerkOpt } from '@/lib/auftraege/auftrag-position-blocks'
import { istInterneAuftragGewerkBeschreibung } from '@/lib/auftraege/auftrag-position-blocks'
import {
  istEigenleistungPosition,
  preisEigenleistung,
  preisPartner,
} from '@/lib/auftraege/auftrag-leistung-phasen'
import type { AuftragPosition } from '@/lib/types'

/** Gruppiert nach gewerk_block_key (wie Angebot/Legacy), Fallback gewerk_slug / gewerk_name. */
export function groupPositionenByGewerkSlug(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): AuftragGewerkBlock[] {
  const sorted = [...positionen]
    .filter((p) => !istInterneAuftragGewerkBeschreibung(p))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const blocks: AuftragGewerkBlock[] = []
  const indexByKey = new Map<string, number>()

  for (const p of sorted) {
    const slug = p.gewerk_slug?.trim()
    const g =
      (slug ? gewerke.find((x) => x.slug === slug) : undefined) ??
      gewerke.find((x) => x.name === p.gewerk_name)
    const key =
      p.gewerk_block_key?.trim() ||
      slug ||
      `name:${p.gewerk_name.trim().toLowerCase()}`

    let idx = indexByKey.get(key)
    if (idx === undefined) {
      idx = blocks.length
      indexByKey.set(key, idx)
      blocks.push({
        key,
        gewerkId: g?.id ?? '',
        gewerkName: g?.name ?? p.gewerk_name,
        gewerkSlug: slug ?? g?.slug ?? null,
        positionen: [],
      })
    }
    blocks[idx]!.positionen.push(p)
  }

  return blocks
}

export function createLeeresGewerkBlock(gewerk: GewerkOpt): AuftragGewerkBlock {
  return {
    key: `${gewerk.slug}-${Date.now()}`,
    gewerkId: gewerk.id,
    gewerkName: gewerk.name,
    gewerkSlug: gewerk.slug,
    positionen: [],
  }
}

export function blockVkSumme(block: AuftragGewerkBlock): number {
  return block.positionen.reduce((s, p) => s + Math.max(0, p.preis_fix ?? 0), 0)
}

export function rowMarge(pos: AuftragPosition): { ek: number; marge: number; pct: number | null } {
  const vk = Math.max(0, pos.preis_fix ?? 0)
  const ek = istEigenleistungPosition(pos) ? preisEigenleistung(pos) : preisPartner(pos)
  const marge = vk - ek
  const pct = vk > 0 ? Math.round((marge / vk) * 1000) / 10 : null
  return { ek, marge, pct }
}

export function formatZeitraumKurz(pos: AuftragPosition): string | null {
  const von = pos.start_datum?.slice(0, 10)
  const bis = pos.end_datum?.slice(0, 10)
  if (von && bis) return `${von} – ${bis}`
  if (von) return `ab ${von}`
  if (bis) return `bis ${bis}`
  return null
}

export function handwerkerInitialen(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}
