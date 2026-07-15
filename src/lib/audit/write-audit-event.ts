import { supabaseAdmin } from '@/lib/supabase-admin'

export type AuditEventInput = {
  entityType: string
  entityId: string
  aktion: string
  actorId?: string | null
  actorRolle?: string | null
  kundeId?: string | null
  payload?: Record<string, unknown>
}

/** Append-only Audit-Eintrag (service_role) — Spiegel Portal. */
export async function writeAuditEvent(input: AuditEventInput): Promise<void> {
  const { error } = await supabaseAdmin.from('audit_events').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    aktion: input.aktion,
    actor_id: input.actorId ?? null,
    actor_rolle: input.actorRolle ?? 'crm',
    kunde_id: input.kundeId ?? null,
    payload: input.payload ?? {},
  })
  if (error) console.error('[audit]', input.aktion, error.message)
}
