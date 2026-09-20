import 'server-only'

import { insertEmailLogRow } from '@/lib/kommunikation/insert-email-log'

export type NotifyEmailLogInput = {
  /** z. B. partner_notify, partner_notify_anfrage */
  typ: string
  betreff: string
  ok: boolean
  error?: string | null
  anEmail?: string | null
  leadId?: string | null
  angebotId?: string | null
  auftragId?: string | null
}

/**
 * P4-3: Notify-/Partner-HTTP-Ergebnis in email_log (gesendet | fehler).
 * Rückgabe der Notify-Funktion bleibt unverändert — nur Logging.
 */
export async function logNotifyEmailResult(input: NotifyEmailLogInput): Promise<void> {
  const errText = input.error?.trim() || null
  const summary = input.ok
    ? 'Notify gesendet.'
    : `Notify fehlgeschlagen${errText ? `: ${errText}` : '.'}`

  await insertEmailLogRow({
    typ: input.typ,
    an_email: input.anEmail?.trim() || '(notify)',
    betreff: input.betreff,
    inhalt_html: `<p>${escapeHtml(summary)}</p>`,
    status: input.ok ? 'gesendet' : 'fehler',
    fehler_nachricht: input.ok ? null : errText || 'unbekannt',
    lead_id: input.leadId ?? null,
    angebot_id: input.angebotId ?? null,
    auftrag_id: input.auftragId ?? null,
    richtung: 'gesendet',
    kontext_typ: 'notify',
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
