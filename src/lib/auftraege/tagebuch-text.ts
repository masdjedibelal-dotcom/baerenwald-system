/** Titel/Beschreibung aus gespeichertem `beschreibung`-Feld (Create: Titel + \\n\\n + Text). */
export function splitTagebuchBeschreibung(raw: string | null | undefined): {
  titel: string
  beschreibung: string
} {
  const body = String(raw ?? '').trim()
  if (!body) return { titel: '', beschreibung: '' }
  if (body.includes('\n\n')) {
    const idx = body.indexOf('\n\n')
    return {
      titel: body.slice(0, idx).trim(),
      beschreibung: body.slice(idx + 2).trim(),
    }
  }
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) {
    if (body.length <= 72) return { titel: body, beschreibung: '' }
    return { titel: '', beschreibung: body }
  }
  return { titel: lines[0] ?? '', beschreibung: lines.slice(1).join('\n') }
}
