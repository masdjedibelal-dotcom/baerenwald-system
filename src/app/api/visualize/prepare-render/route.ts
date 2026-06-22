import { NextResponse } from 'next/server'
import {
  fallbackVizBrief,
  mergeVizBriefAnswer,
  prepareVizRender,
} from '@/lib/visualize/claude-viz-prepare'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { claudeApiKeyLooksValid, getClaudeApiKey } from '@/lib/copilot/claude-api-key'
import { loadKiVisualisierung, updateKiVisualisierung } from '@/lib/visualize/queries'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const claudeKey = getClaudeApiKey()
  if (!claudeKey || !claudeApiKeyLooksValid(claudeKey)) {
    return NextResponse.json({ error: 'KI nicht verfügbar.' }, { status: 503 })
  }

  let body: {
    angebot_id?: string
    session_id?: string
    wunsch_text?: string
    answer?: { question_id: string; option_id: string; option_label: string }
  } = {}

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const angebotId = body.angebot_id?.trim()
  const sessionId = body.session_id?.trim()
  const wunschText = body.wunsch_text?.trim()

  if (!angebotId || !sessionId || !wunschText) {
    return NextResponse.json(
      { error: 'angebot_id, session_id und wunsch_text erforderlich' },
      { status: 400 }
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

  let brief = session.viz_brief ?? fallbackVizBrief(session.raum_analyse)

  if (body.answer?.question_id && body.answer.option_id) {
    brief = mergeVizBriefAnswer(
      brief,
      body.answer.question_id,
      body.answer.option_id,
      body.answer.option_label ?? body.answer.option_id
    )
    await updateKiVisualisierung(sessionId, { viz_brief: brief, wunsch_text: wunschText })
  }

  try {
    const result = await prepareVizRender({
      wunschText,
      istAnalyse: session.raum_analyse,
      inspirationAnalyse: session.inspiration_analyse,
      existingBrief: brief,
    })

    const mergedBrief = {
      ...result.viz_brief,
      beantwortete_fragen: brief.beantwortete_fragen,
      nutzer_antworten: brief.nutzer_antworten,
    }

    const updated = await updateKiVisualisierung(sessionId, {
      viz_brief: mergedBrief,
      wunsch_text: wunschText,
    })

    return NextResponse.json({
      ready: result.ready,
      viz_brief: mergedBrief,
      questions: result.questions,
      session: updated,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Vorbereitung fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
