/**
 * Status-Writes für hw_formular_einreichungen (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planHwFormularStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writeHwFormularStatusByToken(
  supabase: SupabaseClient,
  token: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planHwFormularStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('hw_formular_einreichungen').update(patch).eq('token', token)
}
