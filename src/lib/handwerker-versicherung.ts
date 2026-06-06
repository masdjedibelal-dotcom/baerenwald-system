/** Slug des Compliance-Typs „Betriebshaftpflichtversicherung“. */
export const VERSICHERUNG_TYP_SLUG = 'betriebshaftpflicht'

export type VersicherungStatus = 'ok' | 'warn' | 'expired' | 'missing'

function startOfDayMs(iso: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return NaN
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function versicherungStatus(
  gueltig_bis: string | null | undefined,
  hasNachweis: boolean
): VersicherungStatus {
  if (!hasNachweis) return 'missing'
  if (!gueltig_bis?.trim()) return 'ok'
  const g = startOfDayMs(gueltig_bis)
  const today = startOfDayMs(new Date().toISOString())
  if (Number.isNaN(g)) return 'ok'
  if (g < today) return 'expired'
  if (g <= today + 30 * 86400000) return 'warn'
  return 'ok'
}

export type VersicherungDocRow = {
  handwerker_id: string
  gueltig_bis: string | null
  datei_url: string | null
}

/** Pro Handwerker: Nachweis mit Datei, spätestes gueltig_bis. */
export function versicherungMapFromDocs(docs: VersicherungDocRow[]): Map<string, { gueltig_bis: string | null; hasNachweis: boolean }> {
  const m = new Map<string, { gueltig_bis: string | null; hasNachweis: boolean }>()
  for (const d of docs) {
    const id = d.handwerker_id
    if (!id) continue
    const hasFile = Boolean(d.datei_url?.trim())
    const cur = m.get(id) ?? { gueltig_bis: null, hasNachweis: false }
    if (hasFile) cur.hasNachweis = true
    if (d.gueltig_bis) {
      if (!cur.gueltig_bis || d.gueltig_bis > cur.gueltig_bis) {
        cur.gueltig_bis = d.gueltig_bis
      }
    }
    m.set(id, cur)
  }
  return m
}
