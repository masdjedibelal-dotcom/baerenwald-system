import { mailSecondaryButtonHtml } from '@/lib/mail/email-buttons'

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
  anrede: 'du' | 'sie',
  opts?: { organisation?: boolean }
): string {
  if (opts?.organisation) {
    return anrede === 'du' ? 'Dein Auftraggeber-Portal' : 'Ihr Auftraggeber-Portal'
  }
  return anrede === 'du' ? 'Dein Zugang zu MeinBärenwald' : 'Ihr Zugang zu MeinBärenwald'
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
  return 'Dein Zugang zum Partner-Portal'
}

export function defaultPartnerPortalInviteText(): string {
  return (
    'hier ist dein Zugang zum Partner-Portal von Bärenwald.\n\n' +
    'Registriere dich mit deiner bei uns hinterlegten E-Mail-Adresse — danach siehst du Anfragen, Aufträge, Angebote und Dokumente.'
  )
}

export function publicWebsiteBaseUrl(): string {
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

/** @deprecated Nutze buildPartnerVorgangPortalUrl — alter Aufträge-Tab */
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

/** Einzelner Portal-Button (ohne Zusatzabsatz — Text steht im P.S.-Block der Mail-Hülle). */
export function buildPortalButton(
  portalLink: string,
  anrede: 'du' | 'sie' = 'du',
  audience: PortalMailAudience = 'privat'
): string {
  void anrede
  return `
<div style="margin:20px 0 8px;">
  ${mailSecondaryButtonHtml(portalMailButtonLabel(audience), portalLink, { margin: '0' })}
</div>`
}

/** @deprecated Token-Links entfallen — nutze buildPortalLoginLink() */
export function buildPortalLink(_token?: string | null): string | null {
  void _token
  return buildPortalLoginLink()
}
