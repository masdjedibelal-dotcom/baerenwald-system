/**
 * CRM → Website: Partner-Mail nach Rückfrage oder Ablehnung einer Einreichung.
 */

import { logNotifyEmailResult } from '@/lib/kommunikation/log-notify-email-result'

function partnerSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export type PartnerAngebotAntwortTyp = 'rueckfrage' | 'abgelehnt'

export async function notifyPartnerHandwerkerAngebotAntwort(input: {
  anfrageId: string
  typ: PartnerAngebotAntwortTyp
  crmNotiz: string
  betreff?: string
  cc?: string[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const logCtx = {
    typ: 'partner_notify_angebot_antwort',
    betreff: input.betreff?.trim() || `Partner-Antwort (${input.typ}): ${input.anfrageId}`,
    leadId: input.anfrageId.trim() || null,
  }

  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) {
    const error = 'PARTNER_INTERNAL_API_SECRET fehlt — Partner-Mail kann nicht gesendet werden.'
    await logNotifyEmailResult({ ...logCtx, ok: false, error })
    return { ok: false, error }
  }

  const url = `${partnerSiteBaseUrl()}/api/internal/partner-notify-angebot-antwort`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        anfrageId: input.anfrageId.trim(),
        typ: input.typ,
        crmNotiz: input.crmNotiz.trim(),
        betreff: input.betreff?.trim() || undefined,
        cc: input.cc?.filter(Boolean),
      }),
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    const error = `Partner-Mail: ${msg}`
    await logNotifyEmailResult({ ...logCtx, ok: false, error })
    return { ok: false, error }
  }

  let body: { ok?: boolean; error?: string } = {}
  try {
    body = (await res.json()) as { ok?: boolean; error?: string }
  } catch {
    body = {}
  }

  if (!res.ok || !body.ok) {
    const detail = body.error?.trim() || `HTTP ${res.status}`
    const error = `Partner-Mail fehlgeschlagen: ${detail}`
    await logNotifyEmailResult({ ...logCtx, ok: false, error })
    return { ok: false, error }
  }

  await logNotifyEmailResult({ ...logCtx, ok: true })
  return { ok: true }
}
