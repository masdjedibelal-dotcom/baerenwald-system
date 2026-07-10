'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { syncOrgFreigabeNachNachtrag } from '@/lib/org/org-freigabe-logic'
import { revalidatePath } from 'next/cache'

/** CRM genehmigt Nachtrag → ggf. HV-Freigabe nach Schwelle (8b: nur CRM wenn unter Schwelle). */
export async function genehmigeOrgNachtrag(
  nachtragId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: nachtrag } = await supabaseAdmin
    .from('nachtraege')
    .select('id, gesamt_max, gesamt_min, status')
    .eq('id', nachtragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (!nachtrag) return { ok: false, message: 'Nachtrag nicht gefunden.' }

  const betrag = Number(nachtrag.gesamt_max ?? nachtrag.gesamt_min ?? 0)
  if (!Number.isFinite(betrag) || betrag <= 0) {
    return { ok: false, message: 'Nachtrag ohne gültigen Betrag.' }
  }

  const { data: auftrag } = await supabaseAdmin
    .from('auftraege')
    .select('lead_id')
    .eq('id', auftragId)
    .maybeSingle()

  const leadId = (auftrag as { lead_id?: string } | null)?.lead_id?.trim()
  if (!leadId) return { ok: false, message: 'Kein Lead — Org-Freigabe nicht anwendbar.' }

  await supabaseAdmin
    .from('nachtraege')
    .update({ status: 'genehmigt', updated_at: new Date().toISOString() })
    .eq('id', nachtragId)

  const sync = await syncOrgFreigabeNachNachtrag({ leadId, nachtragBetragEur: betrag })

  await writeAuditEvent({
    entityType: 'lead',
    entityId: leadId,
    aktion: 'nachtrag_crm_genehmigt',
    actorRolle: 'crm',
    payload: { nachtrag_id: nachtragId, betrag_eur: betrag, org_freigabe: sync.ok ? sync.status : null },
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}
