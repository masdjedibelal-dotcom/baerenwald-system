import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildRechnungPdfBuffer } from '@/lib/rechnungen/persist-pdf'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { isEingehendeRechnung } from '@/lib/rechnungen/rechnung-richtung'

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

  // Eingangsrechnung: Partner-PDF ausliefern (nicht Baerenwald-Beleg neu rendern)
  const { data: meta } = await supabaseAdmin
    .from('rechnungen')
    .select('richtung, pdf_url, angebot_handwerker_id, rechnungsnummer')
    .eq('id', rechnungId)
    .maybeSingle()

  if (meta && isEingehendeRechnung(meta)) {
    let partnerStored = String(meta.pdf_url ?? '').trim()
    const ahId = String(meta.angebot_handwerker_id ?? '').trim()
    if ((!partnerStored || /^https?:\/\//i.test(partnerStored) === false) && ahId) {
      const { data: ah } = await supabaseAdmin
        .from('angebot_handwerker')
        .select('hw_rechnung_pdf_url')
        .eq('id', ahId)
        .maybeSingle()
      const fromAh = String(ah?.hw_rechnung_pdf_url ?? '').trim()
      if (fromAh) partnerStored = fromAh
    }
    if (partnerStored) {
      const signed = await signedHandwerkerUploadUrl(partnerStored)
      if (signed) {
        return Response.redirect(signed, 302)
      }
      // http(s) public URL (selten)
      if (/^https?:\/\//i.test(partnerStored)) {
        return Response.redirect(partnerStored, 302)
      }
    }
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

