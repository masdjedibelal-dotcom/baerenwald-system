import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'

/** Lesbare Fehlermeldung auch für non-Error throws (z. B. Netlify-Abbruch). */
export function formatUnknownError(e: unknown): string {
  const anthropic = formatAnthropicError(e)
  if (anthropic !== 'Analyse fehlgeschlagen') return anthropic

  if (e instanceof Error) {
    const msg = e.message.trim()
    if (msg) return msg
    return e.name || 'Unbekannter Fehler'
  }

  if (typeof e === 'string' && e.trim()) return e.trim()

  if (typeof e === 'object' && e !== null) {
    const o = e as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim()
    try {
      const json = JSON.stringify(e)
      if (json && json !== '{}') return json.slice(0, 400)
    } catch {
      /* ignore */
    }
  }

  return 'Unbekannter Fehler — bitte kürzere Nachricht senden oder später erneut versuchen.'
}
