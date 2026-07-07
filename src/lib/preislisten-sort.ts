import type { Preisliste } from '@/lib/types'

/** Sortierung wie in der Preislisten-Abfrage: Gewerk → Kategorie → Leistung */
export function sortPreislistenRows(rows: Preisliste[]): Preisliste[] {
  return [...rows].sort((a, b) => {
    const na = a.gewerke?.name ?? ''
    const nb = b.gewerke?.name ?? ''
    if (na !== nb) return na.localeCompare(nb, 'de')
    const ka = (a.kategorie ?? '').trim()
    const kb = (b.kategorie ?? '').trim()
    if (ka !== kb) return ka.localeCompare(kb, 'de')
    return a.leistung.localeCompare(b.leistung, 'de')
  })
}
