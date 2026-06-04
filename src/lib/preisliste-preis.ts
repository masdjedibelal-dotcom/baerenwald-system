/** Einheitlicher Netto-Preis aus der Preisliste (nur Spalte preis_min). */
export function preislisteEinzelpreis(pl: { preis_min?: number | null }): number {
  const v = Number(pl.preis_min)
  if (!Number.isFinite(v) || v < 0) return 0
  return Math.round(v * 100) / 100
}
