import { supabaseAdmin } from '@/lib/supabase-admin'

export function istKundenAngebot(row: {
  ist_partner_einholung?: boolean | null
} | null | undefined): boolean {
  return row?.ist_partner_einholung !== true
}

export function filterKundenAngebote<T extends { ist_partner_einholung?: boolean | null }>(
  rows: T[] | null | undefined
): T[] {
  return (rows ?? []).filter(istKundenAngebot)
}

/** Partner-Einholungen vom internen Gehäuse auf das Kundenangebot ziehen. */
export async function reparentPartnerEinholungenZuKundenangebot(
  leadId: string,
  kundenAngebotId: string
): Promise<void> {
  const lead = leadId.trim()
  const target = kundenAngebotId.trim()
  if (!lead || !target) return

  const { data: intern, error } = await supabaseAdmin
    .from('angebote')
    .select('id')
    .eq('lead_id', lead)
    .eq('ist_partner_einholung', true)

  if (error) {
    if (/ist_partner_einholung|column/i.test(error.message)) return
    console.warn('[reparentPartnerEinholungen]', error.message)
    return
  }

  const internIds = (intern ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => id && id !== target)
  if (!internIds.length) return

  const { data: existing } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('handwerker_id')
    .eq('angebot_id', target)
  const taken = new Set(
    (existing ?? []).map((r) => String((r as { handwerker_id: string }).handwerker_id))
  )

  const { data: movers } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id, handwerker_id')
    .in('angebot_id', internIds)
    .eq('ohne_lv', true)

  const ids = (movers ?? [])
    .filter((r) => !taken.has(String((r as { handwerker_id: string }).handwerker_id)))
    .map((r) => String((r as { id: string }).id))
  if (!ids.length) return

  const { error: upErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({ angebot_id: target })
    .in('id', ids)

  if (upErr && !/ohne_lv|column/i.test(upErr.message)) {
    console.warn('[reparentPartnerEinholungen] AH:', upErr.message)
  }
}
