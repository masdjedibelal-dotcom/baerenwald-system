/**
 * CRM → Website: Partner-Portal-Mail „Neue Anfrage“ (Resend auf der Website).
 * @see handwerks-plattform/docs/PARTNER_CRM_NOTIFY_API.md
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

export async function notifyPartnerHandwerkerAnfrage(
  anfrageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = anfrageId.trim()
  if (!id) return { ok: false, error: 'anfrageId fehlt' }

  const logCtx = {
    typ: 'partner_notify_anfrage',
    betreff: `Partner-Anfrage-Notify: ${id}`,
    leadId: id,
  }

  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) {
    const error =
      'PARTNER_INTERNAL_API_SECRET fehlt — Partner-Mail kann nicht ausgelöst werden (Netlify/CRM .env).'
    await logNotifyEmailResult({ ...logCtx, ok: false, error })
    return { ok: false, error }
  }

  const url = `${partnerSiteBaseUrl()}/api/internal/partner-notify-anfrage`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ anfrageId: id }),
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    const error = `Partner-Benachrichtigung: ${msg}`
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
    const error = `Partner-Benachrichtigung fehlgeschlagen: ${detail}`
    await logNotifyEmailResult({ ...logCtx, ok: false, error })
    return { ok: false, error }
  }

  await logNotifyEmailResult({ ...logCtx, ok: true })
  return { ok: true }
}
