import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

/** Fotos für Projekt-Angebote (Wizard) — gleicher Bucket wie Notiz-Fotos, eigener Pfad. */
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
    return NextResponse.json({ error: 'Datei zu groß (max. 5 MB)' }, { status: 400 })
  }

  const type = (file as File).type || 'image/jpeg'
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Nur Bilder (JPEG, PNG, WebP, GIF, HEIC) erlaubt' }, { status: 400 })
  }

  const rawName = typeof (file as File).name === 'string' ? (file as File).name : 'foto.jpg'
  const safe = rawName.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const path = `${leadId}/projekt-doc/${Date.now()}-${user.id.slice(0, 8)}-${safe}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabaseAdmin.storage
    .from('lead-notizen-fotos')
    .upload(path, buf, { contentType: type, upsert: false })

  if (upErr) {
    const raw = upErr.message ?? ''
    const hint =
      /bucket not found|does not exist/i.test(raw)
        ? ' — Bucket „lead-notizen-fotos“ fehlt: Migration `20260520140000_storage_lead_notizen_fotos.sql` ausführen.'
        : ''
    return NextResponse.json({ error: raw + hint }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('lead-notizen-fotos').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
