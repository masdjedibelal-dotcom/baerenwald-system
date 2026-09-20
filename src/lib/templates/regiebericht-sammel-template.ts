/**
 * HTML für Sammel-Regiebericht (Bauauftrag / Eigenregie, Kalenderwoche).
 */

import {
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { AuftragRegiearbeit } from '@/lib/auftraege/baustelle-types'
import { formatDatum } from '@/lib/format/geld-datum'
import {
  pdfAbsenderFromReportFirm,
  pdfKopfHtml,
  pdfReportShell,
  pdfTitelzeileHtml,
} from '@/lib/pdf/chrome'
import { C } from '@/lib/tokens/colors'

const ACCENT = C.greenDark
const MUTED = C.gray500
const BORDER = C.gray300

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

function regieTable(regie: AuftragRegiearbeit[]): {
  html: string
  summeStunden: number
  summePersonen: number
} {
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
    <thead><tr style="background:${C.greenTint};">
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Nr.</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Datum</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Leistung</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Pers.</th>
      <th style="padding:6px 8px;border:1px solid ${BORDER};font-size:9pt;">Std.</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:${C.greenTint};font-weight:700;">
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
    ${pdfKopfHtml({
      variant: 'bw-kunde',
      absender: pdfAbsenderFromReportFirm(p),
    })}
    ${pdfTitelzeileHtml({
      dokumentTyp: 'Regiebericht',
      objektOderAdresse: p.projektTitel,
      datum: `KW ${p.kalenderwoche}/${p.jahr} | ${zeitraum}`,
      accent: ACCENT,
    })}
    <p style="font-size:10pt;margin:0 0 4px;"><strong>Auftraggeber:</strong> ${esc(p.auftraggeberName)}</p>
    <p style="font-size:10pt;margin:0 0 12px;"><strong>Bauleitung:</strong> ${esc(p.bauleiterName || '—')}</p>
    <h2 style="font-size:12pt;font-weight:700;color:${ACCENT};margin:18px 0 8px;border-bottom:1px solid ${BORDER};padding-bottom:4px;">Regiearbeiten — KW ${p.kalenderwoche}</h2>
    <p style="font-size:10pt;margin:0 0 8px;">${p.regiearbeiten.length} Positionen · ${summeStunden.toFixed(1).replace('.', ',')} Stunden gesamt</p>
    ${tableHtml}
    <p style="font-size:9pt;color:${MUTED};margin-top:24px;line-height:1.4;">Dieser Regiebericht dokumentiert zusätzliche Leistungen im Regieauftrag für die Kalenderwoche ${p.kalenderwoche}/${p.jahr}.</p>
  `
  return pdfReportShell({ title, bodyHtml: body })
}

export function buildRegieberichtSammelPdfFooterTemplate(p: RegieberichtSammelHtmlInput): string {
  return buildAngebotPdfFooterTemplate(footerInputFrom(p), {
    seitenZusatz: `Regiebericht KW ${p.kalenderwoche}`,
  })
}
