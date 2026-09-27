/**
 * Regie-Mails nach erfolgreichem Datenschreiben (Claim → sendMail).
 * Nur von decideWeitereArbeitMitNotify / decidePartnerPositionsAnfrageIntern aufrufen.
 */
import 'server-only'

import { regieKundenStundensatz } from '@/lib/auftraege/regie-display'
import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailAnredeFromKundeTyp, mailBegruessungZeile } from '@/lib/mail/anrede'
import {
  buildRegieEntscheidungPartnerMail,
  loadLatestRegieKorrekturPartnerSicht,
  resolveRegiePartnerFall,
} from '@/lib/mail/regie-entscheidung-partner-mail'
import { buildRegieInformationKundenMail } from '@/lib/mail/regie-information-kunden-mail'
import { sendMail } from '@/lib/mail-service'
import {
  buildPartnerVorgangPortalUrl,
  buildPortalLoginLink,
} from '@/lib/portal-utils'
import {
  positionBetrag,
  regieBetragPartner,
  regieMengeStunden,
  summeBetraege,
  type BetragPosition,
} from '@/lib/shared-domain/regie-betrag'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type RegieMailSendResult = {
  warnings: string[]
}

async function claimRegieMailColumn(
  positionId: string,
  col: 'regie_mail_partner_at' | 'regie_mail_kunde_at'
): Promise<boolean> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .update({ [col]: now })
    .eq('id', positionId)
    .is(col, null)
    .select('id')
  if (error) {
    logDbError(`lib/auftraege/send-regie-entscheidung-mails:claim:${col}`, error)
    return false
  }
  return Boolean(data?.length)
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Nach allen tragenden Schreibvorgängen: Partner-Mail immer (bei Claim),
 * Kunden-Mail nur bei Annahme.
 */
export async function sendRegieEntscheidungMailsAfterWrite(input: {
  positionId: string
  status: 'anerkannt' | 'abgelehnt'
  /** Ablehnungsgrund / Notiz — nur Partner-Mail. */
  ablehnungsNotiz?: string | null
}): Promise<RegieMailSendResult> {
  const warnings: string[] = []
  const positionId = input.positionId.trim()
  if (!positionId) return { warnings: ['Position fehlt — keine Mail.'] }

  const { data: pos, error: posErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      `id, auftrag_id, handwerker_id, leistung_name, beschreibung, menge, einheit,
       typ, verguetung, geschaetzt_std, stundensatz, stundensatz_kunde,
       preis_partner, preis_fix,
       handwerker:handwerker_id(id, name, email, firma),
       auftraege:auftrag_id(
         id, titel, kunde_id,
         kunden:kunde_id(id, name, email, typ)
       )`
    )
    .eq('id', positionId)
    .maybeSingle()
  if (posErr) {
    logDbError('lib/auftraege/send-regie-entscheidung-mails:auftrag_positionen', posErr)
    warnings.push('Mail: Position konnte nicht geladen werden.')
    return { warnings }
  }
  if (!pos?.auftrag_id) {
    warnings.push('Mail: Auftrag zur Position fehlt.')
    return { warnings }
  }

  const auftragRaw = pos.auftraege as
    | {
        id?: string
        titel?: string | null
        kunde_id?: string | null
        kunden?:
          | { id?: string; name?: string | null; email?: string | null; typ?: string | null }
          | { id?: string; name?: string | null; email?: string | null; typ?: string | null }[]
          | null
      }
    | {
        id?: string
        titel?: string | null
        kunde_id?: string | null
        kunden?:
          | { id?: string; name?: string | null; email?: string | null; typ?: string | null }
          | { id?: string; name?: string | null; email?: string | null; typ?: string | null }[]
          | null
      }[]
    | null
  const auftrag = Array.isArray(auftragRaw) ? auftragRaw[0] : auftragRaw
  const kundeRaw = auftrag?.kunden
  const kunde = Array.isArray(kundeRaw) ? kundeRaw[0] : kundeRaw

  const hwRaw = pos.handwerker as
    | { id?: string; name?: string | null; email?: string | null; firma?: string | null }
    | { id?: string; name?: string | null; email?: string | null; firma?: string | null }[]
    | null
  const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw

  const auftragTitel = String(auftrag?.titel ?? '').trim() || 'Auftrag'
  const positionTitel = String(pos.leistung_name ?? '').trim() || 'Weitere Arbeit'
  const beschreibung = String(pos.beschreibung ?? '')
    .replace(/\n*Nachtrag\s*\/\s*Regie\s*[—\-–]\s*wartet auf Freigabe durch Bärenwald\.?\s*$/i, '')
    .trim()

  const stunden = regieMengeStunden(
    null,
    pos.geschaetzt_std != null && Number(pos.geschaetzt_std) > 0
      ? Number(pos.geschaetzt_std)
      : numOrNull(pos.menge)
  )
  const partnersatz =
    numOrNull(pos.stundensatz) && Number(pos.stundensatz) > 0
      ? Number(pos.stundensatz)
      : numOrNull(pos.preis_partner) && Number(pos.preis_partner) > 0
        ? Number(pos.preis_partner)
        : null
  const partnerBetrag =
    partnersatz != null && partnersatz > 0
      ? regieBetragPartner(stunden, partnersatz)
      : null

  const branding = await getMailBranding(supabaseAdmin)

  // ——— Partner-Mail ———
  const partnerEmail = hw?.email?.trim() || ''
  if (!partnerEmail) {
    warnings.push('Partner-Mail: keine E-Mail-Adresse hinterlegt.')
  } else {
    const claimed = await claimRegieMailColumn(positionId, 'regie_mail_partner_at')
    if (!claimed) {
      // bereits versendet oder Claim-Fehler — kein zweiter Versand
    } else {
      const korrektur = await loadLatestRegieKorrekturPartnerSicht(positionId)
      const fall = resolveRegiePartnerFall({
        status: input.status,
        aenderungen: korrektur?.aenderungen ?? null,
      })
      const begruendung =
        input.status === 'abgelehnt'
          ? input.ablehnungsNotiz?.trim() || korrektur?.begruendung || null
          : korrektur?.begruendung || null

      const tpl = buildRegieEntscheidungPartnerMail(
        {
          partnerName: hw?.name?.trim() || hw?.firma?.trim() || 'Partner',
          partnerTyp: null,
          auftragTitel,
          positionTitel,
          stunden,
          partnersatz,
          betrag: partnerBetrag,
          begruendung,
          aenderungen: korrektur?.aenderungen ?? [],
          portalLink: buildPartnerVorgangPortalUrl(String(pos.auftrag_id)),
          fall,
        },
        branding
      )

      const sent = await sendMail({
        typ: 'regie_entscheidung_partner',
        an: partnerEmail,
        anName: hw?.name?.trim() || null,
        betreff: tpl.betreff,
        html: tpl.html,
        auftragId: String(pos.auftrag_id),
        kontextTyp: 'auftrag',
      })
      if (!sent.success) {
        const err = sent.error ?? 'Partner-Mail fehlgeschlagen.'
        console.error('[regie-mail] Partner-Mail nach Claim fehlgeschlagen:', {
          positionId,
          error: err,
        })
        warnings.push(`Partner-Mail fehlgeschlagen: ${err}`)
      }
    }
  }

  // ——— Kunden-Mail nur bei Annahme ———
  if (input.status !== 'anerkannt') {
    return { warnings }
  }

  const kundeEmail = kunde?.email?.trim() || ''
  if (!kundeEmail) {
    warnings.push('Kunden-Mail: keine E-Mail-Adresse hinterlegt.')
    return { warnings }
  }

  const claimedKunde = await claimRegieMailColumn(positionId, 'regie_mail_kunde_at')
  if (!claimedKunde) {
    return { warnings }
  }

  const { data: allePos, error: alleErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'typ, verguetung, menge, geschaetzt_std, stundensatz, stundensatz_kunde, preis_partner, preis_fix'
    )
    .eq('auftrag_id', String(pos.auftrag_id))
  if (alleErr) {
    logDbError('lib/auftraege/send-regie-entscheidung-mails:summe', alleErr)
  }

  const betragPos: BetragPosition = {
    typ: pos.typ as string | null,
    verguetung: pos.verguetung as string | null,
    menge: numOrNull(pos.menge),
    geschaetzt_std: numOrNull(pos.geschaetzt_std),
    stundensatz: numOrNull(pos.stundensatz),
    stundensatz_kunde: numOrNull(pos.stundensatz_kunde),
    preis_partner: numOrNull(pos.preis_partner),
    preis_fix: numOrNull(pos.preis_fix),
  }
  const positionsBetrag = positionBetrag(betragPos, 'kunde')
  const vorgangGesamtsumme = summeBetraege(
    (allePos ?? []).map((p) => ({
      typ: p.typ as string | null,
      verguetung: p.verguetung as string | null,
      menge: numOrNull(p.menge),
      geschaetzt_std: numOrNull(p.geschaetzt_std),
      stundensatz: numOrNull(p.stundensatz),
      stundensatz_kunde: numOrNull(p.stundensatz_kunde),
      preis_partner: numOrNull(p.preis_partner),
      preis_fix: numOrNull(p.preis_fix),
    })),
    'kunde'
  )
  const kundensatz = regieKundenStundensatz({
    stundensatz_kunde: numOrNull(pos.stundensatz_kunde),
    stundensatz: partnersatz,
  })

  const anrede = mailAnredeFromKundeTyp(kunde?.typ)
  const kundeName = kunde?.name?.trim() || 'Kundin/Kunde'
  const tplKunde = buildRegieInformationKundenMail(
    {
      anrede,
      begruessung: mailBegruessungZeile(anrede, kundeName),
      projektTitel: auftragTitel,
      positionTitel,
      positionBeschreibung: beschreibung || null,
      stunden,
      kundensatz: kundensatz > 0 ? kundensatz : null,
      positionsBetrag: positionsBetrag > 0 ? positionsBetrag : null,
      vorgangGesamtsumme: vorgangGesamtsumme > 0 ? vorgangGesamtsumme : null,
      datum: new Date().toISOString().slice(0, 10),
      statusLink: buildPortalLoginLink(),
    },
    branding
  )

  const sentKunde = await sendMail({
    typ: 'regie_information',
    an: kundeEmail,
    anName: kundeName,
    betreff: tplKunde.betreff,
    html: tplKunde.html,
    kundeId: (auftrag?.kunde_id as string | null) ?? kunde?.id ?? null,
    auftragId: String(pos.auftrag_id),
    kontextTyp: 'auftrag',
  })
  if (!sentKunde.success) {
    const err = sentKunde.error ?? 'Kunden-Mail fehlgeschlagen.'
    console.error('[regie-mail] Kunden-Mail nach Claim fehlgeschlagen:', {
      positionId,
      error: err,
    })
    warnings.push(`Kunden-Mail fehlgeschlagen: ${err}`)
  }

  return { warnings }
}

/** Hängt Mail-Warnungen an die Erfolgsmeldung (Toast). */
export function appendRegieMailWarnings(
  baseMessage: string,
  warnings: string[]
): string {
  if (!warnings.length) return baseMessage
  return `${baseMessage} ${warnings.join(' ')}`
}
