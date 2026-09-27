/**
 * Partner-Aufgabe: Anzeige-Helfer (CRM / später Portal).
 * Leer/null Titel → LV-Text der Position, nie leere Überschrift.
 */

export function partnerAufgabeAnzeigeTitel(
  titel: string | null | undefined,
  lvFallback: string | null | undefined
): string {
  const t = (titel ?? '').trim()
  if (t) return t
  const lv = (lvFallback ?? '').trim()
  return lv || 'Leistung'
}
