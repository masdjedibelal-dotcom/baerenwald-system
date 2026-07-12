import type { AuftragDetail } from '@/lib/types'

export type HandwerkerBewertungZiel = {
  handwerkerId: string
  name: string
  firma: string | null
  gewerkName: string | null
  gewerkId: string | null
}

/** Alle am Auftrag beteiligten Handwerker (dedupliziert). */
export function handwerkerAusAuftrag(detail: Pick<AuftragDetail, 'auftrag_handwerker' | 'auftrag_positionen'>): HandwerkerBewertungZiel[] {
  const map = new Map<string, HandwerkerBewertungZiel>()

  for (const z of detail.auftrag_handwerker ?? []) {
    if (!z.handwerker_id || !z.handwerker?.name) continue
    map.set(z.handwerker_id, {
      handwerkerId: z.handwerker_id,
      name: z.handwerker.name,
      firma: z.handwerker.firma ?? null,
      gewerkName: z.gewerke?.name ?? null,
      gewerkId: z.gewerk_id ?? null,
    })
  }

  for (const p of detail.auftrag_positionen ?? []) {
    if (!p.handwerker_id || !p.handwerker?.name) continue
    if (map.has(p.handwerker_id)) continue
    const hw = p.handwerker as { name: string; firma?: string | null }
    map.set(p.handwerker_id, {
      handwerkerId: p.handwerker_id,
      name: hw.name,
      firma: hw.firma ?? null,
      gewerkName: p.gewerk_name ?? null,
      gewerkId: null,
    })
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
