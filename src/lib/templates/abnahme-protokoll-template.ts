/**
 * HTML für Abnahmeprotokoll-PDF — Layout angelehnt an Kunden-Muster
 * (ohne technische Schnittzeichnung).
 */

import type { AbnahmeGewerkBlock, AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import { notizenFuerLeistung } from '@/lib/auftraege/abnahme-protokoll-types'
import {
  ABNAHME_ERGEBNIS_LABEL,
  type AbnahmeErgebnis,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  ANGEBOT_PDF_BOTTOM_MARGIN_MM,
  angebotLogoKopfHtml,
  buildAngebotPdfFooterTemplate,
  type AngebotHtmlInput,
} from '@/lib/templates/angebot-template'

const ACCENT = '#1A3D2B'
const TEXT = '#111111'
const MUTED = '#6B7280'
const BORDER = '#D1D5DB'
const SOFT = '#F3F4F6'
const GREEN_SOFT = '#E8F5EE'
const WARN_SOFT = '#FEF9C3'

export type AbnahmeProtokollHtmlInput = {
  firmen_logo_url?: string | null
  firmenname: string
  firmen_rechtsform?: string | null
  firmen_adresse: string
  firmen_kontakt: string
  firmen_telefon?: string | null
  firmen_email?: string | null
  firmen_website?: string | null
  firmen_steuer_footer?: string | null
  auftragsNr: string
  projektTitel: string
  abnahmeDatum: string
  kunde_name: string
  kunde_adresse: string
  gewerke: AbnahmeGewerkBlock[]
  maengel: AbnahmeMangel[]
  notizen: string | null
  meta: AbnahmeProtokollMeta
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function footerInputFromAbnahme(p: AbnahmeProtokollHtmlInput): AngebotHtmlInput {
  return {
    firmenname: p.firmenname,
    firmen_rechtsform: p.firmen_rechtsform,
    firmen_adresse: p.firmen_adresse,
    firmen_kontakt: p.firmen_kontakt,
    firmen_steuer_footer: p.firmen_steuer_footer,
    firmen_logo_url: p.firmen_logo_url,
    geschaeftsfuehrer: null,
    kunde_name: p.kunde_name,
    kunde_adresse: p.kunde_adresse,
    kundennr: '',
    angebotsnr: p.auftragsNr,
    datum: p.abnahmeDatum,
    gueltig_bis: '',
    leistungsumfang: p.meta.projektbezeichnung || p.projektTitel,
    begruessung: '',
    einleitung: '',
    zahlungsbedingungen: '',
    positionen: [],
    summen: { netto: 0, mwst_prozent: 0, mwst_betrag: 0, brutto: 0 },
    schlusstext: '',
    hinweise: '',
  }
}

function sectionHeading(n: string, title: string): string {
  return `<h2 style="font-size:10.5pt;font-weight:700;color:${ACCENT};margin:16px 0 8px;padding-bottom:5px;border-bottom:2px solid ${ACCENT};page-break-after:avoid;">
    <span style="margin-right:6px;">${esc(n)}.</span>${esc(title)}
  </h2>`
}

function metaBarHtml(p: AbnahmeProtokollHtmlInput): string {
  const uhr = p.meta.uebergabe_uhrzeit?.trim()
    ? (p.meta.uebergabe_uhrzeit.includes('Uhr')
        ? p.meta.uebergabe_uhrzeit
        : `${p.meta.uebergabe_uhrzeit} Uhr`)
    : '—'
  const ort = p.meta.uebergabe_ort?.trim() || '—'
  const cell = (label: string, value: string) =>
    `<div style="flex:1;min-width:0;padding:8px 10px;">
      <div style="font-size:7.5pt;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;">${esc(label)}</div>
      <div style="font-size:9.5pt;font-weight:600;color:${TEXT};">${esc(value)}</div>
    </div>`
  return `<div style="display:flex;background:${SOFT};border-radius:4px;margin:0 0 14px;border:1px solid ${BORDER};page-break-inside:avoid;">
    ${cell('Übergabedatum', p.abnahmeDatum)}
    <div style="width:1px;background:${BORDER};"></div>
    ${cell('Übergabe Uhrzeit', uhr)}
    <div style="width:1px;background:${BORDER};"></div>
    ${cell('Übergabe Ort', ort)}
  </div>`
}

function partyBox(
  title: string,
  rows: { label: string; value: string }[]
): string {
  const body = rows
    .filter((r) => r.value.trim())
    .map(
      (r) =>
        `<tr>
          <td style="padding:2px 8px 2px 0;font-size:8pt;color:${MUTED};vertical-align:top;white-space:nowrap;">${esc(r.label)}</td>
          <td style="padding:2px 0;font-size:9pt;color:${TEXT};vertical-align:top;">${esc(r.value)}</td>
        </tr>`
    )
    .join('')
  return `<div style="border:1px solid ${BORDER};border-radius:4px;padding:10px 12px;page-break-inside:avoid;">
    <div style="font-size:8pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">${esc(title)}</div>
    <table style="width:100%;border-collapse:collapse;">${body || `<tr><td style="font-size:9pt;color:${MUTED};">—</td></tr>`}</table>
  </div>`
}

function fotosHtml(urls: string[], captions: string[] = []): string {
  if (!urls.length) return ''
  const imgs = urls
    .slice(0, 4)
    .map((u, i) => {
      const cap = (captions[i] ?? '').trim()
      return `<div style="margin:0 0 6px;border:1px solid ${BORDER};border-radius:3px;overflow:hidden;page-break-inside:avoid;">
          <img src="${esc(u)}" alt="" style="display:block;width:100%;height:72px;object-fit:cover;" />
          ${
            cap
              ? `<div style="padding:4px 6px;font-size:7pt;color:${MUTED};line-height:1.3;">${esc(cap)}</div>`
              : ''
          }
        </div>`
    })
    .join('')
  return `<div style="border:1px solid ${BORDER};border-radius:4px;padding:8px;page-break-inside:avoid;">
    <div style="font-size:8pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Örtliche Situation</div>
    ${imgs}
  </div>`
}

function partiesRowHtml(p: AbnahmeProtokollHtmlInput): string {
  const an = partyBox('Auftragnehmer', [
    { label: 'Firma', value: p.firmenname },
    { label: 'Adresse', value: p.firmen_adresse.replace(/\n/g, ', ') },
    { label: 'Vertreten durch', value: p.meta.vertreter_an },
    { label: 'Telefon', value: p.firmen_telefon ?? '' },
    { label: 'E-Mail', value: p.firmen_email ?? '' },
  ])
  const ag = partyBox('Auftraggeber / Kunde', [
    { label: 'Name', value: p.kunde_name },
    { label: 'Adresse', value: p.kunde_adresse.replace(/\n/g, ', ') },
    { label: 'Ansprechpartner', value: p.meta.ansprechpartner_kunde },
    { label: 'Anwesend bei Übergabe', value: p.meta.anwesend_uebergabe },
  ])
  const fotos = fotosHtml(p.meta.uebergabe_foto_urls, p.meta.uebergabe_foto_captions)
  if (fotos) {
    return `<div style="display:flex;gap:10px;margin:0 0 14px;align-items:stretch;">
      <div style="flex:1.1;min-width:0;">${an}<div style="height:8px;"></div>${ag}</div>
      <div style="flex:0.7;min-width:0;">${fotos}</div>
    </div>`
  }
  return `<div style="display:flex;gap:10px;margin:0 0 14px;">
    <div style="flex:1;">${an}</div>
    <div style="flex:1;">${ag}</div>
  </div>`
}

function bauvorhabenHtml(p: AbnahmeProtokollHtmlInput): string {
  const bez = p.meta.projektbezeichnung?.trim() || p.projektTitel
  const adr = p.meta.projektadresse?.trim() || p.kunde_adresse.replace(/\n/g, ', ')
  const umfang = p.meta.leistungsumfang_kurz?.trim() || '—'
  const row = (l: string, v: string) =>
    `<tr>
      <td style="padding:3px 10px 3px 0;font-size:8.5pt;color:${MUTED};vertical-align:top;width:28%;">${esc(l)}</td>
      <td style="padding:3px 0;font-size:9pt;color:${TEXT};vertical-align:top;white-space:pre-wrap;">${esc(v)}</td>
    </tr>`
  return `${sectionHeading('1', 'Bauvorhaben')}
    <table style="width:100%;border-collapse:collapse;margin:0 0 4px;">
      ${row('Projektbezeichnung', bez)}
      ${row('Projektadresse', adr)}
      ${row('Leistungsumfang', umfang)}
      ${row('Auftrag', p.auftragsNr)}
    </table>`
}

function checkOkHtml(): string {
  // SVG statt Unicode ✓ — Chromium-PDF rendert Häkchen-Glyphen oft nicht.
  return `<span style="display:inline-block;width:14px;height:14px;flex-shrink:0;margin-top:1px;line-height:0;vertical-align:top;" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="${ACCENT}"/><path d="M3.9 7.15l2.05 2.05L10.2 4.9" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
}

function leistungenHtml(gewerke: AbnahmeGewerkBlock[]): string {
  if (!gewerke.length) {
    return `${sectionHeading('2', 'Ausgeführte Leistungen')}<p style="font-size:9pt;color:${MUTED};">Keine Leistungen ausgewählt.</p>`
  }
  const blocks = gewerke
    .map((g) => {
      const items = g.leistungen
        .map((l) => {
          const titel =
            l.leistung_name.trim() ||
            l.punkte[0]?.beschreibung?.trim() ||
            'Leistung'
          const notes = notizenFuerLeistung(l.punkte)
            .map((n) => n.trim())
            .filter(Boolean)
          // Beschreibung: Notiz, sonst Bullet-Texte die ≠ Titel
          const descParts = notes.length
            ? notes
            : l.punkte
                .map((p: AbnahmePunkt) => p.beschreibung?.trim())
                .filter((t): t is string => Boolean(t) && t !== titel)
          const desc = descParts.join(' · ')
          return `<li style="margin:0 0 10px;list-style:none;page-break-inside:avoid;">
              <table style="width:100%;border-collapse:collapse;"><tr>
                <td style="width:18px;vertical-align:top;padding:2px 0 0;line-height:0;">${checkOkHtml()}</td>
                <td style="vertical-align:top;padding:0 0 0 6px;">
                  <div style="font-size:9.5pt;font-weight:700;line-height:1.35;color:${TEXT};">${esc(titel)}</div>
                  ${
                    desc
                      ? `<div style="margin:3px 0 0;font-size:8pt;font-weight:400;line-height:1.4;color:${MUTED};">${esc(desc)}</div>`
                      : ''
                  }
                </td>
              </tr></table>
            </li>`
        })
        .join('')
      const showGewerk = g.gewerk.trim() && g.gewerk !== 'Ohne Gewerk'
      return `<div style="margin:0 0 10px;page-break-inside:avoid;">
        ${
          showGewerk
            ? `<p style="margin:0 0 6px;font-size:9pt;font-weight:700;color:${TEXT};">${esc(g.gewerk)}</p>`
            : ''
        }
        <ul style="margin:0;padding:0;">${items}</ul>
      </div>`
    })
    .join('')
  return `${sectionHeading('2', 'Ausgeführte Leistungen')}
    <p style="margin:0 0 8px;font-size:8pt;color:${MUTED};">Alle unten genannten Leistungen wurden nach den anerkannten Regeln der Technik ausgeführt.</p>
    ${blocks}`
}

function ergebnisHtml(ergebnis: AbnahmeErgebnis, datum: string): string {
  const label = ABNAHME_ERGEBNIS_LABEL[ergebnis]
  const bg = ergebnis === 'verweigert' ? '#FEE2E2' : ergebnis === 'mit_vorbehalt' ? WARN_SOFT : GREEN_SOFT
  const border = ergebnis === 'verweigert' ? '#DC2626' : ACCENT
  return `${sectionHeading('3', 'Abnahmeergebnis')}
    <p style="margin:0 0 10px;font-size:9pt;line-height:1.5;color:${TEXT};">
      Die Leistungen wurden am ${esc(datum)} gemeinsam vor Ort besichtigt und geprüft.
    </p>
    <div style="display:flex;align-items:center;gap:12px;background:${bg};border:1.5px solid ${border};border-radius:6px;padding:12px 14px;page-break-inside:avoid;">
      <span style="display:inline-block;width:22px;height:22px;line-height:0;flex-shrink:0;" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6.2" fill="none" stroke="${border}" stroke-width="1.4"/><path d="M3.9 7.15l2.05 2.05L10.2 4.9" fill="none" stroke="${border}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span style="font-size:11pt;font-weight:700;color:${ACCENT};">${esc(label)}</span>
    </div>`
}

function isMangelOffenPdf(m: AbnahmeMangel): boolean {
  const s = m.status ?? 'offen'
  return s === 'offen' || s === 'in_bearbeitung'
}

function hinweiseHtml(p: AbnahmeProtokollHtmlInput): string {
  const offen = p.maengel.filter(isMangelOffenPdf)
  const sonst = p.meta.hinweis_sonstiges?.trim()
  const notiz = p.notizen?.trim()
  const fristGlobal = p.meta.maengel_beseitigung_spaetestens?.trim()
  let body = ''
  if (!offen.length && !sonst && !notiz) {
    body = `<p style="margin:0;font-size:9pt;color:${TEXT};">Es wurden keine Mängel festgestellt.</p>`
  } else {
    if (offen.length) {
      body += `<ul style="margin:0 0 8px;padding-left:18px;font-size:9pt;line-height:1.45;">
        ${offen
          .map((m) => {
            const titel = (m.titel ?? '').trim()
            const detail = (m.beschreibung ?? '').trim()
            const head = titel || detail
            const sub = titel && detail && detail !== titel ? detail : ''
            return `<li style="margin:0 0 8px;">
              <div style="font-weight:700;color:${TEXT};">${esc(head)}${
                m.frist
                  ? ` <span style="font-weight:400;color:#991B1B;">(Beseitigung bis: ${esc(m.frist.slice(0, 10))})</span>`
                  : ''
              }</div>
              ${
                sub
                  ? `<div style="margin:2px 0 0;font-size:8pt;font-weight:400;color:${MUTED};">${esc(sub)}</div>`
                  : ''
              }
            </li>`
          })
          .join('')}
      </ul>`
    } else {
      body += `<p style="margin:0 0 8px;font-size:9pt;color:${TEXT};">Es wurden keine Mängel festgestellt.</p>`
    }
    if (fristGlobal) {
      body += `<p style="margin:0 0 8px;font-size:9pt;color:#991B1B;"><strong>Mängelbeseitigung:</strong> ${esc(fristGlobal)}</p>`
    }
    if (sonst) {
      body += `<div style="background:${SOFT};border-left:3px solid ${ACCENT};padding:8px 10px;margin:8px 0 0;font-size:8.5pt;line-height:1.45;color:${TEXT};white-space:pre-wrap;">${esc(sonst)}</div>`
    }
    if (notiz) {
      body += `<p style="margin:8px 0 0;font-size:8.5pt;color:${MUTED};white-space:pre-wrap;">${esc(notiz)}</p>`
    }
  }
  return `${sectionHeading('4', 'Festgestellte Hinweise')}
    <div style="border:1px solid ${BORDER};border-radius:4px;padding:10px 12px;page-break-inside:avoid;">${body}</div>`
}

function rechtHtml(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-\*]+/, '').trim())
    .filter(Boolean)
  const lis = lines
    .map((l) => `<li style="margin:0 0 4px;">${esc(l)}</li>`)
    .join('')
  return `${sectionHeading('5', 'Weitere Hinweise')}
    <ul style="margin:0;padding-left:18px;font-size:8.5pt;line-height:1.45;color:${TEXT};">${lis}</ul>`
}

function unterschriftenHtml(p: AbnahmeProtokollHtmlInput): string {
  const block = (title: string, name: string, ortDatum: string) =>
    `<div style="flex:1;min-width:0;page-break-inside:avoid;">
      <div style="font-size:8pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.03em;margin-bottom:28px;">${esc(title)}</div>
      <div style="border-bottom:1px solid ${TEXT};min-height:20px;margin-bottom:4px;font-size:9pt;color:${TEXT};">${esc(ortDatum.trim() || ' ')}</div>
      <div style="font-size:7.5pt;color:${MUTED};">Ort, Datum</div>
      <div style="border-bottom:1px solid ${TEXT};height:36px;margin:16px 0 4px;"></div>
      <div style="font-size:7.5pt;color:${MUTED};">Unterschrift${name ? ` · ${esc(name)}` : ''}</div>
    </div>`
  return `${sectionHeading('6', 'Unterschriften')}
    <div style="display:flex;gap:16px;margin-top:8px;">
      ${block('Auftragnehmer', p.meta.vertreter_an, p.meta.unterschrift_ort_datum_an)}
      ${block(
        'Auftraggeber',
        p.meta.ansprechpartner_kunde || p.kunde_name,
        p.meta.unterschrift_ort_datum_ag
      )}
      ${block(
        'Anwesend bei Übergabe',
        p.meta.anwesend_uebergabe,
        p.meta.unterschrift_ort_datum_anwesend
      )}
    </div>`
}

function firmKontaktKopf(p: AbnahmeProtokollHtmlInput): string {
  const lines = [
    p.firmenname,
    p.firmen_adresse.replace(/\n/g, ', '),
    [p.firmen_telefon, p.firmen_email, p.firmen_website].filter(Boolean).join(' · '),
  ].filter(Boolean)
  return `<div style="text-align:right;font-size:8pt;line-height:1.45;color:${MUTED};max-width:240px;">
    ${lines.map((l) => `<div>${esc(l)}</div>`).join('')}
  </div>`
}

export function buildAbnahmeProtokollHtml(p: AbnahmeProtokollHtmlInput): string {
  const footerProps = footerInputFromAbnahme(p)
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <title>Abnahmeprotokoll</title>
  <style>
    @page { size: A4; margin: 12mm 12mm ${ANGEBOT_PDF_BOTTOM_MARGIN_MM}mm 12mm; }
    body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: ${TEXT}; }
  </style>
</head>
<body>
  <div style="max-width:100%;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:10px;">
      <div style="flex:1;min-width:0;">
        ${angebotLogoKopfHtml(footerProps)}
        <h1 style="font-size:16pt;font-weight:700;color:${ACCENT};margin:8px 0 2px;letter-spacing:0.02em;">ABNAHMEPROTOKOLL</h1>
        <p style="margin:0;font-size:8.5pt;color:${MUTED};letter-spacing:0.06em;text-transform:uppercase;">Garten- und Landschaftsbau</p>
      </div>
      ${firmKontaktKopf(p)}
    </div>
    ${metaBarHtml(p)}
    ${partiesRowHtml(p)}
    ${bauvorhabenHtml(p)}
    ${leistungenHtml(p.gewerke)}
    ${ergebnisHtml(p.meta.abnahme_ergebnis, p.abnahmeDatum)}
    ${hinweiseHtml(p)}
    ${rechtHtml(p.meta.rechtshinweise)}
    ${unterschriftenHtml(p)}
    <p style="margin:20px 0 0;font-size:8pt;color:${MUTED};text-align:center;">Qualität. Verlässlichkeit. Natur. — Vielen Dank für Ihr Vertrauen!</p>
  </div>
</body>
</html>`
}

export function buildAbnahmeProtokollPdfFooterTemplate(p: AbnahmeProtokollHtmlInput): string {
  return buildAngebotPdfFooterTemplate(footerInputFromAbnahme(p))
}
