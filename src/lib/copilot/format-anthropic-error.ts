import Anthropic from '@anthropic-ai/sdk'

import { isNetlifyAiGatewayBaseUrl } from '@/lib/copilot/claude-api-key'

/** Nutzerfreundliche Meldung statt „401 status code (no body)“. */
export function formatAnthropicError(e: unknown): string {
  if (e instanceof Anthropic.APIError) {
    if (e.status === 401) {
      if (isNetlifyAiGatewayBaseUrl()) {
        return 'Claude 401 — Netlify AI Gateway aktiv. Deploy mit aktuellem Code (direkte api.anthropic.com) oder ANTHROPIC_BASE_URL in Netlify entfernen.'
      }
      return 'Claude API-Key ungültig oder abgelaufen — CLAUDE_API_KEY in Netlify prüfen (sk-ant-… von console.anthropic.com).'
    }
    if (e.status === 403) {
      return 'Claude API-Zugriff verweigert — Key-Berechtigungen prüfen.'
    }
    if (e.status === 429) {
      return 'Claude Rate-Limit erreicht — bitte kurz warten.'
    }
    if (e.status === 400 || e.status === 413) {
      const m = (e.message || '').toLowerCase()
      if (
        m.includes('prompt is too long') ||
        m.includes('too many tokens') ||
        m.includes('context length') ||
        m.includes('maximum')
      ) {
        return 'Nachricht oder Verlauf zu lang — bitte kürzer formulieren oder Verlauf mit /reset leeren.'
      }
    }
    return e.message || `Claude API-Fehler (${e.status})`
  }
  if (e instanceof Error) return e.message
  return 'Analyse fehlgeschlagen'
}
