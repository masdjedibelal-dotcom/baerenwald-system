/**
 * HTML für Abnahmeprotokoll-PDF (A4, Bärenwald-Layout wie Angebot/Abschluss).
 */

import type { AbnahmeGewerkBlock, AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'

const ACCENT = '#1A3D2B'
const TINT = '#F3F7F4'
const TEXT = '#111111'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'

export type AbnahmeProtokollHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  auftragsNr: string
  projektTitel: string
  abnahmeDatum: string
  kunde_name: string
  kunde_adresse: string
  gewerke: AbnahmeGewerkBlock[]
  maengel: AbnahmeMangel[]
  notizen: string | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firmennameZeile(p: AbnahmeProtokollHtmlInput): string {
  const rf = p.firmen_rechtsform?.trim()
  return rf ? `${p.firmenname.trim()} ${rf}` : p.firmenname.trim()
}

function logoKopf(p: AbnahmeProtokollHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  const safeSrc = src.replace(/"/g, '&quot;')
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${safeSrc}" alt="${esc(firmennameZeile(p))}" style="height:72px;width:auto;max-width:300px;object-fit:contain;display:block;" />
  </div>`
}

function briefAbsender(p: AbnahmeProtokollHtmlInput): string {
  const kontakt = p.firmen_kontakt
    .split(' · ')
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => esc(z))
  const steuer = (p.firmen_steuer_footer ?? '')
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => esc(z))
  const zeilen = [
    `<strong>${esc(firmennameZeile(p))}</strong>`,
    ...esc(p.firmen_adresse)
      .replace(/\n/g, '<br/>')
      .split('<br/>')
      .filter(Boolean),
    ...kontakt,
    ...steuer,
  ]
  return `<div style="font-size:8pt;line-height:1.45;color:${TEXT};font-weight:400;text-align:right;">
    ${zeilen.join('<br/>')}
  </div>`
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:700;color:${ACCENT};margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid ${ACCENT};page-break-after:avoid;">${esc(title)}</h2>`
}

function statusSymbol(status: AbnahmePunkt['status']): string {
  if (status === 'ok') return '☑'
  if (status === 'mangel') return '⚠'
  return '☐'
}

function checklistBulletHtml(p: AbnahmePunkt): string {
  const notiz = p.notiz?.trim()
  return `<li style="margin:0 0 6px;padding-left:2px;font-size:9pt;line-height:1.45;color:${TEXT};list-style:none;">
    <span style="display:inline-block;width:18px;font-weight:700;color:${ACCENT};">${statusSymbol(p.status)}</span>
    ${esc(p.beschreibung?.trim() || '—')}
    ${notiz ? `<span style="display:block;margin:2px 0 0 20px;font-size:8pt;color:${MUTED};">Notiz: ${esc(notiz)}</span>` : ''}
  </li>`
}

function gewerkeChecklisteHtml(gewerke: AbnahmeGewerkBlock[]): string {
  if (!gewerke.length) {
    return `<p style="font-size:9pt;color:${MUTED};">Keine Abnahmepunkte.</p>`
  }
  return gewerke
    .map((g) => {
      const leistungen = g.leistungen
        .map((l) => {
          const bullets = l.punkte.map((p) => checklistBulletHtml(p)).join('')
          return `<div style="margin:0 0 12px;padding:10px 12px;background:${TINT};border:1px solid ${BORDER};border-radius:4px;page-break-inside:avoid;">
            <p style="margin:0 0 6px;font-size:9.5pt;font-weight:700;color:${ACCENT};">${esc(l.leistung_name)}</p>
            <ul style="margin:0;padding:0;">${bullets}</ul>
          </div>`
        })
        .join('')
      return `<div style="margin-bottom:16px;page-break-inside:avoid;">
        <h3 style="margin:0 0 8px;font-size:10.5pt;font-weight:700;color:${ACCENT};">${esc(g.gewerk)}</h3>
        ${leistungen}
      </div>`
    })
    .join('')
}

function maengelHtml(maengel: AbnahmeMangel[]): string {
  if (!maengel.length) return ''
  const items = maengel
    .map(
      (m) =>
        `<li style="margin:0 0 8px;font-size:9pt;color:${TEXT};">${esc(m.beschreibung)}${
          m.frist
            ? `<span style="display:block;font-size:8pt;color:#991B1B;">Frist: ${esc(m.frist.slice(0, 10))}</span>`
            : ''
        }</li>`
    )
    .join('')
  return `${sectionHeading('Mängel / offene Punkte')}<ul style="margin:0;padding-left:18px;">${items}</ul>`
}

function unterschriftBlock(): string {
  return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid ${BORDER};page-break-inside:avoid;">
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
      <tr>
        <td style="width:50%;padding:8px 12px 0 0;vertical-align:top;">
          <p style="margin:0 0 28px;color:${MUTED};">Datum der Abnahme</p>
          <div style="border-bottom:1px solid ${TEXT};height:1px;"></div>
        </td>
        <td style="width:50%;padding:8px 0 0 12px;vertical-align:top;">
          <p style="margin:0 0 28px;color:${MUTED};">Unterschrift Kunde</p>
          <div style="border-bottom:1px solid ${TEXT};height:1px;"></div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:16px 0 0;vertical-align:top;">
          <p style="margin:0 0 28px;color:${MUTED};">Unterschrift ${esc('Auftragnehmer')}</p>
          <div style="border-bottom:1px solid ${TEXT};height:1px;"></div>
        </td>
      </tr>
    </table>
  </div>`
}

export function buildAbnahmeProtokollHtml(p: AbnahmeProtokollHtmlInput): string {
  const meta = `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:9pt;">
    <tr>
      <td style="width:50%;vertical-align:top;padding:0 12px 0 0;">
        <p style="margin:0 0 4px;font-size:8pt;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;">Kunde / Objekt</p>
        <p style="margin:0;font-weight:700;color:${TEXT};">${esc(p.kunde_name)}</p>
        <p style="margin:4px 0 0;color:${TEXT};white-space:pre-line;">${esc(p.kunde_adresse)}</p>
      </td>
      <td style="width:50%;vertical-align:top;padding:0;">
        <p style="margin:0 0 4px;font-size:8pt;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;">Projekt</p>
        <p style="margin:0;font-weight:600;color:${TEXT};">${esc(p.projektTitel)}</p>
        <p style="margin:6px 0 0;color:${MUTED};">Auftrag ${esc(p.auftragsNr)} · Abnahme ${esc(p.abnahmeDatum)}</p>
      </td>
    </tr>
  </table>`

  const notizen = p.notizen
    ? `${sectionHeading('Anmerkungen')}<p style="margin:0;font-size:9pt;line-height:1.5;color:${TEXT};white-space:pre-wrap;">${esc(p.notizen)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <title>Abnahmeprotokoll</title>
  <style>
    @page { size: A4; margin: 14mm 14mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 14mm; }
    body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: ${TEXT}; }
  </style>
</head>
<body>
  <div style="max-width:100%;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="width:55%;vertical-align:top;">${logoKopf(p)}</td>
        <td style="width:45%;vertical-align:top;">${briefAbsender(p)}</td>
      </tr>
    </table>
    <h1 style="margin:0 0 6px;font-size:14pt;font-weight:700;color:${ACCENT};">Abnahmeprotokoll</h1>
    <p style="margin:0 0 14px;font-size:9pt;color:${MUTED};">Checkliste der erbrachten Leistungen zur Abnahme vor Ort.</p>
    ${meta}
    ${sectionHeading('Abnahmecheckliste')}
    ${gewerkeChecklisteHtml(p.gewerke)}
    ${maengelHtml(p.maengel)}
    ${notizen}
    ${unterschriftBlock()}
  </div>
</body>
</html>`
}

function footerInputFromAbnahme(p: AbnahmeProtokollHtmlInput): AngebotHtmlInput {
  return {
    firmenname: p.firmenname,
    firmen_rechtsform: p.firmen_rechtsform,
    firmen_adresse: p.firmen_adresse,
    firmen_kontakt: p.firmen_kontakt,
    firmen_steuer_footer: p.firmen_steuer_footer,
    firmen_logo_url: p.firmen_logo_url,
    geschaeftsfuehrer: null,
    kunde_name: p.kunde_name,
    kunde_adresse: p.kunde_adresse,
    kundennr: '',
    angebotsnr: p.auftragsNr,
    datum: p.abnahmeDatum,
    gueltig_bis: '',
    leistungsumfang: p.projektTitel,
    begruessung: '',
    einleitung: '',
    zahlungsbedingungen: '',
    positionen: [],
    summen: { netto: 0, mwst_prozent: 0, mwst_betrag: 0, brutto: 0 },
    schlusstext: '',
    hinweise: '',
  }
}

export function buildAbnahmeProtokollPdfFooterTemplate(p: AbnahmeProtokollHtmlInput): string {
  return buildAngebotPdfFooterTemplate(footerInputFromAbnahme(p))
}
