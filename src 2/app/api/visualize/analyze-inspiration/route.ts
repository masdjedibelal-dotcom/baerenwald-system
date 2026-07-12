import { NextResponse } from 'next/server'
import { analyzeInspirationImage } from '@/lib/visualize/claude-analyze-room'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { claudeApiKeyLooksValid, getClaudeApiKey } from '@/lib/copilot/claude-api-key'
import { loadKiVisualisierung, updateKiVisualisierung } from '@/lib/visualize/queries'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  let body: { angebot_id?: string; session_id?: string; ziel_bild_url?: string } = {}

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const sessionId = body.session_id?.trim()
  const zielUrl = body.ziel_bild_url?.trim()

  if (!angebotId || !sessionId || !zielUrl) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
  }

  const claudeKey = getClaudeApiKey()
  if (!claudeKey || !claudeApiKeyLooksValid(claudeKey)) {
    return NextResponse.json({ error: 'Claude API nicht konfiguriert.' }, { status: 503 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const session = await loadKiVisualisierung(sessionId)
  if (!session || session.angebot_id !== angebotId) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  }

  try {
    const inspiration_analyse = await analyzeInspirationImage(zielUrl)
    await updateKiVisualisierung(sessionId, {
      inspiration_analyse,
      ziel_bild_url: zielUrl,
    })
    return NextResponse.json({ inspiration_analyse })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Inspirations-Analyse fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
