/**
 * Statisches HTML für Angebots-PDF (Druck/A4).
 * Daten kommen aus dem CRM (Siehe angebot-html-payload.ts → buildAngebotHtml Aufruf).
 */

import {
  groupAngebotPositionenByBlock,
} from '@/lib/angebote/angebot-position-blocks'
import { GEWERK_BESCHREIBUNG_TITEL } from '@/lib/dokument-zeilen'
import {
  ANGEBOT_ANNAHME_HINWEIS,
  defaultAngebotPdfSchlusstext,
  type AngebotMailAnrede,
} from '@/lib/templates/angebot-mail'
import type { AngebotBlockPdfEntry } from '@/lib/angebote/angebot-position-blocks'
import { mapAngebotPositionenToTemplateRows } from '@/lib/angebote/angebot-projekt-pdf-blocks'
import type { AngebotProjektPdfBlock } from '@/lib/angebote/angebot-projekt-pdf-blocks'
import type { AngebotPosition } from '@/lib/types'
import { RECHNUNG_SCHLUSS_STANDARD } from '@/lib/rechnungen/rechnung-texte'
import {
  looksLikeHtml,
  plainTextToPdfHtml,
  richTextToPlain,
  richTextToSafePdfHtml,
} from '@/lib/rich-text'
import { kiVisualisierungPdfHtml } from '@/lib/visualize/pdf-html'
import type { KiVizPdfPage } from '@/lib/visualize/pdf-data'

const PROJEKT_ACCENT = '#1A3D2B'
const PROJEKT_TINT = '#F3F7F4'
const TEXT_PRIMARY = '#111111'
const TEXT_MUTED = '#333333'
const GREEN_SUM = '#2E7D52'

/** Unterer PDF-Rand bei Puppeteer footerTemplate (Höhe der Fußzeile + Puffer) */
export const ANGEBOT_PDF_BOTTOM_MARGIN_MM = 36

export type AngebotTemplatePosition = {
  pos: number
  /** Gewerk-Name für Projekt-PDF (Abschnitte pro Gewerk) */
  gewerk_name?: string | null
  bezeichnung: string
  beschreibung?: string | null
  ist_fachbetrieb?: boolean
  menge: number
  einheit: string
  einzelpreis_netto: number
  rabatt_prozent?: number | null
  gesamt_netto: number
}

export type AngebotTemplateSummen = {
  netto: number
  mwst_prozent: number
  mwst_betrag: number
  brutto: number
}

/** Steuerliche Aufschlüsselung unter der Positionstabelle */
export type AngebotKostenaufstellung = {
  lohn_netto: number
  material_netto: number
}

export type AngebotPdfRechtshinweise = {
  hinweis_35a: boolean
  hinweis_19: boolean
  hinweis_13b: boolean
}

export type AngebotHtmlInput = {
  /** Standard: Angebot — Rechnung nutzt gleiches Layout mit anderen Meta-Zeilen. */
  dokument_art?: 'angebot' | 'rechnung'
  /** Nur Rechnung: formatierter Leistungszeitraum für Meta-Block */
  leistungszeitraum_text?: string | null
  /** Nur Rechnung: Leistungsdatum (ein Tag) */
  leistungsdatum_text?: string | null
  /** Nur Rechnung: Projektbezeichnung unter Leistungszeitraum */
  projekt_titel?: string | null
  /** Bärenwald-Logo oben (data: oder https://) */
  firmen_logo_url?: string | null
  /** Du/Sie für Standard-Hinweise (Angebot annehmen) */
  mail_anrede?: AngebotMailAnrede
  firmenname: string
  firmen_rechtsform?: string | null
  geschaeftsfuehrer?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  /** USt-IdNr., Steuernummer (Kopf + Fuß) */
  firmen_steuer_footer?: string | null
  /** IBAN, BIC, Bank — eigener Zahlungsblock */
  firmen_bankverbindung?: string | null
  firmen_impressum?: string | null
  angebotsnr: string
  kundennr: string
  datum: string
  gueltig_bis: string
  kunde_name: string
  kunde_adresse: string
  /** privat | gewerbe | hausverwaltung */
  kunde_typ?: string | null
  /** Vorausgefüllter Ort für Unterschriftsblock (z. B. Objektort) */
  kunde_ort?: string | null
  /** Objekt / Ausführungsort („Durchführung in: …”) */
  durchfuehrung_in?: string | null
  leistungsumfang: string
  /** z. B. „Hallo Max,“ oder „Sehr geehrte Damen und Herren,“ */
  begruessung: string
  einleitung: string
  /** Anzeige-Zahlungsbedingungen (langer Klartext) */
  zahlungsbedingungen: string
  hinweise?: string | null
  positionen: AngebotTemplatePosition[]
  summen: AngebotTemplateSummen
  /** Arbeits- vs. Materialkosten (netto), automatisch aus Positionen */
  kostenaufstellung?: AngebotKostenaufstellung | null
  rechtshinweise?: AngebotPdfRechtshinweise | null
  schlusstext?: string | null
  /** Projekt-Layout */
  dokument_typ?: 'einfach' | 'projekt'
  projektbeschreibung?: string | null
  dokumentation_bilder?: Array<{ url: string; beschreibung?: string | null }> | null
  /** Zweite Preistabelle (Variante B) */
  variant_block?: {
    titel: string
    positionen: AngebotTemplatePosition[]
    summen: AngebotTemplateSummen
  } | null
  /** Überschrift über erster Positionstabelle (z. B. „Variante A: …”) */
  variant_erste_ueberschrift?: string | null
  /** Globaler Block vor Schlusstext */
  hat_fachbetrieb_positionen?: boolean
  /** Projekt-PDF: Gewerk- oder Varianten-Abschnitte */
  projekt_bloecke?: AngebotProjektPdfBlock[] | null
  /** Für Freitext/Positionen-Reihenfolge im PDF (nur beim HTML-Build gesetzt) */
  pdf_gewerke?: import('@/lib/types').Gewerk[]
  pdf_roh_positionen?: AngebotPosition[]
  /** true = zwei Alternativ-Angebote, keine Gesamtübersicht */
  projekt_hat_varianten?: boolean
  /** KI-Visualisierung (ins Angebot übernommen) */
  ki_visualisierungen?: KiVizPdfPage[] | null
  /** Rechnung: voll | abschlag | schluss — steuert PDF-Überschrift */
  rechnung_typ?: 'voll' | 'abschlag' | 'schluss' | null
  rechnung_abschlag_index?: number | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function euro(n: number): string {
  return `${n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

const FACHBETRIEB_POS_ZEILE =
  `<span style="display:block;font-size:8pt;color:${TEXT_PRIMARY};margin-top:3pt;font-weight:400;">Ausführung durch zugelassenen Fachbetrieb</span>`

const FACHBETRIEB_GLOBAL_BLOCK = `
  <div class="avoid-fuss-overlap" style="margin:20px 0 0;padding:10pt 12pt;border:1pt solid #185FA5;border-radius:4pt;background:#F0F7FF;font-size:9pt;color:${TEXT_PRIMARY};line-height:1.55;font-weight:400;page-break-inside:avoid;">
    <strong style="font-weight:700;">Hinweis zur Leistungserbringung:</strong>
    Gekennzeichnete Leistungen werden durch zugelassene und geprüfte Fachbetriebe
    unter der Projektverantwortung von Bärenwald München ausgeführt.
    Bärenwald München übernimmt als Generalunternehmer die vollständige Koordination,
    Qualitätskontrolle und Haftung gegenüber dem Auftraggeber.
  </div>`

function positionRowHtml(p: AngebotTemplatePosition): string {
  const beschRaw = p.beschreibung?.trim() || ''
  const beschPlain = richTextToPlain(beschRaw).trim()
  const besch =
    beschPlain && beschPlain !== p.bezeichnung.trim() ? beschRaw : ''
  return `
<tr>
  <td style="padding:7px 6px;border-bottom:1px solid #D1D5DB;">${p.pos}</td>
  <td style="padding:7px 6px;border-bottom:1px solid #D1D5DB;">
    <strong>${esc(p.bezeichnung)}</strong>
    ${besch ? `<div style="font-size:10pt;color:${TEXT_PRIMARY};margin-top:3pt;font-weight:400;">${richTextToSafePdfHtml(besch)}</div>` : ''}
    ${p.ist_fachbetrieb ? FACHBETRIEB_POS_ZEILE : ''}
  </td>
  <td style="padding:7px 6px;border-bottom:1px solid #D1D5DB;text-align:right;">${esc(String(p.menge))}</td>
  <td style="padding:7px 6px;border-bottom:1px solid #D1D5DB;">${esc(p.einheit)}</td>
  <td style="padding:7px 6px;border-bottom:1px solid #D1D5DB;text-align:right;white-space:nowrap;">${euro(p.einzelpreis_netto)}</td>
  <td style="padding:7px 6px;border-bottom:1px solid #D1D5DB;text-align:right;white-space:nowrap;font-weight:600;">${euro(p.gesamt_netto)}</td>
</tr>`
}

const POSITION_TABLE_HEAD = `
    <thead>
      <tr style="background:#f3f4f6;font-size:9pt;color:${TEXT_PRIMARY};font-weight:700;">
        <th style="padding:6px;text-align:left;width:28px;border-bottom:1px solid #9CA3AF;">Pos.</th>
        <th style="padding:6px;text-align:left;border-bottom:1px solid #9CA3AF;">Bezeichnung</th>
        <th style="padding:6px;text-align:right;width:48px;border-bottom:1px solid #9CA3AF;">Menge</th>
        <th style="padding:6px;text-align:left;width:56px;border-bottom:1px solid #9CA3AF;">Einheit</th>
        <th style="padding:6px;text-align:right;width:72px;border-bottom:1px solid #9CA3AF;">Einzel €</th>
        <th style="padding:6px;text-align:right;width:76px;border-bottom:1px solid #9CA3AF;">Gesamt €</th>
      </tr>
    </thead>`

export function positionTableHtml(positionen: AngebotTemplatePosition[]): string {
  const body = positionen.map(positionRowHtml).join('')
  if (!body.trim()) return ''
  return `<table>${POSITION_TABLE_HEAD}<tbody>${body}</tbody></table>`
}

/** Hinweis / Freitext ohne Preistabelle */
export function freitextBlockHtml(ft: { titel: string; text: string }): string {
  const titel = ft.titel.trim()
  const text = ft.text.trim()
  if (!titel && !text) return ''
  return `<div class="angebot-freitext" style="margin:12px 0;padding:12px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;page-break-inside:avoid;">
    ${
      titel
        ? `<p style="margin:0 0 6px;font-size:10pt;font-weight:700;color:${PROJEKT_ACCENT};">${esc(titel)}</p>`
        : ''
    }
    ${
      text
        ? `<div style="margin:0;font-size:9pt;line-height:1.55;color:${TEXT_PRIMARY};font-weight:400;">${richTextToSafePdfHtml(text)}</div>`
        : ''
    }
  </div>`
}

/** Positionen und Freitexte in Wizard-Reihenfolge (pro Gewerk-Abschnitt). */
export function renderBlockEntriesHtml(
  entries: AngebotBlockPdfEntry[],
  mapPositions: (positions: AngebotPosition[]) => AngebotTemplatePosition[]
): string {
  const parts: string[] = []
  let posBuffer: AngebotPosition[] = []

  const flushPositions = () => {
    if (!posBuffer.length) return
    const table = positionTableHtml(mapPositions(posBuffer))
    if (table) parts.push(table)
    posBuffer = []
  }

  for (const entry of entries) {
    if (entry.kind === 'freitext') {
      flushPositions()
      if (entry.freitext.titel === GEWERK_BESCHREIBUNG_TITEL) {
        const text = entry.freitext.text.trim()
        if (text) {
          parts.push(
            `<div style="margin:0 0 12px;font-size:10pt;line-height:1.55;color:${TEXT_PRIMARY};font-weight:400;">${richTextToSafePdfHtml(
              text
            )}</div>`
          )
        }
        continue
      }
      const html = freitextBlockHtml(entry.freitext)
      if (html) parts.push(html)
    } else {
      posBuffer.push(entry.position)
    }
  }
  flushPositions()
  return parts.join('')
}

/** Einfaches Angebot: Positionen + Freitexte in Wizard-Reihenfolge, ohne Gewerk-Überschriften. */
export function positionenMitFreitextFlatHtml(
  rohPositionen: AngebotPosition[],
  gewerke: import('@/lib/types').Gewerk[]
): string {
  const groups = groupAngebotPositionenByBlock(rohPositionen, gewerke)
  const mapPositions = (positions: AngebotPosition[]) =>
    mapAngebotPositionenToTemplateRows(positions, gewerke)

  return groups
    .map((g, i) => {
      const descEntry = g.entries.find(
        (e) => e.kind === 'freitext' && e.freitext.titel === GEWERK_BESCHREIBUNG_TITEL
      )
      const descText =
        descEntry && descEntry.kind === 'freitext' ? descEntry.freitext.text ?? '' : ''
      const entriesOhneDesc = descEntry
        ? g.entries.filter(
            (e) =>
              !(
                e.kind === 'freitext' && e.freitext.titel === GEWERK_BESCHREIBUNG_TITEL
              )
          )
        : g.entries

      const showNummer = groups.length > 1
      const gewerkTitel = showNummer
        ? `GEWERK ${i + 1} – ${g.titel.toUpperCase()}`
        : g.titel.toUpperCase()

      const beschreibungHtml = descText.trim().length
        ? `<div style="margin:0 0 12px;font-size:10pt;line-height:1.55;color:${TEXT_PRIMARY};font-weight:400;">${richTextToSafePdfHtml(
            descText
          )}</div>`
        : ''

      const inhalt = renderBlockEntriesHtml(entriesOhneDesc, mapPositions)

      return `<section class="projekt-block" style="margin:0 0 26px;page-break-inside:avoid;">
        <h2 style="font-size:13pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 12px;line-height:1.35;padding-bottom:6px;border-bottom:2px solid ${PROJEKT_ACCENT};">${esc(
          gewerkTitel
        )}</h2>
        ${beschreibungHtml}
        ${inhalt}
      </section>`
    })
    .join('')
}

function kostenaufstellungPlain(
  ka: AngebotKostenaufstellung | null | undefined,
  inSummenSpalte = false
): string {
  if (!ka) return ''
  const rows: string[] = []
  if (ka.lohn_netto > 0) {
    rows.push(
      `<div style="display:flex;justify-content:space-between;"><span>Arbeitskosten (netto)</span><span>${euro(ka.lohn_netto)}</span></div>`
    )
  }
  if (ka.material_netto > 0) {
    rows.push(
      `<div style="display:flex;justify-content:space-between;"><span>Materialkosten (netto)</span><span>${euro(ka.material_netto)}</span></div>`
    )
  }
  if (!rows.length) return ''
  const width = inSummenSpalte ? 'width:100%;' : 'max-width:280px;margin-left:auto;'
  return `<div style="font-size:9pt;color:${TEXT_PRIMARY};line-height:1.7;font-weight:400;${inSummenSpalte ? 'margin-bottom:8px;' : 'margin-top:14px;'}${width}">
    ${rows.join('')}
  </div>`
}

function rechtshinweisePlain(
  rh: AngebotPdfRechtshinweise | null | undefined,
  ka: AngebotKostenaufstellung | null | undefined
): string {
  if (!rh) return ''
  const parts: string[] = []
  const lohn = ka?.lohn_netto ?? 0
  const pStyle = `margin:0 0 8px;font-size:8pt;color:${TEXT_PRIMARY};line-height:1.55;text-align:left;font-weight:400;`
  if (rh.hinweis_35a && lohn > 0) {
    parts.push(
      `<p style="${pStyle}">
        Steuerlicher Hinweis gemäß § 35a Abs. 3 EStG: Der ausgewiesene Lohnkostenanteil in Höhe von ${euro(lohn)} kann bei der Einkommensteuer geltend gemacht werden.
      </p>`
    )
  }
  if (rh.hinweis_19) {
    parts.push(
      `<p style="${pStyle}">
        <strong>Hinweis § 19 UStG:</strong> Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
      </p>`
    )
  }
  if (rh.hinweis_13b) {
    parts.push(
      `<p style="${pStyle}">
        <strong>Hinweis § 13b UStG:</strong> Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG (Reverse Charge). Die Umsatzsteuer ist vom Leistungsempfänger zu entrichten.
      </p>`
    )
  }
  return parts.join('')
}

function summenBlockHtml(
  s: AngebotTemplateSummen,
  ka?: AngebotKostenaufstellung | null,
  rh?: AngebotPdfRechtshinweise | null
): string {
  const recht = rechtshinweisePlain(rh, ka)
  const summenSpalte = `<div style="width:300px;flex-shrink:0;">
    ${kostenaufstellungPlain(ka, true)}
    <table style="width:100%;font-size:10pt;font-weight:400;">
      <tr><td style="padding:3px 4px;">Zwischensumme (netto)</td><td style="padding:3px 4px;text-align:right;">${euro(s.netto)}</td></tr>
      <tr><td style="padding:3px 4px;">Umsatzsteuer ${esc(String(s.mwst_prozent))} %</td><td style="padding:3px 4px;text-align:right;">${euro(s.mwst_betrag)}</td></tr>
    </table>
    <table style="width:100%;font-size:11pt;font-weight:700;margin-top:6px;border-top:1px solid #111;">
      <tr><td style="padding:8px 4px 4px;">Gesamtbetrag</td><td style="padding:8px 4px 4px;text-align:right;color:${GREEN_SUM};">${euro(s.brutto)}</td></tr>
    </table>
  </div>`
  if (!recht) {
    return `<div style="margin-top:14px;display:flex;justify-content:flex-end;">${summenSpalte}</div>`
  }
  return `<div style="margin-top:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
    <div style="flex:1;min-width:0;padding-top:2px;">${recht}</div>
    ${summenSpalte}
  </div>`
}

/** Summen + Hinweise nebeneinander (Projekt-Gesamtübersicht). */
function summenMitHinweisenNeben(
  summenHtml: string,
  ka: AngebotKostenaufstellung | null | undefined,
  rh: AngebotPdfRechtshinweise | null | undefined
): string {
  const recht = rechtshinweisePlain(rh, ka)
  const kosten = kostenaufstellungPlain(ka, true)
  const rechts = `<div style="width:300px;flex-shrink:0;">${kosten}${summenHtml}</div>`
  if (!recht) {
    return `<div style="display:flex;justify-content:flex-end;margin-top:10px;">${rechts}</div>`
  }
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-top:10px;">
    <div style="flex:1;min-width:0;">${recht}</div>
    ${rechts}
  </div>`
}

function firmennameZeile(props: AngebotHtmlInput): string {
  const rf = props.firmen_rechtsform?.trim()
  return rf ? `${props.firmenname.trim()} ${rf}` : props.firmenname.trim()
}

/** Bärenwald-Logo oben auf jeder Angebotsseite */
function mailAnredeAusProps(props: AngebotHtmlInput): AngebotMailAnrede {
  if (props.mail_anrede === 'sie' || props.mail_anrede === 'du') return props.mail_anrede
  const b = props.begruessung?.trim() ?? ''
  if (/Sehr geehrte/i.test(b)) return 'sie'
  return 'du'
}


function angebotUnterschriftFelderInnerHtml(): string {
  return `<div style="display:flex;gap:28px;align-items:flex-end;width:100%;font-size:10pt;color:#111;">
      <div style="flex:1;min-width:0;">
        <div style="border-bottom:1px solid #D1D5DB;height:32px;"></div>
        <div style="font-size:8pt;color:${TEXT_MUTED};margin-top:5px;font-weight:400;text-align:left;">Ort und Datum</div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="border-bottom:1px solid #D1D5DB;height:32px;"></div>
        <div style="font-size:8pt;color:${TEXT_MUTED};margin-top:5px;font-weight:400;text-align:left;">Unterschrift</div>
      </div>
    </div>`
}

/** „Angebot annehmen“ — Hinweistext und Unterschriftsfelder in einer Card. */
function angebotAnnahmeCardHtml(props: AngebotHtmlInput): string {
  const st = props.schlusstext?.trim() ?? ''
  const showHinweis = !st.includes('unterzeichnet')
  if (!showHinweis) return ''
  const anrede = mailAnredeAusProps(props)
  const text = ANGEBOT_ANNAHME_HINWEIS[anrede]
  const cardStyle = `margin-top:18px;padding:12px 14px;border:1px solid #D1D5DB;border-radius:2px;font-size:10pt;line-height:1.55;color:${TEXT_PRIMARY};font-weight:400;page-break-inside:avoid;`
  return `<div class="avoid-fuss-overlap angebot-annahme-card" style="${cardStyle}">
    <strong style="display:block;margin-bottom:6px;color:${TEXT_PRIMARY};font-size:11pt;font-weight:700;">Angebot annehmen</strong>
    <span style="font-weight:400;">${esc(text)}</span>
    <div class="angebot-annahme-unterschrift" style="margin-top:14px;">
      ${angebotUnterschriftFelderInnerHtml()}
    </div>
  </div>`
}

function angebotPdfAbschlussHtml(props: AngebotHtmlInput): string {
  const teamLabel =
    mailAnredeAusProps(props) === 'du' ? 'Dein Bärenwald Team' : 'Ihr Bärenwald Team'
  const anrede = mailAnredeAusProps(props)
  const custom = props.schlusstext?.trim()
  const customPlain = custom ? richTextToPlain(custom) : ''
  const isAnnahmeText =
    !!customPlain &&
    (customPlain.includes('unterzeichn') ||
      customPlain === ANGEBOT_ANNAHME_HINWEIS.du ||
      customPlain === ANGEBOT_ANNAHME_HINWEIS.sie)
  const text = custom && !isAnnahmeText ? custom : defaultAngebotPdfSchlusstext(anrede, teamLabel)
  return `<div class="avoid-fuss-overlap" style="margin-top:12px;font-size:11pt;line-height:1.6;color:${TEXT_PRIMARY};font-weight:400;page-break-inside:avoid;">
    ${richTextToSafePdfHtml(text)}
  </div>`
}

function rechnungPdfSchlussHtml(props: AngebotHtmlInput): string {
  const anrede = mailAnredeAusProps(props)
  const dank = RECHNUNG_SCHLUSS_STANDARD[anrede]
  const name = firmennameZeile(props)
  return `<div class="avoid-fuss-overlap" style="margin-top:16px;font-size:10.5pt;line-height:1.6;color:${TEXT_PRIMARY};page-break-inside:avoid;">
    <p style="margin:0 0 12px;">${esc(dank)}</p>
    <p style="margin:0 0 4px;">Mit freundlichen Grüßen</p>
    <p style="margin:0;font-weight:700;">${esc(name)}</p>
  </div>`
}

/** Dokumentende: Annahme-Card (inkl. Unterschrift) → Fachbetrieb-Hinweis → Abschluss */
function angebotDokumentEndeHtml(props: AngebotHtmlInput): string {
  const fach = props.hat_fachbetrieb_positionen ? FACHBETRIEB_GLOBAL_BLOCK : ''
  return `<div class="angebot-dokument-ende" style="margin-bottom:10mm;">
    ${angebotAnnahmeCardHtml(props)}${fach}${angebotPdfAbschlussHtml(props)}
  </div>`
}

/** Logo-Band für PDFs (Angebot, Abnahmeprotokoll, …). */
export function angebotLogoKopfHtml(props: AngebotHtmlInput): string {
  const src = props.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  const safeSrc = src.replace(/"/g, '&quot;')
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${PROJEKT_ACCENT};">
    <img src="${safeSrc}" alt="" role="presentation" style="height:80px;width:auto;max-width:320px;object-fit:contain;display:block;" />
  </div>`
}

/** Rechnungs-Briefkopf — gleiches Layout wie Projektangebot (Logo + grüner Kopfbalken). */
function rechnungBriefkopfHtml(props: AngebotHtmlInput): string {
  const projektTitel =
    props.projekt_titel?.trim() || props.leistungsumfang?.trim() || 'Rechnung'
  const teamLabel = `${firmennameZeile(props)} Team`
  const dokumentLabel =
    props.rechnung_typ === 'schluss'
      ? 'Schlussrechnung'
      : props.rechnung_typ === 'abschlag'
        ? props.rechnung_abschlag_index && props.rechnung_abschlag_index > 0
          ? `Abschlagsrechnung ${props.rechnung_abschlag_index}`
          : 'Abschlagsrechnung'
        : 'Rechnung'
  return `<header style="border-bottom:3px solid ${PROJEKT_ACCENT};padding-bottom:14px;margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:9pt;color:${TEXT_PRIMARY};text-transform:uppercase;letter-spacing:0.06em;font-weight:400;">${esc(dokumentLabel)}</div>
        <h1 style="font-size:15pt;font-weight:700;color:${PROJEKT_ACCENT};margin:6px 0 0;line-height:1.3;">
          ${esc(projektTitel)}
        </h1>
        <div style="margin-top:10px;font-size:9pt;line-height:1.5;color:${TEXT_PRIMARY};font-weight:400;">
          Ausführung durch geprüfte Fach- &amp; Subunternehmen<br/>
          Koordination: ${esc(teamLabel)}
        </div>
      </div>
      <div style="flex:0 0 auto;padding-top:2px;text-align:right;">
        ${briefAbsenderHtml(props).replace('margin-bottom:6mm;', 'margin-bottom:10px;')}
        ${briefMetaHtml(props)}
      </div>
    </div>
  </header>`
}

/** Kleiner Briefkopf-Absender (DIN-ähnlich, wie Musterangebot). */
export function briefAbsenderHtml(props: AngebotHtmlInput): string {
  const kontakt = props.firmen_kontakt
    .split(' · ')
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => esc(z))
  const steuer = (props.firmen_steuer_footer ?? '')
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => esc(z))
  const zeilen = [
    `<strong>${esc(firmennameZeile(props))}</strong>`,
    ...esc(props.firmen_adresse)
      .replace(/\n/g, '<br/>')
      .split('<br/>')
      .filter(Boolean),
    ...kontakt,
    ...steuer,
  ]
  return `<div style="font-size:8pt;line-height:1.45;color:${TEXT_PRIMARY};font-weight:400;text-align:right;margin-bottom:6mm;">
    ${zeilen.join('<br/>')}
  </div>`
}

function briefMetaHtml(props: AngebotHtmlInput): string {
  const zeile = (label: string, value: string) =>
    `<div style="text-align:right;font-size:8.5pt;line-height:1.55;white-space:nowrap;">
      <span style="color:${TEXT_PRIMARY};">${label}</span>
      <span style="font-weight:400;margin-left:8px;">${esc(value)}</span>
    </div>`
  if (props.dokument_art === 'rechnung') {
    const lz = props.leistungszeitraum_text?.trim() || '—'
    const ld = props.leistungsdatum_text?.trim() || props.datum || '—'
    return `<div style="text-align:right;min-width:200px;">
      ${zeile('Rechnungsnr.:', props.angebotsnr)}
      ${zeile('Kundennr.:', props.kundennr)}
      ${zeile('Rechnungsdatum:', props.datum)}
      ${zeile('Leistungsdatum:', ld)}
      ${zeile('Leistungszeitraum:', lz)}
      ${zeile('Fällig am:', props.gueltig_bis)}
    </div>`
  }
  return `<div style="text-align:right;min-width:200px;">
    ${zeile('Angebotsnr.:', props.angebotsnr)}
    ${zeile('Kundennr.:', props.kundennr)}
    ${zeile('Datum:', props.datum)}
    ${zeile('gültig bis:', props.gueltig_bis)}
  </div>`
}

/** Briefkopf: Titel links, Absender + Meta rechtsbündig. */
export function briefkopfZeileHtml(
  props: AngebotHtmlInput,
  titel: string,
  titelStyle = `font-size:18pt;font-weight:700;margin:0 0 8px;color:${TEXT_PRIMARY};`,
  metaHtml?: string
): string {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:18px;">
    <div style="flex:1;min-width:0;">
      <h1 style="${titelStyle}">${esc(titel)}</h1>
    </div>
    <div style="flex:0 0 auto;padding-top:2px;text-align:right;">
      ${briefAbsenderHtml(props).replace('margin-bottom:6mm;', 'margin-bottom:10px;')}
      ${metaHtml ?? briefMetaHtml(props)}
    </div>
  </div>`
}

function briefEmpfaengerHtml(props: AngebotHtmlInput): string {
  const ort = props.durchfuehrung_in?.trim()
  const adresse = props.kunde_adresse?.trim() || '—'
  const durchfuehrungRechts = ort
    ? `<div style="text-align:right;font-size:10pt;line-height:1.5;min-width:48mm;max-width:72mm;">
        <div style="font-weight:600;color:${PROJEKT_ACCENT};">Durchführung in:</div>
        <div style="margin-top:4px;color:#111;">${esc(ort).replace(/\n/g, '<br/>')}</div>
      </div>`
    : ''
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin:0 0 20px;">
    <div style="min-height:32mm;max-width:92mm;font-size:11pt;line-height:1.5;">
      <div style="font-weight:600;">${esc(props.kunde_name)}</div>
      <div style="margin-top:6px;white-space:pre-line;">${esc(adresse)}</div>
    </div>
    ${durchfuehrungRechts}
  </div>`
}

function bankverbindungHtml(props: AngebotHtmlInput, referenzNr: string): string {
  const bank = props.firmen_bankverbindung?.trim()
  const inhalt = bank
    ? esc(bank).replace(/\n/g, '<br/>')
    : [
        'Bank: [wird in Einstellungen ergänzt]',
        'IBAN: [wird in Einstellungen ergänzt]',
        'BIC: [wird in Einstellungen ergänzt]',
      ].join('<br/>')
  const platzhalterHinweis = bank
    ? ''
    : `<div style="margin-top:6px;font-size:8pt;color:${TEXT_MUTED};font-style:italic;font-weight:400;">Platzhalter — Bankdaten bitte unter Einstellungen pflegen.</div>`
  return `<div style="margin-top:18px;padding:10px 12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:2px;font-size:9pt;line-height:1.55;font-weight:400;">
    <div style="font-weight:700;margin-bottom:6px;color:${TEXT_PRIMARY};">Bankverbindung (Überweisung)</div>
    <div style="white-space:pre-line;color:${TEXT_PRIMARY};">${inhalt}</div>
    ${platzhalterHinweis}
    <div style="margin-top:6px;font-size:8.5pt;color:${TEXT_PRIMARY};">Verwendungszweck: ${esc(referenzNr)}</div>
  </div>`
}

function projektGewerkUebersichtListeHtml(bloecke: AngebotProjektPdfBlock[]): string {
  if (bloecke.length < 2) return ''
  const rows = bloecke
    .map(
      (b) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:10pt;color:#111;">${esc(b.titel)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:10pt;white-space:nowrap;">${euro(b.summen.netto)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:10pt;font-weight:600;white-space:nowrap;">${euro(b.summen.brutto)}</td>
      </tr>`
    )
    .join('')
  return `<div style="margin-bottom:16px;">
    <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;">
      <thead>
        <tr style="background:#F3F4F6;font-size:9pt;text-transform:uppercase;letter-spacing:0.04em;color:${TEXT_PRIMARY};">
          <th style="padding:8px 10px;text-align:left;font-weight:600;">Gewerk</th>
          <th style="padding:8px 10px;text-align:right;font-weight:600;width:96px;">Netto</th>
          <th style="padding:8px 10px;text-align:right;font-weight:600;width:96px;">Brutto</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

function summenBlockKompaktHtml(s: AngebotTemplateSummen, gruen = false): string {
  const accent = gruen ? PROJEKT_ACCENT : '#111'
  const bg = gruen ? PROJEKT_TINT : 'transparent'
  const border = gruen ? `1px solid ${PROJEKT_ACCENT}` : 'none'
  const pad = gruen ? '12px 14px' : '0'
  return `<div style="margin-top:12px;display:flex;flex-direction:column;align-items:flex-end;">
    <div style="width:300px;background:${bg};border:${border};border-radius:4px;padding:${pad};">
      <table style="width:100%;font-size:10pt;color:${accent};font-weight:400;">
        <tr><td style="padding:3px 6px;">Gesamtsumme netto</td><td style="padding:3px 6px;text-align:right;font-weight:600;">${euro(s.netto)}</td></tr>
        <tr><td style="padding:3px 6px;">zzgl. ${esc(String(s.mwst_prozent))} % MwSt.</td><td style="padding:3px 6px;text-align:right;">${euro(s.mwst_betrag)}</td></tr>
        <tr style="border-top:1px solid ${accent};"><td style="padding:8px 6px 4px;font-weight:700;">Gesamtsumme brutto</td><td style="padding:8px 6px 4px;text-align:right;font-weight:700;">${euro(s.brutto)}</td></tr>
      </table>
    </div>
  </div>`
}

function projektFotosHtml(
  bilder: Array<{ url: string; beschreibung?: string | null }>
): string {
  return `<section style="margin:0 0 22px;page-break-inside:avoid;">
    <h2 style="font-size:11pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid ${PROJEKT_ACCENT};">
      Fotodokumentation Bestand
    </h2>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      ${bilder
        .slice(0, 12)
        .map((b) => {
          const cap = b.beschreibung?.trim()
          return `<figure style="margin:0;border:1px solid #E5E7EB;border-radius:4px;overflow:hidden;background:#fff;">
            <img alt="" src="${esc(b.url)}" style="width:100%;height:150px;object-fit:cover;display:block;"/>
            <figcaption style="padding:8px 10px;font-size:9pt;line-height:1.45;color:${TEXT_PRIMARY};background:${PROJEKT_TINT};min-height:36px;">
              ${cap ? richTextToSafePdfHtml(cap) : `<span style="color:${TEXT_MUTED};">—</span>`}
            </figcaption>
          </figure>`
        })
        .join('')}
    </div>
  </section>`
}

function projektBlockHtml(
  block: AngebotProjektPdfBlock,
  totalBlocks: number,
  mapPositions: (positions: AngebotPosition[]) => AngebotTemplatePosition[],
  hatVarianten = false
): string {
  const titel =
    totalBlocks > 1 && !hatVarianten
      ? `GEWERK ${block.nummer} – ${block.titel.toUpperCase()}`
      : block.titel.toUpperCase()
  const bullets =
    block.leistungsliste.length > 0
      ? `<ul style="margin:0 0 12px;padding-left:18px;font-size:10pt;line-height:1.55;color:${TEXT_PRIMARY};">
      ${block.leistungsliste.map((l) => `<li style="margin-bottom:4px;">${esc(l)}</li>`).join('')}
    </ul>`
      : ''
  const inhalt = renderBlockEntriesHtml(block.entries, mapPositions)
  return `<section class="projekt-block" style="margin:0 0 26px;page-break-inside:avoid;">
    <h2 style="font-size:13pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 12px;line-height:1.35;padding-bottom:6px;border-bottom:2px solid ${PROJEKT_ACCENT};">${esc(titel)}</h2>
    ${bullets}
    ${inhalt}
    ${summenBlockKompaktHtml(block.summen)}
  </section>`
}

function wichtigeHinweiseHtml(text: string): string {
  if (looksLikeHtml(text)) {
    return `<section style="margin:22px 0;page-break-inside:avoid;">
    <h2 style="font-size:11pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 10px;">Wichtige Hinweise</h2>
    <div style="font-size:10pt;line-height:1.55;color:${TEXT_PRIMARY};">${richTextToSafePdfHtml(text)}</div>
  </section>`
  }
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
  if (!lines.length) return ''
  return `<section style="margin:22px 0;page-break-inside:avoid;">
    <h2 style="font-size:11pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 10px;">Wichtige Hinweise</h2>
    <ul style="margin:0;padding-left:18px;font-size:10pt;line-height:1.55;color:${TEXT_PRIMARY};">
      ${lines.map((l) => `<li style="margin-bottom:6px;">${esc(l)}</li>`).join('')}
    </ul>
  </section>`
}

function parseFusszeileKontakt(props: AngebotHtmlInput): {
  tel: string
  email: string
  web: string
} {
  let tel = ''
  let email = ''
  let web = ''
  for (const part of props.firmen_kontakt.split(' · ').map((z) => z.trim()).filter(Boolean)) {
    if (/^tel\.?\s*/i.test(part)) tel = part.replace(/^tel\.?\s*/i, '').trim()
    else if (part.includes('@')) email = part
    else if (/^www\./i.test(part) || part.includes('.')) web = part.replace(/^https?:\/\//i, '')
  }
  const steuerLines = (props.firmen_steuer_footer ?? '')
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
  for (const line of steuerLines) {
    if (/^www\./i.test(line) && !web) web = line.replace(/^https?:\/\//i, '')
  }
  if (!web) web = 'www.baerenwaldmuenchen.de'
  if (!tel) tel = '+49 163 7316161'
  if (!email) email = 'info@baerenwaldmuenchen.de'
  return { tel, email, web }
}

function parseFusszeileSteuer(props: AngebotHtmlInput): { ustId: string; steuernr: string } {
  let ustId = 'DE362198001'
  let steuernr = '14417721070'
  const lines = (props.firmen_steuer_footer ?? '')
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
  for (const line of lines) {
    if (/ust/i.test(line) || /uSt/i.test(line)) {
      const m = line.match(/DE\s*\d+/i)
      if (m) ustId = m[0].replace(/\s/g, '')
    }
    if (/steuer/i.test(line) && !/ust/i.test(line)) {
      const m = line.match(/\d[\d\s]+/)
      if (m) steuernr = m[0].replace(/\s/g, '')
    }
  }
  return { ustId, steuernr }
}

/** Puppeteer footerTemplate — auf jeder PDF-Seite (2 Spalten + Seitenzahl). */
export function buildAngebotPdfFooterTemplate(props: AngebotHtmlInput): string {
  const name = firmennameZeile(props)
  const addrLines = props.firmen_adresse
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
  const { tel, email, web } = parseFusszeileKontakt(props)
  const { ustId, steuernr } = parseFusszeileSteuer(props)
  const telDisplay = tel.startsWith('+') ? tel : `+49 ${tel.replace(/^0/, '')}`
  const leftHtml = [
    esc(name),
    ...addrLines.map((l) => esc(l)),
    `Tel.: ${esc(telDisplay)}`,
    esc(email),
  ].join('<br/>')
  const rightHtml = [
    esc(web.startsWith('www.') ? web : `www.${web}`),
    `USt-IdNr.: ${esc(ustId)}`,
    `Steuernummer: ${esc(steuernr)}`,
  ].join('<br/>')

  return `<div style="width:100%;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;color:${TEXT_MUTED};padding:4px 12mm 2px;border-top:0.5pt solid #E5E7EB;background:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;width:100%;">
      <div style="flex:1;text-align:left;line-height:1.45;font-weight:400;">${leftHtml}</div>
      <div style="flex:0 0 auto;text-align:center;line-height:1.45;font-weight:400;white-space:nowrap;padding:0 8px;">
        Seite <span class="pageNumber"></span> von <span class="totalPages"></span>
      </div>
      <div style="flex:1;text-align:right;line-height:1.45;font-weight:400;">${rightHtml}</div>
    </div>
  </div>`
}

/** Fußzeile für HTML-Vorschau (Browser, eine Seite am Ende). */
export function pdfFusszeileHtml(props: AngebotHtmlInput): string {
  const inner = buildAngebotPdfFooterTemplate(props)
    .replace(/<span class="pageNumber"><\/span>/g, '1')
    .replace(/<span class="totalPages"><\/span>/g, '1')
  return `<div class="pdf-fuss">${inner}</div>`
}

export type AngebotPdfShellOptions = {
  includeBodyFooter?: boolean
}

function angebotPdfShell(
  body: string,
  title: string,
  footerHtml: string,
  options?: AngebotPdfShellOptions
): string {
  const bodyFooter = options?.includeBodyFooter
    ? `<div class="pdf-fuss-end">${footerHtml}</div>`
    : ''
  const bodyPaddingBottom = options?.includeBodyFooter ? '30mm' : '0'
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: ${TEXT_PRIMARY};
    font-size: 11pt;
    font-weight: 400;
    padding-bottom: ${bodyPaddingBottom};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  .page { padding: 0 4mm; max-width: 210mm; margin: 0 auto; }
  .page-body {
    padding-bottom: ${options?.includeBodyFooter ? '0' : '4mm'};
  }
  .pdf-fuss-end {
    margin-top: 28px;
    padding-top: 10px;
    page-break-inside: avoid;
    break-inside: avoid-page;
  }
  .projekt-block { break-inside: avoid-page; }
  .angebot-unterschrift-block {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }
  @media print {
    .avoid-fuss-overlap {
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
  }
</style>
</head>
<body>
<div class="page">
  <div class="page-body">${body}</div>
  ${bodyFooter}
</div>
</body>
</html>`
}

function buildAngebotProjektHtml(
  props: AngebotHtmlInput,
  options?: AngebotPdfShellOptions
): string {
  const shellOpts = options
  const bloecke = props.projekt_bloecke ?? []
  const projektTitel = props.leistungsumfang?.trim() || 'Projektkoordination'
  const teamLabel = `${firmennameZeile(props)} Team`

  const einl = richTextToSafePdfHtml(props.einleitung)
  const begr = esc(props.begruessung.trim() || 'Guten Tag,')

  const beschreibung =
    props.projektbeschreibung?.trim()
      ? `<section style="margin:0 0 20px;">
    <h2 style="font-size:11pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 8px;">Projektbeschreibung</h2>
    <div style="font-size:11pt;line-height:1.6;color:${TEXT_PRIMARY};font-weight:400;">${richTextToSafePdfHtml(props.projektbeschreibung)}</div>
  </section>`
      : ''

  const fotos =
    props.dokumentation_bilder && props.dokumentation_bilder.length > 0
      ? projektFotosHtml(props.dokumentation_bilder)
      : ''

  const gewerke = props.pdf_gewerke ?? []
  const mapPositions = (positions: AngebotPosition[]) =>
    mapAngebotPositionenToTemplateRows(positions, gewerke)
  const bloeckeHtml = bloecke
    .map((b) => projektBlockHtml(b, bloecke.length, mapPositions, props.projekt_hat_varianten))
    .join('')

  const gesamtNetto = bloecke.reduce((s, b) => s + b.summen.netto, 0)
  const gesamtMwst = bloecke.reduce((s, b) => s + b.summen.mwst_betrag, 0)
  const gesamtBrutto = bloecke.reduce((s, b) => s + b.summen.brutto, 0)
  const mehrereGewerke = bloecke.length > 1

  const gesamtSummenWerte = {
    netto: Math.round(gesamtNetto * 100) / 100,
    mwst_prozent: props.summen.mwst_prozent,
    mwst_betrag: Math.round(gesamtMwst * 100) / 100,
    brutto: Math.round(gesamtBrutto * 100) / 100,
  }

  const gesamtKompaktInner = summenBlockKompaktHtml(gesamtSummenWerte, true).replace(
    'margin-top:12px;display:flex;flex-direction:column;align-items:flex-end;',
    'display:flex;flex-direction:column;align-items:flex-end;'
  )

  const gesamtSumme =
    mehrereGewerke && !props.projekt_hat_varianten && gesamtBrutto > 0
      ? `<section class="avoid-fuss-overlap" style="margin:8px 0 24px;padding:14px 16px;background:${PROJEKT_TINT};border:2px solid ${PROJEKT_ACCENT};border-radius:4px;">
    <h2 style="font-size:11pt;font-weight:700;color:${PROJEKT_ACCENT};margin:0 0 10px;">Gesamtübersicht aller Gewerke</h2>
    ${projektGewerkUebersichtListeHtml(bloecke)}
    ${summenMitHinweisenNeben(
      gesamtKompaktInner,
      props.kostenaufstellung,
      props.rechtshinweise
    )}
  </section>`
      : ''

  const abschlussKostenRecht =
    !mehrereGewerke || props.projekt_hat_varianten
      ? summenMitHinweisenNeben('', props.kostenaufstellung, props.rechtshinweise)
      : ''

  const hinweise = props.hinweise?.trim() ? wichtigeHinweiseHtml(props.hinweise) : ''

  const ende = angebotDokumentEndeHtml(props)

  const body = `
  ${angebotLogoKopfHtml(props)}
  <header style="border-bottom:3px solid ${PROJEKT_ACCENT};padding-bottom:14px;margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:9pt;color:${TEXT_PRIMARY};text-transform:uppercase;letter-spacing:0.06em;font-weight:400;">Projektangebot</div>
        <h1 style="font-size:15pt;font-weight:700;color:${PROJEKT_ACCENT};margin:6px 0 0;line-height:1.3;">
          ${esc(projektTitel)}
        </h1>
        <div style="margin-top:10px;font-size:9pt;line-height:1.5;color:${TEXT_PRIMARY};font-weight:400;">
          Ausführung durch geprüfte Fach- &amp; Subunternehmen<br/>
          Koordination: ${esc(teamLabel)}
        </div>
      </div>
      <div style="flex:0 0 auto;padding-top:2px;text-align:right;">
        ${briefAbsenderHtml(props).replace('margin-bottom:6mm;', 'margin-bottom:10px;')}
        ${briefMetaHtml(props)}
      </div>
    </div>
  </header>

  ${briefEmpfaengerHtml(props)}

  <section style="margin:0 0 22px;width:100%;">
    <div style="font-size:10pt;color:${TEXT_PRIMARY};font-weight:400;margin-bottom:4px;">Projektkoordination &amp; Bauorganisation</div>
    <div style="font-size:10pt;font-weight:400;color:${TEXT_PRIMARY};margin-bottom:10px;">${esc(teamLabel)}</div>
    <div style="font-size:11pt;line-height:1.65;color:${TEXT_PRIMARY};font-weight:400;max-width:100%;">
      <p style="margin:0;">${begr}</p>
      ${einl ? `<p style="margin:12px 0 0;">${einl}</p>` : ''}
    </div>
  </section>

  ${beschreibung}
  ${fotos}
  ${props.ki_visualisierungen?.length ? kiVisualisierungPdfHtml(props.ki_visualisierungen) : ''}
  ${bloeckeHtml}
  ${gesamtSumme}
  ${abschlussKostenRecht}

  <div class="avoid-fuss-overlap" style="margin-top:16px;font-size:10pt;color:${TEXT_PRIMARY};line-height:1.55;">${plainTextToPdfHtml(props.zahlungsbedingungen)}</div>
  ${bankverbindungHtml(props, props.angebotsnr)}
  ${hinweise}
  ${ende}
  `

  return angebotPdfShell(body, `Projektangebot ${props.angebotsnr}`, pdfFusszeileHtml(props), shellOpts)
}

/** HTML-Dokument für PDF-Rendering */
export function buildAngebotHtml(
  props: AngebotHtmlInput,
  options?: AngebotPdfShellOptions
): string {
  const shellOpts = options
  const istProjekt = props.dokument_typ === 'projekt'
  if (istProjekt && (props.projekt_bloecke?.length ?? 0) > 0) {
    return buildAngebotProjektHtml(props, options)
  }

  const istRechnung = props.dokument_art === 'rechnung'
  const dokumentTitel =
    props.rechnung_typ === 'schluss'
      ? 'Schlussrechnung'
      : props.rechnung_typ === 'abschlag'
        ? props.rechnung_abschlag_index && props.rechnung_abschlag_index > 0
          ? `Abschlagsrechnung ${props.rechnung_abschlag_index}`
          : 'Abschlagsrechnung'
        : istRechnung
          ? 'Rechnung'
          : 'Angebot'

  const einl = richTextToSafePdfHtml(props.einleitung?.trim() || '')
  const begr = esc(props.begruessung.trim() || 'Guten Tag,')
  const kiViz =
    props.ki_visualisierungen?.length ? kiVisualisierungPdfHtml(props.ki_visualisierungen) : ''

  const posTables =
    props.pdf_roh_positionen?.length && props.pdf_gewerke?.length
      ? positionenMitFreitextFlatHtml(props.pdf_roh_positionen, props.pdf_gewerke)
      : positionTableHtml(props.positionen)

  const hinweisBlock =
    props.hinweise?.trim()?.length ?? 0
      ? `<p style="margin-top:16px;font-size:8.5pt;color:${TEXT_PRIMARY};line-height:1.55;"><strong>Hinweise:</strong> ${richTextToSafePdfHtml(props.hinweise!.trim())}</p>`
      : ''

  const schlussBlock = istRechnung ? rechnungPdfSchlussHtml(props) : angebotDokumentEndeHtml(props)
  const bankBlock = bankverbindungHtml(props, props.angebotsnr)

  const variantBlock = (() => {
    const vb = props.variant_block
    if (!vb || !vb.positionen.length) return ''
    const rows = vb.positionen.map(positionRowHtml).join('')
    return `
  <h2 style="font-size:13pt;font-weight:700;color:${TEXT_PRIMARY};margin:24px 0 8px;">${esc(vb.titel)}</h2>
  <table>${POSITION_TABLE_HEAD}<tbody>${rows}</tbody></table>
  ${summenBlockHtml(vb.summen)}`
  })()

  const fotosBlock =
    props.dokumentation_bilder && props.dokumentation_bilder.length > 0
      ? projektFotosHtml(props.dokumentation_bilder)
      : ''

  const erstePosUeberschrift =
    props.variant_erste_ueberschrift?.trim()
      ? `<h2 style="font-size:13pt;font-weight:700;color:${TEXT_PRIMARY};margin:18px 0 8px;">${esc(props.variant_erste_ueberschrift.trim())}</h2>`
      : ''

  const kopfBlock = istRechnung
    ? rechnungBriefkopfHtml(props)
    : briefkopfZeileHtml(props, dokumentTitel)

  const body = `
  ${angebotLogoKopfHtml(props)}
  ${kopfBlock}
  ${briefEmpfaengerHtml(props)}
  <p style="margin:0 0 12px;line-height:1.55;font-size:11pt;color:${TEXT_PRIMARY};font-weight:400;">
    ${begr}<br/><br/>
    ${einl}
  </p>
  ${kiViz}
  ${erstePosUeberschrift}
  ${posTables}
  ${fotosBlock}
  ${summenBlockHtml(props.summen, props.kostenaufstellung, props.rechtshinweise)}
  ${variantBlock}
  <div style="margin-top:18px;font-size:10pt;color:${TEXT_PRIMARY};line-height:1.55;">${plainTextToPdfHtml(props.zahlungsbedingungen)}</div>
  ${istRechnung ? bankBlock : ''}
  ${hinweisBlock}
  ${schlussBlock}
  ${!istRechnung ? bankBlock : ''}
  `

  const docTitle = istRechnung ? `Rechnung ${props.angebotsnr}` : `Angebot ${props.angebotsnr}`
  return angebotPdfShell(body, docTitle, pdfFusszeileHtml(props), shellOpts)
}
