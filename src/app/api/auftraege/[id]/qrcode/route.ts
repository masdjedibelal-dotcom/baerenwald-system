import QRCode from 'qrcode'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data: row } = await supabase.from('auftraege').select('id').eq('id', params.id).maybeSingle()
  if (!row) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const { data: tok } = await supabaseAdmin
    .from('auftraege')
    .select('kunden_token')
    .eq('id', params.id)
    .maybeSingle()

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
      color: { dark: '#1A3D2B', light: '#FFFFFF' },
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
