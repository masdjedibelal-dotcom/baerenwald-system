import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import {
  createAnthropicClient,
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

export type CopilotChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function formatCopilotError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) {
    return `Claude API-Key abgelehnt (401). ${describeClaudeKeyForDebug()}.`
  }
  const msg = formatUnknownError(e)
  if (/401.*no body/i.test(msg)) {
    return `Claude API-Key abgelehnt (401). ${describeClaudeKeyForDebug()}.`
  }
  return msg
}

/** Claude-Chat mit Tool-Loop — für Telegram und CRM-Sidepanel. */
export async function runCopilotChat(opts: {
  userText: string
  history?: CopilotChatMessage[]
  contextHint?: string | null
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
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
        const result = await executeCopilotTool(
          tool.name,
          tool.input as Record<string, unknown>
        )
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

    const assistantText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim()

    return {
      ok: true,
      text: assistantText || 'Erledigt — keine Textantwort.',
    }
  } catch (e) {
    return { ok: false, error: formatCopilotError(e) }
  }
}
