/**
 * Zentrale HTML-E-Mail-Templates (Bärenwald München).
 * Platzhalter [LOGO_URL], [ADRESSE], [TEL] werden via applyEmailBranding ersetzt.
 */

import { resolveBrandLogoUrl } from '@/lib/brand'
import { mailLogoCidSrc, mailLogoInlineEnabled } from '@/lib/mail/mail-logo-inline'
import { telefonFuerKundenMail } from '@/lib/telefon-kunden-mail'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { buildPortalLoginLink, buildPortalButton } from '@/lib/portal-utils'

export type EmailBranding = {
  logoUrl: string
  adresse: string
  telefon: string
  googleBewertungUrl?: string
}

export type AngebotKundePosition = {
  beschreibung: string
  gesamt_min: number
  gesamt_max: number
}

export type HandwerkerAnfragePosition = { beschreibung: string }

const DEFAULT_BRANDING: EmailBranding = {
  logoUrl: resolveBrandLogoUrl('white'),
  adresse: process.env.EMAIL_FIRMEN_ADRESSE ?? 'München',
  telefon: telefonFuerKundenMail(process.env.EMAIL_FIRMEN_TEL),
  googleBewertungUrl: process.env.NEXT_PUBLIC_GOOGLE_BEWERTUNG_URL ?? 'https://maps.google.com',
}

function resolveLogoSrcForTemplate(branding: EmailBranding): string {
  if (mailLogoInlineEnabled()) {
    return mailLogoCidSrc('white')
  }
  return escapeHtml(branding.logoUrl)
}

export function applyEmailBranding(html: string, branding: EmailBranding = DEFAULT_BRANDING): string {
  return html
    .replaceAll('[LOGO_URL]', resolveLogoSrcForTemplate(branding))
    .replaceAll('[ADRESSE]', escapeHtml(branding.adresse))
    .replaceAll('[TEL]', escapeHtml(branding.telefon))
    .replaceAll('[GOOGLE_BEWERTUNG_URL]', escapeHtml(branding.googleBewertungUrl ?? 'https://maps.google.com'))
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function baseTemplate(content: string, preheader?: string, branding: EmailBranding = DEFAULT_BRANDING): string {
  const ph = preheader
    ? `
    <span style="display:none;max-height:0;overflow:hidden;">
      ${escapeHtml(preheader)}
    </span>`
    : ''

  const raw = `
  <!DOCTYPE html>
  <html lang="de">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Bärenwald München</title>
  </head>
  <body style="margin:0;padding:0;background:#F7F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#1E1E1E;">
    ${ph}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="100%" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="background:#1A3D2B;padding:20px 32px;">
                ${
                  branding.logoUrl
                    ? `<img src="[LOGO_URL]" height="32" alt="Bärenwald München" style="display:block;border:0;"/>`
                    : `<p style="margin:0;color:#FFFFFF;font-size:18px;font-weight:700;">Bärenwald München</p>`
                }
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#F7F6F3;padding:20px 32px;font-size:12px;color:#6B6B6B;border-top:1px solid #E5E3DF;">
                Bärenwald Handwerksgruppe München<br/>
                [ADRESSE]<br/>
                <a href="tel:[TEL]" style="color:#2E7D52;">[TEL]</a>
                &nbsp;·&nbsp;
                <a href="mailto:info@baerenwaldmuenchen.de" style="color:#2E7D52;">info@baerenwaldmuenchen.de</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`
  return applyEmailBranding(raw, branding)
}

export function greenBox(innerHtml: string): string {
  return `
  <div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:20px 0;">
    ${innerHtml}
  </div>`
}

export function infoRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:8px 0;color:#6B6B6B;font-size:13px;width:40%;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`
}

export function primaryButton(text: string, url: string): string {
  return mailPrimaryButtonHtml(text, url)
}

export function emailLeadBestaetigung(
  {
    name,
    situation,
    bereiche,
    preis_min,
    preis_max,
    projektLink,
    includePortalLink,
  }: {
    name: string
    situation?: string
    bereiche?: string[]
    preis_min?: number
    preis_max?: number
    /** Persönlicher Link zur Status-Seite (wenn bereits Auftrag/Lead mit Token verknüpft) */
    projektLink?: string | null
    /** MeinBärenwald Login-Link in der Mail */
    includePortalLink?: boolean
  },
  branding?: EmailBranding
): string {
  const preisText =
    preis_min != null && preis_max != null
      ? greenBox(`
      <p style="margin:0;font-size:12px;color:#2E7D52;">Ihre Preisindikation</p>
      <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#1A3D2B;">
        ${preis_min.toLocaleString('de-DE')} – ${preis_max.toLocaleString('de-DE')} €
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#2E7D52;">Unverbindliche Erstindikation</p>
    `)
      : ''

  const situationBlock = situation
    ? `<p style="margin:12px 0 0;color:#6B6B6B;font-size:14px;">${escapeHtml(situation)}</p>`
    : ''
  const bereicheBlock =
    bereiche && bereiche.length > 0
      ? `<p style="margin:8px 0 0;font-size:13px;color:#6B6B6B;">Bereiche: ${escapeHtml(bereiche.join(', '))}</p>`
      : ''

  const projektBlock =
    projektLink && projektLink.trim()
      ? greenBox(`
      <p style="margin:0;font-size:12px;color:#2E7D52;font-weight:600;">Ihr persönlicher Projekt-Link</p>
      <p style="margin:8px 0 0;font-size:14px;">
        <a href="${escapeHtml(projektLink.trim())}" style="color:#1A3D2B;font-weight:600;word-break:break-all;">
          ${escapeHtml(projektLink.trim())}
        </a>
      </p>
      <p style="margin:10px 0 0;font-size:12px;color:#6B6B6B;">
        Dort sehen Sie jederzeit den aktuellen Stand Ihres Projekts. Speichern oder bookmarken — kein Passwort nötig.
      </p>
    `)
      : ''
  const portalHtml = includePortalLink
    ? buildPortalButton(buildPortalLoginLink(), 'sie')
    : ''

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Ihre Anfrage ist eingegangen</h2>
    <p style="margin:0 0 20px;color:#6B6B6B;">Guten Tag ${escapeHtml(name)},</p>
    <p>vielen Dank für Ihre Anfrage. Wir haben alles erhalten und melden uns innerhalb von <strong>24 Stunden</strong> bei Ihnen.</p>
    ${situationBlock}
    ${bereicheBlock}
    ${preisText}
    ${projektBlock}
    ${portalHtml}
    <div style="background:#F7F6F3;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-weight:600;">Ihr nächster Schritt:</p>
      <p style="margin:8px 0 0;color:#6B6B6B;font-size:13px;">Wir prüfen Ihre Anfrage und rufen Sie zur Terminabsprache an.</p>
    </div>
    <p style="font-size:13px;color:#6B6B6B;">Bei dringenden Fragen:<br/>
      <a href="tel:[TEL]" style="color:#2E7D52;font-weight:600;">[TEL]</a>
    </p>
  `,
    `Ihre Anfrage ist bei uns eingegangen — wir melden uns innerhalb von 24h`,
    branding
  )
}

export function emailAngebotKunde(
  {
    name,
    positionen,
    gesamt_min,
    gesamt_max,
    gueltig_bis,
    lohn_gesamt,
  }: {
    name: string
    positionen: AngebotKundePosition[]
    gesamt_min: number
    gesamt_max: number
    gueltig_bis: string
    lohn_gesamt?: number
  },
  branding?: EmailBranding
): string {
  const rows = positionen
    .map(
      (p) => `
        <tr style="border-bottom:1px solid #E5E3DF;">
          <td style="padding:10px 0;">${escapeHtml(p.beschreibung)}</td>
          <td style="padding:10px 0;text-align:right;white-space:nowrap;color:#2E7D52;font-weight:600;">
            ${p.gesamt_min.toLocaleString('de-DE')} – ${p.gesamt_max.toLocaleString('de-DE')} €
          </td>
        </tr>`
    )
    .join('')

  const lohnHinweis =
    lohn_gesamt != null && lohn_gesamt > 0
      ? `
    <div style="background:#F7F6F3;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;color:#6B6B6B;">
      <strong>Steuerlicher Hinweis:</strong> Als Privatperson können Sie den Lohnkostenanteil von
      ${lohn_gesamt.toLocaleString('de-DE')} € nach § 35a EStG absetzen (20 % ≈
      ${Math.round(lohn_gesamt * 0.2).toLocaleString('de-DE')} € Steuerersparnis).
    </div>`
      : ''

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Ihr persönliches Angebot</h2>
    <p>Guten Tag ${escapeHtml(name)},<br/>anbei finden Sie Ihr Angebot von Bärenwald München.</p>
    ${greenBox(`
      <p style="margin:0;font-size:12px;color:#2E7D52;">Gesamtbetrag inkl. MwSt.</p>
      <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#1A3D2B;">
        ${gesamt_min.toLocaleString('de-DE')} – ${gesamt_max.toLocaleString('de-DE')} €
      </p>
    `)}
    <p style="font-weight:600;margin:20px 0 8px;">Enthaltene Leistungen:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;" role="presentation">${rows}</table>
    ${lohnHinweis}
    <p style="font-size:13px;color:#6B6B6B;">Das detaillierte Angebot mit allen Positionen finden Sie im Anhang.<br/>
      <strong>Gültig bis: ${escapeHtml(gueltig_bis)}</strong>
    </p>
    <p>Bei Fragen stehen wir gerne zur Verfügung:</p>
    <a href="tel:[TEL]" style="color:#2E7D52;font-weight:600;font-size:16px;">[TEL]</a>
  `,
    `Ihr Angebot: ${gesamt_min.toLocaleString('de-DE')} – ${gesamt_max.toLocaleString('de-DE')} €`,
    branding
  )
}

export function emailAuftragsbestaetigung(
  {
    name,
    gewerke,
    start_datum,
    end_datum,
    projektLink,
  }: {
    name: string
    gewerke: string[]
    start_datum: string
    end_datum?: string
    projektLink?: string | null
  },
  branding?: EmailBranding
): string {
  const linkBlock =
    projektLink && projektLink.trim()
      ? `
    ${mailPrimaryButtonHtml('Projekt-Status ansehen', projektLink.trim(), { block: true, margin: '20px 0' })}
    <p style="font-size:13px;color:#6B6B6B;">Hier verfolgen Sie den Fortschritt — ohne Passwort.</p>`
      : ''

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Auftrag bestätigt</h2>
    <p>Guten Tag ${escapeHtml(name)},</p>
    <p>Ihr Auftrag wurde bestätigt — den aktuellen Status können Sie jederzeit online einsehen.</p>
    ${linkBlock}
    <p style="font-size:13px;color:#6B6B6B;margin-top:16px;">
      <strong>Geplanter Start:</strong> ${escapeHtml(start_datum)}<br/>
      ${end_datum ? `<strong>Voraussichtlich fertig:</strong> ${escapeHtml(end_datum)}<br/>` : ''}
      <strong>Gewerke:</strong> ${escapeHtml(gewerke.join(', '))}
    </p>
    <p style="font-size:13px;color:#6B6B6B;">Bei Fragen:<br/>
      <a href="tel:[TEL]" style="color:#2E7D52;font-weight:600;">[TEL]</a>
    </p>
  `,
    'Auftrag bestätigt — Bärenwald München',
    branding
  )
}

/** Kurzer Hinweis mit Link zur öffentlichen Projekt-Status-Seite */
export function emailUpdateHinweis(
  { name, link }: { name: string; link: string },
  branding?: EmailBranding
): string {
  return baseTemplate(
    `
    <p>Guten Tag ${escapeHtml(name)},</p>
    <p>es gibt ein neues Update zu Ihrem Projekt.</p>
    ${mailPrimaryButtonHtml('Projekt-Status ansehen', link, { block: true, margin: '20px 0' })}
    <p style="font-size:13px;color:#6B6B6B;">
      Bei Fragen:<br/>
      <a href="tel:[TEL]" style="color:#2E7D52;">[TEL]</a>
    </p>
  `,
    'Neues Update zu Ihrem Projekt',
    branding
  )
}

/** Interne Kurzinfo (Cron / Monitoring) */
export function emailInternHinweis(text: string, branding?: EmailBranding): string {
  return baseTemplate(
    `<p style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;">${escapeHtml(text)}</p>`,
    'Intern',
    branding
  )
}

export function emailAbnahme(
  { name, abnahme_datum, gewerke }: { name: string; abnahme_datum: string; gewerke: string[] },
  branding?: EmailBranding
): string {
  const rows = infoRow('Abnahmedatum:', abnahme_datum) + infoRow('Gewerke:', gewerke.join(', '))
  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Ihr Projekt ist abgeschlossen</h2>
    <p>Guten Tag ${escapeHtml(name)},<br/>alle Arbeiten an Ihrem Projekt wurden erfolgreich abgeschlossen und abgenommen.</p>
    ${greenBox(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>`)}
    <p>Das Abnahmeprotokoll mit der vollständigen Dokumentation finden Sie im Anhang.</p>
    <p style="font-size:13px;color:#6B6B6B;"><strong>Gewährleistung:</strong> Die gesetzliche Gewährleistung beträgt 5 Jahre ab Abnahme.</p>
    <p>Vielen Dank für Ihr Vertrauen.</p>
    <p style="font-size:13px;color:#6B6B6B;"><a href="tel:[TEL]" style="color:#2E7D52;">[TEL]</a></p>
  `,
    'Ihr Projekt ist abgeschlossen',
    branding
  )
}

export function emailRechnung(
  {
    name,
    rechnungsnummer,
    brutto,
    faellig_am,
    iban,
  }: {
    name: string
    rechnungsnummer: string
    brutto: number
    faellig_am: string
    iban: string
  },
  branding?: EmailBranding
): string {
  const rows =
    infoRow('Rechnungsnummer:', rechnungsnummer) +
    infoRow('Betrag:', `${brutto.toLocaleString('de-DE')} €`) +
    infoRow('Fällig am:', faellig_am) +
    infoRow('IBAN:', iban)

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Ihre Rechnung</h2>
    <p>Guten Tag ${escapeHtml(name)},<br/>anbei finden Sie Ihre Rechnung für die ausgeführten Arbeiten.</p>
    ${greenBox(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>`)}
    <p style="font-size:13px;color:#6B6B6B;">Bitte überweisen Sie den Betrag bis zum <strong>${escapeHtml(faellig_am)}</strong>
      unter Angabe der Rechnungsnummer <strong>${escapeHtml(rechnungsnummer)}</strong>.</p>
    <p style="font-size:13px;color:#6B6B6B;">Die vollständige Rechnung finden Sie im Anhang.</p>
  `,
    `Rechnung ${rechnungsnummer} — ${brutto.toLocaleString('de-DE')} € fällig am ${faellig_am}`,
    branding
  )
}

export function emailZahlungserinnerung(
  {
    name,
    rechnungsnummer,
    brutto,
    faellig_am,
    tage_ueberfaellig,
    iban,
  }: {
    name: string
    rechnungsnummer: string
    brutto: number
    faellig_am: string
    tage_ueberfaellig: number
    iban: string
  },
  branding?: EmailBranding
): string {
  const rows =
    infoRow('Offener Betrag:', `${brutto.toLocaleString('de-DE')} €`) +
    infoRow('IBAN:', iban) +
    infoRow('Verwendungszweck:', rechnungsnummer)

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Zahlungserinnerung</h2>
    <p>Guten Tag ${escapeHtml(name)},</p>
    <p>unsere Rechnung <strong>${escapeHtml(rechnungsnummer)}</strong> vom <strong>${escapeHtml(faellig_am)}</strong>
      ist seit <strong>${tage_ueberfaellig} Tagen</strong> offen.</p>
    ${greenBox(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>`)}
    <p style="font-size:13px;color:#6B6B6B;">Falls Sie bereits gezahlt haben, melden Sie sich bitte bei uns:<br/>
      <a href="tel:[TEL]" style="color:#2E7D52;">[TEL]</a></p>
  `,
    `Zahlungserinnerung: ${brutto.toLocaleString('de-DE')} € seit ${tage_ueberfaellig} Tagen offen`,
    branding
  )
}

export function emailHandwerkerAnfrage(
  {
    name,
    gewerk,
    plz,
    zeitraum,
    positionen,
    link,
  }: {
    name: string
    gewerk: string
    plz: string
    zeitraum?: string
    positionen: HandwerkerAnfragePosition[]
    link: string
  },
  branding?: EmailBranding
): string {
  const rows =
    infoRow('Gewerk:', gewerk) +
    infoRow('Einsatzort:', plz) +
    infoRow('Zeitraum:', zeitraum?.trim() || 'Nach Absprache')

  const liste = positionen.map((p) => `<li>${escapeHtml(p.beschreibung)}</li>`).join('')

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Neue Anfrage für Sie</h2>
    <p>Guten Tag ${escapeHtml(name)},<br/>wir haben eine neue Anfrage im Bereich <strong>${escapeHtml(gewerk)}</strong>.</p>
    ${greenBox(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>`)}
    <p style="font-weight:600;margin:16px 0 8px;">Ihre Aufgaben:</p>
    <ul style="padding-left:20px;font-size:14px;line-height:1.8;margin:0 0 20px;">${liste}</ul>
    ${primaryButton('Anfrage ansehen & antworten', link)}
    <p style="font-size:13px;color:#6B6B6B;margin-top:16px;">Oder diesen Link öffnen:<br/>
      <a href="${escapeHtml(link)}" style="color:#2E7D52;word-break:break-all;">${escapeHtml(link)}</a></p>
  `,
    `Neue Anfrage: ${gewerk} in ${plz}`,
    branding
  )
}

export type NachtragMailPosition = { beschreibung: string; gesamt_min: number; gesamt_max: number }

export function emailNachtrag(
  {
    name,
    grund,
    positionen,
    gesamt_min,
    gesamt_max,
    link,
    erinnerung,
  }: {
    name: string
    grund: string
    positionen: NachtragMailPosition[]
    gesamt_min: number
    gesamt_max: number
    link: string
    erinnerung?: boolean
  },
  branding?: EmailBranding
): string {
  const hColor = erinnerung ? '#B45309' : '#D97706'
  const rows = positionen
    .map(
      (p) => `
        <tr style="border-bottom:1px solid #E5E3DF;">
          <td style="padding:8px 0;">${escapeHtml(p.beschreibung)}</td>
          <td style="padding:8px 0;text-align:right;white-space:nowrap;">
            ${p.gesamt_min.toLocaleString('de-DE')} – ${p.gesamt_max.toLocaleString('de-DE')} €
          </td>
        </tr>`
    )
    .join('')

  const title = erinnerung ? 'Erinnerung: Nachtrag zu Ihrem Auftrag' : 'Nachtrag zu Ihrem Auftrag'

  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:${hColor};font-size:20px;">${escapeHtml(title)}</h2>
    <p>Guten Tag ${escapeHtml(name)},<br/>
    bei den laufenden Arbeiten ist ein Zusatzaufwand entstanden, den wir Ihnen transparent mitteilen möchten.</p>
    <div style="background:#FEF3C7;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-weight:600;">Grund: ${escapeHtml(grund)}</p>
    </div>
    <p style="font-weight:600;margin:16px 0 8px;">Zusätzliche Leistungen:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;" role="presentation">${rows}</table>
    <div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#2E7D52;">Mehrkosten gesamt</p>
      <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#1A3D2B;">
        + ${gesamt_min.toLocaleString('de-DE')} – ${gesamt_max.toLocaleString('de-DE')} €
      </p>
    </div>
    ${mailPrimaryButtonHtml('Nachtrag bestätigen', link, { block: true, margin: '20px 0' })}
    <p style="font-size:13px;color:#6B6B6B;text-align:center;">
      Bei Fragen rufen Sie uns an:<br/>
      <a href="tel:[TEL]" style="color:#2E7D52;font-weight:600;">[TEL]</a>
    </p>
  `,
    `Nachtrag: +${gesamt_min.toLocaleString('de-DE')} – ${gesamt_max.toLocaleString('de-DE')} € — Bitte bestätigen`,
    branding
  )
}

export function emailBewertung({ name, gewerke }: { name: string; gewerke: string[] }, branding?: EmailBranding): string {
  const g = gewerke.length ? gewerke.join(', ') : 'Ihr Projekt'
  return baseTemplate(
    `
    <h2 style="margin:0 0 8px;color:#2E7D52;font-size:20px;">Wie war Ihre Erfahrung?</h2>
    <p>Guten Tag ${escapeHtml(name)},<br/>wir hoffen, Sie sind mit den Arbeiten (${escapeHtml(g)}) zufrieden!</p>
    <p>Ihr Feedback hilft uns und anderen Kunden.</p>
    ${primaryButton('Jetzt bewerten (Google)', '[GOOGLE_BEWERTUNG_URL]')}
    <p style="font-size:13px;color:#6B6B6B;">Das dauert nur wenige Minuten. Vielen Dank!</p>
  `,
    'Wie war Ihre Erfahrung?',
    branding
  )
}
