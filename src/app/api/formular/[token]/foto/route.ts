import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const { data: row } = await supabaseAdmin
    .from('hw_formular_einreichungen')
    .select('id')
    .eq('token', params.token)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Keine Datei' }, { status: 400 })
  }

  const name = typeof (file as File).name === 'string' ? (file as File).name : 'upload.jpg'
  const ext = name.includes('.') ? name.split('.').pop() : 'jpg'
  const path = `${params.token}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const contentType = (file as File).type || 'image/jpeg'

  const { error: upErr } = await supabaseAdmin.storage
    .from('hw-formular-fotos')
    .upload(path, buf, { contentType, upsert: false })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('hw-formular-fotos').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
