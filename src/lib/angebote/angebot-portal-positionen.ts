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
