import 'server-only'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'

/** Verknüpft gespeicherte E-Mail mit Anfrage-Verlauf (Tab „Verlauf“). */
export async function logLeadEmailTimelineEvent(input: {
  leadId: string
  emailLogId: string | null | undefined
  titel: string
  beschreibung?: string | null
  typ?: string
  angebotId?: string | null
}): Promise<void> {
  const leadId = input.leadId.trim()
  const emailLogId = input.emailLogId?.trim()
  if (!leadId || !emailLogId) return

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tl = await insertLeadTimelineEvent(supabaseAdmin, {
    lead_id: leadId,
    angebot_id: input.angebotId ?? null,
    typ: input.typ ?? 'email',
    titel: input.titel,
    beschreibung: input.beschreibung ?? null,
    email_log_id: emailLogId,
    erstellt_von: user?.id ?? null,
  })
  if (!tl.ok) {
    console.warn('[logLeadEmailTimelineEvent]', tl.message)
  }
  revalidatePath(`/anfragen/${leadId}`)
}
