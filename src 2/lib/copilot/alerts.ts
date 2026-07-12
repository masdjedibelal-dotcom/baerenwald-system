import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

export async function copilotAlertAlreadySent(
  alertType: string,
  entityType: string,
  entityId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('copilot_alerts')
    .select('id')
    .eq('alert_type', alertType)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle()
  return Boolean(data)
}

export async function recordCopilotAlert(
  alertType: string,
  entityType: string,
  entityId: string
): Promise<void> {
  await supabaseAdmin.from('copilot_alerts').upsert(
    {
      alert_type: alertType,
      entity_type: entityType,
      entity_id: entityId,
      sent_at: new Date().toISOString(),
    },
    { onConflict: 'alert_type,entity_type,entity_id' }
  )
}
