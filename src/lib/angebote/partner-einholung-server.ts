import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

/** Offenes Kundenangebot derselben Anfrage — LV-Karten hängen hier, sobald es eines gibt. */
export async function latestKundenAngebotIdFuerLead(leadId: string): Promise<string | null> {
  const lead = leadId.trim()
  if (!lead) return null
  const { data, error } = await supabaseAdmin
    .from('angebote')
    .select('id, ist_partner_einholung, ersetzt_durch, created_at')
    .eq('lead_id', lead)
    .order('created_at', { ascending: false })

  if (error) {
    if (/ist_partner_einholung|ersetzt_durch|column/i.test(error.message)) return null
    console.warn('[latestKundenAngebotIdFuerLead]', error.message)
    return null
  }

  const row = (data ?? []).find((r) => {
    const rec = r as {
      id: string
      ist_partner_einholung?: boolean | null
      ersetzt_durch?: string | null
    }
    if (rec.ist_partner_einholung === true) return false
    if (rec.ersetzt_durch?.trim()) return false
    return Boolean(rec.id)
  }) as { id: string } | undefined
  return row?.id ? String(row.id) : null
}

export async function partnerLvHandwerkerIdsFuerLead(leadId: string): Promise<Set<string>> {
  const lead = leadId.trim()
  const out = new Set<string>()
  if (!lead) return out
  const { data, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('handwerker_id, angebote!inner(lead_id)')
    .eq('ohne_lv', true)
    .eq('angebote.lead_id', lead)

  if (error) {
    if (/ohne_lv|column/i.test(error.message)) return out
    console.warn('[partnerLvHandwerkerIdsFuerLead]', error.message)
    return out
  }
  for (const r of data ?? []) {
    const id = String((r as { handwerker_id?: string }).handwerker_id ?? '').trim()
    if (id) out.add(id)
  }
  return out
}

/** Wizard speichert Zuweisungen neu — offene LV-Anfragen dürfen dabei nicht weg. */
export async function loescheAngebotHandwerkerAusserPartnerLv(angebotId: string): Promise<void> {
  const id = angebotId.trim()
  if (!id) return
  const { data, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id, ohne_lv')
    .eq('angebot_id', id)

  if (error) {
    if (/ohne_lv|column/i.test(error.message)) {
      await supabaseAdmin.from('angebot_handwerker').delete().eq('angebot_id', id)
      return
    }
    console.warn('[loescheAngebotHandwerkerAusserPartnerLv]', error.message)
    return
  }

  const dropIds = (data ?? [])
    .filter((r) => (r as { ohne_lv?: boolean | null }).ohne_lv !== true)
    .map((r) => String((r as { id: string }).id))
    .filter(Boolean)
  if (!dropIds.length) return

  const { error: delErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .delete()
    .in('id', dropIds)
  if (delErr) console.warn('[loescheAngebotHandwerkerAusserPartnerLv] del:', delErr.message)
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
    .select('id, handwerker_id, ohne_lv')
    .eq('angebot_id', target)

  const { data: movers } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id, handwerker_id')
    .in('angebot_id', internIds)
    .eq('ohne_lv', true)

  const moverHwIds = new Set(
    (movers ?? []).map((r) => String((r as { handwerker_id: string }).handwerker_id))
  )
  const dupRegularIds = (existing ?? [])
    .filter((r) => {
      const hwId = String((r as { handwerker_id: string }).handwerker_id)
      return moverHwIds.has(hwId) && (r as { ohne_lv?: boolean | null }).ohne_lv !== true
    })
    .map((r) => String((r as { id: string }).id))
  if (dupRegularIds.length) {
    await supabaseAdmin.from('angebot_handwerker').delete().in('id', dupRegularIds)
  }

  const taken = new Set(
    (existing ?? [])
      .filter((r) => (r as { ohne_lv?: boolean | null }).ohne_lv === true)
      .map((r) => String((r as { handwerker_id: string }).handwerker_id))
  )

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
