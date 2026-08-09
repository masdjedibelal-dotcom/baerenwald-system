/**
 * Mieter-Aushang (Spec §16) — einseitig, HV-gebrandet, QR + Melde-URL.
 * Kompakt für A4 mit Standard-PDF-Rändern (eine Druckseite).
 */

const GOLD = '#C4A35A'

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
  const primary = hexOr(p.primaryColor, '#22508C')
  const org = (p.orgName || 'Hausverwaltung').trim()
  const sub = (p.orgSub || 'Mieter-Service').trim()
  const objekt = (p.objektTitel || 'Objekt').trim()
  const adresse = (p.objektAdresse || '').trim()
  const kontakt = [p.hvTelefon?.trim(), p.hvEmail?.trim()].filter(Boolean).join(' · ') || '—'

  const logo = p.logoUrl?.trim()
  const logoHtml =
    logo && (logo.startsWith('data:') || /^https?:\/\//i.test(logo))
      ? `<img src="${logo.replace(/"/g, '&quot;')}" alt="" style="height:40px;width:auto;max-width:140px;object-fit:contain;display:block;margin-bottom:8px;" />`
      : `<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:700;color:#fff;margin-bottom:8px;">${esc(org.slice(0, 2).toUpperCase())}</div>`

  const qr = p.qrDataUrl?.trim()
  const qrHtml = qr
    ? `<img src="${qr.replace(/"/g, '&quot;')}" alt="QR-Code Melde-Link" style="width:128px;height:128px;display:block;background:#fff;padding:6px;border-radius:4px;" />`
    : `<div style="width:128px;height:128px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#666;text-align:center;padding:8px;">QR-Code</div>`

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
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10pt; }
</style>
</head><body>
  <div style="max-height: 270mm; overflow: hidden;">
    <header style="background:${primary};color:#fff;padding:18px 20px 16px;border-radius:4px;">
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
        <div style="margin-top:4px;font-size:7pt;color:#555;max-width:150px;word-break:break-all;line-height:1.3;">${esc(p.meldeUrl)}</div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:9pt;font-weight:700;color:${primary};letter-spacing:0.08em;margin-bottom:10px;">SO FUNKTIONIERT'S</div>
        ${steps
          .map(
            ([nr, title, body]) => `<div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;">
          <div style="font-size:18pt;font-weight:700;color:${primary};line-height:1;min-width:36px;">${nr}</div>
          <div>
            <div style="font-size:11pt;font-weight:700;margin-bottom:2px;">${esc(title)}</div>
            <div style="font-size:9pt;line-height:1.4;color:#333;">${esc(body)}</div>
          </div>
        </div>`
          )
          .join('')}
      </div>
    </div>

    <footer style="padding:12px 4px 0;border-top:1px solid #E5E7EB;font-size:7.5pt;color:#555;line-height:1.4;display:flex;justify-content:space-between;gap:12px;">
      <div><strong>Kein Smartphone?</strong><br/>Melden Sie sich bei Ihrer Hausverwaltung: ${esc(kontakt)}</div>
      <div style="text-align:right;max-width:200px;">Datenschutz: Angaben nur zur Schadenbearbeitung. Partner: Bärenwald München.</div>
    </footer>
  </div>
</body></html>`
}
