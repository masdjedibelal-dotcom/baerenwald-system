import { NextResponse } from 'next/server'
import { analyzeRoomImage } from '@/lib/visualize/claude-analyze-room'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { claudeApiKeyLooksValid, getClaudeApiKey } from '@/lib/copilot/claude-api-key'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  let body: { angebot_id?: string; ist_bild_url?: string } = {}

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const istUrl = body.ist_bild_url?.trim()

  if (!angebotId || !istUrl) {
    return NextResponse.json({ error: 'angebot_id und ist_bild_url erforderlich' }, { status: 400 })
  }

  const claudeKey = getClaudeApiKey()
  if (!claudeKey || !claudeApiKeyLooksValid(claudeKey)) {
    return NextResponse.json({ error: 'Claude API nicht konfiguriert.' }, { status: 503 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const raum_analyse = await analyzeRoomImage(istUrl)
    return NextResponse.json({ raum_analyse })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Raumanalyse fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
