import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import {
  buildRechnungHtmlAusDetail,
  loadRechnungDetailForPdf,
} from '@/lib/rechnungen/rechnung-html-payload'
import { renderRechnungPdfForDetail } from '@/lib/rechnungen/render-rechnung-pdf-for-detail'

export const runtime = 'nodejs'
export const maxDuration = 60

async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(request: Request) {
  const { user } = await requireUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const url = new URL(request.url)
  const rechnungId = url.searchParams.get('rechnungId') ?? url.searchParams.get('id')
  const previewRaw = url.searchParams.get('preview') ?? ''
  const wantPreview = previewRaw === '1' || previewRaw === 'true' || previewRaw === 'html'

  if (!rechnungId?.trim()) {
    return NextResponse.json({ error: 'rechnungId fehlt' }, { status: 400 })
  }

  const detail = await loadRechnungDetailForPdf(supabaseAdmin, rechnungId)
  if (!detail?.kunden) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const gewerke = await loadGewerkeAusfuehrung(supabaseAdmin)

  if (wantPreview) {
    const html = buildRechnungHtmlAusDetail(detail, firm, gewerke, { previewFooter: true })
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const buffer = await renderRechnungPdfForDetail(detail, firm, gewerke)
    const nr = detail.rechnungsnummer?.trim()?.replace(/\s+/g, '_') ?? rechnungId.slice(0, 8)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rechnung_${nr}_Baerenwald.pdf"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PDF fehlgeschlagen'
    console.error('[api/rechnung-pdf]', msg)
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

  let body: { rechnungId?: string }
  try {
    body = (await request.json()) as { rechnungId?: string }
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const rechnungId = body.rechnungId?.trim()
  if (!rechnungId) {
    return NextResponse.json({ error: 'rechnungId fehlt' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  return GET(
    new Request(
      `${origin}/api/rechnung-pdf?rechnungId=${encodeURIComponent(rechnungId)}`,
      { headers: request.headers }
    )
  )
}
