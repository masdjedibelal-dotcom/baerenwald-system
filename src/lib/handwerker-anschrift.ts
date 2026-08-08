/** Firmensitz-Felder Handwerker — CRM ↔ Portal. */

export type HandwerkerAnschriftParts = {
  strasse: string
  hausnummer: string
  plz: string
  ort: string
}

export function splitStrasseHausnummer(raw: string): {
  strasse: string
  hausnummer: string
} {
  const t = raw.trim()
  if (!t) return { strasse: '', hausnummer: '' }
  const m = t.match(/^(.*)\s+(\d+\s*[a-zA-Z]?)$/)
  if (m) {
    return { strasse: (m[1] ?? '').trim(), hausnummer: (m[2] ?? '').trim() }
  }
  return { strasse: t, hausnummer: '' }
}

export function splitPlzOrt(raw: string): { plz: string; ort: string } {
  const t = raw.trim()
  if (!t) return { plz: '', ort: '' }
  const m = t.match(/^(\d{5})\s+(.+)$/)
  if (m) return { plz: m[1]!, ort: m[2]!.trim() }
  if (/^\d{5}$/.test(t)) return { plz: t, ort: '' }
  return { plz: '', ort: t }
}

export function formatStrasseNr(
  strasse?: string | null,
  hausnummer?: string | null
): string {
  return [strasse?.trim(), hausnummer?.trim()].filter(Boolean).join(' ')
}

export function formatPlzOrt(plz?: string | null, ort?: string | null): string {
  return [plz?.trim(), ort?.trim()].filter(Boolean).join(' ')
}

export function composeHandwerkerAdresse(parts: HandwerkerAnschriftParts): string | null {
  const line1 = formatStrasseNr(parts.strasse, parts.hausnummer)
  const line2 = formatPlzOrt(parts.plz, parts.ort)
  const joined = [line1, line2].filter(Boolean).join(', ')
  return joined || null
}

export function resolveHandwerkerAnschrift(input: {
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
  adresse?: string | null
}): HandwerkerAnschriftParts {
  let strasse = input.strasse?.trim() || ''
  let hausnummer = input.hausnummer?.trim() || ''
  let plz = input.plz?.trim() || ''
  let ort = input.ort?.trim() || ''

  if (strasse && !hausnummer) {
    const split = splitStrasseHausnummer(strasse)
    if (split.hausnummer) {
      strasse = split.strasse
      hausnummer = split.hausnummer
    }
  }

  if (ort && !plz) {
    const split = splitPlzOrt(ort)
    if (split.plz) {
      plz = split.plz
      ort = split.ort
    }
  }

  if (!strasse && !ort && !plz && input.adresse?.trim()) {
    const parts = input.adresse.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts[0]) {
      const s = splitStrasseHausnummer(parts[0])
      strasse = s.strasse
      hausnummer = s.hausnummer
    }
    if (parts[1]) {
      const p = splitPlzOrt(parts.slice(1).join(', '))
      plz = p.plz
      ort = p.ort
    }
  }

  return { strasse, hausnummer, plz, ort }
}
