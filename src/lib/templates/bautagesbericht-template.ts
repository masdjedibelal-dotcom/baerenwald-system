/**
 * HTML für Bautagesbericht-PDF (A4, Bärenwald-Layout wie Abschlussdokumentation).
 */

import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { BautagesberichtFoto } from '@/lib/auftraege/bautagesbericht-types'

const ACCENT = '#1A3D2B'
const TINT = '#F3F7F4'
const TEXT = '#111111'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'

export type BautagesberichtHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  projektTitel: string
  projektAdresse: string
  tagNummer: number
  datumLabel: string
  arbeitszeit: string
  wetter: string
  auftraggeberName: string
  auftragnehmerName: string
  nachunternehmerZeile: string
  leistungen: string[]
  behinderungen: string
  qualitaetssicherung: string
  risiken: string[]
  zusammenfassung: string
  personalNamen: string[]
  fotos: BautagesberichtFoto[]
}

const BAUTAGESBERICHT_MAX_FOTOS = 12

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firmennameZeile(p: BautagesberichtHtmlInput): string {
  const rf = p.firmen_rechtsform?.trim()
  return rf ? `${p.firmenname.trim()} ${rf}` : p.firmenname.trim()
}

function logoKopf(p: BautagesberichtHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  const safeSrc = src.replace(/"/g, '&quot;')
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${safeSrc}" alt="${esc(firmennameZeile(p))}" style="height:72px;width:auto;max-width:300px;object-fit:contain;display:block;" />
  </div>`
}

function briefAbsender(p: BautagesberichtHtmlInput): string {
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
  return `<h2 style="font-size:11pt;font-weight:700;color:${ACCENT};margin:22px 0 8px;padding-bottom:6px;border-bottom:2px solid ${ACCENT};page-break-after:avoid;">${esc(title)}</h2>`
}

function bulletList(items: string[]): string {
  if (!items.length) {
    return `<p style="margin:0;font-size:9.5pt;color:${MUTED};">—</p>`
  }
  return `<ul style="margin:0;padding-left:18px;font-size:9.5pt;line-height:1.55;color:${TEXT};">
    ${items.map((item) => `<li style="margin-bottom:6px;">${esc(item)}</li>`).join('')}
  </ul>`
}

function metaBlock(p: BautagesberichtHtmlInput): string {
  const rows = [
    ['Auftraggeber', p.auftraggeberName],
    ['Auftragnehmer', p.auftragnehmerName],
    ['Nachunternehmer', p.nachunternehmerZeile || '—'],
    ['Datum', p.datumLabel],
    ['Arbeitszeit', p.arbeitszeit || '—'],
    ['Wetter', p.wetter || '—'],
  ]
  return `<div style="display:grid;grid-template-columns:140px 1fr;gap:6px 12px;font-size:9.5pt;line-height:1.5;margin:16px 0;padding:12px 14px;border:1px solid ${BORDER};border-radius:4px;background:${TINT};">
    ${rows
      .map(
        ([label, value]) =>
          `<div style="color:${MUTED};">${esc(label)}</div><div style="color:${TEXT};font-weight:500;">${esc(value)}</div>`
      )
      .join('')}
  </div>`
}

function personalGrid(namen: string[]): string {
  if (!namen.length) {
    return `<p style="margin:0;font-size:9.5pt;color:${MUTED};">Keine Einträge</p>`
  }
  const cells = namen.map(
    (name, i) =>
      `<div style="font-size:9pt;line-height:1.45;padding:6px 8px;border:1px solid ${BORDER};border-radius:4px;background:#fff;">
        <span style="color:${MUTED};margin-right:6px;">${i + 1}.</span>${esc(name)}
      </div>`
  )
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">${cells.join('')}</div>
    <p style="margin:12px 0 0;font-size:9.5pt;font-weight:700;color:${ACCENT};">Gesamtpersonal: ${namen.length} Mitarbeiter</p>`
}

function fotosHtml(fotos: BautagesberichtFoto[]): string {
  if (!fotos.length) return ''
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    ${fotos
      .slice(0, BAUTAGESBERICHT_MAX_FOTOS)
      .map((b, i) => {
        const cap = b.caption?.trim()
        return `<figure style="margin:0;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:#fff;page-break-inside:avoid;">
          <img alt="" src="${esc(b.url)}" style="width:100%;height:140px;object-fit:cover;display:block;"/>
          <figcaption style="padding:8px 10px;font-size:8.5pt;line-height:1.45;color:${TEXT};background:${TINT};">
            ${cap ? esc(cap) : `Bild ${i + 1}`}
          </figcaption>
        </figure>`
      })
      .join('')}
  </div>`
}

function textBlock(text: string): string {
  const t = text.trim()
  if (!t) return `<p style="margin:0;font-size:9.5pt;color:${MUTED};">—</p>`
  return `<p style="margin:0;font-size:9.5pt;line-height:1.6;color:${TEXT};white-space:pre-wrap;">${esc(t)}</p>`
}

function briefkopf(p: BautagesberichtHtmlInput): string {
  const tagLabel = String(p.tagNummer).padStart(2, '0')
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:18px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:9pt;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Digitaler Generalunternehmer</div>
      <h1 style="font-size:17pt;font-weight:700;margin:0;color:${ACCENT};line-height:1.25;">Bautagesbericht</h1>
      <p style="margin:8px 0 0;font-size:11pt;color:${TEXT};line-height:1.45;font-weight:600;">TAG ${tagLabel} · ${esc(p.datumLabel)}</p>
      <p style="margin:6px 0 0;font-size:10pt;color:${TEXT};line-height:1.45;">${esc(p.projektTitel)}</p>
      <p style="margin:4px 0 0;font-size:9.5pt;color:${MUTED};">${esc(p.projektAdresse)}</p>
    </div>
    <div style="flex:0 0 auto;text-align:right;">
      ${briefAbsender(p)}
    </div>
  </div>`
}

function footerInputFromBericht(p: BautagesberichtHtmlInput): AngebotHtmlInput {
  return {
    firmenname: p.firmenname,
    firmen_rechtsform: p.firmen_rechtsform,
    firmen_adresse: p.firmen_adresse,
    firmen_kontakt: p.firmen_kontakt,
    firmen_steuer_footer: p.firmen_steuer_footer,
    angebotsnr: '—',
    kundennr: '—',
    datum: p.datumLabel,
    gueltig_bis: '—',
    kunde_name: p.auftraggeberName,
    kunde_adresse: p.projektAdresse,
    leistungsumfang: p.projektTitel,
    begruessung: '',
    einleitung: '',
    zahlungsbedingungen: '',
    positionen: [],
    summen: { netto: 0, mwst_prozent: 19, mwst_betrag: 0, brutto: 0 },
  }
}

function pdfShell(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: ${TEXT};
    font-size: 11pt;
    font-weight: 400;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>${body}</body>
</html>`
}

export function buildBautagesberichtHtml(p: BautagesberichtHtmlInput): string {
  const title = `Bautagesbericht Tag ${String(p.tagNummer).padStart(2, '0')} — ${p.projektTitel}`
  const body = `
    ${logoKopf(p)}
    ${briefkopf(p)}
    ${metaBlock(p)}
    ${sectionHeading(`Ausgeführte Leistungen – Tag ${String(p.tagNummer).padStart(2, '0')}`)}
    ${bulletList(p.leistungen)}
    ${sectionHeading('Behinderungen und Besonderheiten')}
    ${textBlock(p.behinderungen)}
    ${sectionHeading('Qualitätssicherung und Dokumentation')}
    ${textBlock(p.qualitaetssicherung)}
    ${sectionHeading('Risiken & Hinweise')}
    ${bulletList(p.risiken)}
    ${sectionHeading('Zusammenfassung')}
    ${textBlock(p.zusammenfassung)}
    <div style="page-break-before:always;"></div>
    ${sectionHeading(`Personalnachweis – Tag ${String(p.tagNummer).padStart(2, '0')}`)}
    ${personalGrid(p.personalNamen)}
    ${
      p.fotos.length
        ? `<div style="page-break-before:always;"></div>${sectionHeading('Fotodokumentation')}${fotosHtml(p.fotos)}`
        : ''
    }
  `
  return pdfShell(body, title)
}

export function buildBautagesberichtPdfFooterTemplate(p: BautagesberichtHtmlInput): string {
  const tagLabel = String(p.tagNummer).padStart(2, '0')
  const footerBase = buildAngebotPdfFooterTemplate(footerInputFromBericht(p))
  return footerBase.replace(
    '</span>',
    ` · Bautagesbericht Tag ${tagLabel} ${esc(p.datumLabel)}</span>`
  )
}
