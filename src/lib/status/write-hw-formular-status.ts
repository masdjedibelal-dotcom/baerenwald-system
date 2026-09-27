/**
 * Status-Writes für hw_formular_einreichungen (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: API formular/[token] `ausgefuellt`; submit `abgeschlossen`.
 * `offen` in HwFormularEinreichungStatus nur Lesepfad/Default — nicht über Helfer geschrieben.
 */
export const HW_FORMULAR_WRITE_STATUSES = ['ausgefuellt', 'abgeschlossen'] as const

export type HwFormularWriteStatus = (typeof HW_FORMULAR_WRITE_STATUSES)[number]

export function planHwFormularStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('hw_formular', key, HW_FORMULAR_WRITE_STATUSES)
  return { status: key, ...extra }
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
