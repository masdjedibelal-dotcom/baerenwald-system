import { NextResponse } from 'next/server'

import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { logDbError } from '@/lib/errors/log-db-error'
import { sendeAusfuehrungsterminMail } from '@/lib/mail/ausfuehrungstermin-mail'
import { supabaseAdmin } from '@/lib/supabase-admin'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

/**
 * Portal → CRM: Handwerker hat den Ausführungstermin eingetragen.
 * CRM schickt die Bestätigung an den Kunden und vermerkt es im Verlauf des Auftrags.
 */
export async function POST(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: 'Nicht erlaubt.' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { einsatzId?: string; geaendert?: boolean }
  const einsatzId = body.einsatzId?.trim()
  if (!einsatzId) return NextResponse.json({ error: 'einsatzId fehlt.' }, { status: 400 })

  const { data: e, error } = await supabaseAdmin
    .from('einsaetze')
    .select('auftrag_id, handwerker_id, termin_von, termin_bis')
    .eq('id', einsatzId)
    .maybeSingle()
  if (error) logDbError('api/internal/partner-einsatz-termin:einsatz', error)
  if (!e) return NextResponse.json({ error: 'Einsatz nicht gefunden.' }, { status: 404 })
  const einsatz = e as { auftrag_id: string; handwerker_id: string | null; termin_von: string | null; termin_bis: string | null }

  const mail = await sendeAusfuehrungsterminMail({ einsatzId, geaendert: Boolean(body.geaendert), quelle: 'handwerker' })
  const { informiereHvAusfuehrungstermin } = await import('@/lib/org/hv-vorgang-mail')
  await informiereHvAusfuehrungstermin({ einsatzId, geaendert: Boolean(body.geaendert) })
  const datum = [einsatz.termin_von, einsatz.termin_bis && einsatz.termin_bis !== einsatz.termin_von ? einsatz.termin_bis : null]
    .filter(Boolean)
    .map((d) => String(d).slice(0, 10).split('-').reverse().join('.'))
    .join(' bis ')
  await insertAuftragTimelineEvent({
    auftrag_id: einsatz.auftrag_id,
    typ: 'handwerker_update',
    titel: body.geaendert ? 'Ausführungstermin geändert (Handwerker)' : 'Ausführungstermin eingetragen (Handwerker)',
    beschreibung: mail.ok ? `${datum} · Bestätigung an ${mail.an}` : `${datum} · Keine Mail an den Kunden: ${mail.message}`,
    handwerker_id: einsatz.handwerker_id,
  })
  return NextResponse.json({ ok: true, mailGesendet: mail.ok })
}
