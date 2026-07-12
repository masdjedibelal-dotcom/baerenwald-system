/**
 * HTML für Abnahmeprotokoll-PDF (A4, Bärenwald-Layout wie Angebot).
 */

import type { AbnahmeGewerkBlock, AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  angebotLogoKopfHtml,
  briefkopfZeileHtml,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'

const ACCENT = '#1A3D2B'
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

function abnahmeBriefMetaHtml(p: AbnahmeProtokollHtmlInput): string {
  const zeile = (label: string, value: string) =>
    `<div style="text-align:right;font-size:8.5pt;line-height:1.55;white-space:nowrap;">
      <span style="color:${TEXT};">${label}</span>
      <span style="font-weight:400;margin-left:8px;">${esc(value)}</span>
    </div>`
  return `<div style="text-align:right;min-width:200px;">
    ${zeile('Auftrag:', p.auftragsNr)}
    ${zeile('Abnahme:', p.abnahmeDatum)}
    ${zeile('Projekt:', p.projektTitel)}
  </div>`
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:700;color:${ACCENT};margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid ${ACCENT};page-break-after:avoid;">${esc(title)}</h2>`
}

function checklistCircleHtml(): string {
  return `<span style="display:inline-block;width:13px;height:13px;border:1.5pt solid ${TEXT};border-radius:50%;flex-shrink:0;margin-top:2px;"></span>`
}

function checklistBulletHtml(p: AbnahmePunkt): string {
  const notiz = p.notiz?.trim()
  return `<li style="display:flex;align-items:flex-start;gap:8px;margin:0 0 8px;padding:0;font-size:9pt;line-height:1.45;color:${TEXT};list-style:none;">
    ${checklistCircleHtml()}
    <span style="flex:1;min-width:0;">
      ${esc(p.beschreibung?.trim() || '—')}
      ${notiz ? `<span style="display:block;margin-top:2px;font-size:8pt;color:${MUTED};">Notiz: ${esc(notiz)}</span>` : ''}
    </span>
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
          return `<div style="margin:0 0 14px;padding:10px 0 0;border-top:1px solid ${BORDER};page-break-inside:avoid;">
            <p style="margin:0 0 8px;font-size:9.5pt;font-weight:700;color:${ACCENT};">${esc(l.leistung_name)}</p>
            <ul style="margin:0;padding:0;">${bullets}</ul>
          </div>`
        })
        .join('')
      return `<div style="margin-bottom:8px;padding-top:12px;border-top:2px solid ${ACCENT};page-break-inside:avoid;">
        <h3 style="margin:0 0 4px;font-size:10.5pt;font-weight:700;color:${ACCENT};">${esc(g.gewerk)}</h3>
        ${leistungen}
      </div>`
    })
    .join('')
}

function formatTsDe(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso.slice(0, 16)
  }
}

function isMangelOffenPdf(m: AbnahmeMangel): boolean {
  const s = m.status ?? 'offen'
  return s === 'offen' || s === 'in_bearbeitung'
}

function maengelListeHtml(maengel: AbnahmeMangel[], nurOffen: boolean): string {
  const list = maengel.filter((m) => (nurOffen ? isMangelOffenPdf(m) : !isMangelOffenPdf(m)))
  if (!list.length) return ''
  return `<ul style="margin:0;padding-left:18px;font-size:9pt;line-height:1.5;color:${TEXT};">
    ${list
      .map((m) => {
        const verlauf = (m.verlauf ?? [])
          .slice(-3)
          .map((v) => `${formatTsDe(v.at)}: ${esc(v.typ)}${v.notiz ? ` — ${esc(v.notiz)}` : ''}`)
          .join('<br/>')
        return `<li style="margin:0 0 8px;page-break-inside:avoid;">
          <strong>${esc(m.beschreibung)}</strong>
          ${m.frist ? `<span style="display:block;font-size:8pt;color:#991B1B;">Frist: ${esc(m.frist.slice(0, 10))}</span>` : ''}
          ${m.erfasst_at ? `<span style="display:block;font-size:8pt;color:${MUTED};">Erfasst: ${formatTsDe(m.erfasst_at)}</span>` : ''}
          ${m.behoben_at ? `<span style="display:block;font-size:8pt;color:#166534;">Behoben: ${formatTsDe(m.behoben_at)}</span>` : ''}
          ${m.abgenommen_at ? `<span style="display:block;font-size:8pt;color:#166534;">Abgenommen: ${formatTsDe(m.abgenommen_at)}</span>` : ''}
          ${verlauf ? `<span style="display:block;font-size:7.5pt;color:${MUTED};margin-top:2px;">${verlauf}</span>` : ''}
        </li>`
      })
      .join('')}
  </ul>`
}

function offenePunkteHtml(maengel: AbnahmeMangel[]): string {
  const inner = maengelListeHtml(maengel, true)
  return `${sectionHeading('Offene Punkte / Mängel')}
    <div style="min-height:80px;border:1px solid ${BORDER};border-radius:4px;padding:10px 12px;margin-top:4px;page-break-inside:avoid;">
      ${inner || `<p style="margin:0;font-size:9pt;color:${MUTED};">Keine offenen Mängel.</p>`}
    </div>`
}

function behobeneMaengelHtml(maengel: AbnahmeMangel[]): string {
  const inner = maengelListeHtml(maengel, false)
  if (!inner) return ''
  return `${sectionHeading('Behobene / abgenommene Mängel')}
    <div style="border:1px solid #BBF7D0;border-radius:4px;padding:10px 12px;margin-top:4px;background:#F0FDF4;page-break-inside:avoid;">
      ${inner}
    </div>`
}

function unterschriftBlock(abnahmeDatum: string): string {
  return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid ${BORDER};page-break-inside:avoid;">
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
      <tr>
        <td style="width:50%;padding:8px 12px 0 0;vertical-align:top;">
          <p style="margin:0 0 28px;color:${MUTED};">Datum der Abnahme</p>
          <div style="border-bottom:1px solid ${TEXT};height:1px;margin-bottom:4px;"></div>
          <p style="margin:0;font-size:8pt;color:${TEXT};">${esc(abnahmeDatum)}</p>
        </td>
        <td style="width:50%;padding:8px 0 0 12px;vertical-align:top;">
          <p style="margin:0 0 28px;color:${MUTED};">Unterschrift Kunde</p>
          <div style="border-bottom:1px solid ${TEXT};height:1px;"></div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:16px 0 0;vertical-align:top;">
          <p style="margin:0 0 28px;color:${MUTED};">Unterschrift Auftragnehmer</p>
          <div style="border-bottom:1px solid ${TEXT};height:1px;"></div>
        </td>
      </tr>
    </table>
  </div>`
}

function briefEmpfaengerAbnahme(p: AbnahmeProtokollHtmlInput): string {
  return `<div style="margin:0 0 20px;font-size:10pt;line-height:1.5;color:${TEXT};">
    <p style="margin:0 0 4px;font-size:8pt;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;">Kunde / Objekt</p>
    <p style="margin:0;font-weight:700;">${esc(p.kunde_name)}</p>
    <p style="margin:4px 0 0;white-space:pre-line;">${esc(p.kunde_adresse)}</p>
  </div>`
}

export function buildAbnahmeProtokollHtml(p: AbnahmeProtokollHtmlInput): string {
  const footerProps = footerInputFromAbnahme(p)
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
    ${angebotLogoKopfHtml(footerProps)}
    ${briefkopfZeileHtml(
      footerProps,
      'Abnahmeprotokoll',
      `font-size:18pt;font-weight:700;margin:0 0 8px;color:${TEXT};`,
      abnahmeBriefMetaHtml(p)
    )}
    <p style="margin:0 0 14px;font-size:9pt;color:${MUTED};line-height:1.5;">Checkliste der erbrachten Leistungen zur Abnahme vor Ort.</p>
    ${briefEmpfaengerAbnahme(p)}
    ${sectionHeading('Abnahmecheckliste')}
    ${gewerkeChecklisteHtml(p.gewerke)}
    ${offenePunkteHtml(p.maengel)}
    ${behobeneMaengelHtml(p.maengel)}
    ${notizen}
    ${unterschriftBlock(p.abnahmeDatum)}
  </div>
</body>
</html>`
}

export function buildAbnahmeProtokollPdfFooterTemplate(p: AbnahmeProtokollHtmlInput): string {
  return buildAngebotPdfFooterTemplate(footerInputFromAbnahme(p))
}
