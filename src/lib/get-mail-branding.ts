import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { firmenEinstellungenToMailBranding, type MailBranding } from '@/lib/mail-branding'

/** Server Actions / API: Firmen-Branding aus Supabase laden. */
export async function getMailBranding(supabase: SupabaseClient): Promise<MailBranding> {
  const f = await fetchFirmenEinstellungen(supabase)
  return firmenEinstellungenToMailBranding(f)
}
