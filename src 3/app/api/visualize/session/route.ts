import { NextResponse } from 'next/server'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import {
  createKiVisualisierung,
  loadKiVisualisierung,
  updateKiVisualisierung,
} from '@/lib/visualize/queries'

export async function POST(req: Request) {
  let body: { angebot_id?: string; session_id?: string } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  if (!angebotId) {
    return NextResponse.json({ error: 'angebot_id fehlt' }, { status: 400 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const existingId = body.session_id?.trim()
  if (existingId) {
    const row = await loadKiVisualisierung(existingId)
    if (!row || row.angebot_id !== angebotId) {
      return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ session: row })
  }

  try {
    const session = await createKiVisualisierung(angebotId)
    return NextResponse.json({ session })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Session anlegen fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  let body: { angebot_id?: string; session_id?: string; ist_bilder_urls?: string[] } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const sessionId = body.session_id?.trim()
  if (!angebotId || !sessionId) {
    return NextResponse.json({ error: 'angebot_id oder session_id fehlt' }, { status: 400 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const row = await loadKiVisualisierung(sessionId)
  if (!row || row.angebot_id !== angebotId) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  }

  const patch: Record<string, unknown> = {}
  if (Array.isArray(body.ist_bilder_urls)) {
    patch.ist_bilder_urls = body.ist_bilder_urls.slice(0, 3)
  }

  const session = await updateKiVisualisierung(sessionId, patch)
  return NextResponse.json({ session })
}
