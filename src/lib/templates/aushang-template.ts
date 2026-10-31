/**
 * Mieter-Aushang (Spec §16) — einseitig, HV-gebrandet, QR + Melde-URL.
 * Kompakt für A4 mit Standard-PDF-Rändern (eine Druckseite).
 */

import { PDF_FONT_IMPORT } from '@/lib/pdf/chrome'
import { C } from '@/lib/tokens/colors'
import { istTeo, MARKE } from '@/lib/marke'
const GOLD = C.accentGold3

export type AushangHtmlInput = {
  orgName: string
  orgSub?: string | null
  primaryColor?: string | null
  objektTitel?: string | null
  objektAdresse?: string | null
  meldeUrl: string
  /** data:image/png;base64,… */
  qrDataUrl?: string | null
  logoUrl?: string | null
  hvTelefon?: string | null
  hvEmail?: string | null
  /** TEO-Wortmarke (data:/https) für „Ein Service von teo.“ — Standard: Website-Datei */
  teoLogoUrl?: string | null
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function hexOr(primary: string | null | undefined, fallback: string): string {
  const h = (primary || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  }
  return fallback
}

export function buildAushangHtml(p: AushangHtmlInput): string {
  if (istTeo) return buildAushangHtmlTeo(p)
  const primary = hexOr(p.primaryColor, C.grayNeutral7)
  const org = (p.orgName || 'Hausverwaltung').trim()
  const sub = (p.orgSub || 'Mieter-Service').trim()
  const objekt = (p.objektTitel || 'Objekt').trim()
  const adresse = (p.objektAdresse || '').trim()
  const kontakt = [p.hvTelefon?.trim(), p.hvEmail?.trim()].filter(Boolean).join(' · ') || '—'

  const logo = p.logoUrl?.trim()
  const logoHtml =
    logo && (logo.startsWith('data:') || /^https?:\/\//i.test(logo))
      ? `<img src="${logo.replace(/"/g, '&quot;')}" alt="" style="height:40px;width:auto;max-width:140px;object-fit:contain;display:block;margin-bottom:8px;background:#fff;" />`
      : `<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:700;color:${C.white};margin-bottom:8px;">${esc(org.slice(0, 2).toUpperCase())}</div>`

  const qr = p.qrDataUrl?.trim()
  const qrHtml = qr
    ? `<img src="${qr.replace(/"/g, '&quot;')}" alt="QR-Code Melde-Link" style="width:128px;height:128px;display:block;background:${C.white};padding:6px;border-radius:4px;" />`
    : `<div style="width:128px;height:128px;background:${C.white};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8pt;color:${C.grayNeutral3};text-align:center;padding:8px;">QR-Code</div>`

  const steps = [
    ['01', 'Scannen', 'Handy-Kamera auf den QR-Code halten — die Meldeseite öffnet sich sofort.'],
    ['02', 'Melden', 'Bereich wählen, Foto aufnehmen, Schaden kurz beschreiben — fertig.'],
    ['03', 'Verfolgen', 'Sie bekommen eine Bestätigung und sehen den Status jederzeit.'],
  ]

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Aushang Schadenmeldung</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: ${C.gray900}; font-size: 10pt; }
</style>
</head><body>
  <div style="max-height: 270mm; overflow: hidden;">
    <header style="background:${primary};color:${C.white};padding:18px 20px 16px;border-radius:4px;">
      ${logoHtml}
      <div style="font-size:9pt;opacity:0.9;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">${esc(org)} · ${esc(sub)}</div>
      <div style="font-size:8pt;color:${GOLD};font-weight:700;letter-spacing:0.1em;margin-bottom:6px;">MIETERSERVICE</div>
      <h1 style="margin:0;font-size:20pt;line-height:1.2;font-weight:700;">Schaden melden<br/><span style="color:${GOLD};">in drei Schritten</span></h1>
      <p style="margin:10px 0 0;font-size:10pt;line-height:1.4;max-width:420px;opacity:0.95;">
        Für ${esc(objekt)}${adresse ? ` · ${esc(adresse)}` : ''}. Einfach QR scannen — ohne App, ohne Anruf.
      </p>
    </header>

    <div style="padding:18px 4px 12px;display:flex;gap:28px;align-items:flex-start;">
      <div style="flex:0 0 auto;text-align:center;">
        <div style="border:3px solid ${primary};border-radius:8px;padding:8px;display:inline-block;">
          ${qrHtml}
        </div>
        <div style="margin-top:8px;font-size:8pt;font-weight:700;color:${primary};letter-spacing:0.06em;">EINFACH SCANNEN</div>
        <div style="margin-top:4px;font-size:7pt;color:${C.grayNeutral4};max-width:150px;word-break:break-all;line-height:1.3;">${esc(p.meldeUrl)}</div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:9pt;font-weight:700;color:${primary};letter-spacing:0.08em;margin-bottom:10px;">SO FUNKTIONIERT'S</div>
        ${steps
          .map(
            ([nr, title, body]) => `<div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;">
          <div style="font-size:18pt;font-weight:700;color:${primary};line-height:1;min-width:36px;">${nr}</div>
          <div>
            <div style="font-size:11pt;font-weight:700;margin-bottom:2px;">${esc(title)}</div>
            <div style="font-size:9pt;line-height:1.4;color:${C.grayNeutral5};">${esc(body)}</div>
          </div>
        </div>`
          )
          .join('')}
      </div>
    </div>

    <footer style="padding:12px 4px 0;border-top:1px solid ${C.gray200};font-size:7.5pt;color:${C.grayNeutral4};line-height:1.4;display:flex;justify-content:space-between;gap:12px;">
      <div><strong>Kein Smartphone?</strong><br/>Melden Sie sich bei Ihrer Hausverwaltung: ${esc(kontakt)}</div>
      <div style="text-align:right;max-width:220px;">Datenschutz: Angaben nur zur Schadenbearbeitung.<br/><span style="font-size:6.5pt;color:${C.grayNeutral3};">Ein Service von ${MARKE.name}</span></div>
    </footer>
  </div>
</body></html>`
}

/**
 * Servus TEO: Plakat fürs Treppenhaus im Website-Look (Navy/Gold, Manrope).
 * Farben sind fest — die Verwaltung erscheint nur mit Namen und (optional) Logo.
 */
function buildAushangHtmlTeo(p: AushangHtmlInput): string {
  const NAVY = '#0b1f3a'
  const GOLD_TEO = '#e8a317'
  const TEXT_2 = '#4a5d75'
  const LINIE = '#dce4ee'
  const org = (p.orgName || 'Hausverwaltung').trim()
  const objekt = (p.objektTitel || '').trim()
  const adresse = (p.objektAdresse || '').trim()
  const kontakt = [p.hvTelefon?.trim(), p.hvEmail?.trim()].filter(Boolean).map((z) => esc(String(z)))

  const logo = p.logoUrl?.trim()
  const logoOk = logo && (logo.startsWith('data:') || /^https?:\/\//i.test(logo))
  const absender = logoOk
    ? `<img src="${logo!.replace(/"/g, '&quot;')}" alt="" style="height:16mm;width:auto;max-width:70mm;object-fit:contain;display:block;" />`
    : `<div style="font-size:15pt;font-weight:800;color:${NAVY};letter-spacing:-0.01em;">${esc(org)}</div>`
  const teoLogo = p.teoLogoUrl?.trim() || `https://${MARKE.websiteHost}/brand/teo/logo-wordmark.png`

  const qr = p.qrDataUrl?.trim()
  const qrHtml = qr
    ? `<img src="${qr.replace(/"/g, '&quot;')}" alt="QR-Code zur Meldeseite" style="width:82mm;height:82mm;display:block;" />`
    : `<div style="width:82mm;height:82mm;display:flex;align-items:center;justify-content:center;color:${TEXT_2};font-size:11pt;">QR-Code</div>`

  const schritte = [
    ['1', 'Scannen', 'Handy-Kamera auf den QR-Code halten.'],
    ['2', 'Melden', 'Bereich wählen, Foto machen, kurz beschreiben.'],
    ['3', 'Verfolgen', 'Sie bekommen eine Bestätigung und sehen den Stand.'],
  ]

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Aushang Schadenmeldung</title>
<style>
  ${PDF_FONT_IMPORT}
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Manrope', Arial, Helvetica, sans-serif; color: ${NAVY}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .blatt { height: 280mm; padding: 8mm 8mm 4mm; display: flex; flex-direction: column; overflow: hidden; }
</style>
</head><body>
  <div class="blatt">
    <header style="display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;padding-bottom:6mm;border-bottom:1.5pt solid ${NAVY};">
      <div>${absender}${logoOk ? `<div style="margin-top:2mm;font-size:10pt;font-weight:700;">${esc(org)}</div>` : ''}</div>
      <div style="text-align:right;font-size:10pt;line-height:1.45;color:${TEXT_2};">
        ${objekt ? `<div style="font-weight:700;color:${NAVY};">${esc(objekt)}</div>` : ''}
        ${adresse ? `<div>${esc(adresse)}</div>` : ''}
      </div>
    </header>

    <h1 style="margin:13mm 0 0;font-size:40pt;line-height:1.05;font-weight:800;letter-spacing:-0.025em;">Schaden im Haus?<br/>Hier melden<span style="color:${GOLD_TEO};">.</span></h1>
    <p style="margin:5mm 0 0;font-size:14pt;line-height:1.45;color:${TEXT_2};max-width:150mm;">QR-Code scannen, Foto machen, fertig. Ohne App und ohne Warteschleife – die Meldung geht direkt an Ihre Verwaltung.</p>

    <div style="margin:11mm auto 0;padding:7mm;border:1.5pt solid ${LINIE};border-radius:6mm;text-align:center;">
      ${qrHtml}
    </div>
    <div style="margin-top:4mm;text-align:center;font-size:9pt;color:${TEXT_2};word-break:break-all;">${esc(p.meldeUrl)}</div>

    <div style="margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:7mm;">
      ${schritte
        .map(
          ([nr, titel, text]) => `<div style="border-top:2pt solid ${GOLD_TEO};padding-top:4mm;">
        <div style="font-size:9pt;font-weight:800;color:${GOLD_TEO};letter-spacing:0.08em;">SCHRITT ${nr}</div>
        <div style="margin-top:1.5mm;font-size:14pt;font-weight:800;">${esc(titel)}</div>
        <div style="margin-top:1.5mm;font-size:10pt;line-height:1.4;color:${TEXT_2};">${esc(text)}</div>
      </div>`
        )
        .join('')}
    </div>

    <footer style="margin-top:9mm;padding-top:5mm;border-top:0.75pt solid ${LINIE};display:flex;justify-content:space-between;align-items:center;gap:8mm;font-size:9.5pt;line-height:1.45;color:${TEXT_2};">
      <div><strong style="color:${NAVY};">Kein Smartphone?</strong> Melden Sie sich bei ${esc(org)}${kontakt.length ? `:<br/>${kontakt.join(' · ')}` : '.'}</div>
      <div style="display:flex;align-items:center;gap:2.5mm;white-space:nowrap;font-size:8pt;">Ein Service von <img src="${teoLogo.replace(/"/g, '&quot;')}" alt="teo." style="height:6mm;width:auto;display:block;" /></div>
    </footer>
  </div>
</body></html>`
}
