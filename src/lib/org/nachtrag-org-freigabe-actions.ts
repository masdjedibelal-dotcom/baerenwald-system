'use server'

<<<<<<< Updated upstream
import { revalidateAuftragDetail, revalidateLeadDetail } from '@/lib/crm-revalidate'
=======
>>>>>>> Stashed changes
import { logDbError } from '@/lib/errors/log-db-error'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { syncOrgFreigabeNachNachtrag } from '@/lib/org/org-freigabe-logic'
import { writeNachtragStatus } from '@/lib/status/write-nachtrag-status'
/** CRM genehmigt Nachtrag → ggf. HV-Freigabe nach Schwelle (8b: nur CRM wenn unter Schwelle). */
export async function genehmigeOrgNachtrag(
  nachtragId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const db = gate.db
  const { data: nachtrag, error } = await db
    .from('nachtraege')
    .select('id, gesamt_max, gesamt_min, status')
    .eq('id', nachtragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
  if (error) logDbError('lib/org/nachtrag-org-freigabe-actions:nachtraege', error)

  if (!nachtrag) return { ok: false, message: 'Nachtrag nicht gefunden.' }

  const betrag = Number(nachtrag.gesamt_max ?? nachtrag.gesamt_min ?? 0)
  if (!Number.isFinite(betrag) || betrag <= 0) {
    return { ok: false, message: 'Nachtrag ohne gültigen Betrag.' }
  }

  const { data: auftrag, error: error2 } = await db
    .from('auftraege')
    .select('lead_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (error2) logDbError('lib/org/nachtrag-org-freigabe-actions:auftraege', error2)

  const leadId = (auftrag as { lead_id?: string } | null)?.lead_id?.trim()
  if (!leadId) return { ok: false, message: 'Kein Lead — Org-Freigabe nicht anwendbar.' }

  const { error: __dbErr1 } = await writeNachtragStatus(db, nachtragId, 'genehmigt')
  if (__dbErr1) logDbError('lib/org/nachtrag-org-freigabe-actions:nachtraege', __dbErr1)

  const sync = await syncOrgFreigabeNachNachtrag({ leadId, nachtragBetragEur: betrag })

  await writeAuditEvent({
    entityType: 'lead',
    entityId: leadId,
    aktion: 'nachtrag_crm_genehmigt',
    actorRolle: 'crm',
    payload: { nachtrag_id: nachtragId, betrag_eur: betrag, org_freigabe: sync.ok ? sync.status : null },
  })

  revalidateAuftragDetail(auftragId)
  revalidateLeadDetail(leadId)
  return { ok: true }
}
