import 'server-only'

export { supabaseAdmin, getSupabaseAdmin } from '@/lib/supabase-admin'
export { sendMail } from '@/lib/mail-service'
export { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
export { ensureKundenTokenForAuftrag } from '@/lib/projekt/kunden-token'
export { projektUrlFromToken } from '@/lib/projekt/projekt-url'
