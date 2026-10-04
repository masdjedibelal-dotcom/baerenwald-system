/** Telegram erlaubt max. 4096 Zeichen pro Nachricht. */
export const TELEGRAM_MAX_MESSAGE_CHARS = 4096

/** Einzelne Verlaufzeilen beim Laden kürzen. */
export const COPILOT_MAX_HISTORY_MESSAGE_CHARS = 1800

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
