import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mail-service'
import { getMailBranding } from '@/lib/get-mail-branding'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { parseAngebotAnrede } from '@/lib/templates/angebot-mail'
import { buildAngebotNachfassMail } from '@/lib/mail/angebot-nachfass-mail'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import { erledigeInterneNachfassTodos } from '@/lib/kalender-auto-termine'

type NachfassAngebotRow = {
  id: string
  lead_id: string | null
  angebotsnr: string | null
  leistungsumfang: string | null
  notizen: string | null
  anrede: string | null
  nachgefasst_am?: string | null
  kunden:
    | {
        name?: string | null
        email?: string | null
        typ?: string | null
        vorname?: string | null
        nachname?: string | null
      }
    | {
        name?: string | null
        email?: string | null
        typ?: string | null
        vorname?: string | null
        nachname?: string | null
      }[]
    | null
  leads:
    | { plz?: string | null; kontakt_name?: string | null; kundentyp?: string | null }
    | { plz?: string | null; kontakt_name?: string | null; kundentyp?: string | null }[]
    | null
}

function unwrapRow<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

export async function sendAngebotNachfassMailForRow(
  row: NachfassAngebotRow,
  options?: { skipIfAlreadySent?: boolean }
): Promise<
  { ok: true; email: string; nr: string } | { ok: false; message: string } | { ok: true; skipped: true }
> {
  if (options?.skipIfAlreadySent && row.nachgefasst_am) {
    return { ok: true, skipped: true }
  }

  const kunde = unwrapRow(row.kunden)
  const leadRow = unwrapRow(row.leads)
  const email = kunde?.email?.trim()
  if (!email) return { ok: false, message: 'Keine Kunden-E-Mail hinterlegt.' }

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
  const nr = row.angebotsnr?.trim() || row.id.slice(0, 8).toUpperCase()
  const projektTitel =
    row.leistungsumfang?.trim() ||
    leadRow?.kontakt_name?.trim() ||
    kunde?.name?.trim() ||
    'Ihr Projekt'

  const branding = await getMailBranding(supabaseAdmin)
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
    angebotId: row.id,
    leadId: row.lead_id ?? undefined,
  })

  if (!mail.success) {
    return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen' }
  }

  const ts = new Date().toISOString()
  await supabaseAdmin.from('angebote').update({ nachgefasst_am: ts }).eq('id', row.id)

  const leadId = row.lead_id
  if (leadId) {
    await supabaseAdmin.from('lead_timeline').insert({
      lead_id: leadId,
      angebot_id: row.id,
      typ: 'angebot_nachfass',
      titel: 'Nachfass: Rückfrage zum Angebot',
      beschreibung: `${nr} · ${email}`,
    })
    await erledigeInterneNachfassTodos(leadId, nr)
  }

  return { ok: true, email, nr }
}

export async function sendAngebotNachfassMailById(
  angebotId: string,
  options?: { skipIfAlreadySent?: boolean }
): Promise<
  { ok: true; email: string; nr: string } | { ok: false; message: string } | { ok: true; skipped: true }
> {
  const { data: row, error } = await supabaseAdmin
    .from('angebote')
    .select(
      `
      id,
      lead_id,
      angebotsnr,
      leistungsumfang,
      notizen,
      anrede,
      nachgefasst_am,
      kunden(name, email, typ, vorname, nachname),
      leads(plz, kontakt_name, kundentyp)
    `
    )
    .eq('id', angebotId)
    .maybeSingle()

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Angebot nicht gefunden' }
  }

  return sendAngebotNachfassMailForRow(row as NachfassAngebotRow, options)
}
