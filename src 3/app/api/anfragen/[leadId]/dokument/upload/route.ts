import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export async function POST(req: Request, { params }: { params: { leadId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const leadId = params.leadId?.trim()
  if (!leadId) {
    return NextResponse.json({ error: 'leadId fehlt' }, { status: 400 })
  }

  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).maybeSingle()
  if (!lead) {
    return NextResponse.json({ error: 'Anfrage nicht gefunden' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Keine Datei' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 })
  }

  const type = (file as File).type || 'application/octet-stream'
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Nur PDF, JPG, PNG oder WebP erlaubt' }, { status: 400 })
  }

  const rawName =
    (typeof formData.get('filename') === 'string' && (formData.get('filename') as string).trim()) ||
    (typeof (file as File).name === 'string' ? (file as File).name : 'dokument.pdf')
  const safe = rawName.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const path = `${leadId}/${Date.now()}-${user.id.slice(0, 8)}-${safe}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabaseAdmin.storage
    .from('lead-dokumente')
    .upload(path, buf, { contentType: type, upsert: false })

  if (upErr) {
    const raw = upErr.message ?? ''
    const hint =
      /bucket not found|does not exist/i.test(raw)
        ? ' — Bucket „lead-dokumente“ fehlt: Migration `20260610140000_lead_dokumente.sql` ausführen.'
        : ''
    return NextResponse.json({ error: raw + hint }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('lead-dokumente').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, groesse_bytes: file.size })
}
