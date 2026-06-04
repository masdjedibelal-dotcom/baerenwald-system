import {
  formatEurRange,
  type AngebotWizardMeta,
  type WizardPosition,
  ZAHLUNGSBEDINGUNGEN_LABELS,
} from '@/lib/angebote/angebot-wizard-types'
import { angebotGewerkNameAnzeige } from '@/lib/dokument-zeilen'
import { richTextToPlain } from '@/lib/rich-text'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildAngebotWizardMailHtml(input: {
  meta: AngebotWizardMeta
  positions: WizardPosition[]
  totalMin: number
  totalMax: number
  kundenName: string
  statusLink?: string
  compact?: boolean
}): string {
  const { meta, positions, totalMin, totalMax, kundenName, statusLink, compact } = input
  const zahlung = ZAHLUNGSBEDINGUNGEN_LABELS[meta.zahlungsbedingungen]
  const padH = compact ? '14px 18px' : '20px 24px'
  const padB = compact ? '16px' : '24px'
  const subjSize = compact ? '14px' : '18px'

  const rows = positions
    .map(
      (p) => {
        const m = Math.max(Number(p.menge) || 1, 0.01)
        const einzel = p.preis_min / m
        return `<tr>
        <td>
          <div style="font-weight:500">${esc(p.leistung)}</div>
          <div style="color:#6B7280;font-size:${compact ? '11' : '11.5'}px">${esc(richTextToPlain(p.beschreibung) || angebotGewerkNameAnzeige(p.gewerk_name))}</div>
        </td>
        <td>${esc(String(p.menge))} ${esc(p.einheit)}</td>
        <td class="amt">${esc(formatEurRange(einzel, einzel))}</td>
        <td class="amt">${esc(formatEurRange(p.preis_min, p.preis_max))}</td>
      </tr>`
      }
    )
    .join('')

  const einl = meta.einleitung.trim().length
    ? meta.einleitung
    : 'vielen Dank für Ihre Anfrage. Anbei das Angebot mit allen Leistungen und Preisen.'
  const leistBlock = meta.leistungsumfang.trim().length
    ? `<p style="margin:0 0 12px;font-size:13px;color:#374151"><strong>Leistungsumfang:</strong> ${esc(meta.leistungsumfang)}</p>`
    : ''

  const cta = statusLink
    ? `<a class="mail-cta" href="${esc(statusLink)}">Angebot annehmen →</a>`
    : `<span class="mail-cta" style="opacity:0.85">Angebot annehmen →</span>`

  return `<div class="mail-preview">
    <div class="mail-h" style="padding:${padH}">
      <div class="brand" style="font-size:${compact ? '9px' : '11px'}">Bärenwald München</div>
      <div class="subj" style="font-size:${subjSize}">${esc(meta.titel)}</div>
    </div>
    <div class="mail-body" style="padding:${padB};font-size:${compact ? '12px' : '14px'}${compact ? ';max-height:460px;overflow:auto' : ''}">
      <p style="margin:0 0 8px">Guten Tag ${esc(kundenName)},</p>
      ${leistBlock}
      <p style="white-space:pre-line;margin:0 0 12px">${esc(einl)}</p>
      <table>
        <thead>
          <tr><th>Leistung</th><th>Menge</th><th style="text-align:right">Einzel netto</th><th style="text-align:right">Gesamt netto</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total">
            <td>Gesamt netto</td>
            <td></td>
            <td></td>
            <td class="amt">${esc(formatEurRange(totalMin, totalMax))}</td>
          </tr>
        </tbody>
      </table>
      <p style="white-space:pre-line;margin-top:12px">${esc(meta.schluss)}</p>
      <p style="color:#6B7280;font-size:${compact ? '11px' : '12px'}">
        <b>Gültig bis:</b> ${esc(meta.gueltig_bis)}<br />
        <b>Zahlungsbedingungen:</b> ${esc(zahlung)}
      </p>
      ${cta}
    </div>
    <div class="mail-foot">
      Bärenwald München · Lindwurmstr. 88, 80337 München<br />
      Tel. 089 / 552 87 100 · info@baerenwald-bau.de
    </div>
  </div>`
}
