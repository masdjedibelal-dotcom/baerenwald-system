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
