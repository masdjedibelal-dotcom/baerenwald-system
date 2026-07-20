import type { HandwerkerZuweisenScope } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import type { AuftragPosition } from '@/lib/types'

export function posQtyLabelForHandwerker(p: AuftragPosition): string {
  if (p.einheit && p.einheit !== 'pauschal') return `${p.menge ?? 1} ${p.einheit}`
  return 'Pauschal'
}

export function leistungenLabelsFromPositionen(positionen: AuftragPosition[]): string[] {
  return positionen.map((p) => {
    const qty = posQtyLabelForHandwerker(p)
    return `${p.leistung_name}${p.beschreibung ? ` — ${p.beschreibung}` : ''} (${qty})`
  })
}

/** Handwerker für alle Leistungen eines Gewerks. */
export function handwerkerScopeGewerkBlock(block: AuftragGewerkBlock): HandwerkerZuweisenScope | null {
  if (!block.gewerkId) return null
  return {
    type: 'gewerk',
    gewerkId: block.gewerkId,
    gewerkName: block.gewerkName,
    gewerkSlug: block.gewerkSlug,
    positionIds: block.positionen.map((p) => p.id),
    leistungen: leistungenLabelsFromPositionen(block.positionen),
  }
}

/** Handwerker für ausgewählte Leistungen (Multiselect, gleiches Gewerk). */
export function handwerkerScopePositionen(
  block: AuftragGewerkBlock,
  positionIds: string[]
): HandwerkerZuweisenScope | null {
  if (!block.gewerkId || !positionIds.length) return null
  const idSet = new Set(positionIds)
  const picked = block.positionen.filter((p) => idSet.has(p.id))
  if (!picked.length) return null
  return {
    type: 'gewerk',
    gewerkId: block.gewerkId,
    gewerkName: block.gewerkName,
    gewerkSlug: block.gewerkSlug,
    positionIds: picked.map((p) => p.id),
    leistungen: leistungenLabelsFromPositionen(picked),
  }
}

export function positionIdsOhneHandwerker(block: AuftragGewerkBlock): string[] {
  return block.positionen.filter((p) => !p.handwerker_id).map((p) => p.id)
}

export type HandwerkerGruppeInBlock = {
  handwerkerId: string
  handwerkerName: string
  telefon: string | null
  email: string | null
  positionIds: string[]
  leistungen: string[]
}

/** Zugewiesene Handwerker im Gewerk-Block — für Sammel-Mail / WhatsApp. */
export function handwerkerGruppenAusBlock(block: AuftragGewerkBlock): HandwerkerGruppeInBlock[] {
  const map = new Map<string, HandwerkerGruppeInBlock>()
  for (const p of block.positionen) {
    if (!p.handwerker_id || !p.handwerker) continue
    const id = p.handwerker_id
    let gruppe = map.get(id)
    if (!gruppe) {
      gruppe = {
        handwerkerId: id,
        handwerkerName: p.handwerker.name,
        telefon: p.handwerker.telefon ?? null,
        email: p.handwerker.email ?? null,
        positionIds: [],
        leistungen: [],
      }
      map.set(id, gruppe)
    }
    gruppe.positionIds.push(p.id)
    gruppe.leistungen.push(...leistungenLabelsFromPositionen([p]))
  }
  return Array.from(map.values())
}
