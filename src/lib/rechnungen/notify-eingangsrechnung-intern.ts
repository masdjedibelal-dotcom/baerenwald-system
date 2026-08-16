import { sendInternNotifyEmail } from '@/lib/angebote/emails'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { getPublicAppUrl } from '@/lib/utils'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Interne Mail an BW: Partner-Eingangsrechnung eingegangen.
 * Primär nutzt das Portal `sendPartnerInternalRechnungMail`; dieser Helper
 * deckt CRM-seitige Fälle (INTERN_EMAIL) ab.
 */
export async function notifyInternPartnerEingangsrechnung(input: {
  rechnungId: string
  handwerkerName: string
  rechnungsnummer?: string | null
  betragBrutto?: number | null
  auftragTitel?: string | null
}): Promise<void> {
  const base = getPublicAppUrl().replace(/\/$/, '')
  const url = `${base}/rechnungen/${encodeURIComponent(input.rechnungId)}`
  const hw = input.handwerkerName.trim() || 'Partner'
  const nr = input.rechnungsnummer?.trim()
  const betrag =
    input.betragBrutto != null && Number.isFinite(input.betragBrutto)
      ? `${input.betragBrutto.toLocaleString('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} €`
      : null
  const projekt = input.auftragTitel?.trim()

  const subject = `Eingehende Rechnung von ${hw}${nr ? ` (${nr})` : ''}`
  const html = `
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hallo,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Die eingehende Rechnung von <strong>${escapeHtml(hw)}</strong> ist eingegangen.
    </p>
    <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;color:#374151;line-height:1.6;">
      ${nr ? `<li>Nummer: ${escapeHtml(nr)}</li>` : ''}
      ${betrag ? `<li>Betrag: ${escapeHtml(betrag)}</li>` : ''}
      ${projekt ? `<li>Auftrag: ${escapeHtml(projekt)}</li>` : ''}
    </ul>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">
      Bitte prüfen und bei Überweisung im CRM als überwiesen markieren.
    </p>
    ${mailPrimaryButtonHtml('Eingangsrechnung öffnen', url, { block: true })}
  `

  const r = await sendInternNotifyEmail({ subject, html })
  if (!r.ok) {
    console.warn('[notifyInternPartnerEingangsrechnung]', r.message)
  }
}
