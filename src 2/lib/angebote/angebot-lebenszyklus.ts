import type { AngebotStatusEinfach, AngebotStatusEinfachRow } from '@/lib/angebot-einfach'
import { resolveStatusEinfach } from '@/lib/angebot-einfach'

export type AngebotListenZeile = AngebotStatusEinfachRow & {
  id: string
  created_at: string
  updated_at?: string | null
  lead_id?: string | null
  kunde_id?: string | null
}

export function findeNeuestenEntwurf<T extends AngebotListenZeile>(rows: T[]): T | null {
  const entwuerfe = rows.filter((r) => resolveStatusEinfach(r) === 'entwurf')
  if (!entwuerfe.length) return null
  return [...entwuerfe].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
}

/** Nur Entwürfe (plus bereits ersetzte) — kein aktives Gesendet/Angenommen. */
export function hatNurEntwuerfe(rows: AngebotListenZeile[]): boolean {
  if (!rows.length) return false
  return rows.every((r) => {
    const st = resolveStatusEinfach(r)
    return st === 'entwurf' || st === 'ersetzt'
  })
}

function gruppenSchluessel(row: AngebotListenZeile): string {
  if (row.lead_id?.trim()) return `lead:${row.lead_id.trim()}`
  if (row.kunde_id?.trim()) return `kunde:${row.kunde_id.trim()}`
  return `angebot:${row.id}`
}

function aktivScore(status: AngebotStatusEinfach): number {
  if (status === 'entwurf') return 0
  if (status === 'gesendet') return 1
  if (status === 'angenommen') return 2
  return 9
}

export function waehleAktivesAngebot<T extends AngebotListenZeile>(group: T[]): T {
  const ranked = group
    .map((a) => ({
      a,
      score: aktivScore(resolveStatusEinfach(a)),
      ts: new Date(a.updated_at ?? a.created_at).getTime(),
    }))
    .sort((x, y) => x.score - y.score || y.ts - x.ts)
  return ranked[0].a
}

/** Pipeline: pro Anfrage/Kunde nur das aktuelle Angebot anzeigen. */
export function filterAktiveAngeboteListe<T extends AngebotListenZeile>(
  angebote: T[]
): T[] {
  const byKey = new Map<string, T[]>()
  for (const a of angebote) {
    const key = gruppenSchluessel(a)
    const list = byKey.get(key) ?? []
    list.push(a)
    byKey.set(key, list)
  }
  return Array.from(byKey.values())
    .map((group) => waehleAktivesAngebot(group))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function zaehleWeitereVersionen(
  angebot: AngebotListenZeile,
  alle: AngebotListenZeile[]
): number {
  const key = gruppenSchluessel(angebot)
  const count = alle.filter((a) => gruppenSchluessel(a) === key).length
  return Math.max(0, count - 1)
}
