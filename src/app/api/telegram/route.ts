import Anthropic from '@anthropic-ai/sdk'
import { describeClaudeKeyForDebug, createAnthropicClient, getClaudeApiKey, getClaudeModel } from '@/lib/copilot/claude-api-key'
import { sendTelegram, sendTelegramTyping } from '@/lib/copilot/telegram'
import { COPILOT_CLAUDE_TOOLS } from '@/lib/copilot/claude-tools'
import { executeCopilotTool } from '@/lib/copilot/execute-tool'
import { loadHistory, saveMessage } from '@/lib/copilot/memory'
import { COPILOT_SYSTEM } from '@/lib/copilot/system-prompt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function anthropicClient(): Anthropic {
  return createAnthropicClient(getClaudeApiKey())
}

function formatCopilotError(e: unknown): string {
  const hint = describeClaudeKeyForDebug()
  if (e instanceof Anthropic.AuthenticationError) {
    return `Claude API-Key von Anthropic abgelehnt (401). ${hint}. Neuen Key auf console.anthropic.com erzeugen, in Netlify unter CLAUDE_API_KEY eintragen (Production), alte/leere Variable löschen, redeployen.`
  }
  const msg = e instanceof Error ? e.message : 'Unbekannter Fehler'
  if (/401.*no body/i.test(msg)) {
    return `Claude API-Key abgelehnt (401). ${hint}.`
  }
  return msg
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

type TelegramMessage = {
  chat?: { id?: number }
  text?: string
  caption?: string
  voice?: { file_id: string }
  photo?: { file_id: string }[]
}

async function transcribeVoice(_fileId: string): Promise<string | null> {
  // Transkription (z. B. Whisper) kann später ergänzt werden
  return null
}

async function runClaudeChat(userText: string): Promise<string> {
  const history = await loadHistory(20)
  await saveMessage('user', userText)

  const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: userText }]

  const anthropic = anthropicClient()
  let response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 2048,
    system: COPILOT_SYSTEM,
    tools: COPILOT_CLAUDE_TOOLS,
    messages,
  })

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter((b) => b.type === 'tool_use')
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const tool of toolUses) {
      if (tool.type !== 'tool_use') continue
      const result = await executeCopilotTool(tool.name, tool.input as Record<string, unknown>)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tool.id,
        content: JSON.stringify(result),
      })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    response = await anthropic.messages.create({
      model: getClaudeModel(),
      max_tokens: 2048,
      system: COPILOT_SYSTEM,
      tools: COPILOT_CLAUDE_TOOLS,
      messages,
    })
  }

  const assistantText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim()

  await saveMessage('assistant', assistantText)
  return assistantText || '✅ Erledigt.'
}

export async function POST(req: Request) {
  if (!getClaudeApiKey()) {
    return Response.json(
      { ok: false, error: 'CLAUDE_API_KEY oder ANTHROPIC_API_KEY fehlt' },
      { status: 503 }
    )
  }

  let body: TelegramUpdate
  try {
    body = (await req.json()) as TelegramUpdate
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }

  const message = body.message ?? body.edited_message
  if (!message) return Response.json({ ok: true })

  const chatId = message.chat?.id?.toString()
  if (chatId !== process.env.TELEGRAM_CHAT_ID?.trim()) {
    return Response.json({ ok: true })
  }

  let userText = ''

  try {
    if (message.voice) {
      const transcript = await transcribeVoice(message.voice.file_id)
      if (!transcript) {
        await sendTelegram(
          '🎤 Sprachnotiz erhalten — bitte die Anfrage kurz als <b>Text</b> schicken (Transkription folgt in einer späteren Version).'
        )
        return Response.json({ ok: true })
      }
      userText = transcript
    } else if (message.photo?.length) {
      userText = message.caption?.trim() || 'Foto erhalten (Speicherung folgt).'
    } else if (message.text) {
      userText = message.text.trim()
    } else {
      return Response.json({ ok: true })
    }

    if (!userText) return Response.json({ ok: true })

    await sendTelegramTyping()
    const reply = await runClaudeChat(userText)
    await sendTelegram(reply)
  } catch (e) {
    const msg = formatCopilotError(e)
    await sendTelegram(`❌ Copilot-Fehler: ${msg.slice(0, 500)}`).catch(() => undefined)
  }

  return Response.json({ ok: true })
}
