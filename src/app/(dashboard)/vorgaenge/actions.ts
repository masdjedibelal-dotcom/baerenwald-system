'use server'

import { revalidateLeadDetail,revalidateVorgaengeListe } from '@/lib/crm-revalidate';
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role';

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

  revalidateVorgaengeListe()
  revalidateLeadDetail(id)
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
