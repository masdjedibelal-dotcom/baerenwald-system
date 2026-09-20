/**
 * HTML für Bautagesbericht-PDF (A4, Bärenwald-Layout wie Abschlussdokumentation).
 */

import {
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import type { BautagesberichtFoto } from '@/lib/auftraege/bautagesbericht-types'
import {
  pdfAbsenderFromReportFirm,
  pdfKopfHtml,
  pdfReportShell,
  pdfTitelzeileHtml,
} from '@/lib/pdf/chrome'
import { C } from '@/lib/tokens/colors'

const ACCENT = C.greenDark
const TINT = C.greenTint
const TEXT = C.gray900
const MUTED = C.gray500
const BORDER = C.gray300

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
      `<div style="font-size:9pt;line-height:1.45;padding:6px 8px;border:1px solid ${BORDER};border-radius:4px;background:${C.white};">
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
        return `<figure style="margin:0;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:${C.white};page-break-inside:avoid;">
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

export function buildBautagesberichtHtml(p: BautagesberichtHtmlInput): string {
  const tagLabel = String(p.tagNummer).padStart(2, '0')
  const title = `Bautagesbericht Tag ${tagLabel} — ${p.projektTitel}`
  const body = `
    ${pdfKopfHtml({
      variant: 'bw-kunde',
      absender: pdfAbsenderFromReportFirm(p),
    })}
    ${pdfTitelzeileHtml({
      dokumentTyp: 'Bautagesbericht',
      objektOderAdresse: p.projektTitel,
      datum: `TAG ${tagLabel} · ${p.datumLabel}`,
      accent: ACCENT,
    })}
    <p style="margin:0 0 4px;font-size:9.5pt;color:${MUTED};">${esc(p.projektAdresse)}</p>
    ${metaBlock(p)}
    ${sectionHeading(`Ausgeführte Leistungen – Tag ${tagLabel}`)}
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
    ${sectionHeading(`Personalnachweis – Tag ${tagLabel}`)}
    ${personalGrid(p.personalNamen)}
    ${
      p.fotos.length
        ? `<div style="page-break-before:always;"></div>${sectionHeading('Fotodokumentation')}${fotosHtml(p.fotos)}`
        : ''
    }
  `
  return pdfReportShell({ title, bodyHtml: body })
}

export function buildBautagesberichtPdfFooterTemplate(p: BautagesberichtHtmlInput): string {
  const tagLabel = String(p.tagNummer).padStart(2, '0')
  return buildAngebotPdfFooterTemplate(footerInputFromBericht(p), {
    seitenZusatz: `Bautagesbericht Tag ${tagLabel} ${p.datumLabel}`,
  })
}
