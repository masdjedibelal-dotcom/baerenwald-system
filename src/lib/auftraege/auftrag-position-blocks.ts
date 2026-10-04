import type { AuftragPosition } from '@/lib/types';
import { istGewerkBeschreibungLeistungName } from '@/lib/dokument-zeilen';

export type GewerkOpt = { id: string; name: string; slug: string }

export type AuftragGewerkBlock = {
  key: string
  gewerkId: string
  gewerkName: string
  gewerkSlug: string | null
  positionen: AuftragPosition[]
}

/** Interne Gewerk-Beschreibung aus Angebot (nicht in UI-Listen). */
export function istInterneAuftragGewerkBeschreibung(p: AuftragPosition): boolean {
  return istGewerkBeschreibungLeistungName(p.leistung_name)
}

/** Auftragspositionen in Gewerk-Abschnitte (Reihenfolge der ersten Position pro Gewerk). */
export function groupAuftragPositionenByGewerk(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): AuftragGewerkBlock[] {
  const sorted = [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const blocks: AuftragGewerkBlock[] = []
  const indexByKey = new Map<string, number>()

  for (const p of sorted) {
    const g =
      (p.gewerk_slug ? gewerke.find((x) => x.slug === p.gewerk_slug) : undefined) ??
      gewerke.find((x) => x.name === p.gewerk_name)
    const key =
      p.gewerk_block_key?.trim() ||
      p.gewerk_slug?.trim() ||
      `name:${p.gewerk_name}`
    let idx = indexByKey.get(key)
    if (idx === undefined) {
      idx = blocks.length
      indexByKey.set(key, idx)
      blocks.push({
        key,
        gewerkId: g?.id ?? '',
        gewerkName: g?.name ?? p.gewerk_name,
        gewerkSlug: p.gewerk_slug ?? g?.slug ?? null,
        positionen: [],
      })
    }
    blocks[idx]!.positionen.push(p)
  }

  return blocks
}
