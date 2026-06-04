'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mail-service'
import { getMailBranding } from '@/lib/mail-branding'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { parseAngebotAnrede } from '@/lib/templates/angebot-mail'
import { buildAngebotNachfassMail } from '@/lib/mail/angebot-nachfass-mail'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
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
      kunden(name, email, typ, vorname, nachname, firma),
      leads(plz, kontakt_name, kundentyp)
    `
    )
    .eq('status_einfach', 'gesendet')
    .is('nachgefasst_am', null)

  if (error) return { ok: true, bearbeitet: 0, details: [error.message] }

  const branding = await getMailBranding(supabaseAdmin)
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

    const kundeRaw = row.kunden as
      | {
          name?: string
          email?: string | null
          typ?: string | null
          vorname?: string | null
          nachname?: string | null
          firma?: string | null
        }
      | {
          name?: string
          email?: string | null
          typ?: string | null
          vorname?: string | null
          nachname?: string | null
          firma?: string | null
        }[]
      | null
    const kunde = Array.isArray(kundeRaw) ? kundeRaw[0] : kundeRaw
    const leadRaw = row.leads as
      | { plz?: string | null; kontakt_name?: string | null; kundentyp?: string | null }
      | { plz?: string | null; kontakt_name?: string | null; kundentyp?: string | null }[]
      | null
    const leadRow = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw

    const email = kunde?.email?.trim()
    if (!email) {
      details.push(`${row.id}: keine E-Mail`)
      continue
    }

    const empfaenger = kundeRechnungsempfaengerAusStammdaten(
      kunde as Parameters<typeof kundeRechnungsempfaengerAusStammdaten>[0],
      {
        plz: leadRow?.plz ?? null,
        kontakt_name: leadRow?.kontakt_name ?? null,
      }
    )
    const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, leadRow?.kundentyp)
    const anrede =
      row.anrede === 'sie' || row.anrede === 'du'
        ? row.anrede
        : parseAngebotAnrede(row.notizen, kundeTyp)
    const nr = (row.angebotsnr as string | null)?.trim() || row.id.slice(0, 8).toUpperCase()
    const projektTitel =
      (row.leistungsumfang as string | null)?.trim() ||
      leadRow?.kontakt_name?.trim() ||
      kunde?.name?.trim() ||
      'Ihr Projekt'

    const tpl = buildAngebotNachfassMail(
      {
        anrede,
        begruessung: kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger)),
        angebotsnummer: nr,
        projektTitel,
      },
      branding
    )

    const mail = await sendMail({
      typ: 'angebot_nachfass',
      an: email,
      anName: empfaenger.name,
      betreff: tpl.betreff,
      html: tpl.html,
      angebotId: row.id as string,
      leadId: (row.lead_id as string | null) ?? undefined,
    })

    if (!mail.success) {
      details.push(`${nr}: Versand fehlgeschlagen — ${mail.error ?? 'unbekannt'}`)
      continue
    }

    const ts = new Date().toISOString()
    await supabaseAdmin.from('angebote').update({ nachgefasst_am: ts }).eq('id', row.id)

    const leadId = (row as { lead_id?: string }).lead_id
    if (leadId) {
      await supabaseAdmin.from('lead_timeline').insert({
        lead_id: leadId,
        angebot_id: row.id,
        typ: 'angebot_nachfass',
        titel: 'Nachfass: Rückfrage zum Angebot',
        beschreibung: `${nr} · ${email}`,
      })
    }

    bearbeitet++
    details.push(`${nr}: Nachfass an ${email}`)
  }

  return { ok: true, bearbeitet, details }
}
