/**
 * Bautagebuch-PDF aus gemeinsamer Bericht-Datenquelle (Spec §16).
 * Zweistufig: je Kalendertag → je Position.
 */

import {
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { BerichtDatenquelle } from '@/lib/auftraege/bericht-datenquelle'
import {
  formatBerichtMinuten,
  formatBerichtSchichtLabel,
} from '@/lib/auftraege/bericht-datenquelle'
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
const TINT = C.greenTint

export type BautagebuchLebenszyklusHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  data: BerichtDatenquelle
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function dayBlock(tag: BerichtDatenquelle['tage'][number]): string {
  const posHtml = tag.positionen.length
    ? tag.positionen
        .map((pos) => {
          const entries = pos.eintraege
            .map((e) => {
              const text = (e.beschreibung || e.beschreibung_roh || '').trim() || '—'
              const zeit = Number(e.zeit_minuten) || 0
              return `<li style="margin-bottom:4px;font-size:9pt;line-height:1.45;">
                <span style="color:${MUTED};">${esc(String(e.typ))}</span>
                ${zeit ? ` · ${esc(formatBerichtMinuten(zeit))}` : ''}
                — ${esc(text)}
              </li>`
            })
            .join('')
          return `<div style="margin:8px 0 10px;padding:8px 10px;border:1px solid ${BORDER};border-radius:4px;background:${C.white};page-break-inside:avoid;">
            <div style="font-size:10pt;font-weight:700;color:${ACCENT};margin-bottom:4px;">
              ${esc(pos.position_label)}
              ${pos.gewerk_name ? `<span style="font-weight:400;color:${MUTED};"> · ${esc(pos.gewerk_name)}</span>` : ''}
            </div>
            <div style="font-size:8.5pt;color:${MUTED};margin-bottom:6px;">
              Zeit ${esc(formatBerichtMinuten(pos.minuten))} · Fotos ${pos.fotoCount}
            </div>
            <ul style="margin:0;padding-left:16px;">${entries || `<li style="font-size:9pt;color:${C.gray500};">—</li>`}</ul>
          </div>`
        })
        .join('')
    : `<p style="font-size:9.5pt;color:${MUTED};margin:8px 0;">Keine Positions-Einträge an diesem Tag.</p>`

  return `<section style="margin:0 0 20px;page-break-inside:avoid;">
    <h2 style="font-size:12pt;font-weight:700;color:${ACCENT};margin:0 0 6px;padding-bottom:4px;border-bottom:2px solid ${ACCENT};">
      ${esc(formatDatum(tag.tag))}
    </h2>
    <p style="font-size:9pt;color:${MUTED};margin:0 0 8px;">
      Schicht: ${esc(formatBerichtSchichtLabel(tag.schicht))}
      · erfasst ${esc(formatBerichtMinuten(tag.partnerMinuten))}
      ${tag.schicht ? ` · Fotos Schicht ${tag.schicht.foto_count}` : ''}
    </p>
    ${posHtml}
  </section>`
}

function footerInput(p: BautagebuchLebenszyklusHtmlInput): AngebotHtmlInput {
  return {
    firmenname: p.firmenname,
    firmen_rechtsform: p.firmen_rechtsform,
    firmen_adresse: p.firmen_adresse,
    firmen_kontakt: p.firmen_kontakt,
    firmen_steuer_footer: p.firmen_steuer_footer,
    firmen_logo_url: p.firmen_logo_url,
    angebotsnr: '—',
    kundennr: '—',
    datum: formatDatum(new Date().toISOString().slice(0, 10)),
    gueltig_bis: '—',
    kunde_name: p.data.auftraggeberName,
    kunde_adresse: p.data.projektAdresse,
    leistungsumfang: p.data.projektTitel,
    begruessung: '',
    einleitung: '',
    zahlungsbedingungen: '',
    positionen: [],
    summen: { netto: 0, mwst_prozent: 19, mwst_betrag: 0, brutto: 0 },
  }
}

export function buildBautagebuchLebenszyklusHtml(p: BautagebuchLebenszyklusHtmlInput): string {
  const d = p.data
  const days =
    d.tage.length > 0
      ? d.tage.map(dayBlock).join('')
      : `<p style="font-size:10pt;color:${MUTED};">Keine Einträge und keine Schichten.</p>`

  const body = `
    ${pdfKopfHtml({
      variant: 'bw-kunde',
      absender: pdfAbsenderFromReportFirm(p),
    })}
    ${pdfTitelzeileHtml({
      dokumentTyp: 'Bautagebuch',
      objektOderAdresse: d.projektTitel,
      datum: formatDatum(new Date().toISOString().slice(0, 10)),
      accent: ACCENT,
    })}
    <p style="font-size:10pt;color:${MUTED};margin:0 0 12px;">Aus Positions-Dokumentation und Schichten · Auftrag ${esc(d.auftragId.slice(0, 8))}</p>
    <div style="margin:0 0 16px;padding:10px 12px;background:${TINT};border:1px solid ${BORDER};border-radius:4px;font-size:9.5pt;line-height:1.5;">
      <div><strong>Projekt:</strong> ${esc(d.projektTitel)}</div>
      <div><strong>Auftraggeber:</strong> ${esc(d.auftraggeberName)}</div>
      <div><strong>Adresse:</strong> ${esc(d.projektAdresse)}</div>
      <div><strong>Summe Zeit:</strong> ${esc(formatBerichtMinuten(d.summeMinuten))} · <strong>Tage:</strong> ${d.tage.length}</div>
    </div>
    ${days}
  `

  return pdfReportShell({ title: 'Bautagebuch', bodyHtml: body })
}

export function buildBautagebuchLebenszyklusPdfFooterTemplate(
  p: BautagebuchLebenszyklusHtmlInput
): string {
  return buildAngebotPdfFooterTemplate(footerInput(p), {
    seitenZusatz: 'Bautagebuch',
  })
}
