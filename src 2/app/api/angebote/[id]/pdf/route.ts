import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { persistPdfForAngebot } from '@/app/(dashboard)/angebote/actions'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data: row } = await supabase.from('angebote').select('id').eq('id', params.id).maybeSingle()
  if (!row) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const pdf = await persistPdfForAngebot(params.id)
  if (!pdf.ok) {
    return NextResponse.json({ error: pdf.message }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdf.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="angebot-${params.id}.pdf"`,
    },
  })
}
