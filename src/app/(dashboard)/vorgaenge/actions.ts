'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type VorgangEntityRef =
  | { kind: 'lead'; id: string }
  | { kind: 'angebot'; id: string }
  | { kind: 'auftrag'; id: string }
  | { kind: 'rechnung'; id: string }

async function deleteByIds(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string,
  ids: string[]
): Promise<string | null> {
  if (!ids.length) return null
  const { error } = await supabase.from(table).delete().in(column, ids)
  return error ? `${table}: ${error.message}` : null
}

/** HV-Glocke: Notifs zu diesem Lead entfernen (Link enthält lead-id). */
async function deleteHvNotificationsForLead(leadId: string): Promise<string | null> {
  const id = leadId.trim()
  if (!id) return null
  const { error } = await supabaseAdmin
    .from('hv_notifications')
    .delete()
    .or(`link.ilike.%id=${id}%,link.ilike.%${id}%`)
  return error ? `hv_notifications: ${error.message}` : null
}

/** Lead-ID aus beliebiger Vorgangs-Entität auflösen. */
export async function resolveLeadIdForVorgang(
  ref: VorgangEntityRef
): Promise<{ ok: true; leadId: string } | { ok: false; message: string }> {
  const supabase = createClient()

  if (ref.kind === 'lead') {
    const { data } = await supabase.from('leads').select('id').eq('id', ref.id).maybeSingle()
    if (!data?.id) return { ok: false, message: 'Anfrage nicht gefunden.' }
    return { ok: true, leadId: data.id as string }
  }

  if (ref.kind === 'angebot') {
    const { data } = await supabase.from('angebote').select('lead_id').eq('id', ref.id).maybeSingle()
    const leadId = (data as { lead_id?: string | null } | null)?.lead_id?.trim()
    if (!leadId) return { ok: false, message: 'Angebot ohne Anfrage-Verknüpfung.' }
    return { ok: true, leadId }
  }

  if (ref.kind === 'auftrag') {
    const { data } = await supabase.from('auftraege').select('lead_id').eq('id', ref.id).maybeSingle()
    const leadId = (data as { lead_id?: string | null } | null)?.lead_id?.trim()
    if (!leadId) return { ok: false, message: 'Auftrag ohne Anfrage-Verknüpfung.' }
    return { ok: true, leadId }
  }

  const { data: rechnung } = await supabase
    .from('rechnungen')
    .select('auftrag_id, angebote(lead_id), auftraege(lead_id)')
    .eq('id', ref.id)
    .maybeSingle()

  if (!rechnung) return { ok: false, message: 'Rechnung nicht gefunden.' }

  const row = rechnung as {
    auftrag_id?: string | null
    angebote?: { lead_id?: string | null } | { lead_id?: string | null }[] | null
    auftraege?: { lead_id?: string | null } | { lead_id?: string | null }[] | null
  }

  const fromEmbed = (embed: typeof row.angebote) => {
    if (!embed) return null
    const first = Array.isArray(embed) ? embed[0] : embed
    return first?.lead_id?.trim() || null
  }

  const leadId = fromEmbed(row.auftraege) ?? fromEmbed(row.angebote)
  if (!leadId) return { ok: false, message: 'Rechnung ohne Anfrage-Verknüpfung.' }
  return { ok: true, leadId }
}

/**
 * Vorgang (Anfrage + alle Angebote, Aufträge, Rechnungen) löschen.
 * Kunde bleibt erhalten. Bezahlte Rechnungen blockieren das Löschen.
 */
export async function deleteVorgang(
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const id = leadId.trim()
  if (!id) return { ok: false, message: 'Anfrage-ID fehlt.' }

  const { data: lead } = await supabase.from('leads').select('id').eq('id', id).maybeSingle()
  if (!lead?.id) return { ok: false, message: 'Vorgang nicht gefunden.' }

  const { data: auftraege } = await supabase.from('auftraege').select('id').eq('lead_id', id)
  const auftragIds = (auftraege ?? []).map((a) => a.id as string)

  const { data: angebote } = await supabase.from('angebote').select('id').eq('lead_id', id)
  const angebotIds = (angebote ?? []).map((a) => a.id as string)

  let rechnungen: Array<{ id: string; status: string }> = []
  if (auftragIds.length) {
    const { data } = await supabase.from('rechnungen').select('id, status').in('auftrag_id', auftragIds)
    rechnungen = [...rechnungen, ...((data ?? []) as Array<{ id: string; status: string }>)]
  }
  if (angebotIds.length) {
    const { data } = await supabase.from('rechnungen').select('id, status').in('angebot_id', angebotIds)
    rechnungen = [...rechnungen, ...((data ?? []) as Array<{ id: string; status: string }>)]
  }
  const bezahlt = rechnungen.filter((r) => r.status === 'bezahlt')
  if (bezahlt.length > 0) {
    return {
      ok: false,
      message: `Vorgang kann nicht gelöscht werden — ${bezahlt.length} bezahlte Rechnung(en) vorhanden. Bitte zuerst stornieren oder buchen.`,
    }
  }

  const rechnungIds = Array.from(new Set(rechnungen.map((r) => r.id as string)))
  const errors: string[] = []

  for (const err of [
    await deleteByIds(supabase, 'rechnungen', 'id', rechnungIds),
    await deleteByIds(supabase, 'kalender_termine', 'auftrag_id', auftragIds),
    await deleteByIds(supabase, 'kalender_termine', 'lead_id', [id]),
    await deleteByIds(supabase, 'ki_anfragen_log', 'lead_id', [id]),
    await deleteByIds(supabase, 'angebot_handwerker', 'angebot_id', angebotIds),
    await deleteByIds(supabase, 'angebote', 'id', angebotIds),
    await deleteByIds(supabase, 'auftraege', 'id', auftragIds),
    await deleteHvNotificationsForLead(id),
  ]) {
    if (err) errors.push(err)
  }

  // Lead erst löschen, wenn Kinder weg — sonst SET NULL auf auftraege.lead_id → Portal-Geister.
  if (errors.length) {
    return { ok: false, message: errors.join('\n') }
  }

  const { error: leadErr } = await supabase.from('leads').delete().eq('id', id)
  if (leadErr) {
    return { ok: false, message: `leads: ${leadErr.message}` }
  }

  revalidatePath('/vorgaenge')
  revalidatePath('/anfragen')
  revalidatePath('/angebote')
  revalidatePath('/auftraege')
  revalidatePath('/rechnungen')
  revalidatePath(`/anfragen/${id}`)
  return { ok: true }
}

export type BulkDeleteVorgaengeInput = {
  leadIds: string[]
  standaloneRechnungIds: string[]
}

/** Mehrere Vorgänge in einem Client-Roundtrip löschen. */
export async function bulkDeleteVorgaenge(
  input: BulkDeleteVorgaengeInput
): Promise<
  | { ok: true; okCount: number; failCount: number; errors: string[] }
  | { ok: false; message: string }
> {
  const { deleteRechnungEntwurf } = await import('@/app/(dashboard)/rechnungen/wizard-actions')

  const leadIds = Array.from(new Set(input.leadIds.map((id) => id.trim()).filter(Boolean)))
  const rechnungIds = Array.from(
    new Set(input.standaloneRechnungIds.map((id) => id.trim()).filter(Boolean))
  )

  if (!leadIds.length && !rechnungIds.length) {
    return { ok: false, message: 'Keine Vorgänge ausgewählt.' }
  }

  let okCount = 0
  let failCount = 0
  const errors: string[] = []

  for (const leadId of leadIds) {
    const r = await deleteVorgang(leadId)
    if (r.ok) okCount += 1
    else {
      failCount += 1
      errors.push(r.message)
    }
  }

  for (const rechnungId of rechnungIds) {
    const r = await deleteRechnungEntwurf(rechnungId)
    if (r.ok) okCount += 1
    else {
      failCount += 1
      errors.push(r.message)
    }
  }

  return { ok: true, okCount, failCount, errors }
}
