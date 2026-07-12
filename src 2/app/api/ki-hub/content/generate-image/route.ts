import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  loadContentForEmpfehlung,
  saveKiContent,
  updateEmpfehlungBildUrl,
  uploadKiContentImage,
} from '@/lib/ki-hub/content-queries'
import { generateMarketingImage } from '@/lib/ki-hub/replicate-marketing'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: { empfehlung_id?: string; bild_prompt?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const empfehlungId = body.empfehlung_id?.trim()
  if (!empfehlungId) {
    return NextResponse.json({ error: 'empfehlung_id fehlt' }, { status: 400 })
  }

  const { data: empfehlung } = await supabaseAdmin
    .from('ki_empfehlungen')
    .select('id, content, bereich')
    .eq('id', empfehlungId)
    .maybeSingle()

  if (!empfehlung) {
    return NextResponse.json({ error: 'Empfehlung nicht gefunden' }, { status: 404 })
  }

  const content = (empfehlung.content as { bild_prompt?: string; typ?: string } | null) ?? {}
  const prompt = body.bild_prompt?.trim() || content.bild_prompt?.trim()
  if (!prompt) {
    return NextResponse.json({ error: 'bild_prompt fehlt' }, { status: 400 })
  }

  try {
    const replicateUrl = await generateMarketingImage(prompt)
    const uploaded = await uploadKiContentImage(empfehlungId, replicateUrl)

    const row = await saveKiContent({
      empfehlung_id: empfehlungId,
      typ: content.typ ?? 'instagram',
      text_content: null,
      bild_url: uploaded.publicUrl,
      bild_prompt: prompt,
      status: 'generiert',
    })

    await updateEmpfehlungBildUrl(empfehlungId, uploaded.publicUrl)

    await supabaseAdmin.from('system_events').insert({
      quelle: 'ki_hub',
      event_typ: 'content_bild_generiert',
      severity: 'info',
      details: { empfehlung_id: empfehlungId, bild_url: uploaded.publicUrl },
    })

    const all = await loadContentForEmpfehlung(empfehlungId)

    return NextResponse.json({
      ok: true,
      bild_url: uploaded.publicUrl,
      content: row,
      history: all,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bildgenerierung fehlgeschlagen'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
