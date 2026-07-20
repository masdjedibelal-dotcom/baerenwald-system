import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadWochenberichtPdfDaten } from '@/app/(dashboard)/auftraege/baustelle-actions'
import { renderWochenberichtPdfBuffer } from '@/lib/auftraege/render-wochenbericht-pdf'

export async function GET(
  _request: Request,
  { params }: { params: { id: string; bericht_id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data: auf } = await supabase.from('auftraege').select('id').eq('id', params.id).maybeSingle()
  if (!auf) {
    return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })
  }

  const loaded = await loadWochenberichtPdfDaten(params.bericht_id, params.id)
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.message }, { status: 404 })
  }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderWochenberichtPdfBuffer(firm, loaded)
  const wn = String(loaded.woche.wochen_nummer).padStart(2, '0')

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="wochenbericht-${wn}-kw${loaded.woche.kalenderwoche}.pdf"`,
    },
  })
}
