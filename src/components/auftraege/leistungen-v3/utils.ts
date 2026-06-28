import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import type { GewerkOpt } from '@/lib/auftraege/auftrag-position-blocks'
import { istInterneAuftragGewerkBeschreibung } from '@/lib/auftraege/auftrag-position-blocks'
import {
  istEigenleistungPosition,
  preisEigenleistung,
  preisPartner,
} from '@/lib/auftraege/auftrag-leistung-phasen'
import type { AuftragPosition } from '@/lib/types'

/** Gruppiert strikt nach gewerk_slug (Fallback: gewerk_name). */
export function groupPositionenByGewerkSlug(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): AuftragGewerkBlock[] {
  const sorted = [...positionen]
    .filter((p) => !istInterneAuftragGewerkBeschreibung(p))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const map = new Map<string, AuftragGewerkBlock>()

  for (const p of sorted) {
    const slug = p.gewerk_slug?.trim()
    const key = slug || `name:${p.gewerk_name.trim().toLowerCase()}`
    const g =
      (slug ? gewerke.find((x) => x.slug === slug) : undefined) ??
      gewerke.find((x) => x.name === p.gewerk_name)

    let block = map.get(key)
    if (!block) {
      block = {
        key,
        gewerkId: g?.id ?? '',
        gewerkName: g?.name ?? p.gewerk_name,
        gewerkSlug: slug ?? g?.slug ?? null,
        positionen: [],
      }
      map.set(key, block)
    }
    block.positionen.push(p)
  }

  return Array.from(map.values())
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
