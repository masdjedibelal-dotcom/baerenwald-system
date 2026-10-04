import { mailSecondaryButtonHtml } from '@/lib/mail/email-buttons'
import { isStagingSupabase,STAGING_WEBSITE_ORIGIN } from '@/lib/auth/staging-admin'

/** Kundenportal vs. Auftraggeber-Portal — steuert Button- und P.S.-Text in Mails. */
export type PortalMailAudience = 'privat' | 'organisation'

export function portalAudienceFromKunde(
  kunde?: { portal_modus?: string | null } | null
): PortalMailAudience {
  return kunde?.portal_modus === 'organisation' ? 'organisation' : 'privat'
}

export function portalMailButtonLabel(audience: PortalMailAudience): string {
  return audience === 'organisation'
    ? 'Zum Auftraggeber-Portal →'
    : 'Zu MeinBärenwald →'
}

export function portalMailPsIntro(audience: PortalMailAudience, anrede: 'du' | 'sie'): string {
  if (audience === 'organisation') {
    return anrede === 'du'
      ? 'Im <strong>Auftraggeber-Portal</strong> siehst du Meldungen, Freigaben, Angebote und Dokumente.'
      : 'Im <strong>Auftraggeber-Portal</strong> sehen Sie Meldungen, Freigaben, Angebote und Dokumente.'
  }
  return anrede === 'du'
    ? 'In <strong>MeinBärenwald</strong> siehst du dein Projekt digital — Anfrage, Angebote, Dokumente, Bautagebuch und Updates jederzeit im Blick.'
    : 'In <strong>MeinBärenwald</strong> sehen Sie Ihr Projekt digital — Anfrage, Angebote, Dokumente, Bautagebuch und Updates jederzeit im Blick.'
}

export function defaultPortalInviteBetreff(
  _anrede: 'du' | 'sie',
  opts?: { organisation?: boolean }
): string {
  if (opts?.organisation) {
    return 'Auftraggeber-Portal – Zugang bereit'
  }
  return 'MeinBärenwald – Zugang bereit'
}

export function defaultPortalInviteText(
  anrede: 'du' | 'sie',
  opts?: { organisation?: boolean; orgName?: string | null }
): string {
  const org = opts?.orgName?.trim()
  if (opts?.organisation) {
    if (anrede === 'du') {
      return org
        ? `hier ist dein Zugang zum Auftraggeber-Portal für ${org}.\n\nRegistriere dich mit dieser E-Mail-Adresse — Meldungen, Freigaben und Objekte im Blick.`
        : 'hier ist dein Zugang zum Auftraggeber-Portal.\n\nRegistriere dich mit dieser E-Mail-Adresse — Meldungen, Freigaben und Objekte im Blick.'
    }
    return org
      ? `hier ist Ihr Zugang zum Auftraggeber-Portal für ${org}.\n\nRegistrieren Sie sich mit dieser E-Mail-Adresse — Meldungen, Freigaben und Objekte im Blick.`
      : 'hier ist Ihr Zugang zum Auftraggeber-Portal.\n\nRegistrieren Sie sich mit dieser E-Mail-Adresse — Meldungen, Freigaben und Objekte im Blick.'
  }
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
  return 'Partner-Portal – Zugang bereit'
}

export function defaultPartnerPortalInviteText(): string {
  return (
    'hier ist Ihr Zugang zum Partner-Portal von Bärenwald.\n\n' +
    'Registrieren Sie sich mit Ihrer bei uns hinterlegten E-Mail-Adresse. Danach sehen Sie Anfragen, Aufträge, Angebote und Dokumente.'
  )
}

export function publicWebsiteBaseUrl(): string {
  if (isStagingSupabase()) {
    const env = (
      process.env.FRONTEND_URL ??
      process.env.NEXT_PUBLIC_WEBSEITE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      ''
    ).replace(/\/$/, '')
    if (env.includes('staging--')) return env
    return STAGING_WEBSITE_ORIGIN
  }
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

/** Deep-Link zum Vorgang im Partner-Portal (Tab „Vorgänge“). */
export function buildPartnerVorgangPortalUrl(auftragId: string): string {
  const id = auftragId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=vorgaenge&id=${encodeURIComponent(id)}`
}

/** Relativer Link für partner-notify API (Website baut absolute URL). */
export function partnerVorgangRelativeLink(auftragId: string): string {
  const id = auftragId.trim()
  return `/partner?section=vorgaenge&id=${encodeURIComponent(id)}`
}

/** Deep-Link zur Anfrage im Partner-Portal (Tab „Vorgänge“). */
export function buildPartnerAnfragePortalUrl(anfrageId: string): string {
  const id = anfrageId.trim()
  return `${publicWebsiteBaseUrl()}/partner?section=vorgaenge&id=${encodeURIComponent(id)}`
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
