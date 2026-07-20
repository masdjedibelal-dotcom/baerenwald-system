/** Gemeinsame Listen-Anzeige-Helfer. */

export function formatRegion(plz?: string | null, ort?: string | null): string {
  const p = plz?.trim() ?? ''
  const o = ort?.trim() ?? ''
  if (p && o) return `${p} ${o}`
  return p || o || '—'
}

export function formatRegionFromKunde(row: {
  plz?: string | null
  kunden?: { ort?: string | null; plz?: string | null } | null
}): string {
  const plz = row.plz ?? row.kunden?.plz
  const ort = row.kunden?.ort
  return formatRegion(plz, ort)
}
