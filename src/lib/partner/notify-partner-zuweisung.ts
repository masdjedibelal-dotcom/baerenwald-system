/**
 * CRM → Website: Partner-Mail „Leistung zugewiesen“ (Resend auf der Website).
 * @see handwerks-plattform/docs/PARTNER_CRM_NOTIFY_API.md
 */

function partnerSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export async function notifyPartnerHandwerkerZuweisung(input: {
  auftragId: string
  handwerkerId: string
  positionId?: string
  positionIds?: string[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  if (!auftragId || !handwerkerId) {
    return { ok: false, error: 'auftragId oder handwerkerId fehlt' }
  }

  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) {
    return {
      ok: false,
      error:
        'PARTNER_INTERNAL_API_SECRET fehlt — Partner-Zuweisungs-Mail kann nicht gesendet werden.',
    }
  }

  const url = `${partnerSiteBaseUrl()}/api/internal/partner-notify-zuweisung`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auftragId,
        handwerkerId,
        positionId: input.positionId?.trim() || undefined,
        positionIds: input.positionIds?.length ? input.positionIds : undefined,
      }),
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    return { ok: false, error: `Partner-Zuweisungs-Mail: ${msg}` }
  }

  let body: { ok?: boolean; error?: string } = {}
  try {
    body = (await res.json()) as { ok?: boolean; error?: string }
  } catch {
    body = {}
  }

  if (!res.ok || !body.ok) {
    const detail = body.error?.trim() || `HTTP ${res.status}`
    return { ok: false, error: `Partner-Zuweisungs-Mail fehlgeschlagen: ${detail}` }
  }

  return { ok: true }
}
