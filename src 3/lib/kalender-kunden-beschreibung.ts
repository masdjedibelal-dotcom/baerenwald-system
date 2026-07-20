/** Beschreibungstext im Kalender-Eintrag (Kundendetails für Vor-Ort). */

export function buildKalenderKundenBeschreibung(input: {
  kontaktName?: string | null
  kontaktTelefon?: string | null
  kontaktEmail?: string | null
  adresse?: string | null
  mitarbeiterName?: string | null
  mitarbeiterTelefon?: string | null
  notiz?: string | null
}): string | null {
  const lines: string[] = []
  const name = input.kontaktName?.trim()
  const tel = input.kontaktTelefon?.trim()
  const mail = input.kontaktEmail?.trim()
  const adr = input.adresse?.trim()
  const ma = input.mitarbeiterName?.trim()
  const maTel = input.mitarbeiterTelefon?.trim()
  const notiz = input.notiz?.trim()

  if (ma) {
    lines.push('Vor-Ort', ma + (maTel ? ` · ${maTel}` : ''))
    lines.push('')
  }
  if (name || tel || mail || adr) {
    lines.push('Kunde')
    if (name) lines.push(`Name: ${name}`)
    if (tel) lines.push(`Tel: ${tel}`)
    if (mail) lines.push(`E-Mail: ${mail}`)
    if (adr) lines.push(`Adresse: ${adr}`)
    lines.push('')
  }
  if (notiz) {
    lines.push('Notiz', notiz)
  }

  const text = lines.join('\n').trim()
  return text || null
}
