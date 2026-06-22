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

export function defaultPartnerPortalInviteBetreff(): string {
  return 'Dein Zugang zum Partner-Portal'
}

export function defaultPartnerPortalInviteText(): string {
  return (
    'hier ist dein Zugang zum Partner-Portal von Bärenwald.\n\n' +
    'Registriere dich mit deiner bei uns hinterlegten E-Mail-Adresse — danach siehst du Anfragen, Aufträge, Angebote und Dokumente.'
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

/** Partner-Portal-Startseite (Website). Unauthenticated → Middleware leitet zu Login mit next=/partner. */
export function buildPartnerDashboardLink(): string {
  return `${publicWebsiteBaseUrl()}/partner`
}

/** @deprecated Name historisch — nutze buildPartnerDashboardLink(); zeigt auf /partner, nicht /partner/login. */
export function buildPartnerLoginLink(): string {
  return buildPartnerDashboardLink()
}

export function buildPartnerRegisterUrl(): string {
  return `${publicWebsiteBaseUrl()}/partner/registrieren`
}

export function buildPartnerAuftragPortalUrl(auftragId: string): string {
  const id = auftragId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=auftraege&auftrag=${encodeURIComponent(id)}`
}

/** Auftrags-Zuweisung — Annehmen/Ablehnen unter Anfragen (Listen-ID: auftrag:{id}). */
export function buildPartnerAuftragAnfragePortalUrl(auftragId: string): string {
  const id = auftragId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=anfragen&id=${encodeURIComponent(`auftrag:${id}`)}`
}

/** Deep-Link zum Auftrag im Partner-Portal (für E-Mails). */
export function buildPartnerLoginForAuftragUrl(auftragId: string): string {
  return buildPartnerAuftragPortalUrl(auftragId)
}

/** Angebote-Tab im Partner-Portal (Vertrag + Checkliste nach Übernahme). */
export function buildPartnerAngebotPortalUrl(anfrageId: string): string {
  const id = anfrageId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=angebote&id=${encodeURIComponent(id)}`
}

/** Deep-Link zum Angebote-Tab (für E-Mails). */
export function buildPartnerLoginForAngebotUrl(anfrageId: string): string {
  return buildPartnerAngebotPortalUrl(anfrageId)
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
  Melde dich mit deiner bei Bärenwald hinterlegten Partner-E-Mail an — danach siehst du Auftrag und Leistungen.
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
