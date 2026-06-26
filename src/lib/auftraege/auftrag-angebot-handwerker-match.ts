import type { AngebotHandwerkerRow, AuftragPosition } from '@/lib/types'

type GewerkOpt = { id: string; name: string; slug: string }

export function gewerkIdFuerPosition(
  pos: Pick<AuftragPosition, 'gewerk_slug' | 'gewerk_name'>,
  gewerke: GewerkOpt[]
): string | null {
  const bySlug = pos.gewerk_slug?.trim()
    ? gewerke.find((g) => g.slug === pos.gewerk_slug)?.id
    : undefined
  if (bySlug) return bySlug
  const byName = gewerke.find((g) => g.name === pos.gewerk_name)?.id
  return byName ?? null
}

/** Partner-Anfrage aus Angebotsphase zu einer Auftragsposition. */
export function angebotHandwerkerFuerPosition(
  pos: Pick<AuftragPosition, 'handwerker_id' | 'gewerk_slug' | 'gewerk_name'>,
  rows: AngebotHandwerkerRow[],
  gewerke: GewerkOpt[]
): AngebotHandwerkerRow | null {
  if (!pos.handwerker_id?.trim()) return null
  const gewerkId = gewerkIdFuerPosition(pos, gewerke)
  if (!gewerkId) return null
  return (
    rows.find((r) => r.handwerker_id === pos.handwerker_id && r.gewerk_id === gewerkId) ?? null
  )
}

export function effektiverHandwerkerStatus(
  pos: Pick<AuftragPosition, 'handwerker_id' | 'handwerker_status'>,
  partnerRow: AngebotHandwerkerRow | null
): string {
  if (!pos.handwerker_id) return 'ausstehend'
  const posSt = (pos.handwerker_status ?? '').trim().toLowerCase()
  if (posSt) return posSt
  const partnerSt = (partnerRow?.status ?? '').trim().toLowerCase()
  if (partnerSt === 'akzeptiert' || partnerSt === 'abgelehnt' || partnerSt === 'angefragt') {
    return partnerSt
  }
  return 'zugewiesen'
}
