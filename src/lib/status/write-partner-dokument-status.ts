/**
 * Status-Writes für partner_dokumente (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planPartnerDokumentStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writePartnerDokumentStatus(
  supabase: SupabaseClient,
  dokumentId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planPartnerDokumentStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('partner_dokumente').update(patch).eq('id', dokumentId)
}
