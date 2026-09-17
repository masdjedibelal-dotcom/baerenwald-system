/**
 * Portal / Annahme: zuletzt versendete Positionen.
 * CRM-Entwurf (`positionen`) darf abweichen, bis erneut versendet wird.
 */
export function angebotPositionenFuerPortal(row: {
  positionen?: unknown
  positionen_portal?: unknown | null
}): unknown {
  if (row.positionen_portal != null) return row.positionen_portal
  return row.positionen ?? []
}

function round2(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.round(v * 100) / 100
}

/** Stabiler Vergleich: CRM-Entwurf vs. zuletzt versendete Portal-Fassung. */
export function angebotPortalSnapshotWeichtAb(
  positionen: unknown,
  positionenPortal: unknown | null | undefined
): boolean {
  if (positionenPortal == null) return false
  const a = Array.isArray(positionen) ? positionen : []
  const b = Array.isArray(positionenPortal) ? positionenPortal : []
  if (a.length !== b.length) return true

  const finger = (rows: unknown[]) =>
    JSON.stringify(
      rows.map((raw) => {
        const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
        return {
          id: String(p.id ?? ''),
          leistung: String(p.leistung_name ?? p.leistung ?? '').trim(),
          menge: round2(p.menge),
          einheit: String(p.einheit ?? '').trim(),
          vk: round2(p.vk_netto),
          lohn: round2(p.lohn_netto),
          mat: round2(p.material_netto),
          gmin: round2(p.gesamt_min),
          gmax: round2(p.gesamt_max),
        }
      })
    )
  return finger(a) !== finger(b)
}
