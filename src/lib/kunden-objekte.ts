import { isValidMeldeSlug, normalizeOrgSlug } from '@/lib/org/slug'
import type { KundenObjekt } from '@/lib/types'

export type KundenObjektInput = {
  titel: string
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
  melde_slug?: string | null
  melde_aktiv?: boolean
  einheiten_hinweis?: string | null
  notizen_intern?: string | null
}

/** Nur Objekte des angegebenen Kunden (Client-State kann sonst Objekte anderer Kunden mischen). */
export function filterObjekteFuerKunde(
  objekte: KundenObjekt[],
  kundeId: string | null | undefined
): KundenObjekt[] {
  const id = kundeId?.trim()
  if (!id) return []
  return objekte.filter((o) => o.kunde_id === id)
}

export function validateKundenObjektInput(input: KundenObjektInput): string | null {
  if (!input.titel?.trim()) return 'Bitte einen Titel angeben (z. B. WEG).'
  if (!input.strasse?.trim()) return 'Straße ist Pflicht.'
  if (!input.plz?.trim() || !input.ort?.trim()) return 'Postleitzahl und Ort sind Pflicht.'
  const slug = input.melde_slug?.trim()
  if (slug && !isValidMeldeSlug(normalizeOrgSlug(slug))) {
    return 'Melde-Slug: 2–48 Zeichen, nur Kleinbuchstaben, Zahlen und Bindestriche.'
  }
  return null
}

export function kundenObjektStrasseZeile(o: Pick<KundenObjekt, 'strasse' | 'hausnummer'>): string | null {
  const str = o.strasse?.trim() || null
  const nr = o.hausnummer?.trim() || null
  if (str && nr) return `${str} ${nr}`
  return str || nr || null
}

/** Kurzzeile für Dropdowns */
export function kundenObjektKurzlabel(o: KundenObjekt): string {
  const ort = [o.plz?.trim(), o.ort?.trim()].filter(Boolean).join(' ')
  const str = kundenObjektStrasseZeile(o)
  const parts = [o.titel?.trim(), str, ort].filter(Boolean)
  return parts.join(' · ') || o.titel?.trim() || 'Objekt'
}

/** Mindestens Straße oder PLZ/Ort — ohne das kein Ausführungsort im PDF. */
export function kundenObjektHatAnschrift(
  o: Pick<KundenObjekt, 'strasse' | 'hausnummer' | 'plz' | 'ort'>
): boolean {
  const str = kundenObjektStrasseZeile(o)
  const po = [o.plz?.trim(), o.ort?.trim()].filter(Boolean).join(' ')
  return Boolean(str || po)
}

/** Mehrzeilig für PDF „Durchführung in:“ */
export function formatKundenObjektDurchfuehrung(o: KundenObjekt): string {
  const lines: string[] = []
  const titel = o.titel?.trim()
  if (titel) lines.push(titel)
  const str = kundenObjektStrasseZeile(o)
  if (str) lines.push(str)
  const po = [o.plz?.trim(), o.ort?.trim()].filter(Boolean).join(' ')
  if (po) lines.push(po)
  return lines.join('\n')
}

/** Ausführungsort nur bei echter Anschrift — kein Fallback auf Projekt-Titel. */
export function resolveAngebotDurchfuehrungIn(
  verwaltersObjekt: KundenObjekt | null | undefined
): string | null {
  if (!verwaltersObjekt || !kundenObjektHatAnschrift(verwaltersObjekt)) return null
  return formatKundenObjektDurchfuehrung(verwaltersObjekt)
}
