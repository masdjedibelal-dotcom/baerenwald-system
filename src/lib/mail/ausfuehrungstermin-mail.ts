import 'server-only'

import { randomUUID } from 'crypto'

import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { emailLogHtmlMarker } from '@/lib/kommunikation/types'
import { logLeadEmailTimelineEvent } from '@/lib/kommunikation/log-lead-email-timeline'
import { mailAusfuehrungstermin } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { projektOderStatusLink } from '@/lib/mail/versand-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

function datumDe(iso: string | null | undefined): string {
  const d = String(iso ?? '').slice(0, 10)
  const [y, m, t] = d.split('-')
  if (!y || !m || !t) return d
  const wt = new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long' })
  return `${wt}, ${t}.${m}.${y}`
}

/**
 * Servus TEO: Ausführungstermin eines Einsatzes an den Kunden bestätigen.
 * Empfänger: Kontakt der Anfrage (bei Mieter-Meldungen der Melder vor Ort), sonst der Kunde des Auftrags.
 */
export async function sendeAusfuehrungsterminMail(input: {
  einsatzId: string
  geaendert?: boolean
  quelle: 'crm' | 'handwerker'
}): Promise<{ ok: true; an: string } | { ok: false; message: string }> {
  const { data: e, error: eErr } = await supabaseAdmin
    .from('einsaetze')
    .select('id, auftrag_id, handwerker_id, titel, termin_von, termin_bis, ort, kontakt_vor_ort')
    .eq('id', input.einsatzId)
    .maybeSingle()
  if (eErr) logDbError('lib/mail/ausfuehrungstermin:einsatz', eErr)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  const einsatz = e as {
    auftrag_id: string
    handwerker_id: string | null
    titel: string | null
    termin_von: string | null
    termin_bis: string | null
    ort: string | null
  }
  if (!einsatz.termin_von) return { ok: false, message: 'Der Einsatz hat noch keinen Termin.' }

  const { data: a, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .select('id, lead_id, kunde_id, titel, kunden(name, email, typ)')
    .eq('id', einsatz.auftrag_id)
    .maybeSingle()
  if (aErr) logDbError('lib/mail/ausfuehrungstermin:auftrag', aErr)
  const auftrag = a as {
    lead_id: string | null
    kunde_id: string | null
    titel: string | null
    kunden?: { name?: string | null; email?: string | null; typ?: string | null } | null
  } | null

  let leadName = ''
  let leadEmail = ''
  let leadAdresse = ''
  if (auftrag?.lead_id) {
    const { data: l, error: lErr } = await supabaseAdmin
      .from('leads')
      .select('kontakt_name, kontakt_email, strasse, hausnummer, plz')
      .eq('id', auftrag.lead_id)
      .maybeSingle()
    if (lErr) logDbError('lib/mail/ausfuehrungstermin:lead', lErr)
    const lead = l as { kontakt_name?: string | null; kontakt_email?: string | null; strasse?: string | null; hausnummer?: string | null; plz?: string | null } | null
    leadName = lead?.kontakt_name?.trim() ?? ''
    leadEmail = lead?.kontakt_email?.trim() ?? ''
    leadAdresse = [[lead?.strasse, lead?.hausnummer].filter(Boolean).join(' '), lead?.plz].filter(Boolean).join(', ')
  }

  const an = leadEmail || auftrag?.kunden?.email?.trim() || ''
  if (!an) return { ok: false, message: 'Beim Kunden ist keine E-Mail-Adresse hinterlegt.' }
  const name = leadName || auftrag?.kunden?.name?.trim() || ''

  let betrieb: string | null = null
  if (einsatz.handwerker_id) {
    const { data: h } = await supabaseAdmin.from('handwerker').select('name, firma').eq('id', einsatz.handwerker_id).maybeSingle()
    const hw = h as { name?: string | null; firma?: string | null } | null
    betrieb = hw?.firma?.trim() || hw?.name?.trim() || null
  }

  const von = einsatz.termin_von
  const bis = einsatz.termin_bis && einsatz.termin_bis !== einsatz.termin_von ? einsatz.termin_bis : null
  const datumFmt = bis ? `${datumDe(von)} bis ${datumDe(bis)}` : datumDe(von)

  const b = await getMailBranding()
  const statusLink = await projektOderStatusLink(auftrag?.lead_id ?? null)
  const built = mailAusfuehrungstermin(
    {
      name,
      titel: einsatz.titel?.trim() || auftrag?.titel?.trim() || 'Arbeiten',
      datumFmt,
      adresse: einsatz.ort?.trim() || leadAdresse,
      betrieb,
      statusLink,
      kundeTyp: auftrag?.kunden?.typ ?? null,
      geaendert: input.geaendert,
    },
    b
  )

  const emailLogId = randomUUID()
  const r = await sendMail({
    typ: 'ausfuehrungstermin',
    an,
    anName: name || null,
    betreff: built.betreff,
    html: `${emailLogHtmlMarker(emailLogId)}${built.html}`,
    leadId: auftrag?.lead_id ?? null,
    kundeId: auftrag?.kunde_id ?? null,
    kontextTyp: 'auftrag',
    emailLogId,
    from: process.env.RESEND_FROM_ANFRAGEN ?? process.env.RESEND_FROM_EMAIL,
  })
  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }

  if (auftrag?.lead_id) {
    await logLeadEmailTimelineEvent({
      leadId: auftrag.lead_id,
      emailLogId: r.emailLogId ?? emailLogId,
      titel: input.quelle === 'handwerker' ? 'Ausführungstermin bestätigt (vom Handwerker eingetragen)' : 'Ausführungstermin bestätigt',
      beschreibung: `${built.betreff} · An ${an}`,
    })
  }
  return { ok: true, an }
}
