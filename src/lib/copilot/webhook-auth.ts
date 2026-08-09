import 'server-only'

export function copilotWebhookAuthorized(req: Request): boolean {
  const secret =
    process.env.COPILOT_WEBHOOK_SECRET?.trim() || process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim()
  if (auth === `Bearer ${secret}`) return true
  const header = req.headers.get('x-copilot-secret')?.trim()
  return header === secret
}

/**
 * Telegram setWebhook `secret_token` → Header `X-Telegram-Bot-Api-Secret-Token`.
 * Env: TELEGRAM_WEBHOOK_SECRET (bevorzugt), sonst COPILOT_WEBHOOK_SECRET / CRON_SECRET.
 * Fail-closed wenn kein Secret gesetzt.
 */
export function telegramWebhookAuthorized(req: Request): boolean {
  const secret =
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    process.env.COPILOT_WEBHOOK_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = req.headers.get('x-telegram-bot-api-secret-token')?.trim()
  return Boolean(header && header === secret)
}
