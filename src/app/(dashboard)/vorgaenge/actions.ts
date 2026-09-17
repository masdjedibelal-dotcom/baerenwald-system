'use server'

import { revalidatePath } from 'next/cache'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { createClient } from '@/lib/supabase-server'

export type VorgangEntityRef =
  | { kind: 'lead'; id: string }
  | { kind: 'angebot'; id: string }
  | { kind: 'auftrag'; id: string }
  | { kind: 'rechnung'; id: string }

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
 * Vorgang (Anfrage) soft-löschen — Portal blendet Soft-Deletes aus (Shared DB).
 * Auch mit bezahlten/erledigten Rechnungen erlaubt. Kunde bleibt erhalten.
 */
export async function deleteVorgang(
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = leadId.trim()
  if (!id) return { ok: false, message: 'Anfrage-ID fehlt.' }

  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }

  const { softDeleteLeadForPortal } = await import('@/lib/portal/soft-delete-lead')
  const r = await softDeleteLeadForPortal({ leadId: id })
  if (!r.ok) return r

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
