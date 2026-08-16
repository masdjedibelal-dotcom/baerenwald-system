/** Partner-Eingangsrechnung vs. Kundenrechnung (ausgehend). */

export function isEingehendeRechnung(r: {
  richtung?: string | null
}): boolean {
  return String(r.richtung ?? '').trim().toLowerCase() === 'eingehend'
}

/** Kunden-/Ausgangsrechnung (Legacy: richtung null = ausgehend). */
export function isAusgehendeRechnung(r: {
  richtung?: string | null
}): boolean {
  return !isEingehendeRechnung(r)
}

export function filterAusgehendeRechnungen<T extends { richtung?: string | null }>(
  rows: T[]
): T[] {
  return rows.filter(isAusgehendeRechnung)
}
