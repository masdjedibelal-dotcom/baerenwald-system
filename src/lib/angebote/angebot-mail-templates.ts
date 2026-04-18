import type { AngebotPosition } from '@/lib/types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function firmAdresse(f: FirmenEinstellungen): string {
  const parts = [f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean)
  return parts.join(' · ')
}

function ustOderSteuer(f: FirmenEinstellungen): string {
  if (f.ust_id?.trim()) return `USt-IdNr.: ${esc(f.ust_id.trim())}`
  if (f.steuernummer?.trim()) return `Steuernummer: ${esc(f.steuernummer.trim())}`
  return ''
}

export function buildKundenAngebotMail(input: {
  kundeVorname: string
  positionen: AngebotPosition[]
  bruttoMin: number
  bruttoMax: number
  gueltigBis: string
  firm: FirmenEinstellungen
}): string {
  const name = esc(input.kundeVorname.trim() || 'Kundin/Kunde')
  const logo = input.firm.logo_url?.trim()
    ? `<img src="${esc(input.firm.logo_url.trim())}" height="36" alt="" style="margin-bottom:24px"/>`
    : `<p style="font-size:18px;font-weight:700;color:#2E7D52;margin:0 0 24px">${esc(input.firm.firmenname || 'Bärenwald München')}</p>`

  const rows = input.positionen
    .map((p) => {
      const m = p.menge || 1
      const gmin = p.gesamt_min * m
      const gmax = p.gesamt_max * m
      const txt = esc((p.beschreibung || p.leistung).trim())
      return `
        <tr style="border-bottom:1px solid #E5E3DF;">
          <td style="padding:8px 0;">${txt}</td>
          <td style="padding:8px 0;text-align:right;white-space:nowrap;">
            ${formatEuro(gmin)} – ${formatEuro(gmax)} €
          </td>
        </tr>`
    })
    .join('')

  const tel = esc(input.firm.telefon?.trim() || '')
  const mail = esc(input.firm.email?.trim() || 'info@baerenwaldmuenchen.de')
  const adr = esc(firmAdresse(input.firm))
  const ust = ustOderSteuer(input.firm)

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1E1E1E;">
  ${logo}
  <h2 style="color:#2E7D52;font-size:20px;">Guten Tag ${name},</h2>
  <p>vielen Dank für Ihr Vertrauen. Anbei finden Sie Ihr persönliches Angebot von ${esc(input.firm.firmenname || 'Bärenwald München')}.</p>
  <div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#2E7D52;">Gesamtbetrag (inkl. MwSt.)</p>
    <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#1A3D2B;">
      ${formatEuro(input.bruttoMin)} – ${formatEuro(input.bruttoMax)} €
    </p>
  </div>
  <p style="font-weight:600;margin-bottom:8px;">Ihre Leistungen:</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
  <p style="font-size:13px;color:#6B6B6B;margin-top:16px;">
    Das Angebot ist gültig bis ${esc(input.gueltigBis)}. Das detaillierte Angebot finden Sie im Anhang.
  </p>
  <div style="background:#F7F6F3;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;color:#6B6B6B;">
    Als Privatperson können Sie den Lohnkostenanteil nach § 35a EStG steuerlich absetzen (20 % der Lohnkosten).
  </div>
  <p>Bei Fragen stehen wir gerne zur Verfügung:</p>
  <p>
    ${tel ? `📞 <a href="tel:${tel.replace(/\s/g, '')}">${tel}</a><br/>` : ''}
    ✉️ <a href="mailto:${mail}">${mail}</a>
  </p>
  <p style="color:#6B6B6B;font-size:12px;margin-top:32px;border-top:1px solid #E5E3DF;padding-top:16px;">
    ${esc(input.firm.firmenname || 'Bärenwald Handwerksgruppe München')}<br/>
    ${adr}${ust ? ` · ${ust}` : ''}
  </p>
</body>
</html>`
}

export function buildHandwerkerMail(input: {
  handwerker_name: string
  gewerk_name: string
  positionen: AngebotPosition[]
  plz: string
  ort: string
  zeitraum: string
  link: string
  firm: FirmenEinstellungen
}): string {
  const logo = input.firm.logo_url?.trim()
    ? `<img src="${esc(input.firm.logo_url.trim())}" height="36" alt="" style="margin-bottom:24px"/>`
    : `<p style="font-size:18px;font-weight:700;color:#2E7D52;margin:0 0 24px">${esc(input.firm.firmenname || 'Bärenwald München')}</p>`

  const items = input.positionen
    .map((p) => `<li>${esc((p.beschreibung || p.leistung).trim())}</li>`)
    .join('')

  const tel = esc(input.firm.telefon?.trim() || '')
  const link = esc(input.link)

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1E1E1E;">
  ${logo}
  <h2 style="color:#2E7D52;font-size:18px;">Neue Anfrage für Sie</h2>
  <p>Guten Tag ${esc(input.handwerker_name)},<br/>
  wir haben eine neue Anfrage im Bereich <strong>${esc(input.gewerk_name)}</strong> für Sie.</p>
  <div style="background:#F7F6F3;border-radius:8px;padding:16px;margin:16px 0;">
    <table style="width:100%;font-size:14px;">
      <tr>
        <td style="color:#6B6B6B;padding:4px 0;width:40%;">Gewerk:</td>
        <td style="font-weight:600;padding:4px 0;">${esc(input.gewerk_name)}</td>
      </tr>
      <tr>
        <td style="color:#6B6B6B;padding:4px 0;">Einsatzort:</td>
        <td style="font-weight:600;padding:4px 0;">${esc(input.plz)} ${esc(input.ort)}</td>
      </tr>
      <tr>
        <td style="color:#6B6B6B;padding:4px 0;">Zeitraum:</td>
        <td style="font-weight:600;padding:4px 0;">${esc(input.zeitraum || 'Nach Absprache')}</td>
      </tr>
    </table>
  </div>
  <p style="font-weight:600;margin-bottom:8px;">Ihre Aufgaben:</p>
  <ul style="padding-left:20px;font-size:14px;line-height:1.8;">${items}</ul>
  <div style="text-align:center;margin:28px 0;">
    <a href="${link}" style="display:inline-block;background:#2E7D52;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
      Anfrage ansehen &amp; antworten
    </a>
  </div>
  <p style="font-size:13px;color:#6B6B6B;text-align:center;">
    Oder diesen Link öffnen:<br/>
    <a href="${link}" style="color:#2E7D52;">${link}</a>
  </p>
  ${tel ? `<p style="font-size:13px;color:#6B6B6B;margin-top:24px;">Bei Fragen: ${tel}</p>` : ''}
</body>
</html>`
}

export function buildInternHandwerkerAntwortMail(input: {
  handwerkerName: string
  gewerkName: string
  angenommen: boolean
  /** bei Ablehnung: ausgewählter Grund (Kurztext) */
  ablehnungGrund?: string | null
  notiz: string | null
  dashboardUrl: string
}): string {
  const status = input.angenommen ? 'angenommen' : 'abgelehnt'
  const link = esc(input.dashboardUrl)
  const grund =
    !input.angenommen && input.ablehnungGrund?.trim()
      ? `<p><strong>Grund:</strong> ${esc(input.ablehnungGrund.trim())}</p>`
      : ''
  const notiz = input.notiz?.trim()
    ? `<p><strong>Weitere Notiz:</strong> ${esc(input.notiz.trim())}</p>`
    : ''
  const hinweis = !input.angenommen
    ? `<p style="margin-top:16px;padding:12px 14px;background:#FFF8E1;border-radius:8px;border:1px solid #F9A825;">
        <strong>⚠️ Handlungsbedarf:</strong> Anderen Handwerker für <strong>${esc(input.gewerkName)}</strong> auswählen und erneut anfragen.
      </p>`
    : ''
  return `
  <p>Handwerker <strong>${esc(input.handwerkerName)}</strong> hat die Anfrage für <strong>${esc(input.gewerkName)}</strong> <strong>${status}</strong>.</p>
  ${grund}
  ${notiz}
  ${hinweis}
  <p><a href="${link}" style="display:inline-block;margin-top:12px;padding:10px 18px;background:#2E7D52;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Im Dashboard öffnen</a></p>
  `
}
