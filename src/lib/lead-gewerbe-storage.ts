/**
 * Gewerbe wird in leads.bereiche (Schlüssel "gewerbe") gespeichert, nicht in leads.situation.
 * Legacy: situation === "gewerbe" wird beim Speichern in bereiche übernommen und situation geleert.
 */

/** Supabase/JSON: `bereiche` ist manchmal kein echtes string[]. */
export function coerceBereicheArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((b): b is string => typeof b === 'string' && b.length > 0)
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return coerceBereicheArray(parsed)
    } catch {
      /* kein JSON */
    }
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function leadHatGewerbeKontext(
  bereiche: string[] | null | undefined | unknown,
  situation?: string | null
): boolean {
  return Boolean(coerceBereicheArray(bereiche).includes('gewerbe') || situation === 'gewerbe')
}

export function situationOhneGewerbe(situation: string | null | undefined): string | null {
  const t = (situation ?? '').trim()
  if (!t || t === 'gewerbe') return null
  return t
}

/** Wenn noch Alt-Daten situation==="gewerbe" kommen, Schlüssel in bereiche ergänzen. */
export function bereicheMitLegacyGewerbeSituation(
  bereiche: string[] | unknown,
  situation: string | null | undefined
): string[] {
  const out = [...coerceBereicheArray(bereiche)]
  if (situation === 'gewerbe' && !out.includes('gewerbe')) out.push('gewerbe')
  return out
}

/** Legacy-Zeilen: situation „gewerbe“ in der Bereich-Liste anzeigen. */
export function bereicheFuerAnzeige(
  bereiche: string[] | null | undefined | unknown,
  situation: string | null | undefined
): string[] {
  return bereicheMitLegacyGewerbeSituation(bereiche, situation)
}

export function situationFuerAnzeige(situation: string | null | undefined): string | null {
  if (situation === 'gewerbe') return null
  return situation?.trim() || null
}
