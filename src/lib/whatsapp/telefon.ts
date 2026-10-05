/**
 * Telefonnummern für WhatsApp: international ohne „+“ (so liefert und erwartet es 360dialog),
 * z. B. „0176 1234 5678“ → „4917612345678“. Ohne Ländervorwahl gilt Deutschland.
 */
export function waNummer(raw: string | null | undefined): string | null {
  let s = String(raw ?? '').trim()
  if (!s) return null
  s = s.replace(/[^\d+]/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  else if (s.startsWith('00')) s = s.slice(2)
  else if (s.startsWith('0')) s = `49${s.slice(1)}`
  s = s.replace(/\D/g, '')
  // Deutsche Nummer mit „(0)“ nach der Vorwahl: 49 0176… → 49176…
  if (s.startsWith('490')) s = `49${s.slice(3)}`
  return s.length >= 8 && s.length <= 15 ? s : null
}

/** Lesbar fürs CRM: „+49 176 12345678“. */
export function waNummerAnzeige(nr: string | null | undefined): string {
  const s = String(nr ?? '').replace(/\D/g, '')
  if (!s) return ''
  if (s.startsWith('49')) return `+49 ${s.slice(2, 5)} ${s.slice(5)}`
  return `+${s}`
}
