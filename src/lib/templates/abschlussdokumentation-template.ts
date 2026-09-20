/**
 * HTML für Abschlussdokumentation-PDF (A4, Bärenwald-Layout wie Angebot/Rechnung).
 */

import { formatEuro } from '@/lib/format/geld-datum'
import { C } from '@/lib/tokens/colors'
import { abnahmePunkteFuerDokument, gruppiereAbnahmePunkte, type AbnahmePunkt, type AbnahmeMangel } from '@/lib/auftraege/abnahme-protokoll-types'
import type { AbnahmeProtokollMeta } from '@/lib/auftraege/abnahme-protokoll-meta'
import { isMangelOffen } from '@/lib/auftraege/abnahme-maengel-helpers'
import { richTextToSafePdfHtml } from '@/lib/rich-text'
import {
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'
import {
  pdfAbsenderFromReportFirm,
  pdfKopfHtml,
  pdfReportShell,
  pdfTitelzeileHtml,
} from '@/lib/pdf/chrome'

const ACCENT = C.greenDark
const TINT = C.greenTint
const TEXT = C.gray900
const MUTED = C.gray500
const BORDER = C.gray300
const GREEN_SUM = C.green

import { ABSCHLUSS_PROTOKOLL_TITEL } from '@/lib/auftraege/abschlussdokumentation-labels'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

export type AbschlussdokuSummen = {
  netto: number
  mwst_prozent: number
  mwst_betrag: number
  brutto: number
}

export type AbschlussdokuHtmlInput = {
  firmen_logo_url?: string | null
  mail_anrede?: AngebotMailAnrede
  begruessung?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_steuer_footer?: string | null
  /** Leistungsumfang / Projekttitel aus Angebot (wie Rechnung). */
  dokumentTitel: string
  erstelltAm: string
  leistungszeitraum_text: string
  summen: AbschlussdokuSummen | null
  kunde_name: string
  kunde_adresse: string
  durchfuehrung_in?: string | null
  positionen: Array<{
    gewerk: string
    leistung: string
    beschreibung?: string | null
    menge?: number | null
    einheit?: string | null
    preis_netto?: number | null
  }>
  abnahmePunkte: AbnahmePunkt[] | null
  abnahmeMaengel?: AbnahmeMangel[] | null
  abnahmeMeta?: AbnahmeProtokollMeta | null
  abnahmeDatum?: string | null
  abnahmeNotizen?: string | null
  abnahmeErgebnisLabel?: string | null
  bautagebuch: Array<{
    datumSort: string
    datumLabel: string
    titel: string
    beschreibung: string | null
  }>
  fotoUrls: Array<{ url: string; caption?: string | null }>
mitBautagebuch: boolean
  mitFotos: boolean
  /** Preise/Summen = Rechnungsoptik. Abschlussbericht: false (Dokumentation). */
  mitPreisen: boolean
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firmennameZeile(p: AbschlussdokuHtmlInput): string {
  const rf = p.firmen_rechtsform?.trim()
  return rf ? `${p.firmenname.trim()} ${rf}` : p.firmenname.trim()
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:700;color:${ACCENT};margin:22px 0 8px;padding-bottom:6px;border-bottom:2px solid ${ACCENT};page-break-after:avoid;">${esc(title)}</h2>`
}

function empfaengerBlock(p: AbschlussdokuHtmlInput): string {
  const ort = p.durchfuehrung_in?.trim()
  const adresse = p.kunde_adresse?.trim() || '—'
  const durchfuehrung = ort
    ? `<div style="text-align:right;font-size:10pt;line-height:1.5;min-width:48mm;max-width:72mm;">
        <div style="font-weight:600;color:${ACCENT};">Ausführungsort</div>
        <div style="margin-top:4px;color:${TEXT};">${esc(ort).replace(/\n/g, '<br/>')}</div>
      </div>`
    : ''
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin:0 0 16px;">
    <div style="min-height:24mm;max-width:92mm;font-size:11pt;line-height:1.5;">
      <div style="font-size:8.5pt;color:${MUTED};margin-bottom:4px;">Auftraggeber</div>
      <div style="font-weight:600;">${esc(p.kunde_name)}</div>
      <div style="margin-top:6px;white-space:pre-line;">${esc(adresse)}</div>
    </div>
    ${durchfuehrung}
  </div>`
}

function summenBlockKompakt(s: AbschlussdokuSummen): string {
  const mwstLabel =
    s.mwst_prozent <= 0
      ? 'Umsatzsteuer'
      : `Umsatzsteuer ${esc(String(s.mwst_prozent))} %`
  return `<div style="margin-top:10px;display:flex;justify-content:flex-end;">
    <div style="width:240px;flex-shrink:0;">
      <table style="width:100%;font-size:8pt;font-weight:400;">
        <tr><td style="padding:2px 4px;">Zwischensumme (netto)</td><td style="padding:2px 4px;text-align:right;">${formatEuro(s.netto)}</td></tr>
        <tr><td style="padding:2px 4px;">${mwstLabel}</td><td style="padding:2px 4px;text-align:right;">${formatEuro(s.mwst_betrag)}</td></tr>
      </table>
      <table style="width:100%;font-size:9pt;font-weight:700;margin-top:4px;border-top:1px solid ${C.gray900};">
        <tr><td style="padding:6px 4px 2px;">Gesamtbetrag</td><td style="padding:6px 4px 2px;text-align:right;color:${GREEN_SUM};">${formatEuro(s.brutto)}</td></tr>
      </table>
    </div>
  </div>`
}

function auftragDetailsKarte(p: AbschlussdokuHtmlInput): string {
  const zeilen: string[] = []

  if (p.mitPreisen && p.summen && p.summen.brutto > 0) {
    zeilen.push(
      `<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid ${BORDER};">
        <div style="font-size:8.5pt;color:${MUTED};margin-bottom:2px;">Gesamtpreis (brutto)</div>
        <div style="font-size:14pt;font-weight:700;color:${ACCENT};">${formatEuro(p.summen.brutto)}</div>
      </div>`
    )
  }

  if (p.leistungszeitraum_text && p.leistungszeitraum_text !== '—') {
    zeilen.push(
      `<div style="margin-bottom:8px;font-size:9.5pt;line-height:1.5;">
        <span style="color:${MUTED};">Leistungszeitraum:</span>
        <span style="font-weight:600;margin-left:6px;">${esc(p.leistungszeitraum_text)}</span>
      </div>`
    )
  }

  if (p.dokumentTitel.trim()) {
    zeilen.push(
      `<div style="font-size:9.5pt;line-height:1.5;">
        <span style="color:${MUTED};">Titel:</span>
        <span style="font-weight:600;margin-left:6px;">${esc(p.dokumentTitel)}</span>
      </div>`
    )
  }

  if (!zeilen.length) return ''

  return `<div style="margin:0 0 18px;padding:12px 14px;background:${TINT};border:1px solid ${ACCENT};border-radius:4px;">
    <div style="font-size:9pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;">Auftragsdetails</div>
    ${zeilen.join('')}
  </div>`
}

function abschlussEinleitungInhalte(p: AbschlussdokuHtmlInput): string {
  const parts = ['die erbrachten Leistungen']
  if (p.mitBautagebuch && p.bautagebuch.length > 0) parts.push(ABSCHLUSS_PROTOKOLL_TITEL)
  if (p.abnahmePunkte && p.abnahmePunkte.length > 0) parts.push('Abnahme')
  else if ((p.abnahmeMaengel && p.abnahmeMaengel.length > 0) || p.abnahmeErgebnisLabel)
    parts.push('Abnahme')
  if (p.mitFotos && p.fotoUrls.length > 0) parts.push('Fotodokumentation')
  if (parts.length === 1) return parts[0]!
  const last = parts.pop()!
  return `${parts.join(', ')} und ${last}`
}

function einleitungHtml(p: AbschlussdokuHtmlInput): string {
  const team = firmennameZeile(p)
  const anrede = p.mail_anrede ?? 'sie'
  const begr = esc(
    p.begruessung?.trim() ||
      (anrede === 'du' ? 'Hallo,' : 'Sehr geehrte Damen und Herren,')
  )
  const inhalte = esc(abschlussEinleitungInhalte(p))

  if (anrede === 'du') {
    return `<div style="margin:0 0 18px;font-size:10.5pt;line-height:1.65;color:${TEXT};">
    <p style="margin:0;">${begr}</p>
    <p style="margin:12px 0 0;">hiermit erhältst du den <strong>Abschlussbericht</strong> zu deinem Projekt <strong>${esc(p.dokumentTitel)}</strong>. Das Bauvorhaben wurde durch ${esc(team)} koordiniert und abgeschlossen.</p>
    <p style="margin:12px 0 0;">Dieses Dokument fasst ${inhalte} zusammen und dient als Nachweis zum Projektabschluss. Die Abrechnung erfolgt gesondert über die Rechnung / Endabrechnung.</p>
  </div>`
  }

  return `<div style="margin:0 0 18px;font-size:10.5pt;line-height:1.65;color:${TEXT};">
    <p style="margin:0;">${begr}</p>
    <p style="margin:12px 0 0;">hiermit erhalten Sie den <strong>Abschlussbericht</strong> zu Ihrem Projekt <strong>${esc(p.dokumentTitel)}</strong>. Das Bauvorhaben wurde durch ${esc(team)} koordiniert und abgeschlossen.</p>
    <p style="margin:12px 0 0;">Dieses Dokument fasst ${inhalte} zusammen und dient als Nachweis zum Projektabschluss. Die Abrechnung erfolgt gesondert über die Rechnung / Endabrechnung.</p>
  </div>`
}

function leistungenTableHtml(p: AbschlussdokuHtmlInput): string {
  if (!p.positionen.length) {
    return `<p style="font-size:9pt;color:${MUTED};">Keine Positionen hinterlegt.</p>`
  }

  const fs = '8pt'
  const pad = '4px 5px'
  const mitPreisen = p.mitPreisen

  const head = mitPreisen
    ? `<thead>
    <tr style="background:${C.gray100};font-size:${fs};color:${TEXT};font-weight:700;">
      <th style="padding:${pad};text-align:left;width:22px;border-bottom:1px solid ${C.gray400};">Pos.</th>
      <th style="padding:${pad};text-align:left;border-bottom:1px solid ${C.gray400};">Leistung</th>
      <th style="padding:${pad};text-align:right;width:40px;border-bottom:1px solid ${C.gray400};">Menge</th>
      <th style="padding:${pad};text-align:left;width:48px;border-bottom:1px solid ${C.gray400};">Einh.</th>
      <th style="padding:${pad};text-align:right;width:56px;border-bottom:1px solid ${C.gray400};">Einzel €</th>
      <th style="padding:${pad};text-align:right;width:60px;border-bottom:1px solid ${C.gray400};">Gesamt €</th>
    </tr>
  </thead>`
    : `<thead>
    <tr style="background:${C.gray100};font-size:${fs};color:${TEXT};font-weight:700;">
      <th style="padding:${pad};text-align:left;width:22px;border-bottom:1px solid ${C.gray400};">Pos.</th>
      <th style="padding:${pad};text-align:left;border-bottom:1px solid ${C.gray400};">Leistung</th>
      <th style="padding:${pad};text-align:right;width:40px;border-bottom:1px solid ${C.gray400};">Menge</th>
      <th style="padding:${pad};text-align:left;width:48px;border-bottom:1px solid ${C.gray400};">Einh.</th>
    </tr>
  </thead>`

  const rows = p.positionen
    .map((pos, i) => {
      const besch = pos.beschreibung?.trim()
      const beschHtml =
        besch && besch !== pos.leistung.trim()
          ? `<div style="font-size:7.5pt;color:${MUTED};margin-top:2px;font-weight:400;">${richTextToSafePdfHtml(besch)}</div>`
          : ''
      const gewerkZeile =
        pos.gewerk && pos.gewerk !== '—'
          ? `<div style="font-size:7.5pt;color:${ACCENT};font-weight:600;margin-bottom:1px;">${esc(pos.gewerk)}</div>`
          : ''
      const menge = pos.menge ?? 1
      const gesamt = pos.preis_netto ?? 0
      const einzel = menge > 0 ? gesamt / menge : gesamt
      if (!mitPreisen) {
        return `<tr>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">${i + 1}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">
          ${gewerkZeile}
          <div style="font-weight:600;">${esc(pos.leistung)}</div>
          ${beschHtml}
        </td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;vertical-align:top;font-size:${fs};">${esc(String(menge))}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">${esc(pos.einheit ?? 'pauschal')}</td>
      </tr>`
      }
      return `<tr>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">${i + 1}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">
          ${gewerkZeile}
          <div style="font-weight:600;">${esc(pos.leistung)}</div>
          ${beschHtml}
        </td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;vertical-align:top;font-size:${fs};">${esc(String(menge))}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">${esc(pos.einheit ?? 'pauschal')}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;vertical-align:top;font-size:${fs};">${formatEuro(einzel)}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;vertical-align:top;font-size:${fs};font-weight:600;">${formatEuro(gesamt)}</td>
      </tr>`
    })
    .join('')

  const summenHtml = mitPreisen && p.summen ? summenBlockKompakt(p.summen) : ''

  return `<table style="width:100%;border-collapse:collapse;font-size:${fs};">${head}<tbody>${rows}</tbody></table>${summenHtml}`
}

function abnahmeHtml(p: AbschlussdokuHtmlInput): string {
  const punkte = p.abnahmePunkte ?? []
  const fuerPdf = abnahmePunkteFuerDokument(punkte)
  const parts: string[] = []

  if (p.abnahmeDatum || p.abnahmeErgebnisLabel) {
    parts.push(`<p style="margin:0 0 10px;font-size:9pt;line-height:1.5;color:${TEXT};">
      ${p.abnahmeDatum ? `<span style="color:${MUTED};">Datum:</span> <strong>${esc(p.abnahmeDatum)}</strong>` : ''}
      ${p.abnahmeDatum && p.abnahmeErgebnisLabel ? ' · ' : ''}
      ${p.abnahmeErgebnisLabel ? `<span style="color:${MUTED};">Ergebnis:</span> <strong>${esc(p.abnahmeErgebnisLabel)}</strong>` : ''}
    </p>`)
  }

  if (!fuerPdf.length) {
    parts.push(
      `<p style="margin:0;font-size:9pt;color:${MUTED};">Keine Leistungen für die Abnahme ausgewählt.</p>`
    )
  } else {
    parts.push(
      gruppiereAbnahmePunkte(fuerPdf)
        .map((block) => {
          const leistungen = block.leistungen
            .map((l) => {
              const bullets = l.punkte
                .map((pt) => {
                  const mangel =
                    pt.status === 'mangel'
                      ? `<span style="display:inline-block;min-width:56px;padding:2px 6px;border-radius:999px;font-size:7pt;font-weight:700;background:${C.redBg};color:${C.redTx};margin-right:6px;">Mangel</span>`
                      : ''
                  const notiz = pt.notiz?.trim()
                  const name = l.leistung_name.trim()
                  const besch = pt.beschreibung?.trim()
                  const line =
                    besch && besch !== name ? besch : name || besch || 'Leistung'
                  return `<li style="margin:0 0 4px;font-size:8.5pt;list-style:none;">
                ${mangel}${esc(line)}
                ${notiz ? `<span style="color:${MUTED};"> — ${esc(notiz)}</span>` : ''}
              </li>`
                })
                .join('')
              return `<div style="margin:0 0 8px;">
            <p style="margin:0 0 4px;font-size:8.5pt;font-weight:600;color:${TEXT};">${esc(l.leistung_name || 'Leistung')}</p>
            <ul style="margin:0;padding:0;">${bullets}</ul>
          </div>`
            })
            .join('')
          return `<div style="margin-bottom:12px;">
        <p style="margin:0 0 6px;font-size:9pt;font-weight:700;color:${ACCENT};">${esc(block.gewerk)}</p>
        ${leistungen}
      </div>`
        })
        .join('')
    )
  }

  const offenMaengel = (p.abnahmeMaengel ?? []).filter(isMangelOffen)
  if (offenMaengel.length) {
    parts.push(`<div style="margin-top:12px;">
      <p style="margin:0 0 6px;font-size:9pt;font-weight:700;color:${ACCENT};">Festgestellte Mängel</p>
      <ul style="margin:0;padding-left:18px;font-size:8.5pt;line-height:1.45;">
        ${offenMaengel
          .map((m) => {
            const titel = (m.titel ?? '').trim()
            const detail = (m.beschreibung ?? '').trim()
            const head = titel || detail || 'Mangel'
            const sub = titel && detail && detail !== titel ? detail : ''
            return `<li style="margin:0 0 6px;">
              <strong>${esc(head)}</strong>
              ${m.frist ? ` <span style="color:${C.redTx};">(bis ${esc(m.frist.slice(0, 10))})</span>` : ''}
              ${sub ? `<div style="color:${MUTED};font-size:8pt;">${esc(sub)}</div>` : ''}
            </li>`
          })
          .join('')}
      </ul>
    </div>`)
  }

  const unterzeichner = [
    p.abnahmeMeta?.hw_unterschrift_name?.trim() || p.abnahmeMeta?.vertreter_an?.trim(),
    p.abnahmeMeta?.kunde_unterschrift_name?.trim() ||
      p.abnahmeMeta?.ansprechpartner_kunde?.trim(),
  ].filter(Boolean)
  if (unterzeichner.length) {
    parts.push(`<p style="margin:12px 0 0;font-size:8.5pt;color:${MUTED};">
      Unterzeichnet: ${esc(unterzeichner.join(' · '))}
    </p>`)
  }

  if (p.abnahmeNotizen?.trim()) {
    parts.push(`<p style="margin:10px 0 0;font-size:8.5pt;color:${TEXT};">
      <span style="color:${MUTED};">Anmerkungen:</span> ${esc(p.abnahmeNotizen.trim())}
    </p>`)
  }

  return parts.join('')
}

function bautagebuchUebersichtHtml(eintraege: AbschlussdokuHtmlInput['bautagebuch']): string {
  const byDate = new Map<string, AbschlussdokuHtmlInput['bautagebuch']>()
  for (const e of eintraege) {
    const key = e.datumSort || e.datumLabel
    const list = byDate.get(key) ?? []
    list.push(e)
    byDate.set(key, list)
  }

  const keys = Array.from(byDate.keys()).sort()
  const groups = keys
    .map((key) => {
      const items = byDate.get(key)!
      const dateLabel = items[0]?.datumLabel ?? key
      const entries = items
        .map((e) => {
          const body = e.beschreibung
            ? `<div style="font-size:8.5pt;line-height:1.55;color:${TEXT};margin-top:4px;">${richTextToSafePdfHtml(e.beschreibung)}</div>`
            : ''
          return `<div style="margin-bottom:10px;page-break-inside:avoid;">
            <div style="font-size:9pt;font-weight:700;color:${TEXT};">${esc(e.titel)}</div>
            ${body}
          </div>`
        })
        .join('')
      return `<div style="margin-bottom:14px;page-break-inside:avoid;">
        <div style="font-size:9pt;font-weight:700;color:${ACCENT};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid ${BORDER};">${esc(dateLabel)}</div>
        ${entries}
      </div>`
    })
    .join('')

  return `<div style="padding:12px 14px;border:1px solid ${BORDER};border-radius:4px;background:${C.gray50};page-break-inside:avoid;">${groups}</div>`
}

function fotosHtml(bilder: AbschlussdokuHtmlInput['fotoUrls']): string {
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    ${bilder
      .slice(0, 24)
      .map((b, i) => {
        const cap = b.caption?.trim()
        return `<figure style="margin:0;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:${C.white};page-break-inside:avoid;">
          <img alt="" src="${esc(b.url)}" style="width:100%;height:140px;object-fit:cover;display:block;"/>
          <figcaption style="padding:8px 10px;font-size:8.5pt;line-height:1.45;color:${TEXT};background:${TINT};">
            ${cap ? esc(cap) : `Foto ${i + 1}`}
          </figcaption>
        </figure>`
      })
      .join('')}
  </div>`
}

function abschlussHtml(p: AbschlussdokuHtmlInput): string {
  const team = firmennameZeile(p)
  const anrede = p.mail_anrede ?? 'sie'
  const bestaetigung =
    anrede === 'du'
      ? 'Mit diesem Abschlussbericht bestätigen wir die ordnungsgemäße Durchführung und Abwicklung des genannten Auftrags. Für Rückfragen stehen wir dir jederzeit zur Verfügung.'
      : 'Mit diesem Abschlussbericht bestätigen wir die ordnungsgemäße Durchführung und Abwicklung des genannten Auftrags. Für Rückfragen stehen wir Ihnen jederzeit zur Verfügung.'
  const gruss = anrede === 'du' ? 'Viele Grüße' : 'Mit freundlichen Grüßen'
  return `<div class="avoid-fuss-overlap" style="margin-top:24px;font-size:10.5pt;line-height:1.6;color:${TEXT};page-break-inside:avoid;">
    <p style="margin:0 0 12px;">${bestaetigung}</p>
    <p style="margin:0 0 4px;">${gruss}</p>
    <p style="margin:0;font-weight:700;color:${ACCENT};">${esc(team)}</p>
  </div>`
}

function footerInputFromAbschluss(p: AbschlussdokuHtmlInput): AngebotHtmlInput {
  return {
    firmenname: p.firmenname,
    firmen_rechtsform: p.firmen_rechtsform,
    firmen_adresse: p.firmen_adresse,
    firmen_kontakt: p.firmen_kontakt,
    firmen_steuer_footer: p.firmen_steuer_footer,
    angebotsnr: '—',
    kundennr: '—',
    datum: p.erstelltAm,
    gueltig_bis: '—',
    kunde_name: p.kunde_name,
    kunde_adresse: p.kunde_adresse,
    leistungsumfang: p.dokumentTitel,
    begruessung: '',
    einleitung: '',
    zahlungsbedingungen: '',
    positionen: [],
    summen: { netto: 0, mwst_prozent: 19, mwst_betrag: 0, brutto: 0 },
  }
}

export function buildAbschlussdokumentationPdfFooterTemplate(p: AbschlussdokuHtmlInput): string {
  return buildAngebotPdfFooterTemplate(footerInputFromAbschluss(p), {
    seitenZusatz: 'Abschlussbericht',
  })
}

export function buildAbschlussdokumentationHtml(p: AbschlussdokuHtmlInput): string {
  const sections: string[] = []

  sections.push(`
    ${pdfKopfHtml({
      variant: 'bw-kunde',
      absender: pdfAbsenderFromReportFirm(p),
    })}
    ${pdfTitelzeileHtml({
      dokumentTyp: 'Abschlussbericht',
      objektOderAdresse: p.dokumentTitel,
      datum: p.erstelltAm,
      accent: ACCENT,
    })}
    ${empfaengerBlock(p)}
    ${auftragDetailsKarte(p)}
    ${einleitungHtml(p)}
  `)

  if (p.mitBautagebuch && p.bautagebuch.length > 0) {
    sections.push(
      `${sectionHeading(ABSCHLUSS_PROTOKOLL_TITEL)}${bautagebuchUebersichtHtml(p.bautagebuch)}`
    )
  }

  sections.push(`${sectionHeading('Leistungsübersicht')}${leistungenTableHtml(p)}`)

  if (p.abnahmePunkte && p.abnahmePunkte.length > 0) {
    sections.push(`${sectionHeading('Abnahmeprotokoll')}${abnahmeHtml(p)}`)
  } else if (
    (p.abnahmeMaengel && p.abnahmeMaengel.length > 0) ||
    p.abnahmeErgebnisLabel
  ) {
    sections.push(`${sectionHeading('Abnahmeprotokoll')}${abnahmeHtml(p)}`)
  }

  if (p.mitFotos && p.fotoUrls.length > 0) {
    sections.push(`${sectionHeading('Fotodokumentation')}${fotosHtml(p.fotoUrls)}`)
  }

  sections.push(abschlussHtml(p))

  return pdfReportShell({
    title: `Abschlussbericht — ${p.dokumentTitel}`,
    bodyHtml: sections.join('\n'),
  })
}
