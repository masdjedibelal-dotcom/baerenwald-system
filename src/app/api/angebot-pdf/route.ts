import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadAngebotDetailAdmin } from '@/app/(dashboard)/angebote/actions'
import { buildAngebotHtmlAusDetailAsync } from '@/lib/angebote/angebot-html-payload'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { renderAngebotPdfForDetail } from '@/lib/angebote/render-angebot-pdf-for-detail'

export const runtime = 'nodejs'
export const maxDuration = 60

async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** GET: ?angebotId=&preview=html|1 → HTML-Vorschau · sonst → PDF (gleiches HTML-Design) */
export async function GET(request: Request) {
  const { user } = await requireUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const url = new URL(request.url)
  const angebotId = url.searchParams.get('angebotId') ?? url.searchParams.get('id')
  const previewRaw = url.searchParams.get('preview') ?? ''
  const wantPreview = previewRaw === '1' || previewRaw === 'true' || previewRaw === 'html'

  if (!angebotId?.trim()) {
    return NextResponse.json({ error: 'angebotId fehlt' }, { status: 400 })
  }

  const { data: row } = await createClient().from('angebote').select('id').eq('id', angebotId).maybeSingle()
  if (!row) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const detail = await loadAngebotDetailAdmin(angebotId)
  if (!detail?.kunden) {
    return NextResponse.json({ error: 'Angebot/Kunde nicht gefunden' }, { status: 404 })
  }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const gewerke = await loadGewerkeAusfuehrung(supabaseAdmin)

  if (wantPreview) {
    const html = await buildAngebotHtmlAusDetailAsync(detail, firm, gewerke, { previewFooter: true })
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const buffer = await renderAngebotPdfForDetail(detail, firm, gewerke)
    const nr = detail.angebotsnr?.trim()?.replace(/\s+/g, '_') ?? angebotId.slice(0, 8)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Angebot_${nr}_Baerenwald.pdf"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PDF fehlgeschlagen'
    console.error('[api/angebot-pdf]', msg)
    return NextResponse.json(
      {
        error: msg,
        hint: 'npm run setup:chrome ausführen, Dev-Server neu starten (siehe .env.example)',
      },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: { angebotId?: string }
  try {
    body = (await request.json()) as { angebotId?: string }
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const angebotId = body.angebotId?.trim()
  if (!angebotId) {
    return NextResponse.json({ error: 'angebotId fehlt' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  return GET(
    new Request(
      `${origin}/api/angebot-pdf?angebotId=${encodeURIComponent(angebotId)}`,
      { headers: request.headers }
    )
  )
}
