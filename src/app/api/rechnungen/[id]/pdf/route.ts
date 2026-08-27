import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildRechnungPdfBuffer } from '@/lib/rechnungen/persist-pdf'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rechnungId = params.id?.trim()
  if (!rechnungId) {
    return new Response(JSON.stringify({ message: 'Rechnung nicht gefunden' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Service-Role: RLS blockiert sonst Joins in loadRechnungDetailForPdf (FIX-01).
  const res = await buildRechnungPdfBuffer(supabaseAdmin, rechnungId)
  if (!res.ok) {
    return new Response(JSON.stringify({ message: res.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const safeName = res.rechnungsnummer.replace(/[^\w.\-]+/g, '_')
  return new Response(new Uint8Array(res.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
    },
  })
}
