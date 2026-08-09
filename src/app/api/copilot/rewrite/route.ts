import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  buildKiRewriteUserPrompt,
  type KiRewriteTone,
} from '@/lib/copilot/ki-text-rewrite'
import { runTextRewrite } from '@/lib/copilot/run-text-rewrite'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TONES = new Set<KiRewriteTone>(['standard', 'foermlicher', 'einfacher', 'kuerzer'])

/** Inline-Rewrite für einzelne Textfelder (kein Assistent-Chat). */
export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  let body: {
    sourceText?: string
    fieldLabel?: string
    tone?: string
    extraHint?: string | null
    userNote?: string | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiges JSON.' }, { status: 400 })
  }

  const tone = (body.tone ?? 'standard') as KiRewriteTone
  if (!TONES.has(tone)) {
    return NextResponse.json({ ok: false, error: 'Ungültiger Ton.' }, { status: 400 })
  }

  const fieldLabel = String(body.fieldLabel ?? 'Text').trim() || 'Text'
  const sourceText = String(body.sourceText ?? '')
  if (!sourceText.trim() && !String(body.extraHint ?? '').trim()) {
    return NextResponse.json(
      { ok: false, error: 'Bitte zuerst Text eingeben oder Kontext setzen.' },
      { status: 400 }
    )
  }

  const prompt = buildKiRewriteUserPrompt({
    tone,
    sourceText,
    fieldLabel,
    extraHint: body.extraHint,
    userNote: body.userNote,
  })

  const result = await runTextRewrite(prompt)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, text: result.text })
}
