import type { SupabaseClient } from '@supabase/supabase-js'
import { firmenEinstellungenToMailBranding, type MailBranding } from '@/lib/mail-branding'
import { loadCachedFirmenEinstellungen } from '@/lib/stammdaten-cache'

/** Server Actions / API: Firmen-Branding aus Stammdaten-Cache (~2 Min). */
export async function getMailBranding(_supabase?: SupabaseClient): Promise<MailBranding> {
  const f = await loadCachedFirmenEinstellungen()
  return firmenEinstellungenToMailBranding(f)
}
