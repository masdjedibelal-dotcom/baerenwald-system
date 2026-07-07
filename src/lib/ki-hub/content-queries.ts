import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

export const KI_CONTENT_BUCKET = 'ki-content'

export type KiContentRow = {
  id: string
  empfehlung_id: string | null
  typ: string
  text_content: string | null
  bild_url: string | null
  bild_prompt: string | null
  status: string
  publiziert_at: string | null
  created_at: string
}

export function kiContentPublicUrl(path: string): string {
  const { data } = supabaseAdmin.storage.from(KI_CONTENT_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function loadContentForEmpfehlung(empfehlungId: string): Promise<KiContentRow[]> {
  const { data } = await supabaseAdmin
    .from('ki_content')
    .select('*')
    .eq('empfehlung_id', empfehlungId)
    .order('created_at', { ascending: false })
    .limit(5)

  return (data ?? []) as KiContentRow[]
}

export async function saveKiContent(row: {
  empfehlung_id?: string | null
  typ: string
  text_content?: string | null
  bild_url?: string | null
  bild_prompt?: string | null
  status?: string
}): Promise<KiContentRow | null> {
  const { data, error } = await supabaseAdmin
    .from('ki_content')
    .insert({
      empfehlung_id: row.empfehlung_id ?? null,
      typ: row.typ,
      text_content: row.text_content ?? null,
      bild_url: row.bild_url ?? null,
      bild_prompt: row.bild_prompt ?? null,
      status: row.status ?? 'generiert',
    })
    .select('*')
    .single()

  if (error) {
    console.error('saveKiContent', error.message)
    return null
  }
  return data as KiContentRow
}

export async function uploadKiContentImage(
  empfehlungId: string,
  imageUrl: string
): Promise<{ path: string; publicUrl: string }> {
  const res = await fetch(imageUrl, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Bild-Download fehlgeschlagen (${res.status})`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const path = `${empfehlungId}/${Date.now()}.webp`

  const { error } = await supabaseAdmin.storage.from(KI_CONTENT_BUCKET).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) throw new Error(error.message)

  return { path, publicUrl: kiContentPublicUrl(path) }
}

export async function updateEmpfehlungBildUrl(
  empfehlungId: string,
  bildUrl: string
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('ki_empfehlungen')
    .select('content')
    .eq('id', empfehlungId)
    .maybeSingle()

  const content = (data?.content as Record<string, unknown> | null) ?? {}
  await supabaseAdmin
    .from('ki_empfehlungen')
    .update({ content: { ...content, bild_url: bildUrl } })
    .eq('id', empfehlungId)
}
