import type { MailBranding } from '@/lib/mail-branding'
import {
  groupAuftragPositionenByGewerk,
  type AuftragGewerkBlock,
  type GewerkOpt,
} from '@/lib/auftraege/auftrag-position-blocks'
import { normalizeLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { richTextToSafePdfHtml } from '@/lib/rich-text'
import { mailHtmlBase } from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { AuftragBautagebuchEintrag, AuftragPosition } from '@/lib/types'
import { BAUTAGEBUCH_MAX_FOTOS } from '@/lib/auftraege/bautagebuch-fotos'
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
  anrede: AngebotMailAnrede,
  eintragLink?: string | null
): string {
  const titelRaw = eintrag.titel.trim()
  const titel = eintragLink?.trim()
    ? `<a href="${esc(eintragLink.trim())}" style="color:#1A3D2B;text-decoration:none;font-weight:700;">${esc(titelRaw)}</a>`
    : esc(titelRaw)
  const datum = esc(formatDatum(eintrag.datum))
  const label = anrede === 'du' ? 'Aktuelles Update' : 'Aktuelles Update'
  const beschreibungHtml = eintrag.beschreibung?.trim()
    ? `<div style="font-size:14px;color:#374151;line-height:1.6;margin:8px 0 0;">${richTextToSafePdfHtml(eintrag.beschreibung)}</div>`
    : ''
  const fotos = (eintrag.foto_urls ?? []).filter(Boolean)
  const fotoRows: string[] = []
  for (let i = 0; i < Math.min(fotos.length, BAUTAGEBUCH_MAX_FOTOS); i += 2) {
    const u1 = esc(fotos[i]!)
    const u2Cell = fotos[i + 1]
      ? `<td width="50%" style="padding:2px;"><img src="${esc(fotos[i + 1]!)}" alt="" width="100%" style="display:block;width:100%;height:88px;object-fit:cover;border-radius:6px;border:0;"/></td>`
      : '<td width="50%" style="padding:2px;"></td>'
    fotoRows.push(
      `<tr><td width="50%" style="padding:2px;"><img src="${u1}" alt="" width="100%" style="display:block;width:100%;height:88px;object-fit:cover;border-radius:6px;border:0;"/></td>${u2Cell}</tr>`
    )
  }
  const fotoHtml =
    fotoRows.length > 0
      ? `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:12px 0 0;border-collapse:collapse;">${fotoRows.join('')}</table>`
      : ''

  return `<div style="background:#FFFFFF;border-radius:8px;padding:14px;border:1px solid #E5E7EB;margin:0 0 20px;">
    <p style="font-size:10px;font-weight:600;color:#2E7D52;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">${label}</p>
    <p style="font-size:12px;color:#6B7280;margin:0 0 6px;">${datum}</p>
    <p style="font-size:16px;font-weight:700;color:#1A3D2B;margin:0;line-height:1.35;">${titel}</p>
    ${beschreibungHtml}
    ${fotoHtml}
  </div>`
}

function projektUebersichtBlock(
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[],
  eintrag: AuftragBautagebuchEintrag,
  anrede: AngebotMailAnrede,
  eintragLink?: string | null
): string {
  const blocks = groupAuftragPositionenByGewerk(positionen, gewerke)
  return `${gewerkPhaseStrip(blocks, eintrag)}${updateBlock(eintrag, anrede, eintragLink)}`
}

export function defaultBautagebuchKundenNachricht(
  anrede: AngebotMailAnrede,
  eintrag: Pick<AuftragBautagebuchEintrag, 'titel' | 'datum'>,
  projektTitel?: string | null
): string {
  const projekt = projektTitel?.trim() || (anrede === 'du' ? 'dein Projekt' : 'Ihr Projekt')
  if (anrede === 'du') {
    return `es gibt ein neues Update zu ${projekt} (${formatDatum(eintrag.datum)}): „${eintrag.titel.trim()}“.

Unten findest du alle Details zu diesem Eintrag. Fotos und den vollständigen Verlauf siehst du in deinem Projekttagebuch.`
  }
  return `es gibt ein neues Update zu ${projekt} (${formatDatum(eintrag.datum)}): „${eintrag.titel.trim()}“.

Unten sehen Sie alle Details zu diesem Eintrag. Fotos und den vollständigen Verlauf finden Sie in Ihrem Projekttagebuch.`
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
  const link = data.statusLink?.trim() ?? ''
  const uebersicht = projektUebersichtBlock(data.positionen, data.gewerke, data.eintrag, anrede, link)

  const ctaLabel = anrede === 'du' ? 'Dieses Update im Projekttagebuch' : 'Dieses Update im Projekttagebuch'
  const ctaHint =
    anrede === 'du'
      ? 'Der Link führt direkt zu diesem Eintrag — weitere Updates und Fotos siehst du im Projekttagebuch.'
      : 'Der Link führt direkt zu diesem Eintrag — weitere Updates und Fotos finden Sie im Projekttagebuch.'
  const ctaHtml =
    link && !data.previewMode
      ? `<p style="margin:4px 0 16px;"><a href="${esc(link)}" style="display:inline-block;background:#2E7D52;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;">${ctaLabel} →</a></p>
         <p style="font-size:12px;color:#6B7280;margin:0 0 16px;line-height:1.5;">${esc(ctaHint)}</p>`
      : data.previewMode && !link
        ? `<p style="font-size:12px;color:#6B7280;margin:16px 0 0;font-style:italic;line-height:1.5;">${
            anrede === 'du'
              ? 'Der persönliche Link zum Projekttagebuch wird beim Versand eingefügt.'
              : 'Der persönliche Link zum Projekttagebuch wird beim Versand eingefügt.'
          }</p>`
        : ''

  const tel = esc(b.telefon)
  const telHref = tel.replace(/\s/g, '')
  const contact =
    anrede === 'du'
      ? `Bei Fragen erreichst du uns unter <a href="tel:${telHref}" style="color:#2E7D52;text-decoration:none;">${tel}</a>.`
      : `Bei Fragen erreichen Sie uns unter <a href="tel:${telHref}" style="color:#2E7D52;text-decoration:none;">${tel}</a>.`

  const gruss =
    anrede === 'du'
      ? 'Viele Grüße<br/><strong>Dein Bärenwald Team</strong>'
      : 'Mit freundlichen Grüßen<br/><strong>Ihr Bärenwald Team</strong>'

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail, weil es ein neues Update zu deinem Projekt gibt.'
      : 'Sie erhalten diese Mail, weil es ein neues Update zu Ihrem Projekt gibt.'

  const preheader = `${data.eintrag.titel.trim()} · ${data.projektTitel.trim() || 'Projekt-Update'}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      ${nachrichtHtml}
      ${uebersicht}
      ${ctaHtml}
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    { anrede, statusLink: link || null }
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
