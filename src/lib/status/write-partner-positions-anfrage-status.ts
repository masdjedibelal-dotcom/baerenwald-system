/**
 * Status-Writes für partner_positions_anfragen (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planPartnerPositionsAnfrageStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writePartnerPositionsAnfrageStatus(
  supabase: SupabaseClient,
  anfrageId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planPartnerPositionsAnfrageStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('partner_positions_anfragen').update(patch).eq('id', anfrageId)
}
