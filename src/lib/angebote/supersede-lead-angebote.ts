import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  angebotSollBeiAnnahmeErsetztWerden,
  resolveStatusEinfach,
  type AngebotStatusEinfach,
} from '@/lib/angebot-einfach'

type AngebotDbClient = ReturnType<typeof createClient> | typeof supabaseAdmin

type SiblingRow = {
  id: string
  status: string
  status_einfach?: string | null
  gueltig_bis?: string | null
}

/**
 * Angebote desselben Leads bei Annahme entwerten (nur eines darf „angenommen“ sein).
 * Mehrere Angebote pro Anfrage sind erlaubt — Entwertung erst bei Annahme.
 *
 * reason `neue_version`: bewusst no-op für Status (parallele Angebote bleiben).
 * reason `annahme`: Geschwister → ersetzt (+ ersetzt_durch).
 */
export async function supersedeLeadAngebote(
  supabase: AngebotDbClient,
  leadId: string,
  activeAngebotId: string,
  reason: 'neue_version' | 'annahme'
): Promise<void> {
  if (reason === 'neue_version') return

  const trimmedLead = leadId.trim()
  const activeId = activeAngebotId.trim()
  if (!trimmedLead || !activeId) return

  const { data: others } = await supabase
    .from('angebote')
    .select('id, status, status_einfach, gueltig_bis')
    .eq('lead_id', trimmedLead)
    .neq('id', activeId)

  const now = new Date().toISOString()

  for (const row of (others ?? []) as SiblingRow[]) {
    const st = resolveStatusEinfach(row)
    if (!angebotSollBeiAnnahmeErsetztWerden(st)) continue

    const patch: Record<string, unknown> = {
      status_einfach: 'ersetzt' satisfies AngebotStatusEinfach,
      status: 'abgelehnt',
      ersetzt_durch: activeId,
      updated_at: now,
    }

    const { error } = await supabase.from('angebote').update(patch).eq('id', row.id)
    if (error && /ersetzt_durch|korrektur_von|schema cache|column/i.test(error.message)) {
      delete patch.ersetzt_durch
      await supabase.from('angebote').update(patch).eq('id', row.id)
    }
  }
}
