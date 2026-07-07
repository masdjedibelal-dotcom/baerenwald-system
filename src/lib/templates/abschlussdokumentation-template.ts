/**
 * HTML für Abschlussdokumentation-PDF (A4, Bärenwald-Layout wie Angebot/Rechnung).
 */

import { gruppiereAbnahmePunkte, type AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import { richTextToSafePdfHtml } from '@/lib/rich-text'
import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'

const ACCENT = '#1A3D2B'
const TINT = '#F3F7F4'
const TEXT = '#111111'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'
const GREEN_SUM = '#2E7D52'

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
  bautagebuch: Array<{
    datumSort: string
    datumLabel: string
    titel: string
    beschreibung: string | null
  }>
  fotoUrls: Array<{ url: string; caption?: string | null }>
  mitBautagebuch: boolean
  mitFotos: boolean
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function euro(n: number): string {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function firmennameZeile(p: AbschlussdokuHtmlInput): string {
  const rf = p.firmen_rechtsform?.trim()
  return rf ? `${p.firmenname.trim()} ${rf}` : p.firmenname.trim()
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:11pt;font-weight:700;color:${ACCENT};margin:22px 0 8px;padding-bottom:6px;border-bottom:2px solid ${ACCENT};page-break-after:avoid;">${esc(title)}</h2>`
}

function logoKopf(p: AbschlussdokuHtmlInput): string {
  const src = p.firmen_logo_url?.trim()
  if (!src || /^file:/i.test(src)) return ''
  if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) return ''
  const safeSrc = src.replace(/"/g, '&quot;')
  return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${ACCENT};">
    <img src="${safeSrc}" alt="${esc(firmennameZeile(p))}" style="height:72px;width:auto;max-width:300px;object-fit:contain;display:block;" />
  </div>`
}

function briefAbsender(p: AbschlussdokuHtmlInput): string {
  const kontakt = p.firmen_kontakt
    .split(' · ')
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => esc(z))
  const steuer = (p.firmen_steuer_footer ?? '')
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => esc(z))
  const zeilen = [
    `<strong>${esc(firmennameZeile(p))}</strong>`,
    ...esc(p.firmen_adresse)
      .replace(/\n/g, '<br/>')
      .split('<br/>')
      .filter(Boolean),
    ...kontakt,
    ...steuer,
  ]
  return `<div style="font-size:8pt;line-height:1.45;color:${TEXT};font-weight:400;text-align:right;">
    ${zeilen.join('<br/>')}
  </div>`
}

function metaZeile(label: string, value: string): string {
  return `<div style="text-align:right;font-size:8.5pt;line-height:1.55;white-space:nowrap;">
    <span style="color:${TEXT};">${esc(label)}</span>
    <span style="font-weight:400;margin-left:8px;">${esc(value)}</span>
  </div>`
}

function briefkopf(p: AbschlussdokuHtmlInput): string {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:18px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:9pt;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Projektabschluss</div>
      <h1 style="font-size:17pt;font-weight:700;margin:0;color:${ACCENT};line-height:1.25;">Abschlussdokumentation</h1>
      <p style="margin:8px 0 0;font-size:11pt;color:${TEXT};line-height:1.45;font-weight:600;">${esc(p.dokumentTitel)}</p>
    </div>
    <div style="flex:0 0 auto;text-align:right;">
      ${briefAbsender(p)}
      <div style="margin-top:10px;min-width:180px;">
        ${metaZeile('Erstellt am:', p.erstelltAm)}
      </div>
    </div>
  </div>`
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
        <tr><td style="padding:2px 4px;">Zwischensumme (netto)</td><td style="padding:2px 4px;text-align:right;">${euro(s.netto)}</td></tr>
        <tr><td style="padding:2px 4px;">${mwstLabel}</td><td style="padding:2px 4px;text-align:right;">${euro(s.mwst_betrag)}</td></tr>
      </table>
      <table style="width:100%;font-size:9pt;font-weight:700;margin-top:4px;border-top:1px solid #111;">
        <tr><td style="padding:6px 4px 2px;">Gesamtbetrag</td><td style="padding:6px 4px 2px;text-align:right;color:${GREEN_SUM};">${euro(s.brutto)}</td></tr>
      </table>
    </div>
  </div>`
}

function auftragDetailsKarte(p: AbschlussdokuHtmlInput): string {
  const zeilen: string[] = []

  if (p.summen && p.summen.brutto > 0) {
    zeilen.push(
      `<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid ${BORDER};">
        <div style="font-size:8.5pt;color:${MUTED};margin-bottom:2px;">Gesamtpreis (brutto)</div>
        <div style="font-size:14pt;font-weight:700;color:${ACCENT};">${euro(p.summen.brutto)}</div>
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
    <p style="margin:12px 0 0;">hiermit erhältst du die <strong>Abschlussdokumentation</strong> zu deinem Projekt <strong>${esc(p.dokumentTitel)}</strong>. Das Bauvorhaben wurde durch ${esc(team)} koordiniert und abgeschlossen.</p>
    <p style="margin:12px 0 0;">Dieses Dokument fasst ${inhalte} zusammen und dient als Nachweis zum Projektabschluss.</p>
  </div>`
  }

  return `<div style="margin:0 0 18px;font-size:10.5pt;line-height:1.65;color:${TEXT};">
    <p style="margin:0;">${begr}</p>
    <p style="margin:12px 0 0;">hiermit erhalten Sie die <strong>Abschlussdokumentation</strong> zu Ihrem Projekt <strong>${esc(p.dokumentTitel)}</strong>. Das Bauvorhaben wurde durch ${esc(team)} koordiniert und abgeschlossen.</p>
    <p style="margin:12px 0 0;">Dieses Dokument fasst ${inhalte} zusammen und dient als Nachweis zum Projektabschluss.</p>
  </div>`
}

function leistungenTableHtml(p: AbschlussdokuHtmlInput): string {
  if (!p.positionen.length) {
    return `<p style="font-size:9pt;color:${MUTED};">Keine Positionen hinterlegt.</p>`
  }

  const fs = '8pt'
  const pad = '4px 5px'

  const head = `<thead>
    <tr style="background:#f3f4f6;font-size:${fs};color:${TEXT};font-weight:700;">
      <th style="padding:${pad};text-align:left;width:22px;border-bottom:1px solid #9CA3AF;">Pos.</th>
      <th style="padding:${pad};text-align:left;border-bottom:1px solid #9CA3AF;">Leistung</th>
      <th style="padding:${pad};text-align:right;width:40px;border-bottom:1px solid #9CA3AF;">Menge</th>
      <th style="padding:${pad};text-align:left;width:48px;border-bottom:1px solid #9CA3AF;">Einh.</th>
      <th style="padding:${pad};text-align:right;width:56px;border-bottom:1px solid #9CA3AF;">Einzel €</th>
      <th style="padding:${pad};text-align:right;width:60px;border-bottom:1px solid #9CA3AF;">Gesamt €</th>
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
      return `<tr>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">${i + 1}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">
          ${gewerkZeile}
          <div style="font-weight:600;">${esc(pos.leistung)}</div>
          ${beschHtml}
        </td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;vertical-align:top;font-size:${fs};">${esc(String(menge))}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};vertical-align:top;font-size:${fs};">${esc(pos.einheit ?? 'pauschal')}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;vertical-align:top;font-size:${fs};">${euro(einzel)}</td>
        <td style="padding:${pad};border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;vertical-align:top;font-size:${fs};font-weight:600;">${euro(gesamt)}</td>
      </tr>`
    })
    .join('')

  const summenHtml = p.summen ? summenBlockKompakt(p.summen) : ''

  return `<table style="width:100%;border-collapse:collapse;font-size:${fs};">${head}<tbody>${rows}</tbody></table>${summenHtml}`
}

function abnahmeStatusLabel(status: AbnahmePunkt['status']): { label: string; color: string; bg: string } {
  if (status === 'ok') return { label: 'Abgenommen', color: '#166534', bg: '#DCFCE7' }
  if (status === 'mangel') return { label: 'Mangel', color: '#991B1B', bg: '#FEE2E2' }
  return { label: 'Offen', color: '#4B5563', bg: '#F3F4F6' }
}

function abnahmeHtml(punkte: AbnahmePunkt[]): string {
  return gruppiereAbnahmePunkte(punkte)
    .map((block) => {
      const leistungen = block.leistungen
        .map((l) => {
          const bullets = l.punkte
            .map((pt) => {
              const st = abnahmeStatusLabel(pt.status)
              const notiz = pt.notiz?.trim()
              return `<li style="margin:0 0 4px;font-size:8.5pt;list-style:none;">
                <span style="display:inline-block;min-width:72px;padding:2px 6px;border-radius:999px;font-size:7pt;font-weight:700;background:${st.bg};color:${st.color};">${st.label}</span>
                ${esc(pt.beschreibung)}
                ${notiz ? `<span style="color:${MUTED};"> — ${esc(notiz)}</span>` : ''}
              </li>`
            })
            .join('')
          return `<div style="margin:0 0 8px;">
            <p style="margin:0 0 4px;font-size:8.5pt;font-weight:600;color:${TEXT};">${esc(l.leistung_name)}</p>
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

  return `<div style="padding:12px 14px;border:1px solid ${BORDER};border-radius:4px;background:#F9FAFB;page-break-inside:avoid;">${groups}</div>`
}

function fotosHtml(bilder: AbschlussdokuHtmlInput['fotoUrls']): string {
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    ${bilder
      .slice(0, 16)
      .map((b, i) => {
        const cap = b.caption?.trim()
        return `<figure style="margin:0;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:#fff;page-break-inside:avoid;">
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
      ? 'Mit dieser Abschlussdokumentation bestätigen wir die ordnungsgemäße Durchführung und Abwicklung des genannten Auftrags. Für Rückfragen stehen wir dir jederzeit zur Verfügung.'
      : 'Mit dieser Abschlussdokumentation bestätigen wir die ordnungsgemäße Durchführung und Abwicklung des genannten Auftrags. Für Rückfragen stehen wir Ihnen jederzeit zur Verfügung.'
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

function pdfShell(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: ${TEXT};
    font-size: 11pt;
    font-weight: 400;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  .page { padding: 0 4mm; max-width: 210mm; margin: 0 auto; }
  .avoid-fuss-overlap { break-inside: avoid-page; page-break-inside: avoid; }
</style>
</head>
<body>
<div class="page">${body}</div>
</body>
</html>`
}

export function buildAbschlussdokumentationPdfFooterTemplate(p: AbschlussdokuHtmlInput): string {
  return buildAngebotPdfFooterTemplate(footerInputFromAbschluss(p))
}

export function buildAbschlussdokumentationHtml(p: AbschlussdokuHtmlInput): string {
  const sections: string[] = []

  sections.push(`
    ${logoKopf(p)}
    ${briefkopf(p)}
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
    sections.push(`${sectionHeading('Abnahmeprotokoll')}${abnahmeHtml(p.abnahmePunkte)}`)
  }

  if (p.mitFotos && p.fotoUrls.length > 0) {
    sections.push(`${sectionHeading('Fotodokumentation')}${fotosHtml(p.fotoUrls)}`)
  }

  sections.push(abschlussHtml(p))

  return pdfShell(sections.join('\n'), `Abschlussdokumentation — ${p.dokumentTitel}`)
}
