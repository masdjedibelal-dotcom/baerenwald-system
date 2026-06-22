import type { SupabaseClient } from '@supabase/supabase-js'

export type InsertLeadTimelineInput = {
  lead_id: string
  angebot_id?: string | null
  typ?: string
  titel: string
  beschreibung?: string | null
  email_log_id?: string | null
  erstellt_von?: string | null
}

export async function insertLeadTimelineEvent(
  supabase: SupabaseClient,
  input: InsertLeadTimelineInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('lead_timeline')
    .insert({
      lead_id: input.lead_id,
      angebot_id: input.angebot_id ?? null,
      typ: input.typ ?? 'angebot',
      titel: input.titel,
      beschreibung: input.beschreibung ?? null,
      email_log_id: input.email_log_id ?? null,
      erstellt_von: input.erstellt_von ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Timeline-Eintrag fehlgeschlagen' }
  }
  return { ok: true, id: data.id as string }
}
