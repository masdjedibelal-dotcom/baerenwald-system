/** E-Mail-Empfänger (An/CC) parsen und validieren. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Einzelne oder mehrere Adressen aus Text (Komma, Semikolon, Leerzeichen). */
export function parseEmailTokens(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Neue Adressen zu Liste hinzufügen (ohne Duplikate, nur gültige). */
export function mergeEmailList(existing: string[], raw: string): string[] {
  const tokens = parseEmailTokens(raw)
  if (!tokens.length && raw.trim()) tokens.push(raw.trim())
  const next = [...existing]
  for (const token of tokens) {
    if (!isValidEmail(token)) continue
    const norm = normalizeEmail(token)
    if (next.some((e) => normalizeEmail(e) === norm)) continue
    next.push(token.trim())
  }
  return next
}
