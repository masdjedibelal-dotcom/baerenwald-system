/**
 * HTML für Wochenbericht-PDF (Bauauftrag / Eigenregie).
 */

import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { AuftragRegiearbeit } from '@/lib/auftraege/baustelle-types'
import { formatDatum } from '@/lib/utils'

const ACCENT = '#1A3D2B'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'

export type WochenberichtTagesZeile = {
  tag_nummer: number
  datum: string
  wetter?: string | null
  zusammenfassung?: string | null
  leistungen: string[]
  behinderungen?: string | null
}

export type WochenberichtHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  projektTitel: string
  projektAdresse: string
  auftraggeberName: string
  wochenNummer: number
  kalenderwoche: number
  jahr: number
  vonDatum: string
  bisDatum: string
  tagesberichte: WochenberichtTagesZeile[]
  alleLeistungen: string[]
  regiearbeiten: AuftragRegiearbeit[]
  personalNamen: string[]
  behinderungen: string[]
  fazit: string
  ausblick: string
  bauleiterName: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function firmennameZeile(p: WochenberichtHtmlInput): string {
  const rf = p.firmen_rechtsform?.trim()
  return rf ? `${p.firmenname.trim()} ${rf}` : p.firmenname.trim()
}

function logoKopf(p: WochenberichtHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${src.replace(/"/g, '&quot;')}" alt="${esc(firmennameZeile(p))}" style="height:72px;width:auto;max-width:300px;object-fit:contain;display:block;" />
  </div>`
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:12pt;font-weight:700;color:${ACCENT};margin:18px 0 8px;border-bottom:1px solid ${BORDER};padding-bottom:4px;">${esc(title)}</h2>`
}

function bulletList(items: string[]): string {
  if (!items.length) return `<p style="color:${MUTED};font-size:10pt;">—</p>`
  return `<ul style="margin:0;padding-left:18px;font-size:10pt;line-height:1.5;">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
}

function tagesUebersichtTable(p: WochenberichtHtmlInput): string {
  if (!p.tagesberichte.length) {
    return `<p style="color:${MUTED};font-size:10pt;">Keine Tagesberichte in diesem Zeitraum.</p>`
  }
  const rows = p.tagesberichte
    .map((t) => {
      const haupt =
        t.zusammenfassung?.trim() ||
        t.leistungen[0]?.trim() ||
        '—'
      return `<tr>
        <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${String(t.tag_nummer).padStart(2, '0')}</td>
        <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${esc(formatDatum(t.datum))}</td>
        <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${esc(haupt)}</td>
        <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${esc(t.wetter?.trim() || '—')}</td>
      </tr>`
    })
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
    <thead><tr style="background:#F3F7F4;">
      <th style="padding:6px 8px;border:1px solid ${BORDER};text-align:left;font-size:9pt;">Tag</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};text-align:left;font-size:9pt;">Datum</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};text-align:left;font-size:9pt;">Hauptleistung</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};text-align:left;font-size:9pt;">Wetter</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function regieTable(regie: AuftragRegiearbeit[]): string {
  if (!regie.length) return `<p style="color:${MUTED};font-size:10pt;">Keine Regiearbeiten.</p>`
  const rows = regie
    .map(
      (r, i) => `<tr>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${esc(formatDatum(r.datum))}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${esc(r.bezeichnung)}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:center;">${r.personen_anzahl} Mann</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:center;">${r.stunden} Std.</td>
    </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
    <thead><tr style="background:#F3F7F4;">
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Nr.</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Datum</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Leistung</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Personal</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Std.</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function personalGrid(namen: string[]): string {
  if (!namen.length) return `<p style="color:${MUTED};font-size:10pt;">—</p>`
  const cols = 2
  const cells = namen.map(
    (n, i) =>
      `<div style="padding:4px 8px;font-size:10pt;">${i + 1}. ${esc(n)}</div>`
  )
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;border:1px solid ${BORDER};padding:8px;">${cells.join('')}</div>`
}

function footerInputFrom(p: WochenberichtHtmlInput): AngebotHtmlInput {
  return {
    firmenname: p.firmenname,
    firmen_rechtsform: p.firmen_rechtsform,
    firmen_adresse: p.firmen_adresse,
    firmen_kontakt: p.firmen_kontakt,
    firmen_steuer_footer: p.firmen_steuer_footer,
    firmen_logo_url: p.firmen_logo_url,
    angebotsnr: '—',
    kundennr: '—',
    datum: formatDatum(p.vonDatum),
    gueltig_bis: formatDatum(p.bisDatum),
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

export function buildWochenberichtHtml(p: WochenberichtHtmlInput): string {
  const wn = String(p.wochenNummer).padStart(2, '0')
  const title = `Wochenbericht ${wn} — KW ${p.kalenderwoche}/${p.jahr}`
  const zeitraum = `${formatDatum(p.vonDatum)} – ${formatDatum(p.bisDatum)}`
  const body = `
    ${logoKopf(p)}
    <h1 style="font-size:17pt;font-weight:700;margin:0 0 4px;color:${ACCENT};">WOCHENBERICHT ${wn}</h1>
    <p style="font-size:10pt;color:${MUTED};margin:0 0 12px;">KW ${p.kalenderwoche} | ${esc(zeitraum)}</p>
    <p style="font-size:10pt;margin:0 0 4px;"><strong>Projekt:</strong> ${esc(p.projektTitel)}</p>
    <p style="font-size:10pt;margin:0 0 4px;"><strong>Auftraggeber:</strong> ${esc(p.auftraggeberName)}</p>
    <p style="font-size:10pt;margin:0 0 12px;"><strong>Bauleitung:</strong> ${esc(p.bauleiterName || '—')}</p>
    ${sectionHeading(`Wochenübersicht — KW ${p.kalenderwoche}`)}
    ${tagesUebersichtTable(p)}
    ${sectionHeading(`Ausgeführte Gesamtleistungen — Woche ${wn}`)}
    ${bulletList(p.alleLeistungen)}
    ${sectionHeading('Regiearbeiten der Woche')}
    ${regieTable(p.regiearbeiten)}
    ${sectionHeading(`Personalübersicht — Woche ${wn}`)}
    <p style="font-size:10pt;margin:0 0 8px;">${p.personalNamen.length} Mitarbeiter · ${p.tagesberichte.length} Einsatztage</p>
    ${personalGrid(p.personalNamen)}
    ${sectionHeading('Behinderungen & Besonderheiten')}
    ${bulletList(p.behinderungen)}
    ${sectionHeading('Wochenzusammenfassung')}
    <p style="font-size:10pt;line-height:1.5;white-space:pre-wrap;">${esc(p.fazit || '—')}</p>
    ${sectionHeading('Ausblick')}
    <p style="font-size:10pt;line-height:1.5;white-space:pre-wrap;">${esc(p.ausblick || '—')}</p>
  `
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>${esc(title)}</title>
<style>@page{size:A4;margin:12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm;}body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;}</style>
</head><body>${body}</body></html>`
}

export function buildWochenberichtPdfFooterTemplate(p: WochenberichtHtmlInput): string {
  const footerBase = buildAngebotPdfFooterTemplate(footerInputFrom(p))
  const wn = String(p.wochenNummer).padStart(2, '0')
  return footerBase.replace(
    '</span>',
    ` · Wochenbericht ${wn} KW ${p.kalenderwoche}</span>`
  )
}
