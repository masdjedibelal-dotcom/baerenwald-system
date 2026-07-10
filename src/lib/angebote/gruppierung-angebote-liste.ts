import type { AngebotListenZeile } from '@/lib/angebote/angebot-lebenszyklus'
import { waehleAktivesAngebot } from '@/lib/angebote/angebot-lebenszyklus'

function gruppenSchluessel(row: AngebotListenZeile): string {
  if (row.lead_id?.trim()) return `lead:${row.lead_id.trim()}`
  if (row.kunde_id?.trim()) return `kunde:${row.kunde_id.trim()}`
  return `angebot:${row.id}`
}

export type AngebotListenGruppe<T extends AngebotListenZeile> = {
  key: string
  aktiv: T
  weitere: T[]
}

/** Pro Anfrage/Kunde: aktives Angebot + ältere Versionen (neueste zuerst). */
export function gruppiereAngeboteMitVersionen<T extends AngebotListenZeile>(
  angebote: T[]
): AngebotListenGruppe<T>[] {
  const byKey = new Map<string, T[]>()
  for (const a of angebote) {
    const key = gruppenSchluessel(a)
    const list = byKey.get(key) ?? []
    list.push(a)
    byKey.set(key, list)
  }
  return Array.from(byKey.entries())
    .map(([key, group]) => {
      const sorted = [...group].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const aktiv = waehleAktivesAngebot(group)
      const weitere = sorted.filter((a) => a.id !== aktiv.id)
      return { key, aktiv, weitere }
    })
    .sort(
      (a, b) =>
        new Date(b.aktiv.created_at).getTime() - new Date(a.aktiv.created_at).getTime()
    )
}

export function findeAngebotGruppe<T extends AngebotListenZeile>(
  angebot: T,
  alle: T[]
): AngebotListenGruppe<T> | null {
  const key = gruppenSchluessel(angebot)
  const group = alle.filter((a) => gruppenSchluessel(a) === key)
  if (!group.length) return null
  const sorted = [...group].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const aktiv = waehleAktivesAngebot(group)
  return { key, aktiv, weitere: sorted.filter((a) => a.id !== aktiv.id) }
}
