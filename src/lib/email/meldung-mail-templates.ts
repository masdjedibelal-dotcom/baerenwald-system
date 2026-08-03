import { mailHtmlBase } from '@/lib/mail-templates'
import type { MailBranding } from '@/lib/mail-branding'
import { mailTeamGruss } from '@/lib/mail/anrede'
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
  reparatur: 'Reparatur',
  defekt: 'Defekt',
  sonstiges: 'Sonstiges',
}

const BEREICH_LABELS: Record<string, string> = {
  wasser: 'Wasser / Rohr / WC',
  heizung: 'Heizung / Warmwasser',
  strom: 'Strom / Sicherung',
  fenster_tuer: 'Fenster / Tür',
  dach: 'Dach / Regenrinne',
  schimmel: 'Schimmel / Feuchtigkeit',
  baum_notfall: 'Baum / Sturm',
  sonstiges: 'Etwas anderes',
}

const ZEITRAUM_LABELS: Record<string, string> = {
  sofort: 'So bald wie möglich',
  diese_woche: 'Diese Woche',
  flexibel: 'Flexibel',
}

export function meldeKategorieLabel(kategorie: string): string {
  return KATEGORIE_LABELS[kategorie] ?? kategorie
}

function meldeBereichLabel(id: string | null | undefined): string {
  const v = (id ?? '').trim()
  return BEREICH_LABELS[v] ?? (v ? v.replace(/_/g, ' ') : 'Sonstiges')
}

function zeitraumLabel(raw: string | null | undefined): string | undefined {
  const v = (raw ?? '').trim()
  if (!v) return undefined
  return ZEITRAUM_LABELS[v] ?? v.replace(/_/g, ' ')
}

function mailDataRow(label: string, value: string | undefined | null): string {
  const v = value?.trim()
  if (!v) return ''
  return `<tr>
  <td style="padding:8px 14px;font-size:12px;color:#6B7280;vertical-align:top;width:130px;border-top:1px solid #E5E7EB">${esc(label)}</td>
  <td style="padding:8px 14px;font-size:14px;color:#111827;vertical-align:top;border-top:1px solid #E5E7EB">${esc(v)}</td>
</tr>`
}

function mailSummaryTable(rows: string): string {
  if (!rows.trim()) return ''
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;background:#F9FAFB">
${rows}
</table>`
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

export type OrgNeueMeldungMailInput = {
  objektTitel: string
  melderName: string
  melderEinheit?: string
  melderTelefon?: string
  melderEmail?: string
  kategorie: string
  bereichId?: string
  beschreibung?: string
  fotoCount?: number
  dringlichkeit?: string | null
  quelle?: 'mieter' | 'hausverwaltung'
  portalLink?: string
  referenz?: string
}

export function buildOrgNeueMeldungSubject(objektTitel: string): string {
  const obj = objektTitel.trim() || 'Objekt'
  return `Neuer Vorgang — ${obj}`
}

export function mailOrgNeueMeldung(
  input: OrgNeueMeldungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const kat = meldeKategorieLabel(input.kategorie)
  const bereich = meldeBereichLabel(input.bereichId)
  const quelle = input.quelle ?? 'mieter'
  const einleitung =
    quelle === 'hausverwaltung'
      ? `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang von Ihrer Hausverwaltung erfasst.`
      : `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang durch eine <strong>Mieter-Meldung</strong> erstellt.`

  const kontakt = [input.melderEmail?.trim(), input.melderTelefon?.trim()]
    .filter(Boolean)
    .join(' · ')

  const rows = [
    mailDataRow('Art', kat),
    mailDataRow('Bereich', bereich),
    mailDataRow(
      'Melder',
      input.melderEinheit?.trim()
        ? `${input.melderName} (${input.melderEinheit.trim()})`
        : input.melderName
    ),
    mailDataRow('Kontakt', kontakt || undefined),
    mailDataRow('Dringlichkeit', zeitraumLabel(input.dringlichkeit)),
    mailDataRow(
      'Fotos',
      input.fotoCount != null && input.fotoCount > 0
        ? `${input.fotoCount} Bild${input.fotoCount === 1 ? '' : 'er'}`
        : undefined
    ),
    mailDataRow('Beschreibung', input.beschreibung),
    mailDataRow('Referenz', input.referenz),
  ].join('')

  const begr = 'Guten Tag,'
  const gruss = mailTeamGruss('sie', b.firmenname)
  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
    <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${einleitung}</p>
    ${mailSummaryTable(rows)}
    <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.55;">Bitte prüfen Sie den Vorgang im Auftraggeber-Portal und wählen Sie den nächsten Schritt (z.&nbsp;B. Angebot einfordern oder Kleinreparatur).</p>
    <p style="font-size:13px;color:#6B7280;margin:0 0 20px;">Status: Neu · Bereich Meldungen</p>
    <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>
  `

  return {
    betreff: buildOrgNeueMeldungSubject(input.objektTitel),
    html: mailHtmlBase(body, 'Neuer Vorgang', b, 'Sie erhalten diese Mail, weil für Ihr Objekt ein Vorgang im Auftraggeber-Portal angelegt wurde.', {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: input.portalLink,
    }),
  }
}

/** @deprecated Nutze mailOrgNeueMeldung — HTML-Fragment ohne Mail-Hülle. */
export function buildOrgNeueMeldungHtml(input: OrgNeueMeldungMailInput): string {
  const kat = meldeKategorieLabel(input.kategorie)
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Neuer Vorgang — <strong>${esc(input.objektTitel)}</strong></p>
  <p><strong>Art:</strong> ${esc(kat)}<br/>
  <strong>Melder:</strong> ${esc(input.melderName)}${input.melderEinheit ? ` (${esc(input.melderEinheit)})` : ''}</p>
  ${input.beschreibung ? `<p>${esc(input.beschreibung)}</p>` : ''}
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
    <p>für <strong>${esc(data.objektTitel)}</strong> liegt ein Angebot über <strong>${esc(
      data.betragEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
    )}</strong> vor und benötigt Ihre Freigabe.</p>
    <p>Dies betrifft eine <strong>Mieter-Schadenmeldung</strong>. Bitte im Auftraggeber-Portal freigeben oder ablehnen, bevor Bärenwald den Handwerker informiert.</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Freigabe erforderlich', b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
}

/** Unter Schwelle / Notfall: Angebot nur zur Information — kein Freigabe-Request. */
export function mailOrgAngebotZurInfo(
  data: {
    orgName: string
    objektTitel: string
    betragEur: number
    portalLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const betreff = `Angebot zur Information — ${data.objektTitel.trim() || 'Objekt'}`
  const body = `
    <p>Guten Tag,</p>
    <p>für <strong>${esc(data.objektTitel)}</strong> liegt ein Angebot über <strong>${esc(
      data.betragEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
    )}</strong> vor.</p>
    <p>Eine Freigabe ist <strong>nicht erforderlich</strong> (unter Schwelle bzw. Akut). Der Auftrag wird automatisch angelegt — diese Mail dient nur der Information.</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Angebot zur Information', b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
}

/** Direktauftrag: HV nur zur Info — wir kümmern uns; Portal-Zugang wie gewohnt. */
export function mailOrgNotfallDirektInfo(
  data: {
    orgName: string
    objektTitel: string
    /** @deprecated Nicht mehr in der Mail; optional für Aufrufer-Kompatibilität. */
    stundensatz?: number
    portalLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const objekt = data.objektTitel.trim() || 'Ihr Objekt'
  const firma = b.firmenname.trim() || 'Bärenwald'
  const betreff = `Direktauftrag — ${objekt}`
  const gruss = mailTeamGruss('sie', firma)
  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">
      für <strong>${esc(objekt)}</strong> haben wir einen <strong>Direktauftrag</strong> angelegt.
      <strong>${esc(firma)}</strong> kümmert sich darum — Sie müssen nichts freigeben.
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">
      Den aktuellen Stand sehen Sie jederzeit im Auftraggeber-Portal.
    </p>
    <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Direktauftrag angelegt', b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
}

/** Abnahmeprotokoll liegt in den Unterlagen. */
export function mailOrgAbnahmeDokument(
  data: {
    orgName: string
    objektTitel: string
    portalLink: string
    abschlussberichtUrl?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const betreff = `Abnahmedokument verfügbar — ${data.objektTitel.trim() || 'Objekt'}`
  const bericht = data.abschlussberichtUrl?.trim()
    ? `<p>Optionaler Abschlussbericht: <a href="${esc(data.abschlussberichtUrl.trim())}">Bericht öffnen</a></p>`
    : ''
  const body = `
    <p>Guten Tag,</p>
    <p>für <strong>${esc(data.objektTitel)}</strong> liegt das <strong>Abnahmeprotokoll</strong> in den Unterlagen bereit.</p>
    ${bericht}
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Abnahmedokument verfügbar', b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
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
  return {
    betreff,
    html: mailHtmlBase(body, `Freigabe ${aktionLabel}`, b, undefined, {
      skipMeinBaerenwaldPs: true,
    }),
  }
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
    data.anrede === 'du' ? 'Dein Auftraggeber-Portal' : 'Ihr Auftraggeber-Portal'
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
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Auftraggeber-Portal', b, undefined, {
      anrede: data.anrede,
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
}
