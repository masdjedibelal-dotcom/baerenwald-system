'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  LEAD_DOKUMENTE_BUCKET,
  leadDokumentStoragePath,
} from '@/lib/anfragen/lead-dokumente-helpers'

const BUCKET = LEAD_DOKUMENTE_BUCKET

async function assertLead(leadId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('leads').select('id').eq('id', leadId).maybeSingle()
  if (error || !data) return { ok: false as const, message: 'Anfrage nicht gefunden' }
  return { ok: true as const, userId: user.id }
}

export async function insertLeadDokument(input: {
  leadId: string
  name: string
  datei_url: string
  groesse_bytes?: number | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await assertLead(input.leadId)
  if (!gate.ok) return gate

  const name = input.name.trim()
  const url = input.datei_url.trim()
  if (!name) return { ok: false, message: 'Dateiname fehlt' }
  if (!url) return { ok: false, message: 'Datei-URL fehlt' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_dokumente')
    .insert({
      lead_id: input.leadId,
      name,
      datei_url: url,
      groesse_bytes: input.groesse_bytes ?? null,
      erstellt_von: gate.userId,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath(`/anfragen/${input.leadId}`)
  revalidatePath('/anfragen')
  return { ok: true, id: data.id as string }
}

export async function deleteLeadDokument(
  dokumentId: string,
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertLead(leadId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { data: row } = await supabase
    .from('lead_dokumente')
    .select('datei_url')
    .eq('id', dokumentId)
    .eq('lead_id', leadId)
    .maybeSingle()

  const path = leadDokumentStoragePath((row as { datei_url?: string | null } | null)?.datei_url)
  if (path) {
    await supabaseAdmin.storage.from(BUCKET).remove([path])
  }

  const { error } = await supabase
    .from('lead_dokumente')
    .delete()
    .eq('id', dokumentId)
    .eq('lead_id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { ok: true }
}
