'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  KUNDEN_DOKUMENTE_BUCKET,
  kundenDokumentStoragePath,
} from '@/lib/kunden/kunden-dokumente-helpers'

const BUCKET = KUNDEN_DOKUMENTE_BUCKET

async function assertKunde(kundeId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('kunden').select('id').eq('id', kundeId).maybeSingle()
  if (error || !data) return { ok: false as const, message: 'Kunde nicht gefunden' }
  return { ok: true as const, userId: user.id }
}

export async function insertKundeDokument(input: {
  kundeId: string
  name: string
  datei_url: string
  groesse_bytes?: number | null
  typ?: string
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await assertKunde(input.kundeId)
  if (!gate.ok) return gate

  const name = input.name.trim()
  const url = input.datei_url.trim()
  if (!name) return { ok: false, message: 'Dateiname fehlt' }
  if (!url) return { ok: false, message: 'Datei-URL fehlt' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_dokumente')
    .insert({
      kunde_id: input.kundeId,
      name,
      typ: input.typ?.trim() || 'sonstiges',
      datei_url: url,
      groesse_bytes: input.groesse_bytes ?? null,
      erstellt_von: gate.userId,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath(`/kunden/${input.kundeId}`)
  revalidatePath('/kunden')
  return { ok: true, id: data.id as string }
}

export async function deleteKundeDokument(
  dokumentId: string,
  kundeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertKunde(kundeId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { data: row } = await supabase
    .from('kunden_dokumente')
    .select('datei_url')
    .eq('id', dokumentId)
    .eq('kunde_id', kundeId)
    .maybeSingle()

  const path = kundenDokumentStoragePath((row as { datei_url?: string | null } | null)?.datei_url)
  if (path) {
    await supabaseAdmin.storage.from(BUCKET).remove([path])
  }

  const { error } = await supabase
    .from('kunden_dokumente')
    .delete()
    .eq('id', dokumentId)
    .eq('kunde_id', kundeId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath('/kunden')
  return { ok: true }
}
