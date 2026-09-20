/**
 * Gemeinsame PDF-Bausteine (Phase A Freigabe F1).
 * Typo 5 Stufen · Kopf · Titelzeile · Tabelle · Summen · Fuß · Seite n/m.
 * Varianten: bw-kunde | hv-wl | partner-bw
 */

import { C } from '@/lib/tokens/colors'

/** PDF-Typografie (Vorschlag 3.1 / App-Stufen). */
export const PDF_FS = {
  caption: '7.5pt',
  meta: '8.5pt',
  text: '10pt',
  title: '12pt',
  head: '16pt',
} as const

export const PDF_BOTTOM_MARGIN_MM = 36

export type PdfBrandVariant = 'bw-kunde' | 'hv-wl' | 'partner-bw'

export type PdfAbsender = {
  name: string
  adresseZeilen?: string[]
  telefon?: string | null
  email?: string | null
  website?: string | null
  ustId?: string | null
  steuernummer?: string | null
  /** Logo data:/https */
  logoUrl?: string | null
  /** Accent (HV-WL / Partner) */
  accent?: string | null
}

export type PdfKopfInput = {
  variant: PdfBrandVariant
  absender: PdfAbsender
  /** Optionaler Empfänger-/Briefblock rechts (statt Absender rechts) */
  metaRechtsHtml?: string
}

export type PdfTitelzeileInput = {
  dokumentTyp: string
  nummer?: string | null
  objektOderAdresse?: string | null
  datum?: string | null
  extraMeta?: string | null
  accent?: string | null
}

export type PdfTabellenSpalte = {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  width?: string
}

export type PdfTabellenZelle = string | { html: string; align?: 'left' | 'right' | 'center' }

export type PdfFussInput = {
  variant: PdfBrandVariant
  absender: PdfAbsender
  /** Bank / Pflichtangaben — Inhalt unverändert vom Caller */
  pflichtzeile?: string | null
  /** Nur HV-WL / White-Label-Docs: klein „Ein Service von Bärenwald“ */
  serviceVonBaerenwald?: boolean
  /** Zusatz neben Seitenzahl (z. B. „Wochenbericht 01 KW 12“) */
  seitenZusatz?: string | null
  /** Für HTML-Vorschau: feste Seitenzahl statt Puppeteer-Platzhalter */
  previewPage?: { n: number; m: number }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function accentOf(variant: PdfBrandVariant, custom?: string | null): string {
  const c = (custom || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c
  if (variant === 'hv-wl' && c) return c
  if (variant === 'partner-bw' && c) return c
  return C.green
}

/** Shared CSS für alle HTML→PDF-Dokumente. */
export function pdfShellCss(opts?: {
  bottomMarginMm?: number
  bodyPaddingBottom?: string
}): string {
  const bottom = opts?.bottomMarginMm ?? PDF_BOTTOM_MARGIN_MM
  const pad = opts?.bodyPaddingBottom ?? '0'
  return `
  * { box-sizing: border-box; }
  @page { size: A4; margin: 12mm 12mm ${bottom}mm 12mm; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: ${C.text};
    font-size: ${PDF_FS.text};
    font-weight: 400;
    padding-bottom: ${pad};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  .page { padding: 0 4mm; max-width: 210mm; margin: 0 auto; }
  .pdf-fs-caption { font-size: ${PDF_FS.caption}; color: ${C.text3}; }
  .pdf-fs-meta { font-size: ${PDF_FS.meta}; color: ${C.text3}; }
  .pdf-fs-text { font-size: ${PDF_FS.text}; color: ${C.text}; }
  .pdf-fs-title { font-size: ${PDF_FS.title}; font-weight: 700; color: ${C.text}; }
  .pdf-fs-head { font-size: ${PDF_FS.head}; font-weight: 700; letter-spacing: -0.02em; color: ${C.text}; }
  .pdf-num { text-align: right; font-variant-numeric: tabular-nums; }
  .projekt-block { break-inside: avoid-page; }
  @media print {
    .avoid-fuss-overlap { break-inside: avoid-page; page-break-inside: avoid; }
  }`
}

/** Kopf: Logo links · Absender rechts · Accent-Linie. */
export function pdfKopfHtml(input: PdfKopfInput): string {
  const accent = accentOf(input.variant, input.absender.accent)
  const a = input.absender
  const logoSrc = a.logoUrl?.trim()
  const logoOk =
    logoSrc &&
    !/^file:/i.test(logoSrc) &&
    (logoSrc.startsWith('data:') || /^https?:\/\//i.test(logoSrc))
  const brandMark = logoOk
    ? `<img src="${logoSrc!.replace(/"/g, '&quot;')}" alt="" role="presentation" style="height:48px;width:auto;max-width:180px;object-fit:contain;display:block;background:#fff;" />`
    : `<div style="width:40px;height:40px;border-radius:8px;background:${accent};color:${C.white};font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;">${esc(
        (a.name || 'BW').slice(0, 2).toUpperCase()
      )}</div>`

  const absZeilen = [
    `<strong style="font-size:${PDF_FS.title};">${esc(a.name)}</strong>`,
    ...(a.adresseZeilen ?? []).map((z) => esc(z)),
    [a.telefon, a.email].filter(Boolean).map((z) => esc(String(z))).join(' · '),
    a.ustId ? `USt-IdNr. ${esc(a.ustId)}` : '',
  ].filter(Boolean)

  const rechts =
    input.metaRechtsHtml?.trim() ||
    `<div style="font-size:${PDF_FS.meta};color:${C.text3};line-height:1.45;text-align:right;">${absZeilen.join('<br/>')}</div>`

  return `<header class="pdf-kopf" style="display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid ${accent};padding-bottom:14px;margin-bottom:18px;">
  <div style="flex:0 0 auto;">
    ${brandMark}
    ${logoOk ? `<div style="font-weight:700;font-size:${PDF_FS.title};margin-top:6px;">${esc(a.name)}</div>` : ''}
  </div>
  <div style="flex:1;min-width:0;text-align:right;">${rechts}</div>
</header>`
}

/** Titelzeile: Dokumenttyp + Nummer · Objekt · Datum. */
export function pdfTitelzeileHtml(input: PdfTitelzeileInput): string {
  const accent = accentOf('bw-kunde', input.accent)
  const titel = [input.dokumentTyp.trim(), input.nummer?.trim()].filter(Boolean).join(' ')
  const metaParts = [
    input.objektOderAdresse?.trim()
      ? `Objekt: ${input.objektOderAdresse.trim()}`
      : null,
    input.datum?.trim() || null,
    input.extraMeta?.trim() || null,
  ].filter(Boolean)
  return `<div class="pdf-titelzeile" style="margin-bottom:16px;">
  <h1 class="pdf-fs-head" style="margin:0 0 4px;color:${accent};">${esc(titel)}</h1>
  ${
    metaParts.length
      ? `<p class="pdf-fs-meta" style="margin:0;">${esc(metaParts.join(' · '))}</p>`
      : ''
  }
</div>`
}

/** Positionstabelle (gleiche Linien/Abstände). */
export function pdfTabelleHtml(
  spalten: PdfTabellenSpalte[],
  zeilen: PdfTabellenZelle[][]
): string {
  const th = spalten
    .map((s) => {
      const align = s.align === 'right' ? 'right' : s.align === 'center' ? 'center' : 'left'
      const w = s.width ? `width:${s.width};` : ''
      return `<th style="text-align:${align};font-size:${PDF_FS.meta};color:${C.text3};font-weight:600;border-bottom:1px solid ${C.border};padding:6px 4px;${w}">${esc(s.label)}</th>`
    })
    .join('')
  const trs = zeilen
    .map((cells) => {
      const tds = cells
        .map((cell, i) => {
          const col = spalten[i]
          const align =
            typeof cell === 'object' && cell.align
              ? cell.align
              : col?.align === 'right'
                ? 'right'
                : col?.align === 'center'
                  ? 'center'
                  : 'left'
          const html = typeof cell === 'string' ? esc(cell) : cell.html
          const numCls = align === 'right' ? ' pdf-num' : ''
          return `<td class="${numCls.trim()}" style="padding:8px 4px;border-bottom:1px solid ${C.border};vertical-align:top;text-align:${align};font-size:${PDF_FS.text};">${html}</td>`
        })
        .join('')
      return `<tr>${tds}</tr>`
    })
    .join('')
  return `<table class="pdf-table" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr>${th}</tr></thead>
  <tbody>${trs}</tbody>
</table>`
}

/** Summenblock rechts. */
export function pdfSummenHtml(
  rows: { label: string; value: string; total?: boolean }[]
): string {
  const lines = rows
    .map((r) => {
      if (r.total) {
        return `<div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:4px;border-top:1px solid ${C.border};font-weight:700;font-size:${PDF_FS.title};color:${C.text};"><span>${esc(r.label)}</span><span class="pdf-num">${esc(r.value)}</span></div>`
      }
      return `<div style="display:flex;justify-content:space-between;padding:3px 0;color:${C.textMuted};font-size:${PDF_FS.text};"><span>${esc(r.label)}</span><span class="pdf-num">${esc(r.value)}</span></div>`
    })
    .join('')
  return `<div class="pdf-sum" style="margin-top:12px;margin-left:auto;width:220px;">${lines}</div>`
}

/**
 * Puppeteer footerTemplate — Seite n von m.
 * Chromium ersetzt .pageNumber / .totalPages.
 */
export function pdfFussPuppeteerTemplate(input: PdfFussInput): string {
  const a = input.absender
  const addr = (a.adresseZeilen ?? []).map(esc).join('<br/>')
  const left = [
    esc(a.name),
    addr,
    a.telefon ? `Tel.: ${esc(a.telefon)}` : '',
    a.email ? esc(a.email) : '',
  ]
    .filter(Boolean)
    .join('<br/>')
  const right = [
    a.website ? esc(a.website) : '',
    a.ustId ? `USt-IdNr.: ${esc(a.ustId)}` : '',
    a.steuernummer ? `Steuernummer: ${esc(a.steuernummer)}` : '',
    input.pflichtzeile?.trim() ? esc(input.pflichtzeile.trim()) : '',
  ]
    .filter(Boolean)
    .join('<br/>')

  const service =
    input.serviceVonBaerenwald && input.variant === 'hv-wl'
      ? `<div style="text-align:center;font-size:6.5pt;color:${C.text3};margin-top:2px;">Ein Service von Bärenwald</div>`
      : ''

  const pageN = input.previewPage
    ? String(input.previewPage.n)
    : '<span class="pageNumber"></span>'
  const pageM = input.previewPage
    ? String(input.previewPage.m)
    : '<span class="totalPages"></span>'
  const zusatz = input.seitenZusatz?.trim()
    ? ` · ${esc(input.seitenZusatz.trim())}`
    : ''

  return `<div style="width:100%;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;color:${C.text3};padding:4px 12mm 2px;border-top:0.5pt solid ${C.border};background:${C.white};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;width:100%;">
    <div style="flex:1;text-align:left;line-height:1.45;">${left}</div>
    <div style="flex:0 0 auto;text-align:center;line-height:1.45;white-space:nowrap;padding:0 8px;">Seite ${pageN} von ${pageM}${zusatz}</div>
    <div style="flex:1;text-align:right;line-height:1.45;">${right}</div>
  </div>
  ${service}
</div>`
}

/** Fuß für HTML-Vorschau (eine Seite). */
export function pdfFussHtml(input: PdfFussInput): string {
  return `<div class="pdf-fuss">${pdfFussPuppeteerTemplate({
    ...input,
    previewPage: input.previewPage ?? { n: 1, m: 1 },
  })}</div>`
}

/** Volle HTML-Shell. */
export function pdfDokumentShell(opts: {
  title: string
  bodyHtml: string
  footerHtml?: string
  includeBodyFooter?: boolean
}): string {
  const bodyFooter = opts.includeBodyFooter && opts.footerHtml
    ? `<div class="pdf-fuss-end">${opts.footerHtml}</div>`
    : ''
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(opts.title)}</title>
<style>${pdfShellCss({
    bodyPaddingBottom: opts.includeBodyFooter ? '30mm' : '0',
  })}
  .pdf-fuss-end { margin-top: 28px; padding-top: 10px; page-break-inside: avoid; }
</style>
</head>
<body>
<div class="page">
  <div class="page-body">${opts.bodyHtml}</div>
  ${bodyFooter}
</div>
</body>
</html>`
}

/** Absender aus Firmen-ähnlichem Objekt bauen. */
export function pdfAbsenderFromFirm(firm: {
  firmenname?: string | null
  adresse?: string | null
  telefon?: string | null
  email?: string | null
  website?: string | null
  ust_id?: string | null
  steuernummer?: string | null
  logo_url?: string | null
  accent?: string | null
}): PdfAbsender {
  return {
    name: firm.firmenname?.trim() || 'Bärenwald München',
    adresseZeilen: (firm.adresse || '')
      .split('\n')
      .map((z) => z.trim())
      .filter(Boolean),
    telefon: firm.telefon,
    email: firm.email,
    website: firm.website,
    ustId: firm.ust_id,
    steuernummer: firm.steuernummer,
    logoUrl: firm.logo_url,
    accent: firm.accent,
  }
}

/** Absender aus Report-/Angebot-HTML-Inputs (firmen_adresse, firmen_kontakt, …). */
export function pdfAbsenderFromReportFirm(p: {
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt?: string | null
  firmen_telefon?: string | null
  firmen_email?: string | null
  firmen_website?: string | null
  firmen_steuer_footer?: string | null
  firmen_logo_url?: string | null
  accent?: string | null
}): PdfAbsender {
  const name = p.firmen_rechtsform?.trim()
    ? `${p.firmenname.trim()} ${p.firmen_rechtsform.trim()}`
    : p.firmenname.trim()
  let telefon = p.firmen_telefon?.trim() || null
  let email = p.firmen_email?.trim() || null
  let website = p.firmen_website?.trim() || null
  if ((!telefon || !email) && p.firmen_kontakt) {
    const parts = p.firmen_kontakt.split(/[·|,;/]/).map((s) => s.trim()).filter(Boolean)
    for (const part of parts) {
      if (!email && part.includes('@')) email = part
      else if (!telefon && /\d/.test(part) && !part.includes('@')) telefon = part
      else if (!website && /(www\.|https?:)/i.test(part)) website = part
    }
  }
  let ustId: string | null = null
  let steuernummer: string | null = null
  const steuer = (p.firmen_steuer_footer || '').trim()
  if (steuer) {
    const ust = /USt[\s.-]*Id[^:]*:\s*([A-Z0-9]+)/i.exec(steuer)
    const st = /Steuernummer:\s*([\d\s/]+)/i.exec(steuer)
    if (ust) ustId = ust[1]
    if (st) steuernummer = st[1].replace(/\s/g, '')
  }
  return {
    name: name || 'Bärenwald München',
    adresseZeilen: p.firmen_adresse
      .split('\n')
      .map((z) => z.trim())
      .filter(Boolean),
    telefon,
    email,
    website,
    ustId,
    steuernummer,
    logoUrl: p.firmen_logo_url,
    accent: p.accent,
  }
}

/** Standard-Shell für Berichte (Abnahme, Wochenbericht, …). */
export function pdfReportShell(opts: {
  title: string
  bodyHtml: string
  extraCss?: string
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(opts.title)}</title>
<style>
${pdfShellCss()}
${opts.extraCss ?? ''}
</style>
</head>
<body>
<div class="page">
  <div class="page-body">${opts.bodyHtml}</div>
</div>
</body>
</html>`
}
