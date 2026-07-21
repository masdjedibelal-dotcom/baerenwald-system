import { NextResponse } from 'next/server'
import { downloadAbschlussdokumentationPdf } from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { createClient } from '@/lib/supabase-server'

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

  const pdf = await downloadAbschlussdokumentationPdf(params.id, {
    mitBautagebuch: true,
    mitFotos: true,
    mitPreisen: true,
  })

  if (!pdf.ok) {
    return NextResponse.json({ error: pdf.message }, { status: 500 })
  }

  const buffer = Buffer.from(pdf.pdfBase64, 'base64')
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdf.filename}"`,
    },
  })
}
