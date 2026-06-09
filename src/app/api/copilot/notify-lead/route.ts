import { notifyNewLeadAlert } from '@/lib/copilot/crm-actions'
import { copilotWebhookAuthorized } from '@/lib/copilot/webhook-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!copilotWebhookAuthorized(req)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { lead_id?: string }
  try {
    body = (await req.json()) as { lead_id?: string }
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const leadId = body.lead_id?.trim()
  if (!leadId) {
    return Response.json({ ok: false, error: 'lead_id fehlt' }, { status: 400 })
  }

  try {
    const result = await notifyNewLeadAlert(leadId)
    return Response.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
