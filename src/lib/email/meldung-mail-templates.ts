import { mailHtmlBase } from '@/lib/mail-templates'
import type { MailBranding } from '@/lib/mail-branding'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { mailSecondaryButtonHtml } from '@/lib/mail/email-buttons'
import type { LeadAnlass } from '@/lib/types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const KATEGORIE_LABELS: Record<string, string> = {
  notfall: 'Notfall',
  schaden: 'Schaden',
  defekt: 'Defekt',
  sonstiges: 'Sonstiges',
}

export function meldeKategorieLabel(kategorie: string): string {
  return KATEGORIE_LABELS[kategorie] ?? kategorie
}

export function buildMelderBestaetigungHtml(input: {
  melderName: string
  orgName: string
  objektTitel: string
  kategorie: string
  referenz?: string
}): string {
  const kat = meldeKategorieLabel(input.kategorie)
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>wir haben deine <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
  <p>${esc(input.orgName)} und Bärenwald koordinieren den nächsten Schritt.</p>
  ${input.referenz ? `<p style="color:#6b7f74;font-size:14px">Referenz: ${esc(input.referenz)}</p>` : ''}
  <p style="margin-top:24px">Herzliche Grüße<br/>Bärenwald München</p>
</body>
</html>`
}

export function buildOrgNeueMeldungHtml(input: {
  orgName: string
  objektTitel: string
  melderName: string
  melderEinheit?: string
  kategorie: string
  beschreibung?: string
}): string {
  const kat = meldeKategorieLabel(input.kategorie)
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Neue Meldung für <strong>${esc(input.orgName)}</strong></p>
  <p><strong>Objekt:</strong> ${esc(input.objektTitel)}<br/>
  <strong>Melder:</strong> ${esc(input.melderName)}${input.melderEinheit ? ` (${esc(input.melderEinheit)})` : ''}<br/>
  <strong>Kategorie:</strong> ${esc(kat)}</p>
  ${input.beschreibung ? `<p>${esc(input.beschreibung)}</p>` : ''}
  <p>Im Auftraggeber-Portal unter <strong>Eingang</strong> einsehbar.</p>
</body>
</html>`
}

export function anfrageBetreffNachAnlass(anlass: LeadAnlass | null | undefined, objektTitel: string): string {
  const obj = objektTitel.trim() || 'Ihr Objekt'
  if (anlass === 'meldung') return `Meldung eingegangen — ${obj}`
  if (anlass === 'projekt') return `Projektanfrage — ${obj}`
  if (anlass === 'servicepaket') return `Servicepaket-Anfrage — ${obj}`
  return `Anfrage — ${obj}`
}

export function mailOrgFreigabeAngefordert(
  data: {
    orgName: string
    objektTitel: string
    betragEur: number
    portalLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const betreff = `Freigabe erforderlich — ${data.objektTitel.trim() || 'Objekt'}`
  const body = `
    <p>Guten Tag,</p>
    <p>für <strong>${esc(data.orgName)}</strong> liegt ein Angebot über <strong>${esc(
      data.betragEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
    )}</strong> vor und benötigt Ihre Freigabe.</p>
    <p><strong>Objekt:</strong> ${esc(data.objektTitel)}</p>
    <p>Bitte im Auftraggeber-Portal unter <strong>Eingang</strong> freigeben oder ablehnen.</p>
    <div style="margin:20px 0 8px;">
      ${mailSecondaryButtonHtml('Zum Auftraggeber-Portal →', data.portalLink, { margin: '0' })}
    </div>
  `
  return { betreff, html: mailHtmlBase(body, 'Freigabe erforderlich', b) }
}

export function mailOrgFreigabeErgebnis(
  data: {
    orgName: string
    objektTitel: string
    aktion: 'freigegeben' | 'abgelehnt'
    notiz?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const aktionLabel = data.aktion === 'freigegeben' ? 'freigegeben' : 'abgelehnt'
  const betreff = `Freigabe ${aktionLabel} — ${data.objektTitel.trim() || 'Objekt'}`
  const body = `
    <p>Guten Tag,</p>
    <p><strong>${esc(data.orgName)}</strong> hat die Freigabe für <strong>${esc(data.objektTitel)}</strong> <strong>${aktionLabel}</strong>.</p>
    ${data.notiz?.trim() ? `<p><strong>Notiz:</strong> ${esc(data.notiz.trim())}</p>` : ''}
    <p>Bärenwald setzt den Vorgang im CRM fort.</p>
  `
  return { betreff, html: mailHtmlBase(body, `Freigabe ${aktionLabel}`, b) }
}

export function mailOrgPortalEinladung(
  data: {
    name: string
    orgAnzeigename?: string | null
    portalLink: string
    anrede: 'du' | 'sie'
    text: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const betreff =
    data.anrede === 'du'
      ? 'Dein Auftraggeber-Portal — MeinBärenwald'
      : 'Ihr Auftraggeber-Portal — MeinBärenwald'
  const org = data.orgAnzeigename?.trim()
  const intro = org
    ? data.anrede === 'du'
      ? `hier ist dein Zugang zum Auftraggeber-Portal für <strong>${esc(org)}</strong>.`
      : `hier ist Ihr Zugang zum Auftraggeber-Portal für <strong>${esc(org)}</strong>.`
    : esc(data.text)
  const body = `
    <p>${data.anrede === 'du' ? `Hallo ${esc(data.name)},` : `Guten Tag ${esc(data.name)},`}</p>
    <p>${intro}</p>
    <p>${data.anrede === 'du' ? 'Melde dich mit deiner E-Mail an — Meldungen, Freigaben und Objekte im Blick.' : 'Melden Sie sich mit Ihrer E-Mail an — Meldungen, Freigaben und Objekte im Blick.'}</p>
    <div style="margin:20px 0 8px;">
      ${mailSecondaryButtonHtml('Zum Portal →', data.portalLink, { margin: '0' })}
    </div>
    <p style="font-size:13px;color:#6B7280;">Link: ${esc(data.portalLink || buildPortalLoginLink())}</p>
  `
  return { betreff, html: mailHtmlBase(body, 'Auftraggeber-Portal', b) }
}
