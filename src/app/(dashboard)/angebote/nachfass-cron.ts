'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAngebotNachfassMailForRow } from '@/lib/angebote/send-angebot-nachfass-mail'
import { erinnerungReferenzAm } from '@/lib/angebot-einfach'

const NACHFASS_TAGE = 7

/** Angebote, die vor ≥7 Tagen an den Kunden gingen und noch offen sind (keine Reaktion). */
export async function runAngebotNachfassCron(): Promise<{
  ok: true
  bearbeitet: number
  details: string[]
}> {
  const details: string[] = []
  const now = new Date()
  const grenze = new Date(now)
  grenze.setDate(grenze.getDate() - NACHFASS_TAGE)

  const { data: rows, error } = await supabaseAdmin
    .from('angebote')
    .select(
      `
      id,
      lead_id,
      angebotsnr,
      leistungsumfang,
      gesendet_am,
      gesendet_kunde_at,
      verlaengert_am,
      notizen,
      anrede,
      status,
      status_einfach,
      kunden(name, email, typ, vorname, nachname),
      leads(plz, kontakt_name, kundentyp)
    `
    )
    .eq('status_einfach', 'gesendet')
    .is('nachgefasst_am', null)

  if (error) return { ok: true, bearbeitet: 0, details: [error.message] }

  let bearbeitet = 0

  for (const row of rows ?? []) {
    const refIso = erinnerungReferenzAm({
      gesendet_am: row.gesendet_am as string | null,
      gesendet_kunde_at: row.gesendet_kunde_at as string | null,
      verlaengert_am: row.verlaengert_am as string | null,
    })
    if (!refIso) {
      details.push(`${row.id}: noch nicht an Kunden versendet`)
      continue
    }
    if (new Date(refIso) > grenze) {
      continue
    }

    const mail = await sendAngebotNachfassMailForRow(row, { skipIfAlreadySent: true })
    if (!mail.ok) {
      details.push(`${row.id}: ${mail.message}`)
      continue
    }
    if ('skipped' in mail) continue

    bearbeitet++
    details.push(`${mail.nr}: Nachfass an ${mail.email}`)
  }

  return { ok: true, bearbeitet, details }
}
