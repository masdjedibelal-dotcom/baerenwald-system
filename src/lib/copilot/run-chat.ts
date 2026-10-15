import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import {
  createAnthropicClient,
  claudeAuthErrorForClient,
  describeClaudeKeyForDebug,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { COPILOT_CLAUDE_TOOLS } from '@/lib/copilot/claude-tools'
import { executeCopilotTool } from '@/lib/copilot/execute-tool'
import { formatUnknownError } from '@/lib/copilot/format-unknown-error'
import { COPILOT_SYSTEM } from '@/lib/copilot/system-prompt'
import {
  COPILOT_MAX_HISTORY_MESSAGE_CHARS,
  truncateCopilotText,
} from '@/lib/copilot/message-limits'
import {
  collectAssistentUiFromToolResult,
  emptyAssistentUi,
  mergeAssistentUi,
  type AssistentUiPayload,
} from '@/lib/copilot/assistent-ui'
import { sanitizeAssistentChatText } from '@/lib/copilot/sanitize-chat-text'
import { formatKiAnbieterFehler, kiAnbieter } from '@/lib/ki/ki'
import { openAiChat, type OpenAiNachricht, type OpenAiWerkzeug } from '@/lib/shared-domain/ki-openai'

export type CopilotChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type CopilotChatSuccess = {
  ok: true
  text: string
  ui: AssistentUiPayload
}

function formatCopilotError(e: unknown): string {
  const openAi = formatKiAnbieterFehler(e)
  if (openAi) return openAi
  if (e instanceof Anthropic.AuthenticationError) {
    console.error('[copilot/chat] Claude 401', describeClaudeKeyForDebug())
    return claudeAuthErrorForClient()
  }
  const msg = formatUnknownError(e)
  if (/401.*no body/i.test(msg)) {
    console.error('[copilot/chat] Claude 401 (no body)', describeClaudeKeyForDebug())
    return claudeAuthErrorForClient()
  }
  return msg
}

/** Claude-Chat mit Tool-Loop — für Telegram und CRM-Sidepanel. */
export async function runCopilotChat(opts: {
  userText: string
  history?: CopilotChatMessage[]
  contextHint?: string | null
}): Promise<CopilotChatSuccess | { ok: false; error: string }> {
  const userText = opts.userText.trim()
  if (!userText) return { ok: false, error: 'Leere Nachricht.' }

  const system =
    opts.contextHint?.trim()
      ? `${COPILOT_SYSTEM}\n\nAktueller CRM-Kontext:\n${opts.contextHint.trim()}`
      : COPILOT_SYSTEM

  const history = (opts.history ?? []).slice(-20).map((m) => ({
    role: m.role,
    content: truncateCopilotText(m.content, COPILOT_MAX_HISTORY_MESSAGE_CHARS),
  }))

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userText },
  ]

  let ui = emptyAssistentUi()

  if (kiAnbieter() === 'openai') {
    try {
      const r = await openAiWerkzeugSchleife(system, history, userText)
      return { ok: true, text: r.text || 'Erledigt — keine Textantwort.', ui: r.ui }
    } catch (e) {
      return { ok: false, error: formatCopilotError(e) }
    }
  }

  try {
    const anthropic = createAnthropicClient(getClaudeApiKey())
    let response = await anthropic.messages.create({
      model: getClaudeModel(),
      max_tokens: 2048,
      system,
      tools: COPILOT_CLAUDE_TOOLS,
      messages,
    })

    while (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b) => b.type === 'tool_use')
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const tool of toolUses) {
        if (tool.type !== 'tool_use') continue
        const input = tool.input as Record<string, unknown>
        const result = await executeCopilotTool(tool.name, input)
        ui = mergeAssistentUi(ui, collectAssistentUiFromToolResult(tool.name, result, input))
        let serialized: string
        try {
          serialized = JSON.stringify(result)
        } catch {
          serialized = JSON.stringify({ error: 'Tool-Ergebnis nicht serialisierbar.' })
        }
        if (serialized.length > 24_000) {
          serialized = JSON.stringify({
            error: 'Tool-Antwort zu groß — bitte kleinere Anfrage.',
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
        system,
        tools: COPILOT_CLAUDE_TOOLS,
        messages,
      })
    }

    const assistantText = sanitizeAssistentChatText(
      response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('\n')
        .trim()
    )

    return {
      ok: true,
      text: assistantText || 'Erledigt — keine Textantwort.',
      ui,
    }
  } catch (e) {
    return { ok: false, error: formatCopilotError(e) }
  }
}

/** Claude-Werkzeuge → OpenAI-Funktionen (gleiche Namen, Beschreibungen und Eingaben). */
const COPILOT_OPENAI_TOOLS: OpenAiWerkzeug[] = COPILOT_CLAUDE_TOOLS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema as unknown as Record<string, unknown>,
  },
}))

/** Werkzeug-Schleife wie bei Claude: KI ruft CRM-Werkzeuge, bis sie mit Text antwortet. */
async function openAiWerkzeugSchleife(
  system: string,
  history: CopilotChatMessage[],
  userText: string
): Promise<{ text: string; ui: AssistentUiPayload }> {
  let ui = emptyAssistentUi()
  const messages: OpenAiNachricht[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAiNachricht),
    { role: 'user', content: userText },
  ]
  for (let runde = 0; runde < 8; runde++) {
    const r = await openAiChat({ system, messages, maxTokens: 2048, tools: COPILOT_OPENAI_TOOLS })
    if (!r.toolCalls.length) return { text: sanitizeAssistentChatText(r.text), ui }
    messages.push(r.nachricht)
    for (const call of r.toolCalls) {
      let input: Record<string, unknown> = {}
      try {
        input = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
      } catch {
        input = {}
      }
      const result = await executeCopilotTool(call.function.name, input)
      ui = mergeAssistentUi(ui, collectAssistentUiFromToolResult(call.function.name, result, input))
      let serialized: string
      try {
        serialized = JSON.stringify(result)
      } catch {
        serialized = JSON.stringify({ error: 'Tool-Ergebnis nicht serialisierbar.' })
      }
      if (serialized.length > 24_000) {
        serialized = JSON.stringify({ error: 'Tool-Antwort zu groß — bitte kleinere Anfrage.' })
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: serialized })
    }
  }
  return { text: 'Das war zu viel auf einmal — bitte die Frage aufteilen.', ui }
}
