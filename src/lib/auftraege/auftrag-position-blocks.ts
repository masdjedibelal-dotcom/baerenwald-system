import type { AuftragPosition } from '@/lib/types'
import { istGewerkBeschreibungLeistungName } from '@/lib/dokument-zeilen'

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

/** Wie groupAuftragPositionenByGewerk, ohne interne Gewerk-Beschreibungs-Zeilen. */
export function groupAuftragPositionenByGewerkForAnzeige(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): AuftragGewerkBlock[] {
  return groupAuftragPositionenByGewerk(
    positionen.filter((p) => !istInterneAuftragGewerkBeschreibung(p)),
    gewerke
  ).filter((b) => b.positionen.length > 0)
}

/** Gewerke aus Auftragspositionen (für Bautagebuch-Phase). */
export function gewerkOptionenAusPositionen(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): { id: string; name: string }[] {
  return groupAuftragPositionenByGewerk(positionen, gewerke)
    .map((b) => ({
      id: b.gewerkId || b.key,
      name: b.gewerkName,
    }))
    .filter((o) => o.name.trim())
}

export function gewerkSelectionFromEintrag(
  e: { gewerk_id?: string | null; gewerk_phase_key?: string | null }
): string {
  return e.gewerk_id?.trim() || e.gewerk_phase_key?.trim() || ''
}

export function blockSummeVk(block: AuftragGewerkBlock): number {
  return block.positionen.reduce((s, p) => s + (p.preis_fix ?? 0), 0)
}
