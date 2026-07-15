import type { MailBranding } from '@/lib/mail-branding'
import {
  groupAuftragPositionenByGewerk,
  type AuftragGewerkBlock,
  type GewerkOpt,
} from '@/lib/auftraege/auftrag-position-blocks'
import { normalizeLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { richTextToSafePdfHtml } from '@/lib/rich-text'
import {
  mailHtmlBase,
  mailKundenContactLine,
  mailKundenGruss,
  mailKundenStandardOptions,
  mailSummaryBlock,
} from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { AuftragBautagebuchEintrag, AuftragPosition } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtmlParagraphs(text: string): string {
  return esc(text.trim())
    .split(/\n\n+/)
    .map((block) => block.replace(/\n/g, '<br/>'))
    .filter(Boolean)
    .map((block) => `<p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${block}</p>`)
    .join('')
}

function blockIstAktuell(
  b: AuftragGewerkBlock,
  eintrag: Pick<AuftragBautagebuchEintrag, 'gewerk_id' | 'gewerk_phase_key'>
): boolean {
  if (eintrag.gewerk_id?.trim() && b.gewerkId === eintrag.gewerk_id.trim()) return true
  if (eintrag.gewerk_phase_key?.trim() && b.key === eintrag.gewerk_phase_key.trim()) return true
  return false
}

function gewerkPhaseStrip(
  blocks: AuftragGewerkBlock[],
  eintrag: Pick<AuftragBautagebuchEintrag, 'gewerk_id' | 'gewerk_phase_key'>
): string {
  if (blocks.length <= 1) return ''

  const cells = blocks
    .map((b, i) => {
      const done = b.positionen.every((p) => normalizeLeistungStatus(p.leistung_status) === 'erledigt')
      const inArbeit = b.positionen.some((p) => normalizeLeistungStatus(p.leistung_status) === 'in_arbeit')
      const isCurrent =
        blockIstAktuell(b, eintrag) ||
        (!eintrag.gewerk_id && !eintrag.gewerk_phase_key && inArbeit && !done)

      let circleBg = '#FFFFFF'
      let circleBorder = '#D1D5DB'
      let circleColor = '#9CA3AF'
      let labelColor = '#374151'

      if (done) {
        circleBg = '#2E7D52'
        circleBorder = '#2E7D52'
        circleColor = '#FFFFFF'
      } else if (isCurrent) {
        circleBg = '#2E7D52'
        circleBorder = '#2E7D52'
        circleColor = '#FFFFFF'
        labelColor = '#2E7D52'
      } else if (inArbeit) {
        circleBorder = '#2E7D52'
        circleColor = '#2E7D52'
      }

      const inner = done ? '✓' : String(i + 1)
      const connectorDone = done || isCurrent
      const connector =
        i < blocks.length - 1
          ? `<td style="width:16px;vertical-align:middle;padding:0 2px;"><div style="height:2px;background:${connectorDone ? '#2E7D52' : '#E5E7EB'};border-radius:1px;"></div></td>`
          : ''
      return `<td style="vertical-align:top;text-align:center;padding:0 4px;">
        <div style="width:28px;height:28px;margin:0 auto;border-radius:50%;border:2px solid ${circleBorder};background:${circleBg};color:${circleColor};font-size:${done ? '14px' : '12px'};font-weight:700;line-height:24px;text-align:center;">${inner}</div>
        <p style="font-size:10px;font-weight:${isCurrent ? '700' : '600'};color:${labelColor};margin:6px 0 0;line-height:1.3;max-width:72px;">${esc(b.gewerkName)}</p>
      </td>${connector}`
    })
    .join('')

  return `<div style="margin:0 0 20px;padding:12px 8px;background:#F9FAFB;border-radius:8px;overflow-x:auto;">
    <p style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;text-align:center;">Gewerke</p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;border-collapse:collapse;"><tr>${cells}</tr></table>
  </div>`
}

function updateBlock(
  eintrag: AuftragBautagebuchEintrag,
  anrede: AngebotMailAnrede
): string {
  const titel = esc(eintrag.titel.trim())
  const datum = esc(formatDatum(eintrag.datum))
  const label = anrede === 'du' ? 'Aktuelles Update' : 'Aktuelles Update'
  const beschreibungHtml = eintrag.beschreibung?.trim()
    ? `<div style="font-size:14px;color:#374151;line-height:1.6;margin:8px 0 0;">${richTextToSafePdfHtml(eintrag.beschreibung)}</div>`
    : ''
  const fotos = (eintrag.foto_urls ?? []).filter(Boolean)
  const fotoHinweis =
    fotos.length > 0
      ? anrede === 'du'
        ? `<p style="font-size:13px;color:#6B7280;margin:12px 0 0;line-height:1.5;">${fotos.length} Foto${fotos.length === 1 ? '' : 's'} im Update — in MeinBärenwald ansehen.</p>`
        : `<p style="font-size:13px;color:#6B7280;margin:12px 0 0;line-height:1.5;">${fotos.length} Foto${fotos.length === 1 ? '' : 's'} im Update — in MeinBärenwald ansehen.</p>`
      : ''

  return `${mailSummaryBlock({
    label,
    title: titel,
    metaHtml: `<p style="font-size:13px;color:#374151;margin:8px 0 0;"><strong>Datum:</strong> ${datum}</p>`,
  })}${beschreibungHtml}${fotoHinweis}`
}

function projektUebersichtBlock(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[],
  eintrag: AuftragBautagebuchEintrag,
  anrede: AngebotMailAnrede
): string {
  const blocks = groupAuftragPositionenByGewerk(positionen, gewerke)
  return `${gewerkPhaseStrip(blocks, eintrag)}${updateBlock(eintrag, anrede)}`
}

export function defaultBautagebuchKundenNachricht(
  anrede: AngebotMailAnrede,
  eintrag: Pick<AuftragBautagebuchEintrag, 'titel' | 'datum'>,
  projektTitel?: string | null
): string {
  const projekt = projektTitel?.trim() || (anrede === 'du' ? 'dein Projekt' : 'Ihr Projekt')
  if (anrede === 'du') {
    return `es gibt ein neues Update zu ${projekt} (${formatDatum(eintrag.datum)}): „${eintrag.titel.trim()}“.

Details, Fotos und den Verlauf findest du in MeinBärenwald.`
  }
  return `es gibt ein neues Update zu ${projekt} (${formatDatum(eintrag.datum)}): „${eintrag.titel.trim()}“.

Details, Fotos und den Verlauf finden Sie in MeinBärenwald.`
}

export function bautagebuchKundenMailBetreff(
  eintragTitel: string,
  projektTitel: string,
  firmenname: string
): string {
  const titel = projektTitel.trim() || 'Ihr Projekt'
  const update = eintragTitel.trim() || 'Update'
  return `Projekt-Update — ${update} · ${titel} · ${firmenname}`
}

export type BautagebuchKundenMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  nachricht: string
  projektTitel: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  eintrag: AuftragBautagebuchEintrag
  statusLink?: string | null
  previewMode?: boolean
}

export function buildBautagebuchKundenMail(
  data: BautagebuchKundenMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const nachrichtHtml = textToHtmlParagraphs(data.nachricht)
  const uebersicht = projektUebersichtBlock(data.positionen, data.gewerke, data.eintrag, anrede)

  const contact = mailKundenContactLine(anrede, b.telefon)
  const gruss = mailKundenGruss(anrede)

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail, weil es ein neues Update zu deinem Projekt gibt.'
      : 'Sie erhalten diese Mail, weil es ein neues Update zu Ihrem Projekt gibt.'

  const preheader = `${data.eintrag.titel.trim()} · ${data.projektTitel.trim() || 'Projekt-Update'}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      ${nachrichtHtml}
      ${uebersicht}
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    mailKundenStandardOptions(anrede, data.statusLink)
  )

  return {
    betreff: bautagebuchKundenMailBetreff(data.eintrag.titel, data.projektTitel, b.firmenname),
    html,
  }
}

export function resolveBautagebuchProjektTitel(opts: {
  auftragTitel?: string | null
  angebot?: { leistungsumfang?: string | null; notizen?: string | null } | null
  kundeName?: string | null
}): string {
  return resolveRechnungProjektTitel({
    angebot: opts.angebot ?? null,
    auftragTitel: opts.auftragTitel,
    fallback: opts.kundeName?.trim() || 'Ihr Projekt',
  })
}
