const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeOrgSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function isValidMeldeSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase()
  return s.length >= 2 && s.length <= 48 && SLUG_RE.test(s)
}

export function suggestMeldeSlugFromTitel(titel: string): string {
  const base = normalizeOrgSlug(titel)
  return base || `objekt-${Date.now().toString(36).slice(-4)}`
}

export function suggestMeldeSlugFromAddress(
  strasse?: string | null,
  hausnummer?: string | null,
  plz?: string | null
): string {
  const parts = [strasse?.trim(), hausnummer?.trim(), plz?.trim()].filter(Boolean)
  if (!parts.length) return `objekt-${Date.now().toString(36).slice(-4)}`
  return normalizeOrgSlug(parts.join('-'))
}

export function suggestOrgKennungFromName(name: string): string {
  const base = normalizeOrgSlug(name)
  return base || `org-${Date.now().toString(36).slice(-4)}`
}
