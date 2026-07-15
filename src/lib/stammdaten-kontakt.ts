export type StammdatenTyp = 'kunde' | 'handwerker' | 'partner'

export type StammdatenKontaktTreffer = {
  typ: StammdatenTyp
  id: string
  name: string
  email: string | null
  telefon: string | null
}

export function normalizeKontaktEmail(email: string | null | undefined): string | null {
  const t = email?.trim().toLowerCase()
  if (!t || !t.includes('@') || t.length < 5) return null
  return t
}

/** Nur Ziffern — für Vergleich von Telefonnummern. */
export function normalizeKontaktTelefon(telefon: string | null | undefined): string | null {
  const digits = (telefon ?? '').replace(/\D/g, '')
  if (digits.length < 6) return null
  return digits
}

export function telefonKontaktMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizeKontaktTelefon(a)
  const db = normalizeKontaktTelefon(b)
  if (!da || !db) return false
  if (da === db) return true
  const minLen = 8
  if (da.length >= minLen && db.length >= minLen) {
    return da.endsWith(db.slice(-minLen)) || db.endsWith(da.slice(-minLen))
  }
  return false
}

export function emailKontaktMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ea = normalizeKontaktEmail(a)
  const eb = normalizeKontaktEmail(b)
  return Boolean(ea && eb && ea === eb)
}

export function stammdatenTypLabel(typ: StammdatenTyp): string {
  if (typ === 'kunde') return 'Kunde'
  if (typ === 'handwerker') return 'Handwerker'
  return 'Partner'
}

export function stammdatenDetailHref(typ: StammdatenTyp, id: string): string {
  if (typ === 'kunde') return `/kunden/${id}`
  if (typ === 'handwerker') return `/handwerker/${id}`
  return `/partner/${id}`
}
