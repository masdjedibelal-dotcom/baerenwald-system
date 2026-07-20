/** Telegram erlaubt max. 4096 Zeichen pro Nachricht. */
export const TELEGRAM_MAX_MESSAGE_CHARS = 4096

/** Eingehende Bot-Nachricht — darüber wird gekürzt (Kontext + API). */
export const COPILOT_MAX_USER_MESSAGE_CHARS = 4000

/** Einzelne Verlaufzeilen beim Laden kürzen. */
export const COPILOT_MAX_HISTORY_MESSAGE_CHARS = 1800

/** Anzahl Verlauf-Turns für Claude. */
export const COPILOT_HISTORY_TURNS = 12

const TRUNC_SUFFIX = '… [gekürzt]'

export function truncateCopilotText(
  text: string,
  max: number,
  suffix = TRUNC_SUFFIX
): string {
  const t = text.trim()
  if (t.length <= max) return t
  const keep = Math.max(0, max - suffix.length)
  return `${t.slice(0, keep)}${suffix}`
}

export function normalizeCopilotUserMessage(raw: string): {
  text: string
  truncated: boolean
  originalLength: number
} {
  const originalLength = raw.length
  const text = truncateCopilotText(raw, COPILOT_MAX_USER_MESSAGE_CHARS)
  return {
    text,
    truncated: text.length < originalLength,
    originalLength,
  }
}

export function splitTelegramChunks(text: string, max = TELEGRAM_MAX_MESSAGE_CHARS): string[] {
  const t = text.trim()
  if (!t) return []
  if (t.length <= max) return [t]

  const chunks: string[] = []
  let rest = t
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max)
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max)
    if (cut < max * 0.5) cut = max
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}
