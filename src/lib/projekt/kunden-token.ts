import 'server-only'

import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Stellt sicher, dass der Auftrag einen `kunden_token` hat (Migration / Altbestände). */
export async function ensureKundenTokenForAuftrag(auftragId: string): Promise<string | null> {
  const { data: row, error: selErr } = await supabaseAdmin
    .from('auftraege')
    .select('kunden_token')
    .eq('id', auftragId)
    .maybeSingle()
  if (selErr || !row) return null
  const existing = row.kunden_token as string | null | undefined
  if (existing && String(existing).length > 0) return String(existing)

  const token = randomBytes(32).toString('hex')
  const { error: upErr } = await supabaseAdmin.from('auftraege').update({ kunden_token: token }).eq('id', auftragId)
  if (upErr) return null
  return token
}
