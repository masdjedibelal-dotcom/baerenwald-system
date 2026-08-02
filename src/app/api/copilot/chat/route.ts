import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { emptyAssistentUi } from '@/lib/copilot/assistent-ui'
import { runCopilotChat, type CopilotChatMessage } from '@/lib/copilot/run-chat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** CRM-Sidepanel-Assistent — gleiche Claude-Tools wie Telegram + UI-Links/Vorschau. */
export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  let body: {
    message?: string
    history?: CopilotChatMessage[]
    contextHint?: string | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiges JSON.' }, { status: 400 })
  }

  const message = String(body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ ok: false, error: 'Nachricht fehlt.' }, { status: 400 })
  }

  const history = Array.isArray(body.history)
    ? body.history.filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
    : []

  const result = await runCopilotChat({
    userText: message,
    history,
    contextHint: body.contextHint ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json({
    ok: true,
    text: result.text,
    ui: result.ui ?? emptyAssistentUi(),
  })
}
