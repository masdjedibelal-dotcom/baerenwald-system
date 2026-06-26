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
  const hwId = pos.handwerker_id.trim()
  const gewerkId = gewerkIdFuerPosition(pos, gewerke)
  const forHw = rows.filter((r) => r.handwerker_id === hwId)

  if (gewerkId) {
    const exact = forHw.find((r) => r.gewerk_id === gewerkId)
    if (exact) return exact
  }

  // Portal-Zuweisung ohne gewerk_id (Legacy): eindeutige Zeile pro Handwerker
  const ohneGewerk = forHw.filter((r) => !r.gewerk_id?.trim())
  if (ohneGewerk.length === 1) return ohneGewerk[0]!
  if (forHw.length === 1) return forHw[0]!

  return null
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
