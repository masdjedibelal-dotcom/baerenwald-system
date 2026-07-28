/**
 * HTML-Regiebericht aus gemeinsamer Bericht-Datenquelle (Spec §16).
 * Zeiterfassung · Tätigkeiten · Material · Fotos · Soll/Ist · §35a
 */

import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { BerichtDatenquelle } from '@/lib/auftraege/bericht-datenquelle'
import {
  berichtSollIstFuerPosition,
  formatBerichtMinuten,
} from '@/lib/auftraege/bericht-datenquelle'
import { formatRegieSollIst } from '@/lib/auftraege/regie-display'
import { formatHinweis35aRechnung } from '@/lib/rechnung-berechnung'
import { formatDatum } from '@/lib/utils'

const ACCENT = '#1A3D2B'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'
const TINT = '#F3F7F4'

export type RegieberichtLebenszyklusHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  data: BerichtDatenquelle
  /** Fokus-Position (optional) — sonst alle Regie-/Aufwand-Positionen aggregiert */
  focusPositionId?: string | null
  stundensatz: number
  lohnNetto: number
  materialNetto: number
  mwst: number
  brutto: number
  handwerkerName: string
  gewerkName: string | null
  sollIst: string | null
  hinweis35a: boolean
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function euro(n: number): string {
  return (
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  )
}

function logoKopf(p: RegieberichtLebenszyklusHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${src.replace(/"/g, '&quot;')}" alt="${esc(p.firmenname)}" style="height:64px;width:auto;max-width:280px;object-fit:contain;display:block;" />
  </div>`
}

function section(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:700;color:${ACCENT};margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid ${BORDER};">${esc(title)}</h2>`
}

function zeiterfassungTable(data: BerichtDatenquelle): string {
  if (!data.zeiterfassung.length) {
    return `<p style="font-size:9.5pt;color:${MUTED};">Keine Zeiterfassung.</p>`
  }
  const rows = data.zeiterfassung
    .map(
      (z) => `<tr>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;">${esc(formatDatum(z.datum))}</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;">${esc(z.position_label)}</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;">${esc(z.beschreibung)}</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;text-align:right;">${esc(formatBerichtMinuten(z.minuten))}</td>
    </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin:4px 0 8px;">
    <thead><tr style="background:${TINT};">
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:left;">Datum</th>
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:left;">Position</th>
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:left;">Tätigkeit</th>
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:right;">Zeit</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:${TINT};font-weight:700;">
      <td colspan="3" style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;text-align:right;">Summe</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;text-align:right;">${esc(formatBerichtMinuten(data.summeMinuten))}</td>
    </tr></tfoot>
  </table>`
}

function materialTable(data: BerichtDatenquelle): string {
  if (!data.material.length) {
    return `<p style="font-size:9.5pt;color:${MUTED};">Kein Material erfasst.</p>`
  }
  const rows = data.material
    .map(
      (m) => `<tr>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;">${esc(m.bezeichnung)}</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;text-align:right;">${m.menge}</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;text-align:right;">${euro(m.einzelpreis)}</td>
      <td style="padding:5px 8px;border:1px solid ${BORDER};font-size:9pt;text-align:right;">${euro(m.gesamt)}</td>
    </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:${TINT};">
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:left;">Bezeichnung</th>
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:right;">Menge</th>
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:right;">Einzel</th>
      <th style="padding:5px 8px;border:1px solid ${BORDER};font-size:8.5pt;text-align:right;">Gesamt</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function fotosGrid(data: BerichtDatenquelle): string {
  const urls = data.eintraege
    .flatMap((e) => e.eintrag_fotos ?? [])
    .map((f) => f.display_url || f.storage_path)
    .filter((u): u is string => Boolean(u && (u.startsWith('http') || u.startsWith('data:'))))
    .slice(0, 8)
  if (!urls.length) {
    return `<p style="font-size:9.5pt;color:${MUTED};">Keine Fotos.</p>`
  }
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
    ${urls
      .map(
        (url, i) => `<figure style="margin:0;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;page-break-inside:avoid;">
      <img src="${esc(url)}" alt="" style="width:100%;height:120px;object-fit:cover;display:block;"/>
      <figcaption style="padding:6px 8px;font-size:8pt;background:${TINT};">Foto ${i + 1}</figcaption>
    </figure>`
      )
      .join('')}
  </div>`
}

function footerInput(p: RegieberichtLebenszyklusHtmlInput): AngebotHtmlInput {
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

export function buildRegieberichtLebenszyklusHtml(p: RegieberichtLebenszyklusHtmlInput): string {
  const d = p.data
  const taetigkeiten = d.eintraege
    .map((e) => (e.beschreibung || e.beschreibung_roh || '').trim())
    .filter(Boolean)
  const uniqueTaet = Array.from(new Set(taetigkeiten))

  const body = `
    ${logoKopf(p)}
    <h1 style="font-size:17pt;font-weight:700;margin:0 0 4px;color:${ACCENT};">REGIEBERICHT</h1>
    <p style="font-size:10pt;color:${MUTED};margin:0 0 12px;">Auftrag ${esc(d.auftragId.slice(0, 8))} · ${esc(formatDatum(new Date().toISOString().slice(0, 10)))}</p>
    <p style="font-size:10pt;margin:0 0 2px;"><strong>Projekt:</strong> ${esc(d.projektTitel)}</p>
    <p style="font-size:10pt;margin:0 0 2px;"><strong>Auftraggeber:</strong> ${esc(d.auftraggeberName)}</p>
    <p style="font-size:10pt;margin:0 0 2px;"><strong>Adresse:</strong> ${esc(d.projektAdresse)}</p>
    <p style="font-size:10pt;margin:0 0 2px;"><strong>Ausführender:</strong> ${esc(p.handwerkerName)}</p>
    ${p.gewerkName ? `<p style="font-size:10pt;margin:0 0 8px;"><strong>Gewerk:</strong> ${esc(p.gewerkName)}</p>` : ''}
    ${p.sollIst ? `<p style="font-size:10pt;margin:8px 0;padding:8px 10px;background:${TINT};border:1px solid ${BORDER};border-radius:4px;"><strong>Soll/Ist:</strong> ${esc(p.sollIst)}</p>` : ''}

    ${section('Zeiterfassung')}
    ${zeiterfassungTable(d)}

    ${section('Tätigkeiten')}
    ${
      uniqueTaet.length
        ? `<ul style="margin:0;padding-left:18px;font-size:9.5pt;line-height:1.5;">${uniqueTaet.map((t) => `<li style="margin-bottom:4px;">${esc(t)}</li>`).join('')}</ul>`
        : `<p style="font-size:9.5pt;color:${MUTED};">—</p>`
    }

    ${section('Material')}
    ${materialTable(d)}

    ${section('Fotos')}
    ${fotosGrid(d)}

    ${section('Kosten')}
    <p style="font-size:10pt;margin:0 0 2px;">Lohn (netto): ${euro(p.lohnNetto)} · Satz ${euro(p.stundensatz)}/h</p>
    <p style="font-size:10pt;margin:0 0 2px;">Material (netto): ${euro(p.materialNetto)}</p>
    <p style="font-size:10pt;margin:0 0 2px;">MwSt 19 %: ${euro(p.mwst)}</p>
    <p style="font-size:11pt;font-weight:700;margin:6px 0 0;">Brutto: ${euro(p.brutto)}</p>

    ${
      p.hinweis35a && p.lohnNetto > 0
        ? `<p style="margin:16px 0 0;font-size:8pt;color:${MUTED};line-height:1.5;">${esc(formatHinweis35aRechnung(p.lohnNetto))}</p>`
        : ''
    }
    <p style="margin:12px 0 0;font-size:8.5pt;color:${MUTED};line-height:1.45;">Mit der Unterschrift des Auftraggebers werden die aufgeführten Zusatzleistungen anerkannt und Bestandteil des Auftrags.</p>
  `

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Regiebericht</title>
<style>@page{size:A4;margin:12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm;}body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;}</style>
</head><body>${body}</body></html>`
}

export function buildRegieberichtLebenszyklusPdfFooterTemplate(
  p: RegieberichtLebenszyklusHtmlInput
): string {
  return buildAngebotPdfFooterTemplate(footerInput(p)).replace(
    '</span>',
    ' · Regiebericht</span>'
  )
}

/** Hilfs-Export für Soll/Ist-Berechnung in Actions */
export function resolveRegieSollIst(
  data: BerichtDatenquelle,
  positionId: string | null | undefined
): string | null {
  if (positionId) return berichtSollIstFuerPosition(data, positionId)
  if (data.positionen.length === 1) {
    return berichtSollIstFuerPosition(data, data.positionen[0].id)
  }
  const gesch = data.positionen.reduce((s, p) => s + (Number(p.geschaetzt_std) || 0), 0)
  return formatRegieSollIst({
    geschaetztStd: gesch > 0 ? gesch : null,
    erfasstMinuten: data.summeMinuten,
  })
}
