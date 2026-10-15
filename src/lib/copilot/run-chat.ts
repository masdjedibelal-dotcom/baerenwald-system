import 'server-only'

import { COPILOT_TOOLS } from '@/lib/copilot/copilot-tools'
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
import { kiKonfiguriert } from '@/lib/ki/ki'
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

/** KI-Chat mit Werkzeug-Schleife — für Telegram und CRM-Sidepanel. */
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

  if (!kiKonfiguriert()) return { ok: false, error: 'KI nicht eingerichtet — OPENAI_API_KEY in Netlify setzen.' }
  try {
    const r = await werkzeugSchleife(system, history, userText)
    return { ok: true, text: r.text || 'Erledigt — keine Textantwort.', ui: r.ui }
  } catch (e) {
    return { ok: false, error: formatUnknownError(e) }
  }
}

/** CRM-Werkzeuge als OpenAI-Funktionen. */
const COPILOT_OPENAI_TOOLS: OpenAiWerkzeug[] = COPILOT_TOOLS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}))

/** Werkzeug-Schleife: KI ruft CRM-Werkzeuge, bis sie mit Text antwortet. */
async function werkzeugSchleife(
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
