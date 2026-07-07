'use server'

import { createClient } from '@/lib/supabase-server'

export type EmailLogDetail = {
  id: string
  typ: string
  kontext_typ: string | null
  richtung: string
  an_email: string
  von_email: string | null
  cc_email: string | null
  an_name: string | null
  betreff: string
  inhalt_html: string | null
  status: string
  fehler_nachricht: string | null
  anhang_dateiname: string | null
  angebot_id: string | null
  auftrag_id: string | null
  created_at: string
}

export async function loadEmailLogDetail(
  id: string
): Promise<{ ok: true; row: EmailLogDetail } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('email_log')
    .select(
      'id, typ, kontext_typ, richtung, an_email, von_email, cc_email, an_name, betreff, inhalt_html, status, fehler_nachricht, anhang_dateiname, angebot_id, auftrag_id, created_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: 'E-Mail nicht gefunden' }
  return { ok: true, row: data as EmailLogDetail }
}
