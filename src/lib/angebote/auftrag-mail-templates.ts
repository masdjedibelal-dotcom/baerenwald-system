import type { AngebotPosition } from '@/lib/types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { formatDatum } from '@/lib/utils'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildAuftragsbestaetigung(input: {
  name: string
  gewerke: string[]
  start_datum: string | null
  end_datum: string | null
  handwerker_liste: string[]
  firm: FirmenEinstellungen
  projektLink?: string | null
}): string {
  const logo = input.firm.logo_url?.trim()
  const logoBlock = logo
    ? `<img src="${esc(logo)}" height="36" style="margin-bottom:24px" alt="${esc(input.firm.firmenname)}"/>`
    : ''
  const tel = input.firm.telefon?.trim()
  const endBlock =
    input.end_datum != null && String(input.end_datum).trim() !== ''
      ? `<p style="margin:4px 0 0;font-size:13px;color:#2E7D52;">
        Voraussichtliche Fertigstellung: ${esc(formatDatum(String(input.end_datum)))}
      </p>`
      : ''
  const hw =
    input.handwerker_liste.length > 0
      ? `<p style="font-size:14px;color:#1A3D2B;">${input.handwerker_liste.map((h) => esc(h)).join(' · ')}</p>`
      : ''
  const link = input.projektLink?.trim()
  const linkBlock = link
    ? `<div style="background:#EAF3DE;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#2E7D52;font-weight:600;">Projekt-Status online</p>
        <p style="margin:10px 0 0;"><a href="${esc(link)}" style="display:inline-block;background:#2E7D52;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Status ansehen</a></p>
        <p style="margin:8px 0 0;font-size:12px;color:#6B6B6B;">Ohne Passwort — Link speichern oder bookmarken.</p>
      </div>`
    : ''
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  ${logoBlock}
  <h2 style="color:#2E7D52">Ihr Auftrag ist bestätigt</h2>
  <p>Guten Tag ${esc(input.name)},<br/>wir freuen uns, Ihren Auftrag zu bestätigen.</p>
  ${linkBlock}
  <div style="background:#EAF3DE;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#2E7D52;">Geplanter Start</p>
    <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1A3D2B;">
      ${input.start_datum ? esc(formatDatum(String(input.start_datum))) : '—'}
    </p>
    ${endBlock}
  </div>
  <p style="font-weight:600">Ihre Gewerke:</p>
  <ul style="font-size:14px;line-height:1.8;">
    ${input.gewerke.map((g) => `<li>${esc(g)}</li>`).join('')}
  </ul>
  ${hw ? `<p style="font-weight:600">Zugewiesene Handwerksbetriebe:</p>${hw}` : ''}
  <p>Ein Ansprechpartner von Bärenwald koordiniert alle Arbeiten für Sie.</p>
  <p>Bei Fragen:<br/>
  ${tel ? `📞 ${esc(tel)}<br/>` : ''}
  ✉️ ${esc(input.firm.email?.trim() || 'info@baerenwaldmuenchen.de')}</p>
</body>
</html>`
}

export function buildHandwerkerAuftragsMail(input: {
  handwerker_name: string
  gewerk_name: string
  kunde_plz: string
  start_datum: string | null
  end_datum: string | null
  positionen: Pick<AngebotPosition, 'beschreibung' | 'menge' | 'einheit'>[]
  notizen: string | null
  firm: FirmenEinstellungen
}): string {
  const logo = input.firm.logo_url?.trim()
  const logoBlock = logo
    ? `<img src="${esc(logo)}" height="36" style="margin-bottom:24px" alt=""/>`
    : ''
  const tel = input.firm.telefon?.trim()
  const endRow =
    input.end_datum != null && String(input.end_datum).trim() !== ''
      ? `<tr>
          <td style="color:#6B6B6B;padding:4px 0">Fertigstellung:</td>
          <td style="font-weight:600">${esc(formatDatum(String(input.end_datum)))}</td>
        </tr>`
      : ''
  const items = input.positionen
    .map(
      (p) =>
        `<li>${esc((p.beschreibung || '').trim())} — ${esc(String(p.menge))} ${esc(p.einheit)}</li>`
    )
    .join('')
  const notizBlock =
    input.notizen?.trim() != null && input.notizen.trim() !== ''
      ? `<p style="font-weight:600">Notizen:</p>
         <p style="font-size:14px;color:#6B6B6B;">${esc(input.notizen.trim())}</p>`
      : ''
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  ${logoBlock}
  <h2 style="color:#2E7D52">Auftrag bestätigt</h2>
  <p>Guten Tag ${esc(input.handwerker_name)},<br/>der Auftrag wurde bestätigt. Hier sind Ihre Details:</p>
  <div style="background:#F7F6F3;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;">
    <table style="width:100%">
      <tr>
        <td style="color:#6B6B6B;padding:4px 0">Gewerk:</td>
        <td style="font-weight:600">${esc(input.gewerk_name)}</td>
      </tr>
      <tr>
        <td style="color:#6B6B6B;padding:4px 0">Einsatzort:</td>
        <td style="font-weight:600">${esc(input.kunde_plz)}</td>
      </tr>
      <tr>
        <td style="color:#6B6B6B;padding:4px 0">Start:</td>
        <td style="font-weight:600">${
          input.start_datum ? esc(formatDatum(String(input.start_datum))) : '—'
        }</td>
      </tr>
      ${endRow}
    </table>
  </div>
  <p style="font-weight:600">Ihre Aufgaben:</p>
  <ul style="font-size:14px;line-height:1.8;">${items}</ul>
  ${notizBlock}
  <p>Bei Fragen:${tel ? `<br/>📞 ${esc(tel)}` : ''}</p>
</body>
</html>`
}
