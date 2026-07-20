import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { buildRechnungenPdfZip } from '@/lib/rechnungen/export-rechnungen-pdf-zip'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const url = new URL(req.url)
  const von = url.searchParams.get('von') ?? ''
  const bis = url.searchParams.get('bis') ?? ''

  const result = await buildRechnungenPdfZip(supabase, { von, bis })
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status ?? 400 })
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Rechnungen-Count': String(result.count),
    },
  })
}
