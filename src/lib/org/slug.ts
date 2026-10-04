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

export function suggestOrgKennungFromName(name: string): string {
  const base = normalizeOrgSlug(name)
  return base || `org-${Date.now().toString(36).slice(-4)}`
}
