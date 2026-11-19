'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { istTeo } from '@/lib/marke'

/** Servus TEO: Vorgang (Anfrage) einem Teammitglied zuordnen oder die Zuordnung lösen. */
export async function setVorgangZustaendig(
  leadId: string,
  userId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!istTeo) return { ok: false, message: 'Nicht verfügbar.' }
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }

  const id = userId?.trim() || null
  if (id) {
    const { loadCrmTeamMitglieder } = await import('@/lib/crm-team')
    const team = await loadCrmTeamMitglieder()
    if (!team.some((m) => m.id === id)) {
      return { ok: false, message: 'Teammitglied nicht gefunden.' }
    }
  }

  const { error } = await gate.db
    .from('leads')
    .update({ zustaendig_id: id } as never)
    .eq('id', leadId)
  if (error) {
    logDbError('app/actions/vorgang-zustaendig:leads', error)
    if (/zustaendig_id/i.test(error.message)) {
      return { ok: false, message: 'Spalte „zustaendig_id“ fehlt — Migration 20270106120000_lead_zustaendig.sql ausführen.' }
    }
    return { ok: false, message: error.message }
  }
  return { ok: true }
}
