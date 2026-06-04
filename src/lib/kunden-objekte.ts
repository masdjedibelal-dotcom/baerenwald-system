import type { KundenObjekt } from '@/lib/types'

export type KundenObjektInput = {
  titel: string
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
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
