/**
 * Partner-Mail bei Regie-Entscheidung (annehmen / korrigiert annehmen / ablehnen).
 * Nur Partnersatz — kein Kundensatz, kein Kundenbetrag, keine Marge.
 */
import type { MailBranding } from '@/lib/mail-branding'
import { mailAnredeFromKundeTyp, mailBegruessungZeile, mailTeamGruss } from '@/lib/mail/anrede'
import { buildSubject } from '@/lib/mail/build-subject'
import { mailHtmlBase, mailSummaryBlock } from '@/lib/mail-templates'
import { formatEuro, formatNumber } from '@/lib/format/geld-datum'
import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { C } from '@/lib/tokens/colors'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Felder, die in der Partner-Mail sichtbar sein dürfen (Audit `regie_korrigiert`). */
const PARTNER_AENDERUNG_FELDER = [
  'titel',
  'beschreibung',
  'stunden',
  'stundensatz',
] as const

type PartnerAenderungFeld = (typeof PARTNER_AENDERUNG_FELDER)[number]

const FELD_LABEL: Record<PartnerAenderungFeld, string> = {
  titel: 'Titel',
  beschreibung: 'Beschreibung',
  stunden: 'Stunden',
  stundensatz: 'Stundensatz',
}

export type RegieEntscheidungPartnerFall =
  | 'angenommen'
  | 'angenommen_korrigiert'
  | 'abgelehnt'

export type RegiePartnerAenderungZeile = {
  feld: PartnerAenderungFeld
  label: string
  alt: string
  neu: string
}

export type RegieEntscheidungPartnerMailInput = {
  partnerName: string
  /** Für Anrede-Helfer (Kundenmails: immer Sie; hier analog). */
  partnerTyp?: string | null
  auftragTitel: string
  positionTitel: string
  stunden?: number | null
  /** Partnersatz €/h — nie Kundensatz. */
  partnersatz?: number | null
  /** Stunden × Partnersatz. */
  betrag?: number | null
  /** Ablehnungsgrund oder Korrekturbegründung aus dem Audit. */
  begruendung?: string | null
  /** Nur aus gespeichertem Audit — nicht aus dem Formular. */
  aenderungen?: RegiePartnerAenderungZeile[]
  portalLink?: string | null
  fall: RegieEntscheidungPartnerFall
}

function formatPartnerWert(
  feld: PartnerAenderungFeld,
  raw: unknown
): string {
  if (raw == null || raw === '') return '—'
  if (feld === 'stunden') {
    const n = Number(raw)
    return Number.isFinite(n)
      ? `${formatNumber(n, { decimals: 1 })} Std`
      : String(raw)
  }
  if (feld === 'stundensatz') {
    const n = Number(raw)
    return Number.isFinite(n)
      ? `${formatEuro(n, { style: 'currency' })}/h`
      : String(raw)
  }
  return String(raw).trim() || '—'
}

/**
 * Drei Betreffzeilen (Punkt 1).
 * Objekt = Auftragstitel, Ereignis je Fall.
 */
export function regieEntscheidungPartnerBetreff(
  fall: RegieEntscheidungPartnerFall,
  auftragTitel: string
): string {
  const ereignis =
    fall === 'abgelehnt'
      ? 'Weitere Arbeit abgelehnt'
      : fall === 'angenommen_korrigiert'
        ? 'Weitere Arbeit angenommen · korrigiert'
        : 'Weitere Arbeit angenommen'
  return buildSubject({
    objekt: auftragTitel.trim() || 'Auftrag',
    ereignis,
  })
}

/**
 * Liest den letzten `regie_korrigiert`-Eintrag für die Position.
 * Liefert nur Partner-relevante Felder (kein Kundenpreis).
 */
export async function loadLatestRegieKorrekturPartnerSicht(
  positionId: string
): Promise<{
  begruendung: string | null
  aenderungen: RegiePartnerAenderungZeile[]
} | null> {
  const { data, error } = await supabaseAdmin
    .from('audit_events')
    .select('payload, created_at')
    .eq('entity_type', 'auftrag_position')
    .eq('entity_id', positionId)
    .eq('aktion', 'regie_korrigiert')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    logDbError('lib/mail/regie-entscheidung-partner-mail:audit_events', error)
    return null
  }
  if (!data?.payload || typeof data.payload !== 'object') return null

  const payload = data.payload as Record<string, unknown>
  const begruendung =
    typeof payload.begruendung === 'string' && payload.begruendung.trim()
      ? payload.begruendung.trim()
      : null

  const aenderungen: RegiePartnerAenderungZeile[] = []
  for (const feld of PARTNER_AENDERUNG_FELDER) {
    const entry = payload[feld]
    if (!entry || typeof entry !== 'object') continue
    const pair = entry as { alt?: unknown; neu?: unknown }
    if (!('alt' in pair) && !('neu' in pair)) continue
    aenderungen.push({
      feld,
      label: FELD_LABEL[feld],
      alt: formatPartnerWert(feld, pair.alt),
      neu: formatPartnerWert(feld, pair.neu),
    })
  }

  if (!begruendung && aenderungen.length === 0) return null
  return { begruendung, aenderungen }
}

/** Fall aus Audit-Sicht: nur Partner-Felder zählen als „mit Änderung“. */
export function resolveRegiePartnerFall(opts: {
  status: 'anerkannt' | 'abgelehnt'
  aenderungen?: RegiePartnerAenderungZeile[] | null
}): RegieEntscheidungPartnerFall {
  if (opts.status === 'abgelehnt') return 'abgelehnt'
  if (opts.aenderungen && opts.aenderungen.length > 0) return 'angenommen_korrigiert'
  return 'angenommen'
}

export function buildRegieEntscheidungPartnerMail(
  input: RegieEntscheidungPartnerMailInput,
  branding: MailBranding
): { betreff: string; html: string } {
  const anrede = mailAnredeFromKundeTyp(input.partnerTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, input.partnerName))
  const titel = input.positionTitel.trim() || 'Weitere Arbeit'
  const auftrag = input.auftragTitel.trim() || 'Auftrag'
  const betreff = regieEntscheidungPartnerBetreff(input.fall, auftrag)

  const stundenLabel =
    input.stunden != null && Number.isFinite(input.stunden) && input.stunden > 0
      ? `${formatNumber(input.stunden, { decimals: 1 })} Std`
      : null
  const satzLabel =
    input.partnersatz != null &&
    Number.isFinite(input.partnersatz) &&
    input.partnersatz > 0
      ? `${formatEuro(input.partnersatz, { style: 'currency' })}/h`
      : null
  const betragLabel =
    input.betrag != null && Number.isFinite(input.betrag)
      ? formatEuro(input.betrag, { style: 'currency' })
      : stundenLabel &&
          input.partnersatz != null &&
          Number.isFinite(input.partnersatz) &&
          input.partnersatz > 0 &&
          input.stunden != null
        ? formatEuro(input.stunden * input.partnersatz, { style: 'currency' })
        : null

  const metaParts = [stundenLabel, satzLabel, betragLabel].filter(Boolean)
  const metaHtml = metaParts.length
    ? `<p style="font-size:14px;color:${C.gray700};margin:0;line-height:1.5;">${esc(metaParts.join(' · '))}</p>`
    : undefined

  const summary = mailSummaryBlock({
    label:
      input.fall === 'abgelehnt'
        ? 'Abgelehnt'
        : input.fall === 'angenommen_korrigiert'
          ? 'Angenommen · korrigiert'
          : 'Angenommen',
    title: esc(titel),
    priceHtml: betragLabel
      ? `<p style="font-size:16px;font-weight:700;color:${C.greenDark};margin:0 0 4px;">${esc(betragLabel)}</p>`
      : undefined,
    metaHtml,
  })

  let intro: string
  if (input.fall === 'abgelehnt') {
    intro =
      anrede === 'du'
        ? 'deine eingereichte weitere Arbeit wurde <strong>nicht übernommen</strong>.'
        : 'Ihre eingereichte weitere Arbeit wurde <strong>nicht übernommen</strong>.'
  } else if (input.fall === 'angenommen_korrigiert') {
    intro =
      anrede === 'du'
        ? 'deine weitere Arbeit wurde <strong>angenommen</strong> — mit Anpassungen durch Bärenwald. Bitte prüfe die geänderten Angaben.'
        : 'Ihre weitere Arbeit wurde <strong>angenommen</strong> — mit Anpassungen durch Bärenwald. Bitte prüfen Sie die geänderten Angaben.'
  } else {
    intro =
      anrede === 'du'
        ? 'deine weitere Arbeit wurde <strong>angenommen</strong> und ist freigegeben.'
        : 'Ihre weitere Arbeit wurde <strong>angenommen</strong> und ist freigegeben.'
  }

  const aenderungen = input.aenderungen ?? []
  const aenderungenHtml =
    input.fall === 'angenommen_korrigiert' && aenderungen.length > 0
      ? `<div style="margin:0 0 20px;padding:14px 16px;background:${C.gray50};border-radius:8px;">
          <p style="font-size:12px;font-weight:600;color:${C.gray500};text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Änderungen</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:${C.gray700};">
            ${aenderungen
              .map(
                (a) => `<tr>
              <td style="padding:4px 8px 4px 0;vertical-align:top;font-weight:600;white-space:nowrap;">${esc(a.label)}</td>
              <td style="padding:4px 0;vertical-align:top;"><span style="color:${C.gray500};">${esc(a.alt)}</span> → <strong>${esc(a.neu)}</strong></td>
            </tr>`
              )
              .join('')}
          </table>
        </div>`
      : ''

  const begruendung = input.begruendung?.trim()
  const begruendungHtml = begruendung
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:${C.greenSoft};border-radius:8px;">
        <p style="font-size:12px;font-weight:600;color:${C.gray500};text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">${
          input.fall === 'abgelehnt' ? 'Grund' : 'Begründung'
        }</p>
        <p style="font-size:14px;color:${C.gray700};margin:0;line-height:1.55;white-space:pre-wrap;">${esc(begruendung)}</p>
      </div>`
    : ''

  const portal = input.portalLink?.trim()
  const portalHtml = portal
    ? `<p style="margin:20px 0 0;font-size:15px;">
        <a href="${esc(portal)}" style="display:inline-block;background:${C.green};color:${C.white};text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Zum Partner-Portal</a>
      </p>`
    : ''

  const content = `
    <h2 style="color:${C.green};margin:0 0 16px;font-size:20px;">${esc(
      input.fall === 'abgelehnt'
        ? 'Weitere Arbeit abgelehnt'
        : 'Weitere Arbeit angenommen'
    )}</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${begruessung}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${C.gray700};">${intro}</p>
    ${summary}
    <p style="font-size:14px;color:${C.gray500};margin:0 0 16px;">Auftrag: <strong style="color:${C.gray700};">${esc(auftrag)}</strong></p>
    ${aenderungenHtml}
    ${begruendungHtml}
    ${portalHtml}
    <p style="margin:28px 0 0;font-size:15px;line-height:1.6;color:${C.gray700};">${mailTeamGruss(anrede, branding.firmenname)}</p>
  `

  return {
    betreff,
    html: mailHtmlBase(content, betreff, branding, undefined, {
      anrede,
      skipMeinBaerenwaldPs: true,
    }),
  }
}
