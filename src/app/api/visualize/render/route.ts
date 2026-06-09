import { NextResponse } from 'next/server'
import { generateBauErklaerung } from '@/lib/visualize/claude-bauerklaerung'
import { buildEnglishRenderPrompt } from '@/lib/visualize/claude-render-prompt'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { VIZ_MAX_RENDERS_PER_SESSION } from '@/lib/visualize/constants'
import {
  appendPromptHistory,
  loadKiVisualisierung,
  updateKiVisualisierung,
} from '@/lib/visualize/queries'
import { renderInteriorDesign } from '@/lib/visualize/replicate-client'
import { persistRemoteImageToVisualisierungen } from '@/lib/visualize/storage'
import type { VizRaumAnalyse } from '@/lib/visualize/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  let body: {
    angebot_id?: string
    session_id?: string
    ist_bild_url?: string
    prompt?: string
    raum_analyse?: VizRaumAnalyse | null
  } = {}

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const sessionId = body.session_id?.trim()
  const wunschDe = body.prompt?.trim()
  let istUrl = body.ist_bild_url?.trim()

  if (!angebotId || !sessionId || !wunschDe) {
    return NextResponse.json({ error: 'angebot_id, session_id oder prompt fehlt' }, { status: 400 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const session = await loadKiVisualisierung(sessionId)
  if (!session || session.angebot_id !== angebotId) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  }

  if (!istUrl) istUrl = session.ist_bilder_urls[0]?.trim()
  if (!istUrl) {
    return NextResponse.json({ error: 'Kein Ist-Bild' }, { status: 400 })
  }

  if (session.prompt_history.length >= VIZ_MAX_RENDERS_PER_SESSION) {
    return NextResponse.json(
      { error: `Max. ${VIZ_MAX_RENDERS_PER_SESSION} Render-Versuche pro Session` },
      { status: 429 }
    )
  }

  await updateKiVisualisierung(sessionId, { status: 'rendering' })

  try {
    const raumAnalyse = body.raum_analyse ?? null
    const englishPrompt = await buildEnglishRenderPrompt({
      wunschText: wunschDe,
      raumAnalyse,
    })

    const remoteUrl = await renderInteriorDesign({
      image: istUrl,
      prompt: englishPrompt,
    })

    const version = session.prompt_history.length + 1
    const ergebnisUrl = await persistRemoteImageToVisualisierungen({
      sourceUrl: remoteUrl,
      angebotId,
      sessionId,
      version,
    })

    const erklaerung = await generateBauErklaerung({
      wunschText: wunschDe,
      raumAnalyse,
    })

    const entry = {
      prompt: wunschDe,
      ergebnis_url: ergebnisUrl,
      version,
      created_at: new Date().toISOString(),
      ist_bild_url: istUrl,
    }

    const updated = await appendPromptHistory(sessionId, entry)
    return NextResponse.json({
      ergebnis_url: ergebnisUrl,
      version,
      session: updated,
      erklaerung,
      render_prompt_en: englishPrompt,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Render fehlgeschlagen'
    await updateKiVisualisierung(sessionId, { status: 'fehler' })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
