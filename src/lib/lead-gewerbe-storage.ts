/**
 * Gewerbe wird in leads.bereiche (Schlüssel "gewerbe") gespeichert, nicht in leads.situation.
 * Legacy: situation === "gewerbe" wird beim Speichern in bereiche übernommen und situation geleert.
 */

export function leadHatGewerbeKontext(
  bereiche: string[] | null | undefined,
  situation?: string | null
): boolean {
  return Boolean(bereiche?.includes('gewerbe') || situation === 'gewerbe')
}

export function situationOhneGewerbe(situation: string | null | undefined): string | null {
  const t = (situation ?? '').trim()
  if (!t || t === 'gewerbe') return null
  return t
}

/** Wenn noch Alt-Daten situation==="gewerbe" kommen, Schlüssel in bereiche ergänzen. */
export function bereicheMitLegacyGewerbeSituation(
  bereiche: string[],
  situation: string | null | undefined
): string[] {
  const out = [...bereiche]
  if (situation === 'gewerbe' && !out.includes('gewerbe')) out.push('gewerbe')
  return out
}

/** Legacy-Zeilen: situation „gewerbe“ in der Bereich-Liste anzeigen. */
export function bereicheFuerAnzeige(
  bereiche: string[] | null | undefined,
  situation: string | null | undefined
): string[] {
  return bereicheMitLegacyGewerbeSituation([...(bereiche ?? [])], situation)
}

export function situationFuerAnzeige(situation: string | null | undefined): string | null {
  if (situation === 'gewerbe') return null
  return situation?.trim() || null
}
