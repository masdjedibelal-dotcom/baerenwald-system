import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
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
  const name = (formData.get('filename') as string) || 'logo.png'
  const safe = name.replace(/[^\w.\-]+/g, '_')
  const path = `${user.id}/${Date.now()}-${safe}`

  const { error: upErr } = await supabaseAdmin.storage
    .from('logos')
    .upload(path, buf, { contentType: file.type || 'image/png', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('logos').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
