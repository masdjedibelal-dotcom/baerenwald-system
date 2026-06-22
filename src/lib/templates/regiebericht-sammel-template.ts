/**
 * HTML für Sammel-Regiebericht (Bauauftrag / Eigenregie, Kalenderwoche).
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

export type RegieberichtSammelHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  projektTitel: string
  projektAdresse: string
  auftraggeberName: string
  kalenderwoche: number
  jahr: number
  vonDatum: string
  bisDatum: string
  regiearbeiten: AuftragRegiearbeit[]
  bauleiterName: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function firmennameZeile(p: RegieberichtSammelHtmlInput): string {
  const rf = p.firmen_rechtsform?.trim()
  return rf ? `${p.firmenname.trim()} ${rf}` : p.firmenname.trim()
}

function logoKopf(p: RegieberichtSammelHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${src.replace(/"/g, '&quot;')}" alt="${esc(firmennameZeile(p))}" style="height:72px;width:auto;max-width:300px;object-fit:contain;display:block;" />
  </div>`
}

function regieTable(regie: AuftragRegiearbeit[]): { html: string; summeStunden: number; summePersonen: number } {
  if (!regie.length) {
    return {
      html: `<p style="color:${MUTED};font-size:10pt;">Keine Regiearbeiten.</p>`,
      summeStunden: 0,
      summePersonen: 0,
    }
  }
  let summeStunden = 0
  let summePersonen = 0
  const rows = regie
    .map((r, i) => {
      summeStunden += r.stunden
      summePersonen += r.personen_anzahl
      const mat = r.material?.trim()
      const besch = r.beschreibung?.trim()
      const detail = [besch, mat ? `Material: ${mat}` : ''].filter(Boolean).join(' — ')
      return `<tr>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">${esc(formatDatum(r.datum))}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;">
        <strong>${esc(r.bezeichnung)}</strong>${detail ? `<br/><span style="color:${MUTED};font-size:9pt;">${esc(detail)}</span>` : ''}
      </td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:center;">${r.personen_anzahl}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:center;">${r.stunden.toFixed(1).replace('.', ',')}</td>
    </tr>`
    })
    .join('')
  const html = `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
    <thead><tr style="background:#F3F7F4;">
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Nr.</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Datum</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Leistung</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Pers.</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Std.</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#F3F7F4;font-weight:700;">
      <td colspan="3" style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:right;">Summe</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:center;">${summePersonen}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:10pt;text-align:center;">${summeStunden.toFixed(1).replace('.', ',')}</td>
    </tr></tfoot>
  </table>`
  return { html, summeStunden, summePersonen }
}

function footerInputFrom(p: RegieberichtSammelHtmlInput): AngebotHtmlInput {
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

export function buildRegieberichtSammelHtml(p: RegieberichtSammelHtmlInput): string {
  const zeitraum = `${formatDatum(p.vonDatum)} – ${formatDatum(p.bisDatum)}`
  const { html: tableHtml, summeStunden } = regieTable(p.regiearbeiten)
  const title = `Regiebericht KW ${p.kalenderwoche}/${p.jahr}`
  const body = `
    ${logoKopf(p)}
    <h1 style="font-size:17pt;font-weight:700;margin:0 0 4px;color:${ACCENT};">REGIEBERICHT</h1>
    <p style="font-size:10pt;color:${MUTED};margin:0 0 12px;">KW ${p.kalenderwoche}/${p.jahr} | ${esc(zeitraum)}</p>
    <p style="font-size:10pt;margin:0 0 4px;"><strong>Projekt:</strong> ${esc(p.projektTitel)}</p>
    <p style="font-size:10pt;margin:0 0 4px;"><strong>Auftraggeber:</strong> ${esc(p.auftraggeberName)}</p>
    <p style="font-size:10pt;margin:0 0 12px;"><strong>Bauleitung:</strong> ${esc(p.bauleiterName || '—')}</p>
    <h2 style="font-size:12pt;font-weight:700;color:${ACCENT};margin:18px 0 8px;border-bottom:1px solid ${BORDER};padding-bottom:4px;">Regiearbeiten — KW ${p.kalenderwoche}</h2>
    <p style="font-size:10pt;margin:0 0 8px;">${p.regiearbeiten.length} Positionen · ${summeStunden.toFixed(1).replace('.', ',')} Stunden gesamt</p>
    ${tableHtml}
    <p style="font-size:9pt;color:${MUTED};margin-top:24px;line-height:1.4;">Dieser Regiebericht dokumentiert zusätzliche Leistungen im Regieauftrag für die Kalenderwoche ${p.kalenderwoche}/${p.jahr}.</p>
  `
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>${esc(title)}</title>
<style>@page{size:A4;margin:12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm;}body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;}</style>
</head><body>${body}</body></html>`
}

export function buildRegieberichtSammelPdfFooterTemplate(p: RegieberichtSammelHtmlInput): string {
  const footerBase = buildAngebotPdfFooterTemplate(footerInputFrom(p))
  return footerBase.replace('</span>', ` · Regiebericht KW ${p.kalenderwoche}</span>`)
}
