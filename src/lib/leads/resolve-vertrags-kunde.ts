import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import { leadVertragsKundeId } from '@/lib/lead-display-helpers'

/**
 * Löst den Vertragskunden eines Leads auf (HV bei Mieter-Meldung, sonst Melder).
 * Für Server-Actions beim Anlegen von Angebot / Auftrag / Rechnung.
 */
export async function resolveVertragsKundeIdForLead(
  supabase: SupabaseClient,
  leadId: string | null | undefined,
  fallbackKundeId?: string | null
): Promise<string | null> {
  const fallback = fallbackKundeId?.trim() || null
  const id = leadId?.trim()
  if (!id) return fallback

  const { data, error } = await supabase
    .from('leads')
    .select('kunde_id, auftraggeber_kunde_id')
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('lib/leads/resolve-vertrags-kunde:leads', error)

  if (!data) return fallback
  return leadVertragsKundeId(data) ?? fallback
}
