import { mailSecondaryButtonHtml } from '@/lib/mail/email-buttons'

export function defaultPortalInviteBetreff(anrede: 'du' | 'sie'): string {
  return anrede === 'du' ? 'Dein Zugang zu MeinBärenwald' : 'Ihr Zugang zu MeinBärenwald'
}

export function defaultPortalInviteText(anrede: 'du' | 'sie'): string {
  if (anrede === 'du') {
    return (
      'hier ist dein Zugang zu MeinBärenwald, deinem Kundenportal von Bärenwald.\n\n' +
      'Registriere dich mit dieser E-Mail-Adresse — danach siehst du deine Aufträge, Angebote und Dokumente.'
    )
  }
  return (
    'hier ist Ihr Zugang zu MeinBärenwald, Ihrem Kundenportal von Bärenwald.\n\n' +
    'Registrieren Sie sich mit dieser E-Mail-Adresse — danach sehen Sie Ihre Aufträge, Angebote und Dokumente.'
  )
}

function publicWebsiteBaseUrl(): string {
  return (
    process.env.FRONTEND_URL ??
    process.env.NEXT_PUBLIC_WEBSEITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export function buildPortalLoginLink(): string {
  return `${publicWebsiteBaseUrl()}/portal/login`
}

/** Handwerker-Partner-Portal (Website), z. B. WhatsApp-Link */
export function buildPartnerLoginLink(): string {
  return `${publicWebsiteBaseUrl()}/partner/login`
}

export function buildPartnerRegisterUrl(): string {
  return `${publicWebsiteBaseUrl()}/partner/registrieren`
}

export function buildPartnerAuftragPortalUrl(auftragId: string): string {
  const id = auftragId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=auftraege&auftrag=${encodeURIComponent(id)}`
}

/** Login mit Weiterleitung zum Auftrag im Partner-Portal (für E-Mails). */
export function buildPartnerLoginForAuftragUrl(auftragId: string): string {
  const next = buildPartnerAuftragPortalUrl(auftragId)
  return `${buildPartnerLoginLink()}?next=${encodeURIComponent(next)}`
}

/** Angebote-Tab im Partner-Portal (Vertrag + Checkliste nach Übernahme). */
export function buildPartnerAngebotPortalUrl(anfrageId: string): string {
  const id = anfrageId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=angebote&id=${encodeURIComponent(id)}`
}

export function buildPartnerLoginForAngebotUrl(anfrageId: string): string {
  const next = buildPartnerAngebotPortalUrl(anfrageId)
  return `${buildPartnerLoginLink()}?next=${encodeURIComponent(next)}`
}

export function buildPartnerPortalButton(portalLink: string): string {
  return `
<div style="margin:20px 0 8px;">
  ${mailSecondaryButtonHtml('Zum Partner-Portal →', portalLink, { margin: '0' })}
</div>
<p style="font-size:13px;
  color:#6B7280;
  margin:0 0 16px;
  line-height:1.6;
  font-family:Arial,Helvetica,sans-serif;">
  Mit deiner bei uns hinterlegten E-Mail anmelden oder registrieren — danach siehst du Auftrag und Leistungen.
</p>`
}

export function buildPortalButton(
  portalLink: string,
  anrede: 'du' | 'sie' = 'du'
): string {
  const text = anrede === 'du'
    ? 'Zu MeinBärenwald →'
    : 'Zu MeinBärenwald →'
  const sub = anrede === 'du'
    ? 'Melde dich mit deiner E-Mail an oder registriere dich — Anfragen, Angebote und Dokumente im Blick.'
    : 'Melden Sie sich mit Ihrer E-Mail an oder registrieren Sie sich — Anfragen, Angebote und Dokumente im Blick.'

  return `
<div style="margin:20px 0 8px;">
  ${mailSecondaryButtonHtml(text, portalLink, { margin: '0' })}
</div>
<p style="font-size:13px;
  color:#6B7280;
  margin:0 0 16px;
  line-height:1.6;
  font-family:Arial,Helvetica,sans-serif;">
  ${sub}
</p>`
}

/** @deprecated Token-Links entfallen — nutze buildPortalLoginLink() */
export function buildPortalLink(_token?: string | null): string | null {
  void _token
  return buildPortalLoginLink()
}
