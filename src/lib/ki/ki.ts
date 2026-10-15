import 'server-only'

import { getOpenAiApiKey, KiAnbieterFehler, openAiTextClient } from '@/lib/shared-domain/ki-openai'

/** Text rein, Textblöcke raus. */
export type KiTextClient = ReturnType<typeof openAiTextClient>

/** Ist ein KI-Schlüssel (OPENAI_API_KEY) hinterlegt? */
export function kiKonfiguriert(): boolean {
  return Boolean(getOpenAiApiKey())
}

/** KI-Client für einfache Text-Aufrufe (OpenAI). */
export function kiTextClient(): KiTextClient {
  return openAiTextClient()
}

/** Verständlicher Fehlertext für KI-Fehler; sonst die Meldung des Fehlers. */
export function formatKiFehler(e: unknown): string {
  if (e instanceof KiAnbieterFehler) {
    if (e.status === 401 || e.status === 403) return 'OpenAI-Schlüssel ungültig — OPENAI_API_KEY in Netlify prüfen.'
    if (e.status === 404) return 'OpenAI-Modell nicht verfügbar — OPENAI_MODEL in Netlify prüfen.'
    if (e.status === 429) return 'OpenAI-Limit erreicht oder Guthaben aufgebraucht — kurz warten bzw. Abrechnung bei OpenAI prüfen.'
    if (e.status === 400 && /context|too long|maximum/i.test(e.message)) {
      return 'Nachricht oder Verlauf zu lang — bitte kürzer formulieren.'
    }
    return e.message || `OpenAI-Fehler (${e.status})`
  }
  if (e instanceof Error) return e.message
  return 'Analyse fehlgeschlagen'
}
