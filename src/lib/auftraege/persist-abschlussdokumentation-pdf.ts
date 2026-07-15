import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

/** Speichert Abschlussdokumentation im Bucket `protokolle` (wie Abnahmeprotokoll). */
export async function persistAbschlussdokumentationPdf(
  auftragId: string,
  buffer: Buffer
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const path = `${auftragId}/abschlussdokumentation-${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('protokolle')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('protokolle').getPublicUrl(path)
  const publicUrl = pub.publicUrl?.trim()
  if (!publicUrl) return { ok: false, message: 'PDF-URL konnte nicht erzeugt werden.' }

  return { ok: true, publicUrl }
}
