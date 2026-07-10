import type { PartnerAngebotAntwortTyp } from '@/lib/partner/notify-partner-angebot-antwort'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function partnerSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export function handwerkerEinreichungAntwortBetreff(
  typ: PartnerAngebotAntwortTyp,
  gewerkName: string
): string {
  if (typ === 'rueckfrage') {
    return `Rückfrage zu deinem Angebot: ${gewerkName} — Bärenwald Partner`
  }
  return `Angebot nicht übernommen: ${gewerkName} — Bärenwald Partner`
}

/** HTML-Vorschau für CRM-Modal (entspricht Partner-Portal-Mail). */
export function handwerkerEinreichungAntwortPreviewHtml(opts: {
  typ: PartnerAngebotAntwortTyp
  handwerkerName: string
  gewerkName: string
  angebotTitel: string
  crmNotiz: string
  anfrageId: string
}): string {
  const istRueckfrage = opts.typ === 'rueckfrage'
  const titel = istRueckfrage ? 'Rückfrage zu deinem Angebot' : 'Angebot nicht übernommen'
  const intro = istRueckfrage
    ? 'zu deinem eingereichten Angebot haben wir noch eine <strong>Rückfrage</strong>. Bitte prüfe unsere Nachricht und reiche bei Bedarf ein aktualisiertes Angebot im Partner-Portal ein.'
    : 'vielen Dank für dein Angebot. Leider können wir es in der vorliegenden Form <strong>nicht übernehmen</strong>. Du kannst im Partner-Portal ein neues Angebot mit Preis und PDF einreichen.'
  const portalHref = `${partnerSiteBaseUrl()}/partner/login?next=${encodeURIComponent(`/partner?section=angebote&id=${opts.anfrageId}`)}`

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;">
<table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%;">
<tr><td style="padding:0 0 20px;border-bottom:1px solid #E5E7EB;">
  <span style="font-size:20px;font-weight:700;color:#1A3D2B;">Bärenwald</span>
</td></tr>
<tr><td style="padding:28px 0 20px;">
  <h2 style="color:#2E7D52;margin:0 0 16px;font-size:20px;">${escapeHtml(titel)}</h2>
  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${intro}</p>
  <p style="margin:0 0 12px;font-size:14px;line-height:1.6;"><strong>${escapeHtml(opts.angebotTitel)}</strong> · ${escapeHtml(opts.gewerkName)}</p>
  <div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:16px 0;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;">Nachricht von Bärenwald</p>
    <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(opts.crmNotiz.trim())}</p>
  </div>
  <a href="${escapeHtml(portalHref)}" style="display:inline-block;background:#2E7D52;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0 8px;">Zum Partner-Portal</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
