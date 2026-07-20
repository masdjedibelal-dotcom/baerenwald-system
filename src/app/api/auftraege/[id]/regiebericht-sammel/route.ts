import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadRegieSammelPdfDaten } from '@/app/(dashboard)/auftraege/baustelle-actions'
import { renderRegieberichtSammelPdfBuffer } from '@/lib/auftraege/render-regiebericht-sammel-pdf'
import { kwZeitraum } from '@/lib/auftraege/kalenderwoche'

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

  const url = new URL(request.url)
  const kw = Number(url.searchParams.get('kw'))
  const jahr = Number(url.searchParams.get('jahr'))
  if (!kw || !jahr) {
    return NextResponse.json({ error: 'kw und jahr erforderlich' }, { status: 400 })
  }

  const { von, bis } = kwZeitraum(kw, jahr)
  const loaded = await loadRegieSammelPdfDaten(params.id, von, bis, kw, jahr)
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.message }, { status: 404 })
  }
  if (!loaded.regiearbeiten.length) {
    return NextResponse.json({ error: 'Keine Regiearbeiten in dieser KW' }, { status: 404 })
  }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderRegieberichtSammelPdfBuffer(firm, loaded)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="regiebericht-kw${kw}-${jahr}.pdf"`,
    },
  })
}
