import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const name = (formData.get('filename') as string) || 'beleg.pdf'
  const safe = name.replace(/[^\w.\-]+/g, '_')
  const path = `${params.id}/${Date.now()}-${safe}`

  const { error: upErr } = await supabaseAdmin.storage
    .from('eingangsrechnungen')
    .upload(path, buf, { contentType: file.type || 'application/pdf', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('eingangsrechnungen').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
