import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { VIZ_MAX_IST_BILDER, VIZ_STORAGE_BUCKET } from '@/lib/visualize/constants'
import { loadKiVisualisierung, updateKiVisualisierung } from '@/lib/visualize/queries'
import { visualisierungPublicUrl } from '@/lib/visualize/storage'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

function resolveImageMime(file: File): string | null {
  const fromType = file.type?.split(';')[0]?.trim().toLowerCase()
  if (fromType === 'image/heic' || fromType === 'image/heif') return null
  if (fromType && ALLOWED.has(fromType)) return fromType

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'heic' || ext === 'heif') return null
  return null
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const angebotId = String(formData.get('angebot_id') ?? '').trim()
  const sessionId = String(formData.get('session_id') ?? '').trim()
  const kind = String(formData.get('kind') ?? 'ist').trim() as 'ist' | 'ziel'
  const file = formData.get('file')

  if (!angebotId || !sessionId) {
    return NextResponse.json({ error: 'angebot_id oder session_id fehlt' }, { status: 400 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const session = await loadKiVisualisierung(sessionId)
  if (!session || session.angebot_id !== angebotId) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  }

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Keine Datei' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Datei zu groß (max. 8 MB)' }, { status: 400 })
  }

  const type = resolveImageMime(file as File)
  if (!type) {
    return NextResponse.json(
      { error: 'Nur JPEG, PNG oder WebP (iPhone: Foto als JPEG speichern oder HEIC in den Einstellungen deaktivieren)' },
      { status: 400 }
    )
  }

  if (kind === 'ist' && session.ist_bilder_urls.length >= VIZ_MAX_IST_BILDER) {
    return NextResponse.json({ error: `Max. ${VIZ_MAX_IST_BILDER} Ist-Bilder` }, { status: 400 })
  }

  const rawName = typeof (file as File).name === 'string' ? (file as File).name : 'foto.jpg'
  const safe = rawName.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const sub = kind === 'ziel' ? 'ziel' : 'ist'
  const path = `${angebotId}/${sessionId}/${sub}/${Date.now()}-${safe}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabaseAdmin.storage.from(VIZ_STORAGE_BUCKET).upload(path, buf, {
    contentType: type,
    upsert: false,
  })
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const url = visualisierungPublicUrl(path)

  if (kind === 'ziel') {
    const updated = await updateKiVisualisierung(sessionId, { ziel_bild_url: url })
    return NextResponse.json({ url, session: updated })
  }

  const istBilder = [...session.ist_bilder_urls, url].slice(0, VIZ_MAX_IST_BILDER)
  const updated = await updateKiVisualisierung(sessionId, { ist_bilder_urls: istBilder })
  return NextResponse.json({ url, ist_bilder_urls: istBilder, session: updated })
}
