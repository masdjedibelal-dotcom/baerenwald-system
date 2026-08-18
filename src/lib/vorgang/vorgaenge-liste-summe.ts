import type { VorgangListeRow } from '@/lib/vorgang/types'

/** Parse Anzeige „1.234 €“ / „207 – 813 €“ → Euro-Zahl. */
export function parseVorgangWertLabelEuro(wertLabel: string | null | undefined): number | null {
  if (!wertLabel?.trim()) return null
  const matches = [...wertLabel.matchAll(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/g)]
  if (!matches.length) return null
  const nums = matches
    .map((m) => Number(m[1].replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n))
  if (!nums.length) return null
  return Math.max(...nums)
}

function rowListenSummeEuro(row: VorgangListeRow): number {
  if (row.listenSummeEuro != null && Number.isFinite(row.listenSummeEuro)) {
    return row.listenSummeEuro
  }
  return parseVorgangWertLabelEuro(row.wertLabel) ?? 0
}

function vorgangSummenGruppeKey(row: VorgangListeRow): string | null {
  if (row.rechnungRichtung === 'eingehend') {
    return `eingehend:${row.entityId}`
  }
  const leadId = row.leadId?.trim()
  return leadId || null
}

/**
 * Listen-Summe ohne Doppelzählung: pro Lead/Vorgang nur ein Geschäftsvolumen
 * (Auftrag/Angebot), nicht Auftrag + Abschlagsrechnungen + Angebot zusammen.
 */
export function berechneVorgaengeListenSumme(rows: VorgangListeRow[]): number {
  const byGroup = new Map<string, VorgangListeRow[]>()
  let sum = 0

  for (const row of rows) {
    const groupKey = vorgangSummenGruppeKey(row)
    if (!groupKey) {
      if (row.listeSummeZaehlen === false) continue
      sum += rowListenSummeEuro(row)
      continue
    }
    const list = byGroup.get(groupKey) ?? []
    list.push(row)
    byGroup.set(groupKey, list)
  }

  for (const group of byGroup.values()) {
    const fromMeta = group.find(
      (r) => r.listenSummeEuro != null && Number.isFinite(r.listenSummeEuro) && r.listenSummeEuro > 0
    )
    if (fromMeta) {
      sum += fromMeta.listenSummeEuro!
      continue
    }
    const primary = group.find((r) => r.listeSummeZaehlen !== false)
    if (primary) sum += rowListenSummeEuro(primary)
  }

  return sum
}
