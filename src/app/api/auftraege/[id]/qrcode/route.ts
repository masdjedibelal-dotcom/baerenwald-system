import { logDbError } from '@/lib/errors/log-db-error'
import QRCode from 'qrcode'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { C } from '@/lib/tokens/colors'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const {data: row, error: error1} = await supabase.from('auftraege').select('id').eq('id', params.id).maybeSingle()
  if (error1) logDbError('app/api/auftraege/[id]/qrcode/route:auftraege', error1)
  if (!row) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const {data: tok, error: error2} = await supabaseAdmin
    .from('auftraege')
    .select('kunden_token')
    .eq('id', params.id)
    .maybeSingle()
  if (error2) logDbError('app/api/auftraege/[id]/qrcode/route:auftraege', error2)

  const token = tok?.kunden_token as string | null | undefined
  if (!token) {
    return NextResponse.json({ error: 'Kein Kunden-Token' }, { status: 404 })
  }

  const url = projektUrlFromToken(String(token))

  try {
    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: C.greenDark, light: C.white },
    })
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'QR-Code fehlgeschlagen' }, { status: 500 })
  }
}
