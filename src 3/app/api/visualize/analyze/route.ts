import { NextResponse } from 'next/server'
import { analyzeInspirationImage } from '@/lib/visualize/claude-analyze-room'
import { analyzeZielBildForPrompt } from '@/lib/visualize/claude-analyze'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { loadKiVisualisierung, updateKiVisualisierung } from '@/lib/visualize/queries'
import { claudeApiKeyLooksValid, getClaudeApiKey } from '@/lib/copilot/claude-api-key'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  let body: {
    angebot_id?: string
    session_id?: string
    ist_bild_url?: string
    ziel_bild_url?: string
    gewerk?: string
  } = {}

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const sessionId = body.session_id?.trim()
  const istUrl = body.ist_bild_url?.trim()
  const zielUrl = body.ziel_bild_url?.trim()

  if (!angebotId || !sessionId || !istUrl || !zielUrl) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
  }

  const claudeKey = getClaudeApiKey()
  if (!claudeKey || !claudeApiKeyLooksValid(claudeKey)) {
    return NextResponse.json(
      {
        error:
          'Claude API nicht konfiguriert — CLAUDE_API_KEY in Netlify setzen (sk-ant-… von console.anthropic.com).',
      },
      { status: 503 }
    )
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
    const [prompt, inspiration_analyse] = await Promise.all([
      analyzeZielBildForPrompt({
        ist_bild_url: istUrl,
        ziel_bild_url: zielUrl,
        gewerk: body.gewerk,
      }),
      analyzeInspirationImage(zielUrl).catch(() => null),
    ])
    await updateKiVisualisierung(sessionId, {
      analysierter_prompt: prompt,
      ziel_bild_url: zielUrl,
      ...(inspiration_analyse ? { inspiration_analyse } : {}),
    })
    return NextResponse.json({ prompt, inspiration_analyse })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analyse fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
