'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden' }
  return { ok: true as const, userId: user.id }
}

export async function createAuftragDokumentEintrag(input: {
  auftragId: string
  titel: string
  beschreibung?: string | null
  foto_urls: string[]
  fuerKunde?: boolean
}): Promise<{ ok: true; timelineId: string } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const titel = input.titel.trim()
  if (!titel) return { ok: false, message: 'Name fehlt' }
  const fotos = (input.foto_urls ?? []).filter(Boolean)
  if (!fotos.length) return { ok: false, message: 'Keine Datei' }

  const fuerKunde = input.fuerKunde ?? false
  const tl = await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'notiz_intern',
    titel,
    beschreibung: input.beschreibung?.trim() || null,
    foto_urls: fotos,
    erstellt_von: gate.userId,
    fuer_kunde_freigegeben: fuerKunde,
    sichtbar_fuer_kunde: fuerKunde,
  })
  if (!tl.ok) return { ok: false, message: tl.message ?? 'Speichern fehlgeschlagen' }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, timelineId: tl.id ?? '' }
}

export async function updateAuftragDokumentMeta(input: {
  auftragId: string
  timelineId: string
  titel: string
  beschreibung?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_timeline')
    .update({
      titel: input.titel.trim(),
      beschreibung: input.beschreibung?.trim() || null,
    })
    .eq('id', input.timelineId)
    .eq('auftrag_id', input.auftragId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function deleteAuftragDokumentEintrag(input: {
  auftragId: string
  timelineId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_timeline')
    .delete()
    .eq('id', input.timelineId)
    .eq('auftrag_id', input.auftragId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

/** Signierte URLs für Handwerker-Uploads (Bucket handwerker-uploads). */
export async function signHandwerkerDokumentStoragePaths(
  paths: string[]
): Promise<{ ok: true; urls: Record<string, string> } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const unique = Array.from(new Set(paths.map((p) => p.trim()).filter(Boolean)))
  if (!unique.length) return { ok: true, urls: {} }

  const urls: Record<string, string> = {}
  await Promise.all(
    unique.map(async (path) => {
      const signed = await signedHandwerkerUploadUrl(path)
      if (signed) urls[path] = signed
    })
  )
  return { ok: true, urls }
}
