import { NextResponse } from 'next/server'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import {
  linkVisualisierungToAngebot,
  loadKiVisualisierung,
  updateKiVisualisierung,
} from '@/lib/visualize/queries'

export async function POST(req: Request) {
  let body: {
    angebot_id?: string
    session_id?: string
    ausgewaehlte_urls?: string[]
    ins_angebot?: boolean
  } = {}

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const sessionId = body.session_id?.trim()
  const urls = (body.ausgewaehlte_urls ?? []).map((u) => u.trim()).filter(Boolean)

  if (!angebotId || !sessionId) {
    return NextResponse.json({ error: 'angebot_id oder session_id fehlt' }, { status: 400 })
  }
  if (!urls.length) {
    return NextResponse.json({ error: 'Keine Bilder ausgewählt' }, { status: 400 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const session = await loadKiVisualisierung(sessionId)
  if (!session || session.angebot_id !== angebotId) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  }

  const insAngebot = Boolean(body.ins_angebot)
  const updated = await updateKiVisualisierung(sessionId, {
    ausgewaehlte_urls: urls,
    ins_angebot: insAngebot,
    status: 'fertig',
  })

  if (insAngebot) {
    await linkVisualisierungToAngebot(angebotId, sessionId)
  }

  return NextResponse.json({ success: true, session: updated })
}
