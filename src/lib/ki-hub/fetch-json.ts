/** Sicheres JSON-Parsing — verhindert „Unexpected token '<'“ bei HTML-Fehlerseiten. */
export async function fetchJsonSafe<T>(
  res: Response
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const ct = res.headers.get('content-type') ?? ''
  const text = await res.text()

  if (!text.trim()) {
    return { ok: false, message: `Leere Antwort (${res.status})` }
  }

  if (!ct.includes('application/json') && text.trimStart().startsWith('<')) {
    if (res.status === 504 || res.status === 502) {
      return {
        ok: false,
        message:
          'Server-Timeout (Analyse dauert zu lange). Bitte in 1–2 Minuten erneut versuchen — Pulse-Daten kommen oft schon beim Laden.',
      }
    }
    return {
      ok: false,
      message: `Server lieferte HTML statt JSON (${res.status}). Netlify-Deploy-Logs prüfen.`,
    }
  }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return {
      ok: false,
      message: `Ungültige JSON-Antwort (${res.status}): ${text.slice(0, 120)}`,
    }
  }
}
