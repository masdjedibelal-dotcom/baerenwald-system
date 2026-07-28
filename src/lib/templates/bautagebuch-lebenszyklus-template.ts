/**
 * Bautagebuch-PDF aus gemeinsamer Bericht-Datenquelle (Spec §16).
 * Zweistufig: je Kalendertag → je Position.
 */

import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { BerichtDatenquelle } from '@/lib/auftraege/bericht-datenquelle'
import {
  formatBerichtMinuten,
  formatBerichtSchichtLabel,
} from '@/lib/auftraege/bericht-datenquelle'
import { formatDatum } from '@/lib/utils'

const ACCENT = '#1A3D2B'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'
const TINT = '#F3F7F4'

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

function logoKopf(p: BautagebuchLebenszyklusHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${src.replace(/"/g, '&quot;')}" alt="${esc(p.firmenname)}" style="height:64px;width:auto;max-width:280px;object-fit:contain;display:block;" />
  </div>`
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
          return `<div style="margin:8px 0 10px;padding:8px 10px;border:1px solid ${BORDER};border-radius:4px;background:#fff;page-break-inside:avoid;">
            <div style="font-size:10pt;font-weight:700;color:${ACCENT};margin-bottom:4px;">
              ${esc(pos.position_label)}
              ${pos.gewerk_name ? `<span style="font-weight:400;color:${MUTED};"> · ${esc(pos.gewerk_name)}</span>` : ''}
            </div>
            <div style="font-size:8.5pt;color:${MUTED};margin-bottom:6px;">
              Zeit ${esc(formatBerichtMinuten(pos.minuten))} · Fotos ${pos.fotoCount}
            </div>
            <ul style="margin:0;padding-left:16px;">${entries || '<li style="font-size:9pt;color:#6B7280;">—</li>'}</ul>
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
    ${logoKopf(p)}
    <h1 style="font-size:17pt;font-weight:700;margin:0 0 4px;color:${ACCENT};">Bautagebuch</h1>
    <p style="font-size:10pt;color:${MUTED};margin:0 0 12px;">Aus Positions-Dokumentation und Schichten · Auftrag ${esc(d.auftragId.slice(0, 8))}</p>
    <div style="margin:0 0 16px;padding:10px 12px;background:${TINT};border:1px solid ${BORDER};border-radius:4px;font-size:9.5pt;line-height:1.5;">
      <div><strong>Projekt:</strong> ${esc(d.projektTitel)}</div>
      <div><strong>Auftraggeber:</strong> ${esc(d.auftraggeberName)}</div>
      <div><strong>Adresse:</strong> ${esc(d.projektAdresse)}</div>
      <div><strong>Summe Zeit:</strong> ${esc(formatBerichtMinuten(d.summeMinuten))} · <strong>Tage:</strong> ${d.tage.length}</div>
    </div>
    ${days}
  `

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Bautagebuch</title>
<style>@page{size:A4;margin:12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm;}body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;}</style>
</head><body>${body}</body></html>`
}

export function buildBautagebuchLebenszyklusPdfFooterTemplate(
  p: BautagebuchLebenszyklusHtmlInput
): string {
  return buildAngebotPdfFooterTemplate(footerInput(p)).replace(
    '</span>',
    ' · Bautagebuch</span>'
  )
}
