import Anthropic from '@anthropic-ai/sdk'
import { describeClaudeKeyForDebug, createAnthropicClient, getClaudeApiKey, getClaudeModel } from '@/lib/copilot/claude-api-key'
import { COPILOT_CLAUDE_TOOLS } from '@/lib/copilot/claude-tools'
import { executeCopilotTool } from '@/lib/copilot/execute-tool'
import { formatUnknownError } from '@/lib/copilot/format-unknown-error'
import { clearCopilotHistory, loadHistory, saveMessage } from '@/lib/copilot/memory'
import {
  COPILOT_HISTORY_TURNS,
  normalizeCopilotUserMessage,
} from '@/lib/copilot/message-limits'
import { COPILOT_SYSTEM } from '@/lib/copilot/system-prompt'
import { sendTelegram, sendTelegramLong, sendTelegramTyping } from '@/lib/copilot/telegram'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function anthropicClient(): Anthropic {
  return createAnthropicClient(getClaudeApiKey())
}

function formatCopilotError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) {
    const hint = describeClaudeKeyForDebug()
    return `Claude API-Key von Anthropic abgelehnt (401). ${hint}. Neuen Key auf console.anthropic.com erzeugen, in Netlify unter CLAUDE_API_KEY eintragen (Production), alte/leere Variable löschen, redeployen.`
  }
  const msg = formatUnknownError(e)
  if (/401.*no body/i.test(msg)) {
    return `Claude API-Key abgelehnt (401). ${describeClaudeKeyForDebug()}.`
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
  return null
}

async function runClaudeChat(userText: string): Promise<string> {
  const history = await loadHistory(COPILOT_HISTORY_TURNS)
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
      let serialized: string
      try {
        serialized = JSON.stringify(result)
      } catch {
        serialized = JSON.stringify({ error: 'Tool-Ergebnis konnte nicht serialisiert werden.' })
      }
      if (serialized.length > 24_000) {
        serialized = JSON.stringify({
          error: 'Tool-Antwort zu groß — bitte kleinere Anfrage oder weniger Daten auf einmal.',
        })
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tool.id,
        content: serialized,
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

    const lower = userText.toLowerCase()
    if (lower === '/reset' || lower === '/clear' || lower === 'verlauf löschen') {
      await clearCopilotHistory()
      await sendTelegram('🧹 Chat-Verlauf gelöscht. Du kannst wieder mit kurzen Nachrichten starten.')
      return Response.json({ ok: true })
    }

    const normalized = normalizeCopilotUserMessage(userText)
    userText = normalized.text

    if (normalized.truncated) {
      await sendTelegram(
        `⚠️ Deine Nachricht war sehr lang (${normalized.originalLength} Zeichen) und wurde auf ${userText.length} Zeichen gekürzt. Für lange Texte bitte in mehrere Nachrichten aufteilen.`
      )
    } else if (userText.length > 1200) {
      await sendTelegram('⏳ Lange Nachricht — einen Moment …')
    }

    await sendTelegramTyping()
    const reply = await runClaudeChat(userText)
    await sendTelegramLong(reply)
  } catch (e) {
    const msg = formatCopilotError(e)
    await sendTelegram(`❌ Copilot-Fehler: ${msg.slice(0, 500)}`).catch(() => undefined)
  }

  return Response.json({ ok: true })
}
